"""Encode the reviewed, reference-grounded Rome Present illustrations."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'blender/source/rome-present'
DEST = ROOT / 'public/images/rome-present'

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
    return dict(url=f'/images/rome-present/{name}?v={sha[:12]}',
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
    reference = ROOT / 'public/images/rome-125/manifest.json'
    manifest = dict(worldId='rome-present', snapshotYear=2026, overview=overview,
                    inputs=inputs, generator='Codex built-in image generation',
                    provenance='Original generated edits of project-owned Rome illustrations, informed by linked official Rome references. No third-party reference imagery is redistributed.',
                    limitation='Reference-grounded visual reconstruction, not a surveyed aerial photograph. Landmark registration and small-scale building detail remain approximate.',
                    cameraReference=dict(path=str(reference.relative_to(ROOT)), sha256=digest(reference)),
                    anchors=['Pantheon', 'Vittoriano / Piazza Venezia', 'Via dei Fori Imperiali', 'Forum/Capitoline precinct', 'Colosseum', 'Tiber course', 'Palatine ridge', 'Circus Maximus'],
                    modernGeographyReferences=[
                        dict(title='Via dei Fori Imperiali', url='https://www.turismoroma.it/en/places/dei-fori-imperiali', role='Road axis from Piazza Venezia to the Colosseum and surrounding excavations.'),
                        dict(title='Monumento a Vittorio Emanuele II (Vittoriano)', url='https://www.turismoroma.it/it/luoghi/monumento-vittorio-emanuele-ii-vittoriano', role='Monument identity and placement at Piazza Venezia.'),
                        dict(title='Piazza Venezia', url='https://www.turismoroma.it/it/luoghi/piazza-venezia', role='Modern square and urban context at the western terminus.'),
                        dict(title='Archaeological area of the Imperial Fora', url='https://www.turismoroma.it/en/places/archaeological-area-imperial-fora', role='Present archaeological condition of the Imperial Fora.')
                    ])
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(overview, indent=2))
