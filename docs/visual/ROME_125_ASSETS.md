# Rome / 125 CE asset delivery

P0 is an agreed integration change across the four workstreams in AGENTS.md. The three feature owners agreed the additive contract before implementation: `ScenePresentation`, optional `scene.presentation = 'immersive-city'`, optional per-POI `immersive` set and radian look limits, `preview`, camera `near`/`far`, and object `sources`/`confidence`. Existing `HistoricalWorld`, Pittsburgh IDs, scene/content split and camera behavior remain supported.

## Rebuild

Use Blender 5.2 (tested 5.2.1) offline:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/scripts/build_rome.py -- --scene all
```

On other machines replace the executable path with `blender`. `--scene overview` or `--scene forum-trajan` rebuilds one set. `--render` also produces an optional Blender camera review PNG beside the source. Source `.blend` files are saved before GLB export. The browser consumes only checked-in, self-contained GLBs from `public/models/rome-125/`. There are no downloaded meshes, textures, runtime Blender calls or new frontend dependencies. Meshes are merged by material within selectable parent groups; selection uses visible geometry only.

The generator authors in runtime metres (+X east, +Y up, +Z south), converts to Blender +Z-up using `(x, -z, y)`, then exports glTF Y-up. Overview origin is the Forum center; each POV has its own local coordinates and eye at 1.65 m. Camera presets live in `rome-125.scene.ts`. The overview uses a 10 m near plane to preserve depth precision at kilometre distances. POV and legacy scenes default to 0.1 m. Portrait overview fitting increases distance; POV resizing does not move the eye. Overview and POV cuts switch separate sets, with a selectable low-detail fallback during loading and after failure. Parsed model resources are disposed on set exit.

## References and reuse

This is original, stylized, procedural geometry. No photograph, reconstruction, scan, or commercial asset was copied. Colors, capital ornament, statue pose, paving layout, urban blocks, upper architecture and exact decorative placement are interpretations. The institutional links in the [Rome plan](../ROME_125_CITY_PLAN.md#13-evidence-confidence-and-reuse) and [content review](ROME_125_CONTENT_REVIEW.md) are link-only research references, with no redistribution rights assumed. Uffizi's plan and description guide the Forum's 110 × 86 m envelope and the Basilica/Column relationship. Fine elevation accuracy and exact decorative placement still require specialist review; this delivery does not claim a surveyed reconstruction.

## Budget and review

Per-export `*.metrics.json` files record a SHA-256 cache version, actual GLB bytes, triangles, material batches, bounds and group names. Tests independently load every shipped set, check these ceilings, validate exact visible selectable node names, and check matching fallback objects. P0 overview is approximately 3.3 MB / 60k triangles / 12 batches; Forum is 3.5 MB / 68,464 triangles / 30 batches. Both use zero textures. No texture atlas is needed for this deliberately stylized material palette.

The Forum north/east/south/west views were inspected in the actual browser before work began on P1. Its basilica is opaque; the Column appears only in the overview behind it. Porticoes and urban closure hide boundaries; pitch is clamped and paving remains complete. Large-scale overview shadows are disabled because a 2 km crop makes small shadow maps visibly alias; the POV uses shadows. The Tiber is a continuous ribbon. Unavailable stretch markers are explicit previews in P0.

P0 verification includes the Rome path twice, object highlight, source/confidence display, readable narration, fixed mouse/touch/keyboard look, portrait resize, unchanged overview return, WebGL context-loss recovery and failed-model fallback. Existing Pittsburgh narration playback/pause/replay and failed-audio retry are covered separately because Rome currently ships reviewed transcripts without recordings. Physical-phone and specialist historical certification are not inferred from browser tests.

## P1 Pantheon

P1 follows the completed Forum four-direction review. It adds a self-contained Pantheon forecourt GLB (2.53 MB, 48,844 triangles, 24 material batches) and matching Blender source, reviewed transcript, three exact selectable groups and fallbacks. The stepped approach, sixteen porch columns, original line-drawn Agrippa lettering, pediment, rotunda and dome are present; no modern fountain, obelisk or interior is included. Closed porticoes and urban scenery cover the other directions. The initially proposed eye was moved 10 m north to `[0, 1.65, -42]`, looking at `[0, 13, 0]`, after browser review showed the pediment outside the opening frame. Geometry remains at metre scale.

The shared [prefetch module](../MODEL_PREFETCH.md) waits until the overview is ready, then uses idle time for the first two available POV assets. It retains no parsed scenes or JavaScript byte buffers and has a cumulative 20 MB session budget. Preview POIs are skipped. Foreground failures still use normal fallback loading. `docs/evidence/rome-p1/` contains actual cardinal views and responsive checks; tests cover real inscription/column picking, all three object notes, the transcript, repeated Forum/Pantheon switches and failed-model recovery.
