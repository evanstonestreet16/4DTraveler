"""Retrieve context from MongoDB Atlas Vector Search and answer questions with Grok."""
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent


def get_clients():
    load_dotenv(ROOT / ".env")
    
    # Initialize OpenAI for query embedding
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    
    # Initialize xAI (Grok) for text generation
    xai_client = OpenAI(
        api_key=os.environ["XAI_API_KEY"],
        base_url="https://api.x.ai/v1"
    )
    
    mongo = MongoClient(os.environ["MONGODB_URI"])
    collection = mongo[os.getenv("MONGODB_DATABASE", "city_rag")][
        os.getenv("MONGODB_COLLECTION", "city_chunks")
    ]
    
    return openai_client, xai_client, collection


def vector_search(query_text, openai_client, collection, limit=3, city=None):
    # 1. Embed user query using OpenAI
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    query_vector = response.data[0].embedding

    # 2. Run vector search aggregation pipeline in MongoDB Atlas
    index_name = os.getenv("MONGODB_VECTOR_INDEX", "vector_index")
    search = {
        "index": index_name,
        "path": "embedding",
        "queryVector": query_vector,
        "numCandidates": max(limit * 10, 40),
        "limit": limit,
    }
    # Wikipedia ingest stores city as lowercase; sample docs use Title Case.
    if city:
        trimmed = city.strip()
        search["filter"] = {
            "city": {"$in": [trimmed, trimmed.lower(), trimmed.title()]}
        }

    pipeline = [
        {"$vectorSearch": search},
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "city": 1,
                "title": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    try:
        results = list(collection.aggregate(pipeline))
    except Exception:
        results = []
    # If a city filter produced nothing (index lag or name mismatch), retry
    # unfiltered so the tour still has *some* context.
    if city and not results:
        return vector_search(query_text, openai_client, collection, limit=limit)
    return results


SPOKEN_TOUR_SYSTEM = (
    "You are a historical tour guide speaking aloud beside a monument. "
    "Answer in 3 to 5 short spoken sentences. No markdown, no bullet lists, "
    "no headings, no quotation marks around the whole answer. If a year is "
    "given, describe the monument as a visitor in that year would have "
    "understood it. Stay grounded in the retrieved context; if the context "
    "is thin, say only what you can support."
)


def ask_grok(query_text, retrieved_docs, xai_client, spoken=False):
    if not retrieved_docs:
        return "No relevant context found to answer the query."

    # Format retrieved document chunks into context
    context = "\n\n".join(
        [f"--- Document ({doc.get('city', '')} - {doc.get('title', '')}) ---\n{doc.get('text', '')}" for doc in retrieved_docs]
    )
    
    prompt = f"""Use the following context to answer the user's question concisely.

Context:
{context}

Question: {query_text}
Answer:"""

    # 3. Pass context and question to xAI (Grok)
    response = xai_client.chat.completions.create(
        model="grok-4.3",
        messages=[
            {
                "role": "system",
                "content": SPOKEN_TOUR_SYSTEM if spoken else "You are a helpful travel assistant.",
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )
    
    return response.choices[0].message.content


def _extract_json_object(text: str) -> dict:
    import json
    import re

    cleaned = (text or "").strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1)
    else:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            cleaned = cleaned[start : end + 1]
    data = json.loads(cleaned)
    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object.")
    return data


def _safe_http_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    url = value.strip()
    if not url.startswith("https://"):
        return None
    if any(char.isspace() for char in url):
        return None
    return url


def parse_ticket_links(raw_tickets: object) -> list[dict[str, str]]:
    if not isinstance(raw_tickets, list):
        return []
    tickets: list[dict[str, str]] = []
    for entry in raw_tickets:
        if not isinstance(entry, dict):
            continue
        url = _safe_http_url(entry.get("url"))
        title = entry.get("title")
        if not url or not isinstance(title, str) or not title.strip():
            continue
        tickets.append({"title": title.strip()[:80], "url": url})
        if len(tickets) >= 3:
            break
    return tickets


def find_ticket_links(city: str, monument: str, xai_api_key: str) -> list[dict[str, str]]:
    """Ask Grok + web search for official visitor/ticket pages."""
    import requests

    prompt = (
        f'Find official ticket or visitor-booking pages for "{monument}" in {city}. '
        "Prefer the site that actually sells or reserves admission "
        "(official monument site, park service, or museum). "
        "Return ONLY JSON: "
        '{"tickets":[{"title":"Official tickets","url":"https://example.com"}]}. '
        "At most 3 links. If you cannot verify a real page, return {\"tickets\":[]}."
    )
    response = requests.post(
        "https://api.x.ai/v1/responses",
        headers={
            "Authorization": f"Bearer {xai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "grok-4.3",
            "input": [{"role": "user", "content": prompt}],
            "tools": [{"type": "web_search"}],
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    chunks: list[str] = []
    for item in payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for block in item.get("content") or []:
            if isinstance(block, dict) and isinstance(block.get("text"), str):
                chunks.append(block["text"])
    if not chunks and isinstance(payload.get("output_text"), str):
        chunks.append(payload["output_text"])
    if not chunks:
        return []
    try:
        parsed = _extract_json_object("\n".join(chunks))
    except Exception:
        return []
    return parse_ticket_links(parsed.get("tickets"))


def synthesize_speech(text: str, xai_api_key: str, voice_id: str = "ara") -> bytes:
    """Turn narration text into MP3 bytes via xAI Grok TTS. Key stays server-side."""
    from ambience import synthesize_speech as speak

    return speak(text, xai_api_key, voice_id=voice_id, language="en", codec="mp3")

def getResponse(query: str):
    openai_client, xai_client, collection = get_clients()
    docs = vector_search(query, openai_client, collection)
    answer = ask_grok(query, docs, xai_client)
    return answer

def main():
    openai_client, xai_client, collection = get_clients()
    
    user_query = "What should I do when visiting Toronto?"
    print(f"User Query: {user_query}\n")
    
    # Search vector database
    docs = vector_search(user_query, openai_client, collection)
    print(f"Retrieved {len(docs)} relevant chunks from Atlas.")
    
    # Generate answer with Grok
    answer = ask_grok(user_query, docs, xai_client)
    print("\n--- Grok Response ---")
    print(answer)


if __name__ == "__main__":
    main()