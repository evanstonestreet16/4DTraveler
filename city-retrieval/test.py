import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# 1. Load variables from .env into os.environ
ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

# 2. Retrieve key (now properly populated)
api_key = os.getenv("XAI_API_KEY", "").strip()

if not api_key or "your-" in api_key.lower():
    raise ValueError("XAI_API_KEY is missing or invalid in your .env file.")

# 3. Initialize xAI client
client = OpenAI(
    api_key=api_key,
    base_url="https://api.x.ai/v1"
)

try:
    # List available models
    models = client.models.list()
    model_ids = [m.id for m in models.data]
    print("Available Models on your account:")
    for model_id in model_ids:
        print(f" - {model_id}")

    # Test embedding endpoint
    print("\nTesting embedding endpoint...")
    response = client.embeddings.create(
        model="v1",
        input=["Test text for vector search"]
    )
    print("SUCCESS! Embedding endpoints are supported and active on your account.")

except Exception as e:
    print(f"\nEmbedding endpoint failed: {e}")