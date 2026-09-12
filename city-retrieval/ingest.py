"""Fetch a full Wikipedia page for a city, chunk it, embed it, and insert into Atlas."""
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient
import wikipedia

ROOT = Path(__file__).resolve().parent
MODEL = "text-embedding-3-small"
DIMENSIONS = 1536


def get_services():
    load_dotenv(ROOT / ".env")
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    
    mongo = MongoClient(os.environ["MONGODB_URI"])
    collection = mongo[os.getenv("MONGODB_DATABASE", "city_rag")][
        os.getenv("MONGODB_COLLECTION", "city_chunks")
    ]
    return openai_client, mongo, collection


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """Splits long text into overlapping chunks to preserve local context."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def ingest_city_wiki(city_name: str):
    openai_client, mongo, collection = get_services()

    print(f"Fetching Wikipedia article for '{city_name}'...")
    try:
        # Fetch clean page content from Wikipedia
        page = wikipedia.page(city_name, auto_suggest=False)
        full_text = page.content
    except wikipedia.DisambiguationError as e:
        print(f"❌ Ambiguous city name. Did you mean one of these? {e.options[:5]}")
        mongo.close()
        return
    except Exception as e:
        print(f"❌ Failed to fetch page: {e}")
        mongo.close()
        return

    # Split article into small chunks
    raw_chunks = chunk_text(full_text)
    print(f"Split article into {len(raw_chunks)} chunks. Generating embeddings...")

    # Embed in batches to stay within rate limits
    batch_size = 20
    docs_to_insert = []

    for i in range(0, len(raw_chunks), batch_size):
        batch = raw_chunks[i : i + batch_size]
        
        # Call OpenAI to generate 1536-dim vectors
        response = openai_client.embeddings.create(
            model=MODEL, input=batch, dimensions=DIMENSIONS
        )
        embeddings = [item.embedding for item in sorted(response.data, key=lambda x: x.index)]

        for text_chunk, vector in zip(batch, embeddings):
            docs_to_insert.append({
                "city": city_name.lower(),
                "title": f"Wikipedia - {page.title}",
                "text": text_chunk,
                "embedding": vector,
            })

    if docs_to_insert:
        # Optional: clear old chunks for this specific city first
        collection.delete_many({"city": city_name.lower()})
        
        # Insert new chunks into MongoDB
        collection.insert_many(docs_to_insert)
        print(f"✅ Successfully ingested {len(docs_to_insert)} vector chunks for {city_name} into Atlas!")

    mongo.close()


if __name__ == "__main__":
    # Example: Pass any city name
    ingest_city_wiki("Rome")
    ingest_city_wiki("Kyoto")