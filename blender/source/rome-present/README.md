# Rome present overview sources

Original present-day illustrations generated with Codex's built-in image tool
from the project's first Rome Present desktop and portrait overview images. The
selected PNGs and exact prompts are retained here; no third-party aerial imagery
is included. The second pass is grounded in official Roma Capitale tourism
references for the Vittoriano/Piazza Venezia, Via dei Fori Imperiali and the
excavated Imperial Fora. It is a reference-grounded visual reconstruction, not
a surveyed aerial photograph; landmark registration and small-scale building
detail remain approximate.

- `overview-desktop.png`: 1586 × 992, matched to the historical desktop crop.
- `overview-mobile.png`: 954 × 1649, matched to its separate portrait crop.
- `prompts.json`: complete input instructions and generation method.

The review gate requires the white Vittoriano at Piazza Venezia, a readable
straight Via dei Fori Imperiali axis to the Colosseum, open archaeological fora,
the ruined Colosseum shell, a green Circus Maximus and visibly post-antique
surrounding blocks. Official reference URLs and their roles are recorded in the
generated manifest; their images are not packaged or redistributed.

Package the unchanged PNGs as browser WebPs with:

```sh
python3 blender/scripts/package_rome_present.py
```

The encoder uses Pillow, checks byte budgets, and records source/runtime hashes,
dimensions, provenance, and the historical camera-manifest reference in
`public/images/rome-present/manifest.json`. It does not alter the source images.
The browser supplies the two-second reveal, light pass, and 1.5% push; no video,
generated intermediate city frames, AI credentials, or live AI requests are used.
