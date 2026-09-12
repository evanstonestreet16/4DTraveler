"""Return the top-k city chunks as JSON using Atlas Vector Search."""
import argparse
import json
import os
import sys

from common import connect, embed


def retrieve(query, client, collection, index_name, top_k=3, city=None):
    if not query.strip() or len(query) > 2000:
        raise ValueError("Query must contain 1-2000 characters and not be blank.")
    if not 1 <= top_k <= 100:
        raise ValueError("top_k must be between 1 and 100.")
    search = {
        "index": index_name,
        "path": "embedding",
        "queryVector": embed(client, [query])[0],
        "numCandidates": max(100, 20 * top_k),
        "limit": top_k,
    }
    if city:
        search["filter"] = {"city": {"$eq": city}}
    return list(collection.aggregate([
        {"$vectorSearch": search},
        {"$project": {
            "_id": 1, "text": 1, "city": 1, "country": 1,
            "category": 1, "title": 1, "source_url": 1,
            "source_id": 1, "chunk_index": 1,
            "score": {"$meta": "vectorSearchScore"},
        }},
    ], maxTimeMS=30000))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--city", help="Exact city name, e.g. Toronto")
    args = parser.parse_args()
    if not args.query.strip() or len(args.query) > 2000:
        parser.error("query must contain 1-2000 characters and not be blank")
    if not 1 <= args.top_k <= 100:
        parser.error("--top-k must be between 1 and 100")
    client, mongo, collection = connect()
    try:
        results = retrieve(args.query, client, collection,
                           os.getenv("MONGODB_VECTOR_INDEX", "city_vector_index"),
                           args.top_k, args.city)
        print(json.dumps(results, indent=2, ensure_ascii=False))
        if not results:
            print("No matches. Check ingestion, index name/readiness, and city filter.", file=sys.stderr)
    finally:
        client.close()
        mongo.close()


if __name__ == "__main__":
    main()
