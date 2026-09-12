# Performance measurement

Recorded 2026-09-12T02:36:25.563Z. Source 2e65716; see each JSON for source status and exact environment. Production file hashes are in build-assets.json.

| Viewport | Run / observed renderer                                                                                   | Hero readiness ms | Active frame p50 ms | Active frame p95 ms | Peak submitted draws | Peak submitted triangles |
| -------- | --------------------------------------------------------------------------------------------------------- | ----------------: | ------------------: | ------------------: | -------------------: | -----------------------: |
| desktop  | Baseline, Chromium SwiftShader (software GPU); viewport simulation, not physical-device certification     |              1558 |               33.30 |               50.00 |                   36 |                      704 |
| desktop  | Current, ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver) |              2656 |              116.70 |              166.60 |                   66 |                    60754 |

Baseline directory: /private/tmp/4dtraveler-pipeline/docs/evidence/performance/baseline. The checked-in default is historical Dummy v0 on SwiftShader. Confirm comparable scene, GPU, viewport, DPR and quality before interpreting any difference; hardware and software results are not an equivalent-device speedup comparison. Active RAF intervals are a scheduling proxy, not GPU timer-query duration. Mobile rows are viewport/touch emulation, never physical-device certification.

- **pass** (desktop) No uncaught page errors
- **pass** (desktop) Heavy model stays out of landing
- **review** (desktop) Actual renderer diagnostics available
- **pass** (desktop) Active interaction frames captured
- **pass** (desktop) World GPU handles released after each leave
- **pass** (desktop) Entered GPU handles plateau after warmup
- **fail** (desktop) Post-GC heap after leave is stable
- **pass** (desktop) One completed GLB request per model entry
- **pass** (desktop) Re-entry/reload cache behavior observed
- **not-measured** (desktop) Reload returns the same renderer allocation counts
- **pass** (desktop) No unexpected failed network requests
- **review** (desktop) Requested GPU backend matches observed renderer
- **not-measured** (desktop) Physical mobile FPS certification
- **not-measured** (desktop) Agreed laptop 45+ FPS target

Raw frame traces, per-cycle forced-GC heaps, resource/context generations, actual Three renderer.info, and HTTP/cache events are in the viewport JSON files.
