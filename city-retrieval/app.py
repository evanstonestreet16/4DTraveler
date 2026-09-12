"""FastAPI server exposing the RAG pipeline to external frontends."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import functions from your existing query.py
from query import get_clients, vector_search, ask_grok

app = FastAPI()

# Enable CORS so your React app can make fetch/axios requests without browser blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and clients once at startup
openai_client, xai_client, collection = get_clients()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str

@app.post("/api/chat", response_model=QueryResponse)
def get_response(payload: QueryRequest):
    """API endpoint called by the React frontend."""
    try:
        query = payload.query.strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query cannot be empty.")
            
        docs = vector_search(query, openai_client, collection)
        answer = ask_grok(query, docs, xai_client)
        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)