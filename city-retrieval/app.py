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
city_collection = collection.database.get_collection("cities")

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str


@app.get("/api/cities/{city_id}/eras/{era_id}/buildings/{building_id}")
def get_building(city_id: str, era_id: str, building_id: str):
    """Return one building's description for a specific historical era."""
    city = city_collection.find_one(
        {"cityId": city_id, "eras.eraId": era_id},
        {
            "_id": 0,
            "cityId": 1,
            "name": 1,
            "eras": {"$elemMatch": {"eraId": era_id}},
        },
    )
    if not city or not city.get("eras"):
        raise HTTPException(status_code=404, detail="City or era not found")

    era = city["eras"][0]
    building = next(
        (
            candidate
            for candidate in era.get("buildings", [])
            if candidate.get("buildingId") == building_id
        ),
        None,
    )
    if building is None:
        raise HTTPException(status_code=404, detail="Building not found")

    return {
        "cityId": city["cityId"],
        "city": city["name"],
        "era": {
            "eraId": era["eraId"],
            "label": era.get("label"),
            "year": era.get("year"),
        },
        "building": building,
    }

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