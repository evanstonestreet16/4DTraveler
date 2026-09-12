# Pittsburgh / 1892 hero asset

Issue #8 · Workstream 1 · Original project-authored illustrative geometry

The complete GLB retains the primitive scene's coordinate system and selectable centers. The Steel Mill has a tapered furnace with pipework, legs, platform and ladder; a banded brick stack; an open, ribbed freight wagon with wheels and couplers; and modular ventilated sheds. Downtown uses a common facade/roof kit with varied heights, bays, cornices and chimneys. An open truss bridge connects low quays. Track ties, cargo, crates, bollards and a simple barge add scale.

All specific architecture is **illustrative**. See the [historical reference and confidence register](./PITTSBURGH_1892_BRIEF.md). This is not a surveyed 1892 site or an identified reconstruction of Homestead or Smithfield Street Bridge.

## Regenerate and inspect

```sh
npm ci
node scripts/generate-pittsburgh-model.js
npm run dev
```

Open `/scripts/assets/preview.html` on the local Vite server. The preview loads the **exported GLB**, consumes current world camera presets, and provides a camera menu and orbit controls. Its lights are an authoring rig; the production renderer owns runtime atmosphere. Source and preview scripts are outside `public/` and outside the production Vite entry. No browser, Blender, Python, network request or additional package is needed to regenerate the GLB after dependency installation.

`scripts/assets/pittsburgh-kit.js` is the editable source and reusable kit: box/beam/ring, rounded slab, lathe furnace, pitched roof, facade bays, shed, rail and props. Repeated source geometries share a PBR palette. Static meshes merge by material, with separate material batches retained under each selectable node. These nodes contain visible surfaces, not invisible proxy targets. This modest scene uses merge/reuse rather than runtime instancing to keep export and selection straightforward. There is no hidden source `.blend` or asset-generation service.

`scripts/generate-pittsburgh-model.js` exports glTF 2 binary and per-group metrics. It rejects exports exceeding the brief's size, triangle or material-batch ceilings. It uses the existing locked Three.js dependency and a small Node Blob/FileReader adapter. Regeneration is deterministic for identical source and dependency versions.

## Measured budget

| Measure                                  |        Exported hero |                  Brief ceiling |
| ---------------------------------------- | -------------------: | -----------------------------: |
| GLB bytes                                | 2,192,436 (2.09 MiB) |                          8 MiB |
| Geometry triangles                       |               30,152 |                        100,000 |
| Material batches / main-pass asset draws |                   32 |                             50 |
| Shared PBR materials                     |                   12 |   Shared inexpensive materials |
| Textures / external resources            |                0 / 0 | Embedded or explicitly tracked |
| Base footprint                           |  44 × 34 scene units |    Existing tabletop preserved |

The machine-readable authority is [`public/models/pittsburgh-1892.metrics.json`](../../public/models/pittsburgh-1892.metrics.json). Asset draws exclude renderer shadows, markers and UI. Total draw calls and frame timing belong to #11 verification; these export numbers are not an FPS claim. No Draco, Meshopt, KTX2, texture download or decoder is required. A texture atlas is deliberately unnecessary: the shared texture-free PBR palette avoids unique image memory for repeated buildings. Add an atlas only after a demonstrated visual need and budget review.

| Exact GLB node                 | Fixed position   | Triangles | Batches |
| ------------------------------ | ---------------- | --------: | ------: |
| `furnace`                      | `[-13, 2.5, -4]` |     2,384 |       3 |
| `stack`                        | `[-8, 4, -6]`    |     4,440 |       3 |
| `rail-car`                     | `[-7, 1, 0]`     |     1,448 |       4 |
| `warehouse`                    | `[5, 2, -8]`     |     1,076 |       6 |
| `bridge`                       | `[7, 1, 9]`      |     1,416 |       4 |
| `environment` (not selectable) | `[0, 0, 0]`      |    19,388 |      12 |

The five selectable nodes are distinct, nonnested groups with Mesh descendants. Y is up; one unit follows the meter convention within the deliberately compressed composition. Their origins match current data exactly; detailed geometry extends around those origins. Existing object/POI IDs and camera presets are unchanged. Keep all existing fallback primitives. Integration switches the model URL to `/models/pittsburgh-1892.glb` using the #6 contract and verifies both model/fallback paths.

## Visual review and integration

The exported GLB was loaded in Chromium on this macOS host and all four current cameras rendered at 1500 × 1000. Overview separates industrial verticals, city mass and river. The mill frames the furnace/stack/wagon; downtown keeps the warehouse facade visible; the bridge view reveals water through its open trusses. No page errors or missing resources appeared. These authoring checks do not replace production UI, highlight, narration, responsive layout and repeated-transition acceptance tests.

Astra's integration review accepted the #7 composition/budgets and reviewed the overview/mill renders in this task. Human Content and Core Experience signoff remains pending and must not be presented as obtained. Root integration owns production desktop/mobile screenshots, all five selection/highlight checks and regression verification. Camera changes belong in world data with its owner's review; the authoring preview consumes the same presets.

## Provenance and license notes

The generator, SVG brief and generated geometry are original project work created for this repository. No third-party model, texture, reference-image pixels, traced footprint, company logo or marketplace asset is included. Historical links support limited contextual claims and are not bundled runtime resources. This GLB introduces no third-party asset attribution obligations. Three.js remains covered by its existing dependency license. This note does not change the repository's licensing terms or grant a new license to its original assets.
