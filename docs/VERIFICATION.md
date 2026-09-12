# Dummy v0 verification

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
