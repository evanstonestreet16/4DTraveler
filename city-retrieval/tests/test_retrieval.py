"""Offline checks: python -m unittest discover -s tests -v."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import httpx
from openai import OpenAI

from common import DIMENSIONS, MODEL, ROOT, embed
from ingest import chunk_text, ingest_documents, load_documents
from retrieve import retrieve


class MemoryCollection:
    def __init__(self):
        self.records = {}

    def bulk_write(self, writes):
        for write in writes:
            self.records[write._filter["_id"]] = write._doc

    def delete_many(self, query):
        for key, value in list(self.records.items()):
            if value["source_id"] == query["source_id"] and key not in query["_id"]["$nin"]:
                del self.records[key]


class RetrievalTests(unittest.TestCase):
    def test_chunk_coverage_and_boundaries(self):
        for length in (1, 850, 1000, 1001, 1850, 2001):
            text = "abcdefghij" * (length // 10) + "x" * (length % 10)
            chunks = chunk_text(text)
            rebuilt = chunks[0] + "".join(c[150:] for c in chunks[1:])
            self.assertEqual(rebuilt, text)
            self.assertTrue(all(0 < len(c) <= 1000 for c in chunks))
        self.assertEqual(chunk_text(" \n\t"), [])
        with self.assertRaises(ValueError):
            chunk_text("test", size=10, overlap=10)

    def test_samples_and_duplicate_validation(self):
        docs = load_documents(ROOT / "sample_cities.json")
        self.assertEqual(len(docs), 3)
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "bad.json"
            path.write_text(json.dumps([docs[0], docs[0]]), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                load_documents(path)
            path.write_text('[{"id": "bad"}]', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "city"):
                load_documents(path)

    def test_real_sdk_with_mock_http(self):
        requests = []

        def handler(request):
            requests.append(json.loads(request.content))
            return httpx.Response(200, json={
                "object": "list", "model": MODEL,
                "data": [
                    {"object": "embedding", "index": i, "embedding": [float(i)] * DIMENSIONS}
                    for i in (1, 0)
                ],
                "usage": {"prompt_tokens": 2, "total_tokens": 2},
            })

        with OpenAI(api_key="offline-test", http_client=httpx.Client(
            transport=httpx.MockTransport(handler)
        )) as client:
            vectors = embed(client, ["one", "two"])
        self.assertEqual([v[0] for v in vectors], [0.0, 1.0])
        self.assertEqual(requests[0]["dimensions"], DIMENSIONS)
        self.assertEqual(requests[0]["model"], MODEL)
        self.assertEqual(requests[0]["encoding_format"], "float")

    @patch("ingest.embed", side_effect=lambda client, texts: [[0.1] * DIMENSIONS for _ in texts])
    def test_rerun_and_shrinking_source(self, mocked_embed):
        docs = load_documents(ROOT / "sample_cities.json")
        collection = MemoryCollection()
        with contextlib.redirect_stdout(io.StringIO()):
            total = ingest_documents(docs, Mock(), collection)
            first_ids = set(collection.records)
            self.assertGreater(total, 3)
            ingest_documents(docs, Mock(), collection)
            self.assertEqual(set(collection.records), first_ids)
            docs[0]["text"] = "A shorter city description."
            ingest_documents([docs[0]], Mock(), collection)
        self.assertEqual(len(collection.records), 3)
        self.assertEqual({r["city"] for r in collection.records.values()},
                         {"Toronto", "Montreal", "Vancouver"})

    def test_failed_embedding_keeps_existing_source(self):
        collection = Mock()
        docs = load_documents(ROOT / "sample_cities.json")
        with patch("ingest.embed", side_effect=RuntimeError("API failure")):
            with self.assertRaises(RuntimeError):
                ingest_documents(docs, Mock(), collection)
        collection.delete_many.assert_not_called()
        collection.bulk_write.assert_not_called()

    @patch("retrieve.embed", return_value=[[0.0] * DIMENSIONS])
    def test_query_and_metadata_projection(self, mocked_embed):
        collection = Mock()
        collection.aggregate.return_value = [{"city": "Toronto", "score": 0.8}]
        results = retrieve("museums", Mock(), collection, "city_vector_index", 2, "Toronto")
        pipeline = collection.aggregate.call_args.args[0]
        search = pipeline[0]["$vectorSearch"]
        self.assertEqual(search["limit"], 2)
        self.assertGreaterEqual(search["numCandidates"], 40)
        self.assertEqual(search["filter"], {"city": {"$eq": "Toronto"}})
        self.assertEqual(len(search["queryVector"]), DIMENSIONS)
        self.assertNotIn("embedding", pipeline[1]["$project"])
        self.assertEqual(results[0]["city"], "Toronto")
        retrieve("parks", Mock(), collection, "city_vector_index")
        self.assertNotIn("filter", collection.aggregate.call_args.args[0][0]["$vectorSearch"])

    def test_bad_queries_do_not_call_api(self):
        client = Mock()
        for query, k in ((" ", 3), ("x" * 2001, 3), ("parks", 0), ("parks", 101)):
            with self.assertRaises(ValueError):
                retrieve(query, client, Mock(), "index", k)
        client.embeddings.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
