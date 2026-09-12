"""Chunk a JSON array of city documents and upsert embeddings into Atlas."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pymongo import ReplaceOne

from common import DIMENSIONS, MODEL, ROOT, connect, embed


def chunk_text(text, size=1000, overlap=150):
    """Overlapping character windows; small enough to avoid a tokenizer dependency."""
    if not 0 <= overlap < size:
        raise ValueError("Require 0 <= overlap < size.")
    text = " ".join(text.split())
    chunks = []
    for start in range(0, len(text), size - overlap):
        chunks.append(text[start:start + size])
        if start + size >= len(text):
            break
    return chunks


def load_documents(path):
    docs = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(docs, list) or not docs:
        raise ValueError("Input must be a non-empty JSON array.")
    seen = set()
    for doc in docs:
        for field in ("id", "city", "country", "category", "title", "source_url", "text"):
            if not isinstance(doc, dict) or not isinstance(doc.get(field), str) or not doc[field].strip():
                raise ValueError(f"Each document needs a non-empty string: {field}")
        if doc["id"] in seen:
            raise ValueError(f"Duplicate document id: {doc['id']}")
        seen.add(doc["id"])
    return docs


def ingest_documents(docs, client, collection):
    total = 0
    for doc in docs:
        # Include city context in every chunk, including later windows.
        prefix = f"{doc['city']}, {doc['country']}. {doc['title']}. "
        if len(prefix) > 500:
            raise ValueError("Combined city, country and title must be under 500 characters.")
        chunks = [prefix + part for part in chunk_text(doc["text"])]
        key = hashlib.sha256(doc["id"].encode()).hexdigest()
        ids = [f"{key}:{i}" for i in range(len(chunks))]
        for start in range(0, len(chunks), 16):
            batch = chunks[start:start + 16]
            vectors = embed(client, batch)
            writes = []
            for offset, (text, vector) in enumerate(zip(batch, vectors)):
                i = start + offset
                record = {field: doc[field] for field in (
                    "city", "country", "category", "title", "source_url"
                )}
                record.update(
                    _id=ids[i], source_id=doc["id"], chunk_index=i, text=text,
                    embedding=vector, embedding_model=MODEL, embedding_dimensions=DIMENSIONS,
                    updated_at=datetime.now(timezone.utc),
                )
                writes.append(ReplaceOne({"_id": ids[i]}, record, upsert=True))
            collection.bulk_write(writes)
        # Only prune this source's old tail after all its new chunks were written.
        collection.delete_many({"source_id": doc["id"], "_id": {"$nin": ids}})
        total += len(chunks)
        print(f"Stored {len(chunks)} chunks: {doc['title']}")
    return total


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, default=ROOT / "sample_cities.json")
    args = parser.parse_args()
    docs = load_documents(args.file)  # Validate before any paid API calls.
    client, mongo, collection = connect()
    try:
        count = ingest_documents(docs, client, collection)
        print(f"Done: {count} chunks in {collection.full_name}. Allow time for search indexing.")
    finally:
        client.close()
        mongo.close()


if __name__ == "__main__":
    main()
