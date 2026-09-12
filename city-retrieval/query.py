"""Retrieve context from MongoDB Atlas Vector Search and answer questions with Grok."""
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent

# Ensure the index name matches the one created in MongoDB Atlas
VECTOR_INDEX_NAME = "vector_index"


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


def vector_search(query_text, openai_client, collection, limit=3):
    # 1. Embed user query using OpenAI
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query_text],
        dimensions=1536
    )
    query_vector = response.data[0].embedding

    # 2. Run vector search aggregation pipeline in MongoDB Atlas
    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": limit * 10,
                "limit": limit
            }
        },
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
    
    return list(collection.aggregate(pipeline))


def ask_grok(query_text, retrieved_docs, xai_client):
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
            {"role": "system", "content": "You are a helpful travel assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )
    
    return response.choices[0].message.content

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