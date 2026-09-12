# Optimized world: measured results

Frozen production build `c87afe3`, served from `4dtraveler-after-quality-dist` on port 4182. Same Apple M3 machine, Chromium version, viewport dimensions and emulated DPR 1 as the representative before runs. Desktop canvas stayed 1022×570 CSS pixels in both builds. Runs were sequential without competing browser tests. The hardware run used headed Chromium and verified ANGLE Metal on Apple M3; software rows explicitly used SwiftShader.

| Run                                                  | Viewport        | Before hero ready ms | After hero ready ms | Before p50 / p95 ms | After p50 / p95 ms | After peak draws / triangles |
| ---------------------------------------------------- | --------------- | -------------------: | ------------------: | ------------------: | -----------------: | ---------------------------: |
| [Apple M3 High](apple-m3-high/desktop.json)          | Desktop         |                 1511 |                 883 |         16.7 / 17.6 |        16.7 / 17.6 |                  66 / 60,754 |
| [SwiftShader High](software-high/desktop.json)       | Desktop         |                 1910 |                2049 |       116.7 / 166.7 |      116.6 / 150.0 |                  66 / 60,754 |
| [SwiftShader High](software-high/mobile.json)        | Mobile viewport |                 1563 |                 999 |         66.6 / 83.3 |       50.0 / 100.0 |                  66 / 60,754 |
| [SwiftShader Auto → Low](software-auto/desktop.json) | Desktop         |                 1910 |                2034 |       116.7 / 166.7 |        33.3 / 83.3 |                  32 / 30,152 |
| [SwiftShader Auto → Low](software-auto/mobile.json)  | Mobile viewport |                 1563 |                 874 |         66.6 / 83.3 |        16.7 / 33.4 |                  32 / 30,152 |

These are representative single-run scheduling measurements, not statistical speedup guarantees. The Apple M3 High run remains within the 22.22 ms p95 budget corresponding to the 45 FPS target. Software High remains costly; Auto chooses Low, halves submitted drawing work, removes the continuous atmospheric draw loop, and preserves every selection-critical model node. Mobile viewport emulation is not physical-device certification; no physical phone FPS claim is made.

## Loading and delivery

The first hero response now used the content-versioned gzip URL, with **210,934 encoded payload bytes** instead of 2,192,436 raw model bytes. Resource Timing reported 2,192,436 decoded bytes and 211,234 transferred bytes including response overhead in the Apple M3 run. The preview server applied `Content-Encoding: gzip`, so the loader correctly recognized browser-decoded GLB bytes. Each entry completed one model request; every re-entry and reload reused the cache with **zero network transfer**, replacing the prior 127-byte HTTP 304 validations. The plain GLB remains available for browsers or requests that cannot use the compressed path.

Landing JavaScript remained separate: 205,102 decoded / 64,972 encoded bytes, with no model request before era selection. The heavy Three/world chunks and GLB arrived after selecting the era. Each run's `build-assets.json` reports all JS, model, image/texture, audio and other file sizes in raw/gzip/Brotli forms with SHA-256 hashes. Do not sum both the plain and compressed model files as a single entry's transfer; the request journal records the actual chosen payload.

## Renderer and resource lifecycle

All GPU-handle, re-entry, cache and renderer-allocation checks passed. Every leave returned live GPU handles to the pre-world baseline, and entered counts plateaued across all five cycles. High reported 34 geometries and one Three-managed texture (the shadow target), while Low reported 32 geometries and zero textures. The GLB itself contains no texture images. High's normal render reports 34 calls / 30,602 triangles; the instrumentation's 66 / 60,754 total includes the shadow pass. Low submits 32 calls / 30,152 triangles. These counters are logical API allocations and draw submissions, not GPU-resident memory bytes.

## Heap investigation

The original five-cycle raw post-GC heap check still flags growth and is preserved in each JSON. We did not widen its 256 KiB / 2% observation tolerance. To distinguish world retention from compilation warmup, the Apple M3 High run captured post-leave heap graphs at cycles 2 and 5. Large snapshots remain local; the compact [heap comparison](apple-m3-high/heap-comparison.json) is checked in.

| Heap category             | Cycle 2 → 5 change |
| ------------------------- | -----------------: |
| V8 code data              |     +348,524 bytes |
| InstructionStream subset  |     +233,216 bytes |
| TrustedByteArray subset   |      +52,504 bytes |
| Ordinary object self size |       +1,348 bytes |
| Closure count             |      9,527 → 9,527 |
| Mesh count                |              8 → 8 |
| BufferGeometry count      |              8 → 8 |
| Material count            |            12 → 12 |
| Texture count             |              8 → 8 |
| WebGLRenderer count       |              1 → 1 |
| Scene count               |              2 → 2 |
| Object3D count            |            22 → 22 |

An independent retainer-path inspection identified the new instruction streams as code owned by existing application closures (`equ`, `parse`, `Qs`, `lv`) in the existing world, Three and React bundles. Script count stayed 13 and BytecodeArray count stayed 1,789. Closure and retained Three object graphs did not grow; backing-storage bytes and GPU counters also stayed stable. This supports JIT/code-cache warmup as the source of the early heap rise rather than accumulating worlds. Raw growth flags remain part of the evidence; a separate identical-path warmup control checks total-heap behavior after further repeated visits.

## Identical-path warmup control

The additional [Apple M3 High warmup run](apple-m3-warmup/desktop.json) used `PROFILE_WARMUP_CYCLES=5`, followed by five measured cycles with the same navigation, frame recording, cleanup waits and forced GC. The first five cycles are retained separately under `warmupCycles`; no tolerance changed. The frame p95 remained 17.6 ms, and all GPU, renderer, model-request and cache checks passed.

| Measured cycle after five warmups | Post-leave forced-GC heap bytes |
| --------------------------------- | ------------------------------: |
| 1                                 |                       8,010,552 |
| 2                                 |                       8,107,500 |
| 3                                 |                       8,171,756 |
| 4                                 |                       8,545,876 |
| 5                                 |                       8,636,608 |

**Total heap did not plateau in this control.** The unchanged raw check flags +529,108 bytes over measured cycles 2–5. The earlier graphs prove stable retained world-object counts and attribute their dominant early growth to application JIT data, but they do not justify claiming a total-heap plateau after ten visits. This remains a documented measurement limitation/finding; all raw failure flags and the complete warmup trace are preserved. Physical mobile hardware also remains unmeasured.

The frozen measurements remain labeled `c87afe3`. A subsequent loading-progress correction prevents dividing browser-decoded bytes by an encoded Content-Length and adds decoded/native-gzip coverage; it does not change geometry, quality, camera positions, payload bytes or this frozen evidence.
