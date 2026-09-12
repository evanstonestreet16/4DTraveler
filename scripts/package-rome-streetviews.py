"""Package the selected repository street views for the existing Rome POIs.

Run with Python 3, Pillow and NumPy. Preserve original views losslessly; desktop
8K enhancements use budgeted high-quality WebP. Keep the overview unchanged.
"""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "rome_packaging", ROOT / "blender/scripts/package_rome_renders.py"
)
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)

# Pixel anchors refer to visible features in the original 1440 × 720 images.
# Missing objects remain accessible through the existing object list.
VIEWS = {
    "forum-trajan": {
        "source": "trajan/Gemini_Generated_Image_jov5itjov5itjov5.jpg",
        "shift": 0,
        "pixels": {"basilica-ulpia-facade": [724, 330]},
    },
    "pantheon-forecourt": {
        "source": "pantheon/pantheon_41.8990374,12.4767907.jpg",
        "shift": 720,
        "pixels": {
            "pantheon-agrippa-inscription": [720, 173],
            "pantheon-granite-columns": [615, 290],
            "pantheon-forecourt-colonnade": [174, 375],
        },
    },
    "colosseum-valley": {
        "source": "colosseum/colosseum_41.8912414,12.4911149.jpg",
        "shift": 240,
        "pixels": {"colosseum-outer-arcade": [840, 307]},
    },
}


# Ordered nearby views from the supplied repository images. This is an image tour,
# not a surveyed walking route; no distances or geographic bearings are invented.
NEARBY = {
    "forum-trajan": [
        ("forum-square", "Forum square", None, 0),
        ("forum-overlook", "Market overlook", "trajan/Gemini_Generated_Image_69tywf69tywf69ty.jpg", 0),
        ("forum-market", "Market street", "trajan/Gemini_Generated_Image_p7ix01p7ix01p7ix.jpg", 0),
    ],
    "pantheon-forecourt": [
        ("pantheon-front", "Pantheon forecourt", None, 720),
        ("pantheon-square", "Across the square", "pantheon/pantheon_41.8994625,12.4769344.jpg", 720),
        ("pantheon-interior", "Inside the Pantheon", "pantheon/pantheon_41.8986032,12.4768237.jpg", 720),
    ],
    "colosseum-valley": [
        ("colosseum-front", "Colosseum forecourt", None, 240),
        ("colosseum-approach", "Colosseum approach", "colosseum/colosseum_41.8909304,12.4908728.jpg", 680),
        ("colosseum-interior", "Inside the Colosseum", "colosseum/colosseum_41.8899982,12.492235.jpg", 360),
        ("colosseum-southwest", "Southwest square", "colosseum/colosseum_41.8899144,12.4905981.jpg", 1150),
    ],
}


def save_lossless(image, name):
    path = packaging.DEST / name
    image.save(path, "WEBP", lossless=True, method=6)
    # Ensure packaging preserves the decoded source pixels exactly.
    assert Image.open(path).convert("RGB").tobytes() == image.tobytes()
    data = path.read_bytes()
    assert len(data) <= 3_000_000
    digest = hashlib.sha256(data).hexdigest()
    return {
        "url": f"/images/rome-125/{name}?v={digest[:12]}",
        "width": image.width, "height": image.height,
        "bytes": len(data), "sha256": digest,
    }


def package_view(poi_id, filename, shift, pixels, camera, entry):
    source_path = ROOT / "pano-explorer/public/images/citystreetviews/rome" / filename
    source = Image.open(source_path).convert("RGB")
    assert source.size == (1440, 720)
    source = ImageChops.offset(source, shift, 0)
    desktop = save_lossless(source, f"{poi_id}-360.webp")
    data = {
        "desktop": desktop,
        "mobile": save_lossless(source, f"{poi_id}-360-mobile.webp") if entry else desktop,
    }
    delta = [b - a for a, b in zip(camera["eye"], camera["initialTarget"])]
    yaw = math.atan2(-delta[0], -delta[2])
    pitch = math.atan2(delta[1], math.hypot(delta[0], delta[2]))
    data["fallback"] = packaging.save_asset(
        packaging.perspective(source, yaw, pitch, 960, 600, 75),
        f"{poi_id}-fallback.webp", 94, 500_000,
    )
    data["hotspots"] = [
        {
            "objectId": object_id,
            "yaw": (0.5 - ((x + shift) % source.width) / source.width) * 2 * math.pi,
            "pitch": (0.5 - y / source.height) * math.pi,
        }
        for object_id, (x, y) in pixels.items()
    ]
    data["source"] = {
        "path": str(source_path.relative_to(ROOT)),
        "sha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
        "width": source.width,
        "height": source.height,
        "horizontalShiftPixels": shift,
        "hotspotPixels": pixels,
        "encoding": "lossless WebP; decoded source pixels preserved",
    }
    return data


def apply_enhancements(manifest, only_stem=None):
    """Inputs are already wrapped into runtime orientation; preserve angular anchors."""
    manifest["provenance"] = (
        "POI panoramas use supplied AI street-view illustrations, not verified 125 CE "
        "reconstructions or surveyed imagery. Original native-resolution lossless assets "
        "are retained. Available desktop enhancements use free local RealESRGAN_x4plus "
        "restoration and Lanczos sizing to 8192x4096 with budgeted high-quality WebP; "
        "added detail is inferred. Per-view enhancement metadata records provenance. "
        "Nearby arrows switch supplied images, not a surveyed walking route. "
        "Hotspots mark visible illustrative features; other objects remain in the object list. "
        "See overview.provenance for the separate overview workflow."
    )
    for poi_id, panorama in manifest["panoramas"].items():
        for index, frame in enumerate(panorama["viewpoints"]):
            stem = poi_id if index == 0 else frame["id"]
            if only_stem and stem != only_stem:
                continue
            path = ROOT / f"blender/source/rome-125/{stem}-ai-8k.png"
            metadata_path = path.with_suffix(".json")
            # A worker writes provenance only after the PNG is complete.
            if not path.exists() or not metadata_path.exists():
                continue
            metadata = json.loads(metadata_path.read_text())
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            assert digest == metadata["outputSha256"]
            # Keep previously verified packages, avoiding unnecessary recompression.
            previous = frame.get("enhancement", {})
            previous_path = packaging.DEST / Path(frame["desktop"]["url"].split("?")[0]).name
            if (previous.get("sha256") == digest and previous_path.exists()
                    and hashlib.sha256(previous_path.read_bytes()).hexdigest() == frame["desktop"].get("sha256")):
                continue
            image = Image.open(path).convert("RGB")
            assert image.size == (8192, 4096)
            asset = None
            for quality in (94, 92, 90, 88, 86):
                try:
                    asset = packaging.save_asset(image, f"{stem}-ai-8k-360.webp", quality, 6_000_000)
                    break
                except AssertionError:
                    pass
            assert asset is not None, f"{stem} cannot meet the 6 MB image budget"
            delta = [b - a for a, b in zip(panorama["eye"], panorama["initialTarget"])]
            fallback = packaging.save_asset(
                packaging.perspective(image, math.atan2(-delta[0], -delta[2]),
                                      math.atan2(delta[1], math.hypot(delta[0], delta[2])), 960, 600, 75),
                f"{stem}-ai-8k-fallback.webp", 94, 500_000,
            )
            enhancement = {
                "path": str(path.relative_to(ROOT)), "sha256": digest,
                "width": image.width, "height": image.height,
                "generator": "Free local RealESRGAN_x4plus super-resolution",
                "note": f"Native 4x neural restoration to {metadata['neuralDimensions']}, then Lanczos sizing to 8192x4096; WebP quality {quality}. Inferred detail, not native 8K capture. Original source and angular hotspots retained.",
                "metadataPath": str(metadata_path.relative_to(ROOT)),
            }
            if stem == "colosseum-valley":
                enhancement["promptPath"] = "blender/source/rome-125/colosseum-valley-ai-upscale-prompt.txt"
            frame.update(desktop=asset, fallback=fallback, enhancement=enhancement)
            if index == 0:
                panorama.update(desktop=asset, fallback=fallback, enhancement=enhancement)
            print(stem, "desktop 8K", asset["bytes"], "bytes; quality", quality, flush=True)


def main(ai_only=False, only_stem=None):
    manifest_path = packaging.DEST / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if ai_only:
        apply_enhancements(manifest, only_stem)
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        return
    manifest["generator"] = "scripts/package-rome-streetviews.py"
    manifest["projection"] = (
        "equirectangular; runtime center -Z, +yaw -X, +pitch up; radians. "
        "Supplied views are visually aligned, not geographically registered."
    )
    manifest["provenance"] = (
        "POI panoramas use the repository's supplied AI street-view illustrations. "
        "They are visual interpretations, not verified 125 CE reconstructions or surveyed imagery. "
        "Each source is packaged at native resolution with lossless WebP and horizontally "
        "wrapped to fit the existing opening camera direction. Nearby arrows switch among "
        "supplied images within each POI; they do not represent a surveyed walking route. "
        "Hotspots mark visible illustrative features; other objects remain in the object list. "
        "See overview.provenance for the separate overview workflow."
    )
    manifest.pop("aiInputs", None)
    for poi_id, view in VIEWS.items():
        previous = manifest["panoramas"][poi_id]
        frames = []
        for index, (node_id, label, filename, shift) in enumerate(NEARBY[poi_id]):
            frame = package_view(
                poi_id if index == 0 else node_id,
                filename or view["source"], shift,
                view["pixels"] if index == 0 else {}, previous, index == 0,
            )
            frames.append({"id": node_id, "label": label, **frame})
        data = {k: v for k, v in frames[0].items() if k not in ("id", "label")}
        data["eye"] = previous["eye"]
        data["initialTarget"] = previous["initialTarget"]
        data["fieldOfView"] = 75
        data["viewpoints"] = frames
        manifest["panoramas"][poi_id] = data
        print(poi_id, len(frames), "lossless views")
    apply_enhancements(manifest)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--colosseum-ai-only", action="store_true", help="Package only the Colosseum entry enhancement, preserving other assets.")
    parser.add_argument("--ai-only", action="store_true", help="Package all available 8K enhancements without regenerating the original assets.")
    args = parser.parse_args()
    main(args.ai_only or args.colosseum_ai_only, "colosseum-valley" if args.colosseum_ai_only else None)
