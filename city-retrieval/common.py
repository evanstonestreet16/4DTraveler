"""Shared configuration and embeddings using OpenAI; no network calls on import."""
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent
MODEL = "text-embedding-3-small"
DIMENSIONS = 1536


def connect():
    load_dotenv(ROOT / ".env")  # Load variables from .env file
    for name in ("OPENAI_API_KEY", "MONGODB_URI"):
        value = os.getenv(name, "").strip()
        if not value or "your-" in value.lower() or "YOUR_" in value:
            raise ValueError(f"Set {name} in .env (see .env.example).")

    mongo = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=10000)
    try:
        mongo.admin.command("ping")
        collection = mongo[os.getenv("MONGODB_DATABASE", "city_rag")][
            os.getenv("MONGODB_COLLECTION", "city_chunks")
        ]
        
        # Standard OpenAI client initialized using OPENAI_API_KEY
        openai_client = OpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
            timeout=30.0,
            max_retries=2
        )
        return openai_client, mongo, collection
    except Exception:
        mongo.close()
        raise


def embed(client, texts):
    """Generate 1536-dimensional vectors using OpenAI's API."""
    response = client.embeddings.create(
        model=MODEL, input=texts, dimensions=DIMENSIONS, encoding_format="float"
    )
    vectors = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
    if len(vectors) != len(texts) or any(len(v) != DIMENSIONS for v in vectors):
        raise ValueError("Unexpected embedding response size.")
    return vectors