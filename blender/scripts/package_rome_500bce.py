"""Package the circa 500 BCE Rome overview using the Rome Present workflow."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'blender/source/rome-500bce'
DEST = ROOT / 'public/images/rome-500bce'


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
    return dict(url=f'/images/rome-500bce/{name}?v={sha[:12]}',
                width=width, height=height, bytes=size, sha256=sha)


if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    overview = {
        'desktop': encode(SOURCE / 'overview-desktop.png', 'overview.webp', 87, 1500000),
        'mobile': encode(SOURCE / 'overview-mobile.png', 'overview-mobile.webp', 87, 1500000),
        'fallback': encode(SOURCE / 'overview-desktop.png', 'overview-fallback.webp', 45, 500000),
    }
    inputs = [dict(path=str(p.relative_to(ROOT)), sha256=digest(p)) for p in
              [SOURCE / 'overview-desktop.png', SOURCE / 'overview-mobile.png',
               SOURCE / 'overview-desktop-initial.png', SOURCE / 'overview-mobile-initial.png',
               SOURCE / 'prompts.json']]
    references = [ROOT / 'public/images/rome-125' / name
                  for name in ['overview.webp', 'overview-mobile.webp']]
    manifest = dict(
        worldId='rome-500bce', year=-500, label='Circa 500 BCE',
        overview=overview, inputs=inputs,
        generator='Codex built-in image generation',
        provenance='Original generated edits of project-owned Rome overviews, informed by linked archaeological references. No third-party reference images are redistributed.',
        limitation='Interpretive reconstruction. Terrain registration, settlement density, individual buildings, streets and vegetation are approximate. Generated images are not independent historical evidence.',
        cameraReferences=[dict(path=str(p.relative_to(ROOT)), sha256=digest(p)) for p in references],
        geographicAnchors=['Tiber course', 'Capitoline rise', 'Palatine ridge', 'Circus Maximus valley', 'Future Colosseum valley', 'Campus Martius'],
        historicalReferences=json.loads((SOURCE / 'prompts.json').read_text())['references'],
    )
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(overview, indent=2))
