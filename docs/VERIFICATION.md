# Verification

## 3D modeling integration · 2026-09-11

The `codex/3d-modeling` integration covers issues #5–#12 and includes the user-selected **1850 · Blockout**. The [integration runbook](3D_MODELING.md) links each scoped PR, measured evidence and owner review handoffs. The stack was updated from `main` at `875a841` before final verification.

Formatting, lint, strict typecheck, 21 unit tests, production build and all 21 Chromium browser tests pass. Asset tests validate all five hero mappings, material isolation, GLB/gzip integrity, content-version keys and failed/cancelled loading. The full 1892 world data matches the benchmark digest after shared geography extraction.

Browser coverage exercises actual hero and blockout mesh selection, gold highlights, all POIs, repeated camera transitions, narration play/pause, overview return, context recovery, slow/missing/compressed-model fallbacks, quality switching, native/CSS immersive presentation, keyboard focus, portrait/landscape layouts, reduced motion, and repeated 1850 ↔ 1892 transitions with selection/audio/resource reset. Screenshots were visually reviewed for composition, selection and readable desktop/mobile controls.

A final in-app browser walkthrough confirmed the 1892 overview, gold furnace and bridge selection, Steel Mill → Downtown → River / Bridge transitions, narration play/pause, immersive entry/Escape with preserved selection, return to overview, and the visibly distinct 1850 blockout with unavailable narration correctly disabled. The raycast regression now observes arrival at the authored camera target instead of assuming a fixed delay; it passed three repeated runs before the final full-suite pass.

Representative Apple M3 Metal High measurements report 17.6 ms active-frame p95 and 883 ms hero readiness, compared with 1511 ms before delivery optimization. The gzip model payload is 210,934 bytes and repeat visits transfer zero network bytes. GPU handles return to baseline after each leave; retained world-object counts stay flat. Total JavaScript heap grows during the normal-browser warmup control, so a total-heap plateau is not claimed. A separate JIT-disabled control passes the unchanged heap check and verifies stable application allocations. See the [performance evidence](evidence/performance/after/README.md) for raw flags, exact measured revisions and investigation.

Physical-phone frame pacing, Safari/Firefox, display switching and named adjacent-owner approvals remain manual review handoffs. Historical framing is illustrative; 1850 remains explicitly labeled Blockout pending Content review. These limitations are also stated in the PRs.

## Historical Dummy v0 record

The following records the original milestone and its then-current limitations; it is retained for comparison.

Verified locally on macOS with Node 22.20.0, npm 10.9.3, Chromium, and the Codex in-app browser.

## Automated checks

- `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- `npm test`: 5 passing checks covering selection/reset behavior, invalid IDs, missing or mismatched worlds, world-data references, and camera viewport adjustment.
- `npm run test:e2e`: 4 passing browser tests against the production build at desktop (1440 × 1000) and mobile (390 × 844) sizes.
- `npm audit`: zero reported vulnerabilities at verification time.
- Both original planning documents were moved to `docs/` without changing their contents.

## Acceptance path

Browser tests select Pittsburgh and 1892, verify the three scene markers, move to the Steel Mill, and click the actual furnace, smokestack, and rail-car meshes through Three.js raycasting. Each selection shows the correct object description and significance. Tests also inspect the Downtown and River / Bridge objects, close the panel, return to overview, and re-enter the world with cleared selection and narration state.

Local narration play/pause/resume is verified against the media element's playback clock and paused state. A simulated 404 keeps exploration usable, displays an error, and recovers when the audio becomes available. A simulated WebGL context loss displays a retry view and recreates the scene. Narrow-screen tests check marker fit, absence of horizontal overflow, keyboard activation, rapid navigation, and reduced-motion behavior.

Manual visual inspection confirms primitive geometry, the bird's-eye composition, the smooth camera descent, gold highlighting on the selected furnace, readable desktop/mobile object panels, and working narration controls. The temporary WAV contains approximately 21 seconds of locally generated speech.

To reproduce: `npm ci`, `npm run build`, `npx playwright install chromium`, then `npm run test:e2e`. Failure screenshots and traces are written to ignored `test-results/`. A development preview starts with `npm run dev`.

## Deliberate limitations

- One illustrative Pittsburgh / 1892 scene. Geometry and short descriptions are placeholders, not a researched reconstruction.
- No API keys, database, remote assets, Blender, live AI, authentication, or deployment infrastructure.
- The lazy-loaded Three.js scene bundle triggers Vite's advisory 500 kB chunk warning (about 879 kB minified / 238 kB gzip). The landing page loads separately. Further asset/performance work belongs to the next milestone.
- Browser regression coverage targets Chromium; Safari/Firefox and physical mobile devices have not been verified.
