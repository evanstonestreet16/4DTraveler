# Kyoto circa 1700 asset delivery

Kyoto provides a desktop/portrait overview, three fixed-position 4096×2048 panoramas, nine sourced objects, four narration transcripts, and still-image recovery. The original Blender scenes remain editable; the browser loads compressed images and has no Blender or AI-service dependency.

## Source and delivery

- `blender/source/kyoto-1700/*.blend`: original overview, Nijō, Kiyomizu and Nishiki scenes, with metric cameras and named object anchors.
- `blender/scripts/render_kyoto.py` and `lib/kyoto_kit.py`: repeatable geometry, materials, lighting and Cycles rendering. Only generic batched mesh primitives are reused from the existing kit.
- `blender/source/kyoto-1700/overview-illustration.png` and `overview-mobile-illustration.png`: built-in ImageGen overview illustrations based on the original Blender layouts. The intermediate portrait reference and [prompts](../../blender/references/kyoto-1700/overview-prompts.json) are retained. These illustrations are not surveyed maps; their pixel markers were placed against the delivered imagery.
- `public/images/kyoto-1700/manifest.json`: encoded dimensions, content hashes, byte counts, panorama hotspot angles and anchors. Desktop panoramas are 4K; mobile variants are 2048×1024. Every image is below its plan budget.
- `src/data/worlds/kyoto-1700.scene.ts`, `.content.ts`, and `.ts`: geography, historical content, and composition. All three POI IDs and nine object/scene IDs match the plan.

Rebuild the Blender images from the repository root (set `BLENDER_BIN` to your installed executable):

```sh
BLENDER_BIN=/Applications/Blender.app/Contents/MacOS/Blender
"$BLENDER_BIN" --background --python blender/scripts/render_kyoto.py -- --scene overview
"$BLENDER_BIN" --background --python blender/scripts/render_kyoto.py -- --scene nijo-ninomaru
"$BLENDER_BIN" --background --python blender/scripts/render_kyoto.py -- --scene kiyomizu-hillside
"$BLENDER_BIN" --background --python blender/scripts/render_kyoto.py -- --scene nishiki-fish-market
python3 blender/scripts/package_kyoto_renders.py
```

Packaging requires Pillow and NumPy. It uses the checked-in overview illustrations when both are present, otherwise the original Blender overview renders. Raw render PNGs and cardinal contact sheets are local review outputs, excluded from version control. Regeneration of ImageGen illustrations is a separate authoring action; normal packaging never calls a service. If illustration composition changes, update `overview-illustration.markers.json` and check the browser markers before packaging.

Coordinates are metres with +X east, +Y up, +Z south. The overview camera was refined to `[-2800, 2200, 3800]`, looking toward `[1400, 100, 700]`. Nijō is the geographic origin. Separate POV cameras and hotspot angles use local coordinates; panorama center faces north, positive yaw west, and positive pitch up. The [reference notes](../../blender/references/kyoto-1700/README.md) record geospatial support, dimensions, licensing, and reconstruction limits.

## Historical and visual limits

The overview retains a five-story Nijō keep and inferred original Honmaru massing. Kiyomizu excludes the 1735 Zuigu-do. Nishiki is an open-sky street with illustrative stalls, fish, clothing, and a groundwater mechanism. Fine architectural proportions, ornament, finishes and landscape are interpretive. The overview illustrations are richer than the deliberately simplified, original Blender POI geometry. See the [content review](KYOTO_1700_CONTENT_REVIEW.md) for claim-level evidence.

Narration ships as readable transcripts. Recorded voices remain deferred pending pronunciation review. No track autoplays. Failed images and WebGL retain object information and return/retry controls; successful return unmounts the active panorama texture. Prefetch warms compressed bytes only after the overview is interactive.

## Verification

Nijō was reviewed in four directions in the browser before Kiyomizu authoring. Kiyomizu’s hotspot-to-content path worked before Nishiki authoring. Each delivered panorama has cardinal projections for visual review. Desktop and narrow-phone flows cover selection, content, transcript, return, touch/keyboard look, image retry, and lost-WebGL recovery. Run the focused Kyoto tests plus typecheck and production build; a phone-sized Chromium viewport does not certify a physical device.
