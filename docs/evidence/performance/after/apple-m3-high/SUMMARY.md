# Performance measurement

Recorded 2026-09-12T02:47:50.710Z. Source c87afe3; see each JSON for source status and exact environment. Production file hashes are in build-assets.json.

| Viewport | Run / observed renderer                                                      | Hero readiness ms | Active frame p50 ms | Active frame p95 ms | Peak submitted draws | Peak submitted triangles |
| -------- | ---------------------------------------------------------------------------- | ----------------: | ------------------: | ------------------: | -------------------: | -----------------------: |
| desktop  | Baseline, ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version) |              1511 |               16.70 |               17.60 |                   66 |                    60754 |
| desktop  | Current, ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)  |               883 |               16.70 |               17.60 |                   66 |                    60754 |

Baseline directory: /private/tmp/4dtraveler-pipeline/docs/evidence/performance/before/apple-m3. The checked-in default is historical Dummy v0 on SwiftShader. Confirm comparable scene, GPU, viewport, DPR and quality before interpreting any difference; hardware and software results are not an equivalent-device speedup comparison. Active RAF intervals are a scheduling proxy, not GPU timer-query duration. Mobile rows are viewport/touch emulation, never physical-device certification.

- **pass** (desktop) No uncaught page errors
- **pass** (desktop) Heavy model stays out of landing
- **pass** (desktop) Actual renderer diagnostics available
- **pass** (desktop) Active interaction frames captured
- **pass** (desktop) World GPU handles released after each leave
- **pass** (desktop) Entered GPU handles plateau after warmup
- **fail** (desktop) Post-GC heap after leave is stable
- **pass** (desktop) One completed GLB request per model entry
- **pass** (desktop) Re-entry/reload cache behavior observed
- **pass** (desktop) Reload returns the same renderer allocation counts
- **pass** (desktop) No unexpected failed network requests
- **pass** (desktop) Requested GPU backend matches observed renderer
- **not-measured** (desktop) Physical mobile FPS certification
- **pass** (desktop) Agreed laptop 45+ FPS target

Raw frame traces, per-cycle forced-GC heaps, resource/context generations, actual Three renderer.info, and HTTP/cache events are in the viewport JSON files.
