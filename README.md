# 4DTraveler

Explore a place through time: select a location and era, enter a browser-based 3D world, visit points of interest, inspect objects, and hear narration. Dummy v0 implements **Pittsburgh / 1892** with primitive geometry, three POIs, five selectable objects, and temporary local narration. The scene and historical text are illustrative demo content, not an accurate city reconstruction.

## Run locally

Requires Node.js 22.12+ and npm, and a browser with WebGL enabled.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Choose Pittsburgh, then 1892. Click a scene marker or POI button, then a highlighted-on-selection mesh or an object button. Read the information panel, play/pause narration, and return to overview.

```sh
npm run build       # Typecheck and production build
npm run preview     # Serve the production build locally
npm run lint
npm run typecheck
npm run format:check
npm test
npx playwright install chromium  # Once, for browser tests
npm run test:e2e
```

No API keys, database, Blender installation, or remote assets are required at runtime.

## Stack and structure

React, TypeScript (strict), Vite, Three.js, React Three Fiber, and Drei's HTML markers. State uses React context/reducer; the scene loads after era selection.

- `src/types/world.ts`: shared world, camera, POI, object, and primitive contracts.
- `src/data/`: location catalog and static world definitions; no rendering code.
- `src/app/`: application flow and selection/audio state.
- `src/components/`: location, timeline, world/camera, information, and audio UI.
- `public/audio/`: checked-in temporary narration and transcript.
- `public/models/`: future GLB integration boundary.
- `tests/`: browser acceptance coverage.
- [AGENTS.md](AGENTS.md): contributor rules and verification.

Camera presets, geometry layout, descriptions, and audio paths come from world data. `sceneObjectId` links selectable meshes to metadata; future assets can preserve these IDs. The primitive adapter is intentionally temporary. Missing data/audio and scene failures have visible fallbacks.

See the [project overview](docs/PROJECT_OVERVIEW.md), [Dummy v0 specification](docs/DUMMY_V0_SPEC.md), and [verification notes](docs/VERIFICATION.md). Implementation tasks: [foundation #1](https://github.com/evanstonestreet16/4DTraveler/issues/1), [exploration #2](https://github.com/evanstonestreet16/4DTraveler/issues/2), [narration and verification #3](https://github.com/evanstonestreet16/4DTraveler/issues/3).
