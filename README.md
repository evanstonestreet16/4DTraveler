# 4DTraveler

Desktop browsers are the only supported target. Mobile/tablet design, optimization, asset generation and testing are out of scope. Existing mobile variants are retained compatibility assets, not a supported experience; see [contributor scope](AGENTS.md).

Explore a place through time: choose a city and era, visit points of interest, inspect objects, and hear or read narration. Active development is focused on Rome / 125 CE and Kyoto / circa 1700. Pittsburgh remains in the repository as legacy code pending deletion and is outside current development and testing scope.

**Rome / 125 CE** presents an offline-rendered city overview and eye-level 360° panoramas of the Forum of Trajan, Pantheon forecourt and Flavian Amphitheatre valley. Drag or use arrow keys on the focused view to look around, inspect three sourced objects at each place through numbered hotspots or the object list, read the narration transcript, and return to the same overview. The valley includes optional, manually started construction and water ambience. See the [Rome asset delivery](docs/visual/ROME_125_ASSETS.md) for Blender sources, budgets and reconstruction limits.

**Kyoto / circa 1700** presents desktop and portrait overviews plus original Blender-rendered panoramas of Nijō Castle, Kiyomizu-dera and Nishiki Fish Market. Each place includes three sourced objects, responsive hotspots, an accessible object list and a reviewed narration transcript. See the [Kyoto asset delivery](docs/visual/KYOTO_1700_ASSETS.md) for authoring details and reconstruction limits.

All ten Rome street views (four Flavian Amphitheatre, three Forum and three Pantheon) use free local AI upscaling to 8192 × 4096. Original images are retained; the added detail is inferred, not native 8K capture.

These scenes are illustrative composites, not surveyed city reconstructions. Visual assets come from offline Blender rendering and AI illustration/enhancement; the browser displays the images with interactive hotspots. The current demo and visual quality work target desktop browsers.

## Run locally

Requires Node.js 22.12+ and npm. WebGL enables panorama looking; the overview, fallback stills and object lists also work without it.

```sh
npm ci
npm run dev
```

Choose Rome → 125 CE to visit the Forum, Pantheon and Flavian Amphitheatre valley, or choose Kyoto → circa 1700 to visit Nijō Castle, Kiyomizu-dera and Nishiki Fish Market. Inspect an object, read its transcript and return to the overview.

```sh
npm run typecheck
npm test -- <relevant-test-file>
npm run build                     # Runtime integration or release
npm run test:e2e -- <smoke-spec>  # Runtime integration or release
```

No API keys, database, Blender installation, remote visual assets or external audio services are required. Failed panorama loading or graphics rendering shows a compressed still, a retry control and the accessible object list. Rome and Kyoto narration remains available as reviewed text; recorded speech is not included.

Use Blender offline for visual authoring. The Rome and Kyoto pipelines export overviews, equirectangular panoramas, fallback stills and camera-projected hotspot coordinates. Existing GLBs remain available for authoring and the shared viewer still supports worlds that use them.

## Structure and integration

- `src/types/world.ts`: shared world, image/panorama, hotspot, model, environment, camera, POI and object contracts.
- `src/data/`: scene composition and historical content with separate ownership modules.
- `src/app/`: location/era flow and selection/audio state.
- `src/components/world/`: visual loading, selection mapping, camera and viewer boundaries.
- `public/models/` and `public/images/`: versioned runtime visuals; `blender/`: editable offline sources.
- `public/audio/`: checked-in temporary narration and transcript.
- `tests/`: browser acceptance paths, failure/re-entry, fullscreen, quality and era switching.
- [AGENTS.md](AGENTS.md): workstream boundaries and required verification.

Camera coordinates stay in world data, camera movement stays in `CameraController`, and visible imported groups map through stable `sceneObjectId` values. No runtime Blender coupling, backend, authentication, physics, NPCs or live AI integration is introduced.

The [3D modeling integration runbook](docs/3D_MODELING.md) records the eight issue PRs, evidence and review handoffs. [Dummy v0 specification](docs/DUMMY_V0_SPEC.md) and [project overview](docs/PROJECT_OVERVIEW.md) retain the original planning context.
