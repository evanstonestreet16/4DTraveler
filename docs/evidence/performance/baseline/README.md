# Original Dummy v0 performance evidence

Source: `d0521b8` (the merged Dummy v0 on `origin/main`). Captured 2026-09-11 by the integration owner using Chromium SwiftShader, before the GLB/hero/atmosphere work. Desktop is 1440×1000; mobile is a 390×844 viewport with touch emulation, not a physical mobile device.

The JSON files and screenshots are preserved unchanged from the original measurement. JSON contains raw RAF interval/draw traces and five enter/leave samples. It predates schema v2 of `scripts/profile-world.mjs`; exact browser version, OS/GPU device details, per-file production hashes and renderer.info snapshots were not recorded. Its resource `bytes` field was `PerformanceResourceTiming.encodedBodySize`, not an independently measured gzip estimate. Its readiness definition predates explicit model-ready status because this scene had no GLB.

This is historical evidence, not the equivalent-scene optimization baseline. Desktop p95 was 50 ms; mobile viewport p95 was 33.4 ms. Live Buffer/Texture/Program counts returned to zero after every leave. Entered heap rose from 7,023,160 to 7,492,340 bytes on desktop and 7,180,044 to 7,553,140 bytes on mobile across the five samples. Those old entered-heap observations alone do not demonstrate post-leave retention; the new profiler measures forced-GC heap in both states and flags trends explicitly.

Use [the measurement procedure](../../../PERFORMANCE.md) for new representative before/after runs. Do not reinterpret these software-GPU traces as laptop hardware or physical-mobile certification.
