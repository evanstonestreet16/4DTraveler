# 4DTraveler

Explore a place through time: choose Pittsburgh and an era, enter a 3D world, visit points of interest, inspect objects, and hear narration. **Pittsburgh / 1892** is a detailed, original industrial diorama with five selectable objects, atmospheric lighting and motion, quality controls, and immersive fullscreen. **1850** is an explicitly labeled illustrative blockout that proves the same data/rendering pipeline can host another era.

These scenes are illustrative composites, not surveyed city reconstructions. The [visual brief](docs/visual/PITTSBURGH_1892_BRIEF.md) distinguishes historical references from modeling choices.

## Run locally

Requires Node.js 22.12+ and npm, plus a browser with WebGL.

```sh
npm ci
npm run dev
```

Choose Pittsburgh → 1892 → Steel Mill. Click the actual furnace, stack or rail car, read its information, and play/pause narration. Explore Downtown and River / Bridge, then return to overview. Enter immersive view to use the viewport; Escape returns without resetting selection/audio. Scene quality offers Auto, High, Medium and Low. Reduced motion and offscreen/hidden scenes pause environmental animation. Choose era to visit the 1850 blockout.

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium   # Once, for browser tests
npm run test:e2e
npm run preview -- --port 4174 --strictPort
```

No API keys, database, Blender installation, remote model/texture files or external audio services are required. If a detailed model cannot load, the complete selectable primitive world remains usable. Failed WebGL and narration have visible recovery controls.

## Authoring and performance

```sh
npm run assets:fixture    # Deterministic small contract fixture
npm run assets:hero       # Original modular GLB and gzip transport
npm run assets:validate   # Node, geometry, version and transport integrity
npm run assets:budget     # Production raw/gzip/Brotli sizes and hashes
npm run profile:world    # Run with production preview on 4174
```

The hero is 30,152 triangles across 32 material batches, uses no textures, and transfers as a roughly 211KB gzip asset when native decompression is available (2.09MiB plain GLB fallback). A content-hash URL version prevents stale byte caches; after changing the generated model, update the version in scene data as described in the [asset pipeline](docs/ASSET_PIPELINE.md). The landing flow does not load the heavy renderer or model before era selection.

See [performance measurements](docs/PERFORMANCE.md) for real Apple M3/SwiftShader traces, resource lifecycle checks, DPR/shadow tiers and measurement limits. A mobile viewport in Chromium is not a physical-phone certification.

## Structure and integration

- `src/types/world.ts`: shared world, model, environment, camera, POI and object contracts.
- `src/data/`: scene composition and historical content with separate ownership modules.
- `src/app/`: location/era flow and selection/audio state.
- `src/components/world/`: model loading, selection mapping, camera, atmosphere and renderer boundaries.
- `public/models/`: versioned runtime assets; `scripts/assets/`: editable offline kit and preview.
- `public/audio/`: checked-in temporary narration and transcript.
- `tests/`: browser acceptance paths, failure/re-entry, fullscreen, quality and era switching.
- [AGENTS.md](AGENTS.md): workstream boundaries and required verification.

Camera coordinates stay in world data, camera movement stays in `CameraController`, and visible imported groups map through stable `sceneObjectId` values. No runtime Blender coupling, backend, authentication, physics, NPCs or live AI integration is introduced.

The [3D modeling integration runbook](docs/3D_MODELING.md) records the eight issue PRs, evidence and review handoffs. [Dummy v0 specification](docs/DUMMY_V0_SPEC.md) and [project overview](docs/PROJECT_OVERVIEW.md) retain the original planning context.
