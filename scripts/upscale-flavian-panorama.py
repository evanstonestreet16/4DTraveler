"""Offline, free Real-ESRGAN x4 restoration for desktop Rome panoramas.

Requires torch, spandrel, Pillow and NumPy in an authoring environment only.
Download the official RealESRGAN_x4plus.pth and pass its path with --model.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ImageModelDescriptor, ModelLoader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "blender/source/rome-125/colosseum-valley-ai-upscale.png"
OUTPUT = ROOT / "blender/source/rome-125/colosseum-valley-ai-8k.png"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--tile", type=int, default=256)
    args = parser.parse_args()
    assert args.tile > 0
    source_path, output_path = args.source.resolve(), args.output.resolve()
    torch.set_num_threads(2)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = ModelLoader().load_from_file(str(args.model))
    assert isinstance(model, ImageModelDescriptor) and model.scale == 4
    model = model.to(device).eval()
    source = Image.open(source_path).convert("RGB")
    assert source.width == 2 * source.height
    pixels = np.asarray(source)
    height, width = pixels.shape[:2]
    scale, pad = 4, 32
    result = np.empty((height * scale, width * scale, 3), dtype=np.uint8)
    total = ((width + args.tile - 1) // args.tile) * ((height + args.tile - 1) // args.tile)
    start, completed = time.monotonic(), 0
    print(f"RealESRGAN_x4plus on {device}: {source.size}, {total} tiles", flush=True)
    with torch.inference_mode():
        for y in range(0, height, args.tile):
            for x in range(0, width, args.tile):
                tile_width, tile_height = min(args.tile, width - x), min(args.tile, height - y)
                # Periodic horizontal context avoids adding an artificial panorama edge.
                xs = np.arange(x - pad, x + tile_width + pad) % width
                ys = np.clip(np.arange(y - pad, y + tile_height + pad), 0, height - 1)
                tile = pixels[ys[:, None], xs[None, :]]
                tensor = torch.from_numpy(tile.copy()).permute(2, 0, 1).unsqueeze(0).to(device, torch.float32) / 255
                enhanced = model(tensor)
                core = enhanced[0, :, pad * scale:(pad + tile_height) * scale,
                                pad * scale:(pad + tile_width) * scale]
                core = core.clamp(0, 1).mul(255).round().to("cpu", torch.uint8).permute(1, 2, 0).numpy()
                result[y * scale:(y + tile_height) * scale, x * scale:(x + tile_width) * scale] = core
                del tensor, enhanced, core
                completed += 1
                print(f"Tile {completed}/{total}, {time.monotonic() - start:.1f}s", flush=True)
    # Match the requested dimensions after native 4x neural restoration.
    image = Image.fromarray(result).resize((8192, 4096), Image.Resampling.LANCZOS)
    image.save(output_path, optimize=True)
    assert Image.open(output_path).size == (8192, 4096)
    metadata = {
        "source": str(source_path.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
        "sourceDimensions": [width, height],
        "model": "RealESRGAN_x4plus",
        "modelUrl": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        "modelSha256": hashlib.sha256(args.model.read_bytes()).hexdigest(),
        "device": device,
        "neuralDimensions": [width * scale, height * scale],
        "outputDimensions": [8192, 4096],
        "outputSha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "method": "Native 4x neural super-resolution, overlapping context with horizontal wrap, then Lanczos sizing to exactly 8192x4096. Reconstructed detail is inferred, not recovered historical evidence.",
        "elapsedSeconds": round(time.monotonic() - start, 1),
    }
    output_path.with_suffix(".json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2), flush=True)


if __name__ == "__main__":
    main()
