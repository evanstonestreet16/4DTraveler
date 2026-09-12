#!/usr/bin/env python3
"""Generate quiet looping ambience for Rome and Kyoto POIs.

Grok designs a small mix for each viewpoint. Python then synthesizes the
loop with the standard library only — no recordings, speech, or music.
The beds are illustrative, not claims about historical acoustics.

Run: python3 scripts/generate-city-ambience.py
"""

from __future__ import annotations

import array
import hashlib
import json
import math
import os
import random
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_RATE = 22_050
DURATION_SECONDS = 24
TARGET_RMS = 0.09
PEAK_CEILING = 0.32

SCENES = (
    {
        "id": "forum-trajan",
        "city": "Rome",
        "year": 125,
        "rel": "rome-125/forum-trajan-ambience.wav",
        "brief": "open imperial forum, stone paving, distant civic murmur, no water",
    },
    {
        "id": "pantheon-forecourt",
        "city": "Rome",
        "year": 125,
        "rel": "rome-125/pantheon-forecourt-ambience.wav",
        "brief": "forecourt before the rebuilt Pantheon, still air, stone colonnade, faint footsteps",
    },
    {
        "id": "colosseum-valley",
        "city": "Rome",
        "year": 125,
        "rel": "rome-125/colosseum-valley-ambience.wav",
        "brief": "Flavian amphitheatre valley, fountain water, sparse timber and stone construction",
    },
    {
        "id": "nijo-ninomaru",
        "city": "Kyoto",
        "year": 1700,
        "rel": "kyoto-1700/nijo-ninomaru-ambience.wav",
        "brief": "quiet Nijō Castle courtyard, gravel, wood, distant pine wind, almost empty",
    },
    {
        "id": "kiyomizu-hillside",
        "city": "Kyoto",
        "year": 1700,
        "rel": "kyoto-1700/kiyomizu-hillside-ambience.wav",
        "brief": "Kiyomizu hillside, waterfall, timber stage, hillside wind, temple hush",
    },
    {
        "id": "nishiki-fish-market",
        "city": "Kyoto",
        "year": 1700,
        "rel": "kyoto-1700/nishiki-fish-market-ambience.wav",
        "brief": "early Edo fish market, water, wood stalls, baskets, muffled work, no modern machines",
    },
)

FALLBACK_MIXES = {
    "forum-trajan": {
        "air": 0.34,
        "water": 0.0,
        "wood": 0.08,
        "stone": 0.36,
        "crowd": 0.18,
        "birds": 0.04,
        "market": 0.0,
    },
    "pantheon-forecourt": {
        "air": 0.4,
        "water": 0.0,
        "wood": 0.06,
        "stone": 0.38,
        "crowd": 0.12,
        "birds": 0.04,
        "market": 0.0,
    },
    "colosseum-valley": {
        "air": 0.22,
        "water": 0.38,
        "wood": 0.18,
        "stone": 0.16,
        "crowd": 0.06,
        "birds": 0.0,
        "market": 0.0,
    },
    "nijo-ninomaru": {
        "air": 0.42,
        "water": 0.0,
        "wood": 0.28,
        "stone": 0.08,
        "crowd": 0.04,
        "birds": 0.18,
        "market": 0.0,
    },
    "kiyomizu-hillside": {
        "air": 0.28,
        "water": 0.4,
        "wood": 0.16,
        "stone": 0.04,
        "crowd": 0.02,
        "birds": 0.1,
        "market": 0.0,
    },
    "nishiki-fish-market": {
        "air": 0.14,
        "water": 0.22,
        "wood": 0.2,
        "stone": 0.04,
        "crowd": 0.12,
        "birds": 0.0,
        "market": 0.28,
    },
}


def load_env() -> None:
    for path in (ROOT / ".env", ROOT / "city-retrieval" / ".env"):
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ask_grok_mixes() -> dict[str, dict[str, float]]:
    """Ask Grok for a quiet per-scene mix. Falls back if the API is unavailable."""
    api_key = os.environ.get("XAI_API_KEY") or os.environ.get("GROK_API_KEY")
    if not api_key:
        return {}
    scenes = [
        {"id": scene["id"], "city": scene["city"], "year": scene["year"], "brief": scene["brief"]}
        for scene in SCENES
    ]
    prompt = (
        "Design VERY QUIET looping ambient beds for historical viewpoints. "
        "No music, no intelligible speech, no modern machines. "
        "Keep the overall profile small: these sit under a spoken tour. "
        "Return ONLY JSON: {\"mixes\":[{id, air, water, wood, stone, crowd, birds, market}]}. "
        "Each layer is a 0-1 relative weight. ids must match exactly.\n"
        f"{json.dumps(scenes)}"
    )
    body = json.dumps(
        {
            "model": "grok-4.3",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a historical sound designer. Reply with JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
        }
    ).encode()
    request = urllib.request.Request(
        "https://api.x.ai/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {}
    text = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return {}
    mixes: dict[str, dict[str, float]] = {}
    for entry in parsed.get("mixes") or []:
        if not isinstance(entry, dict) or entry.get("id") not in FALLBACK_MIXES:
            continue
        mix = {}
        for key in FALLBACK_MIXES[entry["id"]]:
            value = entry.get(key)
            if isinstance(value, (int, float)):
                mix[key] = max(0.0, min(1.0, float(value)))
        if mix:
            mixes[entry["id"]] = mix
    return mixes


def lowpass(previous: float, sample: float, amount: float) -> float:
    return previous + amount * (sample - previous)


def add_hits(
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


def synthesize(scene_id: str, mix: dict[str, float]) -> tuple[array.array, float]:
    rng = random.Random(
        int(hashlib.sha256(scene_id.encode()).hexdigest()[:8], 16)
    )
    frames = SAMPLE_RATE * DURATION_SECONDS
    samples = [0.0] * frames
    air = water = crowd = market = 0.0
    for frame in range(frames):
        time = frame / SAMPLE_RATE
        noise = rng.uniform(-1.0, 1.0)
        air = lowpass(air, noise, 0.045)
        water = lowpass(water, noise, 0.18)
        crowd = lowpass(crowd, noise, 0.012)
        market = lowpass(market, noise, 0.09)
        breeze = 0.86 + 0.1 * math.sin(2 * math.pi * time / 11)
        trickle = 0.8 + 0.14 * math.sin(2 * math.pi * time / 6.5)
        samples[frame] = (
            mix["air"] * 0.085 * breeze * air
            + mix["water"] * 0.1 * trickle * water
            + mix["crowd"] * 0.055 * crowd
            + mix["market"] * 0.07 * market
        )
        if mix["birds"] > 0 and rng.random() < 0.00045:
            chirp_len = int(SAMPLE_RATE * 0.09)
            freq = rng.uniform(2100, 3400)
            for index in range(chirp_len):
                if frame + index >= frames:
                    break
                env = math.sin(math.pi * index / chirp_len)
                samples[frame + index] += (
                    mix["birds"] * 0.045 * env * math.sin(2 * math.pi * freq * index / SAMPLE_RATE)
                )

    if mix["wood"] > 0:
        add_hits(
            samples,
            rng,
            [2.2, 9.4, 16.8],
            (174, 392, 680),
            0.07 * mix["wood"],
            0.12,
        )
    if mix["stone"] > 0:
        add_hits(
            samples,
            rng,
            [5.1, 13.6, 21.0],
            (810, 1380, 2110),
            0.05 * mix["stone"],
            0.06,
        )

    fade_frames = int(SAMPLE_RATE * 0.65)
    for frame in range(frames):
        distance = min(frame, frames - 1 - frame, fade_frames)
        fade = 0.5 - 0.5 * math.cos(math.pi * distance / fade_frames)
        samples[frame] *= fade

    rms = math.sqrt(sum(sample * sample for sample in samples) / frames)
    if rms > 0:
        samples = [sample * (TARGET_RMS / rms) for sample in samples]
    peak = max(abs(sample) for sample in samples) or 1.0
    if peak > PEAK_CEILING:
        samples = [sample * (PEAK_CEILING / peak) for sample in samples]
        peak = PEAK_CEILING
    pcm = array.array("h", (round(sample * 32767) for sample in samples))
    assert pcm[0] == pcm[-1] == 0
    if sys.byteorder != "little":
        pcm.byteswap()
    return pcm, peak


def write_wav(path: Path, pcm: array.array) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())


def main() -> None:
    load_env()
    grok_mixes = ask_grok_mixes()
    source = "Grok mix" if grok_mixes else "authored fallback mix"
    print(f"Using {source}.")
    for scene in SCENES:
        mix = {**FALLBACK_MIXES[scene["id"]], **grok_mixes.get(scene["id"], {})}
        pcm, peak = synthesize(scene["id"], mix)
        path = ROOT / "public" / "audio" / scene["rel"]
        write_wav(path, pcm)
        with wave.open(str(path), "rb") as stream:
            assert stream.getnframes() == SAMPLE_RATE * DURATION_SECONDS
            assert stream.getnchannels() == 1 and stream.getsampwidth() == 2
        print(f"{path.relative_to(ROOT)}: {DURATION_SECONDS}s, peak {peak:.4f}")


if __name__ == "__main__":
    main()
