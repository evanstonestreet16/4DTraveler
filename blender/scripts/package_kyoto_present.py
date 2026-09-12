"""Encode modern Kyoto BEVs using the Rome Present asset workflow."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'blender/source/kyoto-present'
DEST = ROOT / 'public/images/kyoto-present'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(source, name, quality, budget):
    path = DEST / name
    with Image.open(source) as image:
        image.convert('RGB').save(path, 'WEBP', quality=quality, method=6)
        width, height = image.size
    size = path.stat().st_size
    assert size <= budget, f'{name} exceeds budget: {size}'
    sha = digest(path)
    return dict(url=f'/images/kyoto-present/{name}?v={sha[:12]}',
                width=width, height=height, bytes=size, sha256=sha)


if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    overview = {
        'desktop': encode(SOURCE / 'overview-desktop.png', 'overview.webp', 87, 1500000),
        'mobile': encode(SOURCE / 'overview-mobile.png', 'overview-mobile.webp', 87, 1500000),
        'fallback': encode(SOURCE / 'overview-desktop.png', 'overview-fallback.webp', 45, 500000),
    }
    inputs = [dict(path=str(p.relative_to(ROOT)), sha256=digest(p)) for p in
              [SOURCE / 'overview-desktop.png', SOURCE / 'overview-mobile.png', SOURCE / 'prompts.json']]
    references = [ROOT / 'blender/source/kyoto-1700' / name for name in
                  ['overview-illustration.png', 'overview-mobile-illustration.png']]
    manifest = dict(
        worldId='kyoto-present', snapshotYear=2026, overview=overview,
        inputs=inputs, generator='Codex built-in image generation',
        provenance='Original generated edits of project-owned Kyoto illustrations, informed by linked institutional references. Rome Present supplied the finish reference. No third-party imagery redistributed.',
        limitation='Illustrative present-day reconstruction, not a surveyed aerial photograph. Inherits approximate geography from the historical compositions; landmark alignment and individual buildings remain approximate.',
        cameraReferences=[dict(path=str(p.relative_to(ROOT)), sha256=digest(p)) for p in references],
        anchors=['Nijo Castle moats and low palace buildings', 'Kyoto Imperial Palace / Gyoen', 'Kamo River course', 'Nishiki district', 'Kiyomizu-dera hillside', 'Higashiyama ridgeline'],
        modernGeographyReferences=json.loads((SOURCE / 'prompts.json').read_text())['references'],
    )
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(overview, indent=2))
