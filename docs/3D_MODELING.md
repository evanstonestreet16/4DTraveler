# 3D modeling integration and demo runbook

Workstream 1 · parent issue #5. `codex/3d-modeling` contains the complete integration. The PRs are stacked in roadmap order so every diff remains scoped to one issue. Merge from the bottom and retarget the next PR to `main` after each dependency lands. No PR requires an API key or Blender installation.

## PR stack

| Order | Issue | Pull request                                                   | Scope                                                                         |
| ----- | ----- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1     | #6    | [#13](https://github.com/evanstonestreet16/4DTraveler/pull/13) | Shared world/GLB contract, split scene/content, validated loader and fallback |
| 2     | #7    | [#14](https://github.com/evanstonestreet16/4DTraveler/pull/14) | Source-aware visual brief, blockout, fixed sightlines and asset budgets       |
| 3     | #8    | [#15](https://github.com/evanstonestreet16/4DTraveler/pull/15) | Original modular hero GLB, kit, five imported selectable objects              |
| 4     | #9    | [#16](https://github.com/evanstonestreet16/4DTraveler/pull/16) | Data-driven lighting, haze, smoke, water and ambient-audio authoring hooks    |
| 5     | #10   | [#17](https://github.com/evanstonestreet16/4DTraveler/pull/17) | Immersive renderer, native/CSS fullscreen, focus and responsive controls      |
| 6     | #11   | [#18](https://github.com/evanstonestreet16/4DTraveler/pull/18) | Quality tiers, gzip/cache, lazy chunks and measured resource evidence         |
| 7     | #12   | [#19](https://github.com/evanstonestreet16/4DTraveler/pull/19) | User-selected 1850 blockout and shared era layers                             |
| 8     | #5    | [#20](https://github.com/evanstonestreet16/4DTraveler/pull/20) | Roadmap handoff, current project status and final verification                |

The stack is open for review and has not been merged. GitHub resolves the `Fixes` issue links when changes reach the default branch. Merge dependencies in this listed order. Preserve each child PR's narrow diff when retargeting; verify that its dependency is on `main` first.

## Delivered path

Choose Pittsburgh → 1892 → overview → Steel Mill → select the actual furnace, stack or wagon → read information → play/pause narration → Downtown → River / Bridge → overview. Enter/exit immersive view from any selection; the same canvas and audio remain mounted. Repeat using keyboard and a portrait viewport. Choose era → 1850 to explore the clearly labeled blockout through the same renderer.

The 1892 model is an illustrative industrial composite. The visual brief distinguishes primary-source context from inferred and illustrative geometry; it does not claim a surveyed reconstruction of an identified works. 1850 remains a blockout pending Content review.

## Integration boundaries

Stable 1892 IDs, camera presets and narration are preserved. Scene layout and historical content live in separate data modules. Imported mesh groups map through `sceneObjectId`, camera movement stays in CameraController, effects and quality controls do not remove selectable geometry, and the primitive fallback is always available. Asset authoring scripts are offline tools and never run in the browser.

Content + Audio reviews historical framing and future ambient cue assets. Objects + Intelligence reviews named-node selection behavior. Core Experience reviews immersive presentation, focus behavior and camera sightlines. Human reviews are handoffs, not approvals claimed by automation.

## Reproduce verification

```sh
npm ci
npm run assets:fixture
npm run assets:hero
npm run assets:validate
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run preview -- --port 4174 --strictPort
# In another terminal:
npm run profile:world
```

The checked-in evidence includes real frame samples, GPU resource lifecycle counts and screenshots, with the exact browser/backend noted. A desktop viewport and a mobile viewport in Chromium are regression environments; physical-device certification and editorial review require their named owners.

The final integration passed formatting, lint, strict typecheck, **21 unit tests**, production build and **21 browser tests**. The two-era landing chunk is 209.21 kB raw / 66.24 kB at Vite's gzip setting; the largest JS chunk is 375.76 kB, below the 500 kB advisory. [Final build asset hashes and sizes](evidence/integration/build-assets.json) distinguish this two-era build from the frozen single-era performance comparison. No codec/runtime dependency was added.

## Evidence and review gates

| Gate                 | Verified evidence                                                                                                                                                                                                                    | Review handoff                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          | [Hero desktop/mobile and all five selections](visual/HERO_ASSET.md); all three POIs remain reachable with original camera presets                                                                                                    | Content reviews illustrative historical framing; Core reviews camera sightlines                                                                                                                                                                       |
| Immersion            | [Atmosphere screenshots](ATMOSPHERE.md), live reduced-motion/offscreen tests, [portrait/landscape fullscreen](IMMERSIVE_RENDERER.md) and selection/audio continuity                                                                  | Core reviews final presentation and Safari/display-switch behavior; Content owns future ambient recordings                                                                                                                                            |
| Loading and graphics | Primitive-first staging, bad/slow/missing model recovery, versioned gzip fallback/cache, zero retained GPU handles after each leave                                                                                                  | Reliability reviews physical-phone 30 FPS target and other browsers                                                                                                                                                                                   |
| Runtime resources    | [Apple M3 High comparison](evidence/performance/after/README.md): 17.6 ms active-frame p95, 1511 → 883 ms hero readiness, 210,934-byte gzip payload; flat retained world-object/GPU counts                                           | Normal-browser total heap grew during recorded runs. A [JIT-disabled control](evidence/performance/after/jitless-diagnostic/README.md) passes the unchanged heap check; Reliability reviews distinguishing compiler growth from owned-world resources |
| Multiple eras        | [1850 desktop](evidence/eras/1850-overview.png) and [mobile](evidence/eras/1850-immersive-390.png), actual mesh selection, repeated reset/disposal and missing/pending-model transition tests; full 1892 world-data digest unchanged | 1850 stays visibly labeled Blockout until Content signs off                                                                                                                                                                                           |

No named adjacent-workstream or physical-device approval is fabricated. The code and reproducible evidence are prepared for those reviews; the raw normal-browser heap failure flags remain visible. The current automated coverage targets Chromium on the local Mac.

## Recovery drill

Block the model request: the simplified world remains visible with an explanatory status, all objects remain inspectable, and returning to the era reloads a newly available model. Block narration: retry remains available and selection still works. Simulate WebGL context loss: use Reload scene. Reject the Fullscreen API: the CSS immersive layout works and Escape returns focus to its toggle. Choose Low quality or request reduced motion: decorative animation stops while exploration remains complete.
