# 4DTraveler

Explore **Rome / 125 CE** and **Kyoto / circa 1700**: choose a city and era, enter its overview, visit fixed-position 360° viewpoints, and inspect sourced historical objects.

Kyoto includes **Nijō Castle**, **Kiyomizu-dera**, and **Nishiki Fish Market**, each with three objects and a narration transcript. Desktop and portrait overview illustrations lead into original Blender-rendered panoramas. Drag to look around, use arrow keys on the focused scene, or select objects from the accessible list. Image and WebGL recovery keep the stories available. See the [Kyoto asset delivery](docs/visual/KYOTO_1700_ASSETS.md) for authoring and reconstruction limits.

Rome includes the Forum of Trajan, Pantheon forecourt, and Flavian Amphitheatre valley. See the [Rome asset delivery](docs/visual/ROME_125_ASSETS.md). These scenes are source-aware illustrative reconstructions. Pittsburgh remains legacy code pending deletion, outside active work.

## Run locally

Requires Node.js 22.12+ and npm:

```sh
npm ci
npm run dev
```

Choose **Kyoto → circa 1700 → Nijō Castle**, inspect an object, read the narration transcript, and return to the overview. Kiyomizu and Nishiki use the same controls. No API keys, account, database, Blender installation, or external audio service is needed to run the app. Recorded Kyoto narration is deferred pending pronunciation review.

```sh
npm run typecheck
npm run build
npx vitest run src/data/worlds/kyotoPanoramas.test.ts src/app/kyotoNavigation.test.ts
npx playwright install chromium
npx playwright test tests/kyoto-panoramas.spec.ts tests/kyoto-recovery.spec.ts tests/kyoto-overview-markers.spec.ts
```

## Structure

- `src/types/world.ts`: shared world, image, hotspot, camera and object contracts.
- `src/data/`: scene layout and historical content, composed per world.
- `src/app/`: location, era, selection and audio state.
- `src/components/world/`: panorama/GLB loading, markers, camera and recovery.
- `public/images/`, `public/models/`, `public/audio/`: runtime assets.
- `blender/`: offline authoring sources and references.
- [PROJECT_STATUS.md](PROJECT_STATUS.md): current scope and delivery status.
- [AGENTS.md](AGENTS.md): ownership boundaries and focused verification rules.

Camera coordinates stay in world data; movement stays in `CameraController`. Walking, physics, NPC interaction, and live AI providers remain outside the demo.
