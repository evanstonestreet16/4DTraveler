# Performance measurement

Recorded 2026-09-12T02:51:35.908Z. Source c87afe3; see each JSON for source status and exact environment. Production file hashes are in build-assets.json.

| Viewport | Run / observed renderer                                                                                    | Hero readiness ms | Active frame p50 ms | Active frame p95 ms | Peak submitted draws | Peak submitted triangles |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------: | ------------------: | ------------------: | -------------------: | -----------------------: |
| desktop  | Baseline, ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver) |              1910 |              116.70 |              166.70 |                   66 |                    60754 |
| desktop  | Current, ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)  |              2034 |               33.30 |               83.30 |                   32 |                    30152 |
| mobile   | Baseline, ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver) |              1563 |               66.60 |               83.30 |                   66 |                    60754 |
| mobile   | Current, ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)  |               874 |               16.70 |               33.40 |                   32 |                    30152 |

Baseline directory: /private/tmp/4dtraveler-pipeline/docs/evidence/performance/before/software. The checked-in default is historical Dummy v0 on SwiftShader. Confirm comparable scene, GPU, viewport, DPR and quality before interpreting any difference; hardware and software results are not an equivalent-device speedup comparison. Active RAF intervals are a scheduling proxy, not GPU timer-query duration. Mobile rows are viewport/touch emulation, never physical-device certification.

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
- **not-measured** (desktop) Agreed laptop 45+ FPS target
- **pass** (mobile) No uncaught page errors
- **pass** (mobile) Heavy model stays out of landing
- **pass** (mobile) Actual renderer diagnostics available
- **pass** (mobile) Active interaction frames captured
- **pass** (mobile) World GPU handles released after each leave
- **pass** (mobile) Entered GPU handles plateau after warmup
- **fail** (mobile) Post-GC heap after leave is stable
- **pass** (mobile) One completed GLB request per model entry
- **pass** (mobile) Re-entry/reload cache behavior observed
- **pass** (mobile) Reload returns the same renderer allocation counts
- **pass** (mobile) No unexpected failed network requests
- **pass** (mobile) Requested GPU backend matches observed renderer
- **not-measured** (mobile) Physical mobile FPS certification
- **not-measured** (mobile) Agreed laptop 45+ FPS target

Raw frame traces, per-cycle forced-GC heaps, resource/context generations, actual Three renderer.info, and HTTP/cache events are in the viewport JSON files.
