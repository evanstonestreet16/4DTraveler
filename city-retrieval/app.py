"""FastAPI server exposing the RAG pipeline to external frontends."""
import os
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from query import (
    ask_grok,
    find_ticket_links,
    get_clients,
    synthesize_speech,
    vector_search,
)

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
XAI_API_KEY = os.environ["XAI_API_KEY"]
city_collection = collection.database.get_collection("cities")


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str


class TicketLink(BaseModel):
    title: str
    url: str


class MonumentRequest(BaseModel):
    city: str
    monument: str
    year: int | None = None
    hint: str = ""


class MonumentResponse(BaseModel):
    answer: str
    tickets: list[TicketLink] = []


class TtsRequest(BaseModel):
    text: str
    voice_id: str = Field(default="ara")


class AmbienceRequest(BaseModel):
    city: str
    place: str
    year: int | None = None
    hint: str = ""


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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/monument", response_model=MonumentResponse)
def monument_summary(payload: MonumentRequest):
    """Era-aware spoken-tour summary plus live ticket/visitor links."""
    city = payload.city.strip()
    monument = payload.monument.strip()
    if not city or not monument:
        raise HTTPException(status_code=400, detail="city and monument are required.")

    year_clause = (
        f" Describe it as it would have been understood in the year {payload.year}."
        if payload.year
        else ""
    )
    hint = payload.hint.strip()
    hint_clause = f" Extra context: {hint}." if hint else ""
    query = (
        f'Summarize the monument "{monument}" in {city} for a visitor standing '
        f"in front of it.{year_clause}{hint_clause} "
        "Cover origin, what it looked like, and why it mattered. "
        "Do not mention ticket websites or URLs."
    )

    def draft_summary() -> str:
        docs = vector_search(
            query, openai_client, collection, limit=6, city=city
        )
        return ask_grok(query, docs, xai_client, spoken=True)

    def draft_tickets() -> list[dict[str, str]]:
        try:
            return find_ticket_links(city, monument, XAI_API_KEY)
        except Exception:
            return []

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            summary_future = pool.submit(draft_summary)
            tickets_future = pool.submit(draft_tickets)
            answer = summary_future.result()
            tickets = tickets_future.result()
        return MonumentResponse(answer=answer, tickets=tickets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts")
def narrate(payload: TtsRequest):
    """Grok TTS: turn a summary into spoken MP3."""
    try:
        audio = synthesize_speech(payload.text, XAI_API_KEY, payload.voice_id)
        return Response(content=audio, media_type="audio/mpeg")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
