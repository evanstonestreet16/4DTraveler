#!/usr/bin/env python3
"""Generate the original Rome construction/water ambience using stdlib only.

No recordings, speech, music, or external samples are used. All sounds are
illustrative synthesis, not claims about the historical city's exact acoustics.
Run: python3 scripts/generate-rome-ambience.py
"""

import array
import math
from pathlib import Path
import random
import sys
import wave


SAMPLE_RATE = 22_050
DURATION_SECONDS = 24
OUTPUT = (
    Path(__file__).resolve().parents[1]
    / "public/audio/rome-125/colosseum-valley-ambience.wav"
)


def synthesize():
    """Soft filtered water with irregular, damped timber/stone contact sounds."""
    random_source = random.Random(125)
    frames = SAMPLE_RATE * DURATION_SECONDS
    samples = [0.0] * frames
    slow_water = 0.0
    fast_water = 0.0
    for frame in range(frames):
        time = frame / SAMPLE_RATE
        noise = random_source.uniform(-1.0, 1.0)
        slow_water += 0.025 * (noise - slow_water)
        fast_water += 0.22 * (noise - fast_water)
        flow = 0.82 + 0.12 * math.sin(2 * math.pi * time / 8)
        samples[frame] = flow * (0.036 * fast_water + 0.02 * slow_water)

    # Irregular, widely spaced actions keep the bed from becoming rhythmic music.
    for start, material in [
        (1.4, "timber"),
        (4.1, "stone"),
        (7.6, "timber"),
        (8.05, "timber"),
        (12.8, "stone"),
        (17.2, "timber"),
        (20.6, "stone"),
    ]:
        timber = material == "timber"
        decay = 0.13 if timber else 0.07
        frequencies = (183, 427, 739) if timber else (821, 1427, 2189)
        amplitude = 0.045 if timber else 0.027
        length = int(SAMPLE_RATE * 0.8)
        offset = int(start * SAMPLE_RATE)
        for index in range(length):
            time = index / SAMPLE_RATE
            # A short attack removes clicks; inharmonic decays suggest materials.
            envelope = min(1.0, time / 0.009) * math.exp(-time / decay)
            resonance = sum(
                math.sin(2 * math.pi * frequency * time) / (rank + 1)
                for rank, frequency in enumerate(frequencies)
            ) / 1.84
            contact = random_source.uniform(-1, 1) * math.exp(-time / 0.016)
            samples[offset + index] += amplitude * envelope * (
                0.75 * resonance + 0.25 * contact
            )

    # Both endpoints are zero with a smooth slope, avoiding clicks on the loop.
    fade_frames = int(SAMPLE_RATE * 0.65)
    for frame in range(frames):
        distance = min(frame, frames - 1 - frame, fade_frames)
        fade = 0.5 - 0.5 * math.cos(math.pi * distance / fade_frames)
        samples[frame] *= fade * 3
    peak = max(abs(sample) for sample in samples)
    assert peak < 0.2, "Ambience must remain quiet and comfortably below clipping"
    pcm = array.array("h", (round(sample * 32767) for sample in samples))
    assert pcm[0] == pcm[-1] == 0
    if sys.byteorder != "little":
        pcm.byteswap()
    return pcm, peak


def main():
    pcm, peak = synthesize()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())
    with wave.open(str(OUTPUT), "rb") as stream:
        assert stream.getnframes() == SAMPLE_RATE * DURATION_SECONDS
        assert stream.getnchannels() == 1 and stream.getsampwidth() == 2
    print(f"{OUTPUT}: {DURATION_SECONDS}s, {OUTPUT.stat().st_size} bytes, peak {peak:.4f}")


if __name__ == "__main__":
    main()
