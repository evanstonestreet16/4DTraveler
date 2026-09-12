# POI realism pipeline — cheap Blender proxies into AI streetviews

Rome / 125 CE. Supersedes nothing; extends the rendered-city milestone in
[ROME_125_CITY_PLAN.md](ROME_125_CITY_PLAN.md).

## The split

The bird's-eye overview keeps its current process: Blender-authored geometry from sourced dimensions, then a
constrained image edit for finish. That is the historically-sourced claim and it stays.

POI streetviews change. Blender stops trying to look good and becomes a **structure oracle** — fast, flat,
ugly, and correct. A generation model supplies everything Blender was slow at: material realism, wear,
atmosphere, people, vegetation.

| Layer                                              | Author            | Can a source contradict it? |
| -------------------------------------------------- | ----------------- | --------------------------- |
| What exists, where, how big, what year, what state | MongoDB → Blender | Yes. So it is authored.     |
| Surface finish, light, weather, crowds, foliage    | Generation model  | No. No source records it.   |
| Hotspot angles, object IDs, narration, citations   | Authored data     | Yes. Never generated.       |

The line for the pitch: _we don't use Blender because it's beautiful, we use it because it's consistent._

## Why Blender stays in the loop at all

Three functional reasons, none of which are about historical purity:

1. **Marker registration.** `src/utils/panorama.ts` places hotspots from `yaw`/`pitch` alone. If generation
   moves a building, the marker misses it. A conditioned base pins structure.
2. **Equirectangular consistency.** A 360° panorama must wrap at the seam, behave at the poles, and show the
   _same_ building from every angle. Text-to-image has no 3D model behind it and drifts as the user turns.
3. **Reproducibility.** A proxy is a deterministic function of scene data, so a claim change re-renders
   instead of being re-prompted.

The overview already proved the technique — see `blender/source/rome-125/overview-detail-prompts.json`, whose
prompt states the reason in its own words: _"These must remain in those places because interactive markers
are already mapped onto the image."_

## Track A — proxy render mode (Blender owner)

Add `--proxy` to `blender/scripts/render_rome.py`. It reuses the existing panorama camera path and the
existing `--preview` resolution; it skips everything expensive.

| Setting                            | Beauty path today                   | `--proxy`                                      |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Engine                             | Cycles, 40 samples, denoised        | EEVEE (or Cycles @ 4 samples)                  |
| Resolution                         | 6144 × 3072                         | 2048 × 1024                                    |
| `author_materials()`               | Full procedural + travertine + bump | Skipped — flat base colour per material        |
| `camera_sky()` AI sky              | On                                  | Skipped — flat grey environment                |
| `sculpted_tree()`, staffage detail | On                                  | Low-poly stand-ins, correct scale and position |
| Lighting                           | Physical Nishita sun                | Single flat sun, shadows on, no atmosphere     |

Emit per POI into `blender/renders/rome-125/<poi>/`: `proxy.png`, `depth.png`, `normal.png`, `ids.png`,
`proxy.json`. Depth and normal come from Cycles/EEVEE render passes; `ids.png` from per-entity flat emission
or a cryptomatte flattened to the colour map recorded in `proxy.json`.

Target: **under 60 seconds per POI**, so re-rendering after a data change is never a decision.

The contract and acceptance checks live in
[blender/renders/rome-125/README.md](../blender/renders/rome-125/README.md). A working reference
`proxy.json` is already committed at `blender/renders/rome-125/forum-trajan/proxy.json` so Track B can start
before the first real render lands.

## Track B — streetview generation (AI owner)

Consume `blender/renders/rome-125/<poi>/`. Do not read the Blender sources.

1. Load `proxy.png` as the img2img target and `depth.png` / `normal.png` as structural conditioning.
   Denoise strength high enough for photographic material, low enough that silhouettes hold — start ~0.5–0.65
   and tune per POI.
2. Use `proxy.json.prompt.positive` and `.negative` verbatim. They are generated, not hand-written; if a
   prompt is wrong, fix the data or the generator, not the string.
3. Run the acceptance checks in the handoff README: marker registration against `ids.png`, seam continuity,
   anachronism scan.
4. Package through `blender/scripts/package_rome_renders.py` so image hashes, `aiInputs` and provenance update
   together. Never hand-copy into `public/images/`.

If full-360 generation proves unstable, generate in overlapping yaw tiles against the same proxy and
composite — the proxy guarantees the tiles agree, which is the whole point of having it.

## Track C — MongoDB as the accuracy source

Mongo is the system of record for everything historical. It feeds Blender's geometry _and_ the prompt, which
is what makes the prompt defensible rather than decorative.

```
sources   { _id: 'rome-r1', institution, url, rightsStatus, fetchedAt, rawHash }
entities  { _id: 'basilica-ulpia', city, name, wikidataId, position,
            phases: [ { from, to, state: 'absent'|'under-construction'|'complete'|'ruined' } ] }
claims    { entityId, attribute: 'hall_length_m', value, unit,
            sourceId, excerpt, confidence: 'documented'|'inferred'|'illustrative' }
```

Two generated outputs, both committed so the build never needs a live database:

- **`rome-125.build.json`** → replaces the hardcoded literals in `rome_kit.py` / `build_rome.py`. Every
  dimension in the geometry then traces to a claim with a source and a confidence level.
- **`proxy.json.prompt`** → positive fragments from each in-frame entity's material/finish/state claims;
  **negative fragments from `entities where city = rome and inception > 125`**.

That negative query is the demo moment. The Arch of Constantine (315 CE) is excluded automatically — and
`docs/visual/ROME_125_CONTENT_REVIEW.md` already flags exactly that anachronism by hand today. Diffusion
models are heavily biased toward ruined, weathered, Hollywood Rome; 125 CE was painted, gilded and new.
Dated exclusions generated from the data are the defense.

Ingest for new cities: Wikidata SPARQL for coordinates, inception/dissolution dates and dimensions _with
their own references_, plus whitelisted institutional pages. Store the raw page hash so every claim is
reproducible.

## Sequencing

Track A and Track B are parallel because the contract is committed. First priority is Track A pushing **one**
proxy — even a bad one — to unblock Track B. Track C can land after both tracks are moving; until it does,
`proxy.json` is hand-authored from `rome-125.content.ts`, and nothing downstream changes when Mongo takes over
because the file shape is identical.

## What must be said accurately

- Geometry, placement, scale and date are sourced. Surface appearance and atmosphere are generated. The app
  discloses which is which per object via the existing `confidence` field.
- `historicalEvidence: false` stays in every generated render's metadata.
- `public/images/rome-125/manifest.json` currently still asserts _"no AI generated assets"_ and predates the
  AI pass. Re-run packaging before any demo that claims AI involvement.
