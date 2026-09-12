# World performance measurement

Owner: Workstream 1; issue #11. This procedure measures a production build with representative assets and effects. It does not change the app or build automatically. Run it while no other browser regression or GPU-heavy job is active, with a consistent power/thermal state and the same viewport, DPR and quality for comparisons.

## Reproduce

Build the desired revision and serve its output in a separate terminal. Record the source commit and retain a copy of `dist` before changing code if measuring before/after revisions. Run the profiler against that exact directory and URL:

```sh
npm run build
npm run preview -- --port 4174 --strictPort
```

```sh
PROFILE_URL=http://127.0.0.1:4174 \
PROFILE_DIST=dist \
PROFILE_BACKEND=software \
PROFILE_OUTPUT=docs/evidence/performance/after-software \
PROFILE_NOTE="Hero, atmosphere, auto quality; no concurrent browser jobs" \
node scripts/profile-world.mjs
```

For the native laptop GPU, request the browser default backend and verify the **observed** WebGL renderer and CDP GPU device in the generated JSON. A requested hardware backend may still fall back to software. On this Apple M3, the headless shell selected SwiftShader while headed Chromium reported the native ANGLE Metal renderer; always inspect the observed renderer. A mobile viewport on the laptop is not a physical phone measurement.

```sh
PROFILE_BACKEND=hardware \
PROFILE_VIEWPORTS=desktop \
PROFILE_QUALITY=high \
PROFILE_HEADED=1 \
PROFILE_OUTPUT=docs/evidence/performance/after-laptop \
node scripts/profile-world.mjs
```

`PROFILE_URL`, `PROFILE_DIST`, and `PROFILE_OUTPUT` can point at isolated previews/build snapshots. `PROFILE_REPO` identifies the source repository when profiling from another directory. `PROFILE_BASELINE` chooses the comparison directory. `PROFILE_DPR` defaults to 1 to match the historical measurement; use 2 deliberately for a Retina/mobile stress run and record that difference. `PROFILE_ERA` defaults to 1892. `PROFILE_MODEL_EXPECTED=0` is only for the original primitive baseline. `PROFILE_QUALITY` accepts auto, low, medium and high using the accessible **Scene quality** control. For a frozen build, set `PROFILE_REVISION` to its exact commit; the report separately records the moving checkout revision/status. `PROFILE_HEAP_SNAPSHOTS=1` captures post-leave heap graphs at cycles 2 and 5 for retention diagnosis. These large `.heapsnapshot` files stay in a local temporary output directory and should not be committed. Compare node counts, retained paths and code/cache growth before attributing a heap increase to world objects. Run `node scripts/profile-world.mjs --help` for all options.

Mount `SceneDiagnostics` inside the world Canvas. The script appends `?profile=1`; only that query enables the canvas's read-only `__worldRendererInfo()` snapshot function. Its effect removes the function on unmount. It returns numeric copies of Three.js memory/render/program counts and effective DPR; it exposes no scene objects or mutable renderer. This is diagnostic data with no user-facing UI.

The script takes approximately one minute per viewport. It creates fresh browser contexts for cold entry, then visits three POIs, selects the furnace, leaves/re-enters five times, forces V8 GC for both the left and entered states, and finally reloads the page and re-enters. It saves overview/selection screenshots, raw frame traces, every cycle's renderer/heap/resource samples, HTTP/cache events, production asset hashes, and a generated comparison table. Re-entry keeps the HTTP cache enabled; the initial browser context starts fresh.

## Meaning of the measurements

| Measurement                  | What is measured                                                                                                                            | Important limit                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Primitive visibility         | Time from era click to a usable POI marker                                                                                                  | The fallback may appear before the hero                                                                     |
| Hero readiness               | Model ready status followed by two animation frames                                                                                         | Browser readiness proxy, not a GPU completion fence; failure aborts profiling                               |
| JS/model/texture/audio sizes | Every production file's raw bytes, gzip level-9 / Brotli quality-9 compressed bytes and SHA-256; observed landing/world requests separately | Compressed file sizes do not assert the server sends that encoding                                          |
| HTTP delivery                | Resource Timing encoded/decoded/transfer bytes plus CDP request completion, headers and cache/revalidation events                           | Warm cache and HTTP 304 can have small or zero payload transfers; audio may be only partially fetched       |
| Frame p50/p95                | RAF intervals during which WebGL draws were submitted, across overview and POI transitions                                                  | Scheduling proxy, not a GPU timer query or certified presented FPS; idle demand-loop intervals are excluded |
| Draw calls/triangles         | Actual WebGL draw submissions including instancing, shadow and effect passes                                                                | These differ from the GLB's material/geometry count                                                         |
| Three renderer info          | Current `gl.info.memory`, `gl.info.render`, program count and effective DPR                                                                 | Last renderer frame, not aggregate GPU memory bytes                                                         |
| GPU lifecycle                | Live Buffer/Texture/Program/Framebuffer/Renderbuffer/VertexArray/Shader handles, by context generation                                      | Logical API handles, not driver-resident byte allocations                                                   |
| Texture dimensions           | Maximum observed texture allocation dimensions including shadows                                                                            | Not a decoded texture-memory byte estimate                                                                  |
| Heap                         | V8 `Runtime.getHeapUsage` immediately after `HeapProfiler.collectGarbage`                                                                   | JS/available embedder heap, not complete browser/GPU process memory                                         |

Instrumentation retains WebGL contexts through `WeakRef` and resource handles through `WeakSet`. Strong references would create the leak being measured. Context loss releases the current generation's counts even if WebGL delete methods are not called; restoration starts a fresh generation. Collected contexts are explicitly labeled. The report records loss events, total context generations and only the most recent released context as plain numbers/strings; live records are weak, and released metadata is bounded so the profiler does not grow its own history each cycle. Each saved cycle preserves that point-in-time evidence, making a reset distinguishable from unexplained disappearance. It does not claim precise GPU residency after a driver releases a context.

## Checks and review rules

The process exits **0** when measured checks pass, **1** for a failed check or aborted run, and **2** when evidence needs review. `not-measured` is explicit and never converted into a passing certification.

- Models must stay out of landing requests. A model run must reach `ready`, and at least 30 active interaction frames must be captured. Page errors and unexpected network failures fail the run.
- Every leave must return live GPU handle counts to the pre-world baseline after a 1.2-second cleanup wait and up to 5 seconds for asynchronous disposal. A lost/collected context releases that context's handles; it is not counted as a leak. Identical entered states in cycles 2–5 must have exactly the same handle counts. A mismatch must be investigated; the tolerance is zero.
- Every model entry must complete exactly one GLB request. Aborted requests are recorded separately. Re-entry/reload should show actual disk/memory-cache service or HTTP 304 validation; if every repeat delivers a full response, the script requests review of server caching. The same URL alone does not prove a cache hit.
- Post-leave, post-GC heap in cycles 2–5 is checked after excluding the first warmup. A strictly increasing sequence requires review even below the observation tolerance. Monotonic growth exceeding **256 KiB or 2% of the first steady sample**, whichever is larger, fails. Larger nonmonotonic spread also requires review. This tolerance allows snapshot/scheduler bookkeeping noise; it does not grant permission for sustained leaks or get raised to make a run pass. Report entered heap as well, but diagnose world retention from post-leave heap.
- Reloaded Three.js allocation counts should match initial entry. A mismatch is a review item because shader warmup/quality transitions can legitimately differ; inspect the snapshots and rendered state.
- A desktop run on an observed hardware GPU compares active-frame p95 with 22.22 ms (the 45 FPS target). Software rendering is reference evidence only. Physical-mobile 30 FPS certification remains unmeasured until tested on a representative device; viewport emulation cannot satisfy it.

Keep every failed/review check and explain the disposition in the PR. If a finding is measurement error, fix the instrumentation and capture a new trace. Do not replace unfavorable measurements with an unrecorded claim of success.

## Historical baseline and comparison

The checked-in [baseline evidence](evidence/performance/baseline/README.md) is the original Dummy v0 at `d0521b8`, recorded on 2026-09-11 with SwiftShader. It contains genuine application traces and screenshots from the earlier profiler, but lacks its exact browser/OS version, build file manifest and read-only renderer snapshots.

| Historical viewport     | Readiness ms | Active p50 ms | Active p95 ms | Peak draws | Peak triangles |
| ----------------------- | -----------: | ------------: | ------------: | ---------: | -------------: |
| Desktop 1440×1000       |         1558 |         33.30 |         50.00 |         36 |            704 |
| Mobile viewport 390×844 |          845 |         16.70 |         33.40 |         36 |            704 |

The hero scene is more complex than Dummy v0. This baseline documents that change; it is not an equivalent-scene optimization comparison. Capture another **before** run after representative hero assets and atmosphere exist, before quality/chunking changes. Capture **after** with the same observed GPU, dimensions, DPR, quality and power conditions. Do not call an Apple-GPU result a speedup over SwiftShader. Use `PROFILE_BASELINE` to point the generated summary at the correct comparable directory; inspect provenance before interpreting differences.

Representative [hero-plus-atmosphere before evidence](evidence/performance/before/README.md) is now preserved, including Apple M3 Metal and explicit SwiftShader runs. No after measurements are included yet. Run them against the integrated optimized build, then attach the generated table, raw JSON and screenshots to the performance PR. If the agreed laptop or physical mobile is unavailable, mark those acceptance checks unverified explicitly.

## Cache and compression configuration

The integrated loader may use `fetch(..., { cache: 'force-cache' })` to reuse response bytes while parsing and GPU resources remain owned and disposed by each world mount. Each model URL must carry a content version, such as `?v=<GLB-SHA-prefix>`, and that version must change when regenerated GLB bytes change. Preserve the full versioned URL in request evidence. Unversioned force-cache URLs risk stale assets. The profiler records full URLs, cache events and actual transfer bytes for every re-entry and reload.

`node scripts/asset-budgets.mjs dist` reports raw, gzip and Brotli sizes for every production asset and per-category totals. Those are actual compressor outputs at level/quality 9, separate from measured HTTP bytes. A hero authored with zero texture files and shared material batches may already be compact enough without Draco/Meshopt/KTX2 decoders; justify decoder dependencies using the measured download/parse/frame results rather than adding them by default. Check the actual server Content-Encoding and cache headers before claiming compressed delivery.

The profiler classifies both `.glb` and `.glb.gz` as model payloads. If the server transparently applies `Content-Encoding: gzip`, Resource Timing decoded bytes can already be the plain GLB size; if it serves the gzip sidecar as a binary file, JavaScript decompression happens outside those network counters. Request journals retain actual Content-Encoding/Content-Type so these cases are not confused.
