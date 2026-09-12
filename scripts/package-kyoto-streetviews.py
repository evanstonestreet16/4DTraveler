"""Add the supplied Nishiki street-view 360 as a nearby view, Rome-style.

Keeps the Blender market as the POI entry (hotspots stay authored). The Gemini
arcade image is the second viewpoint. Run from the repo root with Pillow and NumPy.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/images/kyoto-1700"
SOURCE = DEST / "Gemini_Generated_Image_23la0c23la0c23la.jpeg"
SPEC = importlib.util.spec_from_file_location(
    "kyoto_packaging", ROOT / "blender/scripts/package_kyoto_renders.py"
)
packaging = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(packaging)

WIDTH, HEIGHT = 1440, 720
# Visible features in the supplied 1440 × 720 arcade frame. Other objects
# stay reachable from the object list, matching Rome's extra street views.
ARCADE_HOTSPOTS = {
    "nishiki-fish-stall": [420, 440],
    "nishiki-groundwater": [180, 480],
    "nishiki-machiya-shopfront": [1080, 340],
}


def save_lossless(image: Image.Image, name: str) -> dict:
    path = DEST / name
    image.save(path, "WEBP", lossless=True, method=6)
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    assert len(data) <= 3_000_000, f"{name} exceeds street-view budget"
    return {
        "url": f"/images/kyoto-1700/{name}?v={digest[:12]}",
        "width": image.width,
        "height": image.height,
        "bytes": len(data),
        "sha256": digest,
    }


def main() -> None:
    manifest_path = DEST / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    nishiki = manifest["panoramas"]["nishiki-fish-market"]
    source = Image.open(SOURCE).convert("RGB").resize(
        (WIDTH, HEIGHT), Image.Resampling.LANCZOS
    )
    desktop = save_lossless(source, "nishiki-arcade-360.webp")
    fallback = packaging.asset(
        packaging.perspective(source, 0, 0, 960, 600, 75),
        "nishiki-arcade-fallback.webp",
        90,
        500_000,
    )
    arcade_hotspots = [
        {
            "objectId": object_id,
            "yaw": (0.5 - x / WIDTH) * 2 * math.pi,
            "pitch": (0.5 - y / HEIGHT) * math.pi,
        }
        for object_id, (x, y) in ARCADE_HOTSPOTS.items()
    ]
    arcade = {
        "id": "nishiki-arcade",
        "label": "Covered arcade",
        "desktop": desktop,
        "fallback": fallback,
        "hotspots": arcade_hotspots,
        "source": {
            "path": str(SOURCE.relative_to(ROOT)),
            "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "width": Image.open(SOURCE).size[0],
            "height": Image.open(SOURCE).size[1],
            "encoding": "lossless WebP; resized to 2:1 for the panorama viewer",
            "hotspotPixels": ARCADE_HOTSPOTS,
        },
    }
    street = {
        "id": "nishiki-street",
        "label": "Open market street",
        "desktop": nishiki["desktop"],
        "fallback": nishiki["fallback"],
        "hotspots": nishiki["hotspots"],
    }
    nishiki["desktop"] = desktop
    nishiki["fallback"] = fallback
    nishiki["hotspots"] = arcade_hotspots
    nishiki["fieldOfView"] = 75
    nishiki["viewpoints"] = [arcade, street]
    manifest["panoramas"]["nishiki-fish-market"] = nishiki
    manifest["streetViews"] = {
        "nishiki-fish-market": {
            "note": (
                "The covered arcade is a supplied AI street-view illustration. "
                "It is not a surveyed 1700 interior and is not registered to the "
                "Blender market street. Nearby arrows switch images within Nishiki."
            ),
        }
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print("nishiki-fish-market", len(nishiki["viewpoints"]), "views")


if __name__ == "__main__":
    main()
