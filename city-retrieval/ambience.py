"""Grok TTS helper used by object-tour narration."""

from __future__ import annotations

import requests

SAMPLE_RATE = 22_050


def synthesize_speech(
    text: str,
    xai_api_key: str,
    voice_id: str = "ara",
    language: str = "auto",
    codec: str = "mp3",
) -> bytes:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        raise ValueError("Cannot narrate empty text.")
    payload: dict = {
        "text": cleaned[:4000],
        "voice_id": voice_id,
        "language": language or "auto",
        "output_format": {"codec": codec, "sample_rate": SAMPLE_RATE},
    }
    response = requests.post(
        "https://api.x.ai/v1/tts",
        headers={
            "Authorization": f"Bearer {xai_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=45,
    )
    response.raise_for_status()
    if not response.content:
        raise ValueError("TTS returned an empty body.")
    return response.content
