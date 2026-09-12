# Hero and atmosphere before quality optimization

Frozen production build: `2e65716`, served from the preserved `4dtraveler-before-quality-dist` snapshot on port 4181. Measured on 2026-09-11 on the available Apple M3 laptop, Darwin 25.5.0, 8 logical cores, 16 GiB RAM. Chromium version and GPU details are recorded in each JSON. Runs were sequential with no competing browser regression workload.

| Run                                              | Observed GPU                  | Viewport  | Hero ready ms | Active RAF p50 / p95 ms | Peak draws / triangles |
| ------------------------------------------------ | ----------------------------- | --------- | ------------: | ----------------------: | ---------------------: |
| [Apple M3](apple-m3/desktop.json)                | ANGLE Metal, Apple M3, headed | 1440×1000 |          1511 |             16.7 / 17.6 |            66 / 60,754 |
| [Software desktop](software/desktop.json)        | SwiftShader, headless         | 1440×1000 |          1910 |           116.7 / 166.7 |            66 / 60,754 |
| [Software mobile viewport](software/mobile.json) | SwiftShader, headless         | 390×844   |          1563 |             66.6 / 83.3 |            66 / 60,754 |

The native laptop run meets the 45 FPS active-RAF scheduling proxy at p95; this is not a GPU timer or physical-mobile certification. All runs used emulated DPR 1 and the pre-quality scene settings (1024px shadow map and atmospheric motion). The `renderer.info` bridge was not mounted in this older build; those checks are explicitly unmeasured/review, while actual WebGL resource/draw instrumentation and GPU labels are present.

GPU handles plateaued across repeated entries and returned to zero after each leave in every run. Model loading made one completed request per entry. The first hero response transferred approximately 2.19 MB; subsequent requests used HTTP 304 revalidation (127 transferred bytes each). The GLB contains no texture images. Its exact raw/gzip-level-9/Brotli-quality-9 sizes are 2,192,436 / 210,934 / 174,502 bytes. No compressed transport was claimed for this pre-optimization build.

**Heap stability remains unresolved in this baseline.** Post-leave, forced-GC heap increased by 367,424 bytes across cycles 2–5 in the Apple M3 run, exceeding the fixed 256 KiB observation tolerance. The software runs also flagged growth. GPU and backing-storage counts stayed stable, but those facts do not prove that JavaScript references are released. The profiler retains only weak live GPU records and one bounded released-context summary. Follow-up heap graphs are needed to distinguish application retention from JavaScript engine/tooling caches; the failing checks are preserved rather than relaxed.

The [first default-headless attempt](headless-default/desktop.json) requested the default GPU but actually selected SwiftShader. Its failed/review flags and screenshots are preserved as diagnostic evidence. It predates the bounded released-context summary fix. Use the explicit Apple M3/software directories as the representative before runs, and inspect actual renderer labels when choosing the matching after trace.

Each run directory includes raw interval/draw traces, five cycle snapshots, network/cache journals, screenshots, a production file manifest with SHA-256 hashes and compression sizes, and a generated summary. The [main measurement procedure](../../../PERFORMANCE.md) defines the counters, tolerances and limitations.
