"""Dynamic historical ambience: Grok designs the street, TTS speaks the crowd.

Nothing here names a city, language, or monument. The model infers what
people would have sounded like from the city, year, and place it is given.
"""

from __future__ import annotations

import array
import io
import json
import math
import random
import wave
from concurrent.futures import ThreadPoolExecutor

import requests

SAMPLE_RATE = 22_050
DURATION_SECONDS = 24
TARGET_RMS = 0.1
PEAK_CEILING = 0.38
VOICES = ("ara", "eve", "rex", "sal")

_CACHE: dict[str, bytes] = {}


def cache_key(city: str, place: str, year: int | None, hint: str) -> str:
    return json.dumps(
        {
            "city": city.strip(),
            "place": place.strip(),
            "year": year,
            "hint": hint.strip(),
        },
        sort_keys=True,
    )


def _extract_json_object(text: str) -> dict:
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


def design_ambience(
    city: str, place: str, year: int | None, hint: str, xai_api_key: str
) -> dict:
    year_clause = f" The year is {year}." if year is not None else ""
    hint_clause = f" Extra context: {hint}." if hint.strip() else ""
    prompt = (
        f'A visitor is standing at "{place}" in {city}.{year_clause}{hint_clause} '
        "Design a looping ambient street bed for that exact moment. "
        "Decide what language the people around them would actually be speaking, "
        "and write everyday overheard fragments in that language — not English "
        "unless English was the local spoken language then. "
        "Fragments are 3-12 words of ordinary talk, not a tour script. "
        "Return ONLY JSON: "
        '{"language":"auto","voices":[{"text":"...","voice_id":"ara"}],'
        '"bed":{"air":0,"water":0,"wood":0,"stone":0,"crowd":0,"market":0,"birds":0}}. '
        f"voice_id must be one of {list(VOICES)}. 3 to 5 voices. "
        "bed values are 0-1. No music. No modern machines."
    )
    response = requests.post(
        "https://api.x.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {xai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "grok-4.3",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a historical sound designer. "
                        "Reply with JSON only. Never invent English crowd talk "
                        "for a place and year that would not have spoken English."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.4,
        },
        timeout=45,
    )
    response.raise_for_status()
    text = response.json()["choices"][0]["message"]["content"]
    parsed = _extract_json_object(text)
    language = parsed.get("language")
    if not isinstance(language, str) or not language.strip():
        language = "auto"
    voices: list[dict[str, str]] = []
    for index, entry in enumerate(parsed.get("voices") or []):
        if not isinstance(entry, dict):
            continue
        phrase = entry.get("text")
        if not isinstance(phrase, str) or not phrase.strip():
            continue
        voice_id = entry.get("voice_id")
        if voice_id not in VOICES:
            voice_id = VOICES[index % len(VOICES)]
        voices.append({"text": phrase.strip()[:180], "voice_id": voice_id})
        if len(voices) >= 5:
            break
    bed = {}
    raw_bed = parsed.get("bed") if isinstance(parsed.get("bed"), dict) else {}
    for key in ("air", "water", "wood", "stone", "crowd", "market", "birds"):
        value = raw_bed.get(key, 0.2 if key in {"air", "crowd"} else 0.05)
        bed[key] = max(0.0, min(1.0, float(value))) if isinstance(value, (int, float)) else 0.1
    return {"language": language.strip(), "voices": voices, "bed": bed}


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


def _read_wav_mono(data: bytes) -> list[float]:
    with wave.open(io.BytesIO(data), "rb") as stream:
        channels = stream.getnchannels()
        width = stream.getsampwidth()
        rate = stream.getframerate()
        frames = stream.readframes(stream.getnframes())
    if width != 2:
        raise ValueError("Expected 16-bit PCM.")
    samples = array.array("h")
    samples.frombytes(frames)
    if sys_is_big_endian():
        samples.byteswap()
    mono = [
        samples[index] / 32767
        if channels == 1
        else (samples[index] + samples[index + 1]) / 65534
        for index in range(0, len(samples), channels)
    ]
    if rate == SAMPLE_RATE:
        return mono
    # Nearest-neighbour resample is enough for distant crowd layers.
    length = max(1, int(len(mono) * SAMPLE_RATE / rate))
    return [
        mono[min(int(index * rate / SAMPLE_RATE), len(mono) - 1)]
        for index in range(length)
    ]


def sys_is_big_endian() -> bool:
    import sys

    return sys.byteorder != "little"


def _lowpass(previous: float, sample: float, amount: float) -> float:
    return previous + amount * (sample - previous)


def _add_hits(
    samples: list[float],
    rng: random.Random,
    starts: list[float],
    frequencies: tuple[float, ...],
    amplitude: float,
    decay: float,
) -> None:
    length = int(SAMPLE_RATE * 0.7)
    for start in starts:
        offset = int(start * SAMPLE_RATE)
        for index in range(length):
            if offset + index >= len(samples):
                break
            time = index / SAMPLE_RATE
            envelope = min(1.0, time / 0.01) * math.exp(-time / decay)
            resonance = sum(
                math.sin(2 * math.pi * frequency * time) / (rank + 1)
                for rank, frequency in enumerate(frequencies)
            ) / 1.8
            contact = rng.uniform(-1, 1) * math.exp(-time / 0.018)
            samples[offset + index] += amplitude * envelope * (
                0.72 * resonance + 0.28 * contact
            )


def _render_bed(mix: dict[str, float], seed: str) -> list[float]:
    rng = random.Random(seed)
    frames = SAMPLE_RATE * DURATION_SECONDS
    samples = [0.0] * frames
    air = water = crowd = market = 0.0
    for frame in range(frames):
        time = frame / SAMPLE_RATE
        noise = rng.uniform(-1.0, 1.0)
        air = _lowpass(air, noise, 0.045)
        water = _lowpass(water, noise, 0.18)
        crowd = _lowpass(crowd, noise, 0.012)
        market = _lowpass(market, noise, 0.09)
        breeze = 0.86 + 0.1 * math.sin(2 * math.pi * time / 11)
        trickle = 0.8 + 0.14 * math.sin(2 * math.pi * time / 6.5)
        samples[frame] = (
            mix["air"] * 0.07 * breeze * air
            + mix["water"] * 0.08 * trickle * water
            + mix["crowd"] * 0.05 * crowd
            + mix["market"] * 0.06 * market
        )
        if mix["birds"] > 0 and rng.random() < 0.0004:
            chirp_len = int(SAMPLE_RATE * 0.09)
            freq = rng.uniform(2100, 3400)
            for index in range(chirp_len):
                if frame + index >= frames:
                    break
                env = math.sin(math.pi * index / chirp_len)
                samples[frame + index] += (
                    mix["birds"]
                    * 0.04
                    * env
                    * math.sin(2 * math.pi * freq * index / SAMPLE_RATE)
                )
    if mix["wood"] > 0:
        _add_hits(samples, rng, [2.2, 9.4, 16.8], (174, 392, 680), 0.06 * mix["wood"], 0.12)
    if mix["stone"] > 0:
        _add_hits(samples, rng, [5.1, 13.6, 21.0], (810, 1380, 2110), 0.04 * mix["stone"], 0.06)
    return samples


def _overlay_voice(bed: list[float], voice: list[float], start: float, gain: float) -> None:
    offset = int(start * SAMPLE_RATE)
    filtered = 0.0
    for index, sample in enumerate(voice):
        dest = offset + index
        if dest >= len(bed):
            dest -= len(bed)
        filtered = _lowpass(filtered, sample, 0.18)
        bed[dest] += gain * filtered


def _encode_wav(samples: list[float]) -> bytes:
    fade = int(SAMPLE_RATE * 0.4)
    for frame in range(len(samples)):
        distance = min(frame, len(samples) - 1 - frame, fade)
        samples[frame] *= 0.5 - 0.5 * math.cos(math.pi * distance / fade)
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
    if rms > 0:
        samples = [sample * (TARGET_RMS / rms) for sample in samples]
    peak = max(abs(sample) for sample in samples) or 1.0
    if peak > PEAK_CEILING:
        samples = [sample * (PEAK_CEILING / peak) for sample in samples]
    pcm = array.array("h", (max(-32767, min(32767, round(sample * 32767))) for sample in samples))
    if sys_is_big_endian():
        pcm.byteswap()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())
    return buffer.getvalue()


def synthesize_scene_ambience(
    city: str,
    place: str,
    year: int | None,
    hint: str,
    xai_api_key: str,
) -> bytes:
    key = cache_key(city, place, year, hint)
    cached = _CACHE.get(key)
    if cached:
        return cached

    design = design_ambience(city, place, year, hint, xai_api_key)
    bed = _render_bed(design["bed"], key)

    def speak(voice: dict[str, str]) -> list[float] | None:
        try:
            spoken = synthesize_speech(
                f"<whisper>{voice['text']}</whisper>",
                xai_api_key,
                voice_id=voice["voice_id"],
                language=design["language"],
                codec="wav",
            )
            return _read_wav_mono(spoken)
        except Exception:
            return None

    voices = design["voices"]
    spoken_layers: list[list[float]] = []
    if voices:
        with ThreadPoolExecutor(max_workers=min(4, len(voices))) as pool:
            for layer in pool.map(speak, voices):
                if layer:
                    spoken_layers.append(layer)

    starts = (1.1, 4.8, 8.6, 13.2, 17.9)
    for index, layer in enumerate(spoken_layers):
        _overlay_voice(bed, layer, starts[index % len(starts)], 0.42)
        _overlay_voice(bed, layer, (starts[index % len(starts)] + 11.5) % DURATION_SECONDS, 0.28)

    wav = _encode_wav(bed)
    _CACHE[key] = wav
    return wav
