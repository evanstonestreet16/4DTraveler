# Rome / 125 CE asset delivery

## Offline image delivery after P2

Rome now uses an authored overview still and true equirectangular panoramas for all three POIs. Original runtime GLBs remain unchanged as the migration baseline. The checked-in `.blend` sources now contain the render-only material, architecture, civic-figure, foliage and lighting pass; `build_rome.py` can still rebuild the original blockouts separately.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/scripts/render_rome.py -- --scene panoramas
python3 blender/scripts/package_rome_renders.py --panoramas-only
```

The renderer requires Blender 5.2 (tested 5.2.1), uses Cycles with Metal when available and CPU otherwise, and has no downloaded asset dependencies. Packaging requires Python 3 with Pillow and NumPy. `--scene overview`, a POI ID, or `panoramas` limits rendering; `--preview` makes smaller review renders without replacing the canonical `.blend` files. Generated PNGs and cardinal-review contact sheets stay in the ignored `blender/source/rome-125/renders/` directory. Runtime WebPs and the compact provenance/budget manifest are in `public/images/rome-125/`.

For independent POI updates, render with `--scene panoramas` and package with `python3 blender/scripts/package_rome_renders.py --panoramas-only`. This preserves the delivered overview images and `manifest.overview` metadata.

The visual pass adds stone grain and roof tiles, stone edge bevels, portico coffers and projecting ornament, a refined equestrian silhouette, sparse figures for scale, and construction bracing. The aerial uses varied courtyard/terrace/insula families, articulated palace courts, green slopes and atmospheric depth. The result remains an interpretive reconstruction; exact ornament, materials, people, urban fabric and construction staging require specialist review, and photographic realism is still an outstanding quality target.

The atmosphere/detail pass uses two checked-in AI art inputs: a Mediterranean sky panorama and a generic travertine color texture. Both were generated with Codex's built-in image tool; [source files and full prompts](../../blender/assets/rome-125/ai/README.md) document their scope. The sky is an LDR background, with physical sky lighting retained in Blender. Generated texture detail supplies surface appearance rather than historical architecture. The runtime receives the final rendered WebPs and makes no AI service calls. `manifest.aiInputs` records roles, source paths and SHA-256 hashes separately from link-only historical research references.

The upgraded overview is 1586 × 992 on desktop and a separately composed 954 × 1649 portrait image on mobile. It combines a denser editable Blender layout with illustrative AI image enhancement, using Kyoto's delivered overview as the detail/finish reference. The portrait source camera looks from the southeast to spread the landmark axis vertically through a narrow cover crop. `manifest.overview.cameras` and `sourceProjectedMarkers` record the retained Blender layout; `markers` records reviewed positions on the finished images, including forecourt anchors that keep the Pantheon label clear of the phone navigation panel. World coordinates, stable IDs and POI cameras are unchanged. The runtime applies the same responsive cover transform to image and markers.

The overview-specific authoring and packaging commands are:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/scripts/render_rome_overview_detail.py
python3 blender/scripts/package_rome_overview_detail.py
```

The first command rebuilds the editable overview layout and base renders. The second compresses the selected `blender/source/rome-125/overview-detail-{desktop,mobile}.png` illustrations into `blender/source/rome-125/renders/overview-detail/`, with `overview.delivery.json` ready to merge into `manifest.overview`. The integration owner copies the three staged WebPs to `public/images/rome-125/` and replaces only that manifest section. The final illustrated details are not fully represented by the Blender meshes; [exact built-in image-generation prompts](../../blender/source/rome-125/overview-detail-prompts.json) and both selected PNGs preserve that part of the workflow. Use `package_rome_renders.py --panoramas-only` for independent POI delivery so it preserves the upgraded overview.

Overview validation (2026-09-12): desktop/mobile/fallback WebPs are 734,218 / 677,850 / 381,334 bytes. Build/typecheck and the focused overview hash/budget/marker test passed, followed by desktop all-nine-object and portrait navigation smoke tests. Browser review checked desktop and phone composition and moved the phone Pantheon marker clear of navigation. The editable source is 86 MiB; final image detail comes from the retained illustrations rather than shipping this geometry to the browser.

Every desktop panorama is 6144 × 3072; mobile variants are 4096 × 2048 to retain surface detail in tall portrait views. The 4K sphere uses about 32 MiB of decoded RGBA pixels before GPU overhead; only one panorama is retained, and compressed still recovery remains available. The nine exact object IDs retain their plan order. Source eyes and initial targets are unchanged. Panorama center is geographic north (`-Z`), positive yaw turns west (`-X`), positive pitch looks up, and angles are radians. For a camera-relative anchor `(dx, dy, dz)`, yaw is `atan2(-dx, -dz)` and pitch is `atan2(dy, hypot(dx, dz))`; its image coordinate is `(0.5 - yaw / 2π, 0.5 - pitch / π)`. The manifest records the underlying camera-relative inputs and final angles. The Basilica hotspot uses an off-center visible façade anchor to remain separate from the equestrian statue on phones.

The packager checks the actual encoded budgets: overview ≤1.5 MB, each desktop panorama ≤6 MB, each mobile panorama ≤3 MB, and every still fallback ≤0.5 MB. It writes actual dimensions, byte counts and SHA-256 versions for every image. Compressed first-view fallback stills are generated from the same panorama. Cardinal contact sheets and seam measurements are projected from the encoded desktop pixels, not from a separate review camera.

For the actual browser review after starting a production preview:

```sh
node scripts/review-rome.mjs http://127.0.0.1:4173 /tmp/rome-review forum-trajan
```

Repeat with `pantheon-forecourt` and `colosseum-valley`. Check north/east/south/west closure, initial object anchors, portrait marker separation and return to overview. The offline pass preserves the opaque Basilica/Column relationship, stepped ancient Pantheon approach without the modern fountain or obelisk, intact amphitheatre, absent Arch of Constantine and visibly unfinished temple works. A continuous distant valley backdrop closes a southeast gap previously concealed by runtime fog.

## Original P0–P2 GLB delivery

P0 is an agreed integration change across the four workstreams in AGENTS.md. The three feature owners agreed the additive contract before implementation: `ScenePresentation`, optional `scene.presentation = 'immersive-city'`, optional per-POI `immersive` set and radian look limits, `preview`, camera `near`/`far`, and object `sources`/`confidence`. Existing `HistoricalWorld`, Pittsburgh IDs, scene/content split and camera behavior remain supported.

## Rebuild

Use Blender 5.2 (tested 5.2.1) offline:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/scripts/build_rome.py -- --scene all
```

On other machines replace the executable path with `blender`. `--scene overview`, `forum-trajan`, `pantheon-forecourt` or `colosseum-valley` rebuilds one set. `--render` also produces an optional Blender camera review PNG beside the source. Source `.blend` files are saved before GLB export. The browser consumes only checked-in, self-contained GLBs from `public/models/rome-125/`. There are no downloaded meshes, textures, runtime Blender calls or new frontend dependencies. Meshes are merged by material within selectable parent groups; selection uses visible geometry only.

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

## P2 Flavian Amphitheatre valley

P2 follows the working Pantheon mesh-selection path. Its self-contained GLB is 3,830,044 bytes, 72,256 triangles and 28 material batches, with no textures or external resources. Original Blender source and the shared procedural kit produce an intact 188 × 156 m amphitheatre with three open arcaded storeys and an attic, a Meta Sudans fountain, and a visibly unfinished Temple of Venus and Roma worksite. The worksite's exact construction stage is interpretive; the Arch of Constantine is absent. Palatine scenery and urban blocks enclose the remaining directions. The fixed eye remains `[0, 1.65, 0]`, initially looking east toward `[80, 18, 0]`.

Three exact selectable groups have sourced notes, confidence statements and matching fallback primitives. The original 24-second construction/water loop is generated by `scripts/generate-rome-ambience.py`; it has no external samples or speech and starts only after Play ambience. Leaving the valley pauses and releases its playback session. A transcript remains available independently. See the [content and audio review](ROME_125_CONTENT_REVIEW.md) for evidence and provenance.

Selection now stops at the nearest visible surface, including scenery without metadata, and updates hover while moving between meshes within one GLB. This prevents inspecting hidden objects through walls. Browser coverage checks the actual arcade raycast, all nine object paths, repeated three-POI transitions, low-detail recovery, ambience play/pause/error/retry/exit, and mobile control reachability. Cardinal and responsive screenshots are stored in `docs/evidence/rome-p2/`.
