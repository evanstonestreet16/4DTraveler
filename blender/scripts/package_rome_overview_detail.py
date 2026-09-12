"""Stage only the selected Rome overview illustrations and integration metadata.

Does not write public assets or the shared manifest. The integration owner copies
the three staged WebPs and merges overview.delivery.json into manifest.overview.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'blender/source/rome-125'
STAGE = SOURCE / 'renders/overview-detail'


def asset(image, filename, quality, budget):
    path = STAGE / filename
    image.save(path, 'WEBP', quality=quality, method=6)
    data = path.read_bytes()
    assert len(data) <= budget, f'{filename} exceeds {budget} bytes'
    digest = hashlib.sha256(data).hexdigest()
    return {'url': f'/images/rome-125/{filename}?v={digest[:12]}',
            'width': image.width, 'height': image.height,
            'bytes': len(data), 'sha256': digest}


def main():
    STAGE.mkdir(parents=True, exist_ok=True)
    base = json.loads((STAGE / 'overview.json').read_text())
    desktop = Image.open(SOURCE / 'overview-detail-desktop.png').convert('RGB')
    mobile = Image.open(SOURCE / 'overview-detail-mobile.png').convert('RGB')
    fallback = desktop.copy()
    fallback.thumbnail((1280, 800), Image.Resampling.LANCZOS)
    overview = {
        'desktop': asset(desktop, 'overview.webp', 88, 1_500_000),
        'mobile': asset(mobile, 'overview-mobile.webp', 88, 1_500_000),
        'fallback': asset(fallback, 'overview-fallback.webp', 79, 500_000),
        'markers': {
            'forum-trajan': {'desktop': [.416, .422], 'mobile': [.572, .466]},
            'pantheon-forecourt': {'desktop': [.113, .510], 'mobile': [.462, .324]},
            'colosseum-valley': {'desktop': [.850, .398], 'mobile': [.613, .685]},
        },
        'cameras': base['cameras'],
        'sourceProjectedMarkers': base['markers'],
        'generator': 'Original Blender layout plus Codex built-in image generation; package_rome_overview_detail.py',
        'provenance': (
            'Illustrative reconstruction of Rome in 125 CE. Editable Blender source '
            'retains geographic layout, ten procedural building families and authored '
            'landmarks. Final desktop and portrait images use AI-generated architectural '
            'surface and environment detail guided by that layout; those fine details '
            'are illustrative and are not fully represented by the Blender meshes. '
            'Cameras and sourceProjectedMarkers describe the authored layouts; markers '
            'are reviewed positions on the final generated images. Stable IDs and '
            'world-space coordinates are unchanged. Kyoto was a finish reference only.'
        ),
        'illustrationSources': [
            'blender/source/rome-125/overview-detail-desktop.png',
            'blender/source/rome-125/overview-detail-mobile.png',
        ],
        'layoutSource': 'blender/source/rome-125/overview.blend',
        'promptSource': 'blender/source/rome-125/overview-detail-prompts.json',
    }
    (STAGE / 'overview.delivery.json').write_text(json.dumps(overview, indent=2) + '\n')
    print(json.dumps(overview, indent=2))


if __name__ == '__main__':
    main()
