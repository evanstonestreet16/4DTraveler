# 4DTraveler

4DTraveler is an interactive historical city explorer focused on two moments: Rome in 125 CE and Kyoto around 1700.

This release intentionally contains only the bird’s-eye experience. Each city has responsive desktop and portrait artwork, a compressed fallback, and selectable points of interest both on the image and in an accessible list. Selecting a POI highlights it and identifies the future detail destination; no ground-level POI visual is bundled.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Choose Rome or Kyoto, select its era, and click each POI marker or list item. The overview switches to a portrait-specific composition on narrow portrait screens.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e -- tests/overview.spec.ts
```

No API keys, database, external visual assets, or audio services are required.

## Structure

- `src/types/world.ts`: shared world, camera, POI, and overview-image contracts.
- `src/data/locations.ts`: the active Rome and Kyoto registry.
- `src/data/worlds/`: city-owned overview and POI marker data.
- `src/components/world/RenderedOverviewViewer.tsx`: responsive images and interactive markers.
- `public/images/`: versioned overview assets and compact manifests.
