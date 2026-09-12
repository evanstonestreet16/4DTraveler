# Workstream 2 — Core Experience / Navigation

This is the planning document for Workstream 2, one of the four parallel tracks defined in [AGENTS.md](../AGENTS.md) for work after Dummy v0. It exists alongside [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) and [DUMMY_V0_SPEC.md](DUMMY_V0_SPEC.md) as a living plan for this track specifically, in the same spirit as the Workstream 1 plan (`docs/3D_MODELING.md` on `codex/3d-modeling`).

## 1. Scope & Ownership

Per `AGENTS.md`, Workstream 2's deliverable is **a polished and understandable path from globe → location → era → world → POI**. It owns:

- `src/components/location/`, `src/components/timeline/`, and world-loading UI.
- Globe/location selection, era timeline, navigation hierarchy, loading/progress states, and route or deep-link behavior if introduced.
- `CameraController` behavior: easing, duration, interruption, reduced motion, return-to-overview, repeated POI transitions.
- Responsive layout and transitions around the world canvas (excluding object information and narration content).
- User-facing recovery when a world or model cannot load.

This plan adds two small new areas that fall naturally under the same ownership:

- A **globe subsystem** (replacing the current card-based location picker).
- A **geo-data layer** (`src/data/geo/`) that powers the globe — real-world country/sub-region boundaries, distinct from historical world content in `src/data/worlds/`.

Boundary reminder from `AGENTS.md`: consume camera presets and world data as given; do not edit GLB geometry, scene composition, object selection, or historical content — those belong to Workstreams 1, 3, and 4 respectively.

## 2. Current State (Dummy v0, on `main`)

- `LocationSelector.tsx` — a static card grid over `src/data/locations.ts`. Only one location (Pittsburgh) exists today.
- `EraSelector.tsx` — already generic: it maps over `location.eras`, so it needs **no rework** to support additional eras later.
- `CameraController.tsx` — a fixed ~0.95s eased transition between camera views, respects `prefers-reduced-motion`, but has no loading-progress hook and assumes the destination view is already fully known.
- `App.tsx` — a `Suspense` boundary around `WorldExperience` with a static "Loading your historical world…" fallback, and a generic `.notice` block (with a single "choose again" link) for both "location unavailable" and "world not available yet" — no retry/recovery beyond starting over.
- No routing/deep-linking exists; navigation is purely `useReducer` state in `src/app/state.ts`.

## 3. New Feature: Landing Globe

Replaces `LocationSelector`'s internals (it keeps its role as the app's entry screen) with an interactive 3D globe, per the product direction: *"explore not only where the world is, but where the world was."*

**Intro sequence.** A `GlobeIntro` component shows a placeholder logo (a swappable image slot — real artwork arrives later) for a few seconds, then scales/fades into the full interactive globe. Trigger the morph off a fixed delay for now, but structure it so the delay can later be swapped for "wait until globe assets have actually loaded" without changing the component's shape.

**Base globe.** A draggable, zoomable sphere showing only two tones — land (green) vs. water — with no country/city detail visible by default. Recommend building this with **`react-globe.gl`** (built on `three-globe` + d3) rather than fully custom React Three Fiber: it gives drag/zoom controls, polygon layers, hover highlighting, and label rendering out of the box, avoiding hand-built sphere raycasting and point-in-polygon logic. It renders its own Three.js scene, which is fine — the globe is a separate screen from the existing R3F `WorldCanvas`, never nested inside it.

**Hover interaction.** Hovering anywhere on the globe highlights, for *every* country worldwide (not just curated ones):

- the country outline, in one color, and
- a sub-region ("city view") outline within it, in a second color,

alongside a "Country, Subregion" text label. This uses `react-globe.gl`'s polygon layers and built-in hover callbacks.

**Click behavior.** Clicking only does something when the hovered sub-region matches a curated `Location` (see the boundary lookup below) — in that case it dispatches the existing `{ type: 'location', id }` action, proceeding into era selection exactly as today's card click does. Clicking any unsupported region is a **no-op**: no message, no visual reaction beyond the existing hover feedback.

## 4. Geo Data Plan

There is no clean, free, global "exact city limits" dataset, so this plan uses two real, differently-sourced layers rather than inventing one:

- **Country boundaries** — a small bundled dataset (e.g. `src/data/geo/countries.json`, Natural-Earth-derived, low resolution), shipped upfront since it's lightweight.
- **Sub-region ("city view") boundaries** — real worldwide administrative sub-division data (e.g. geoBoundaries-style ADM1/ADM2), which stands in for "city" almost everywhere but is occasionally a county/district instead of literal city limits — an accepted tradeoff. The full dataset is too large to ship upfront, so it's pre-simplified once by an offline data-prep script into per-country static files (e.g. `public/geo/adm/<ISO3>.json`) and fetched **lazily, per country, only when that country is hovered**, then cached in memory for the session. No runtime dependency on a live external API, consistent with the project's preference for demo reliability over network dependence.
- **Boundary lookup** — a small utility mapping a curated `Location` to its real-world boundary identifiers (country ISO code + sub-region ID), so the globe can tell "supported" apart from "not yet supported" without any location-specific logic hardcoded into generic globe components (per `AGENTS.md`'s rule against Pittsburgh-specific assumptions in generic UI).

**Contract note:** this lookup will likely need a new optional field (e.g. `boundaryId`) on the shared `Location` type in `src/types/world.ts`. Per `AGENTS.md`, that's a shared-contract change — it needs a small contract PR coordinated with the integration owner (Astra), updating the type, example data, all consumers, and docs together, not a silent addition.

## 5. Anticipating the Workstream 1 Merge

Workstream 1's unmerged `codex/3d-modeling` branch replaces primitive geometry with a real hero GLB model, adds atmosphere/immersive rendering, and introduces a second era (1850). To avoid rework once it merges:

- `EraSelector` needs no changes — it's already data-driven over `location.eras`.
- `CameraController` and world-loading UX should be hardened now for **heavier GLB loads**: replace the static "Loading your historical world…" text with real progress feedback (e.g. `@react-three/drei`'s `useProgress`, or R3F's Suspense progress), and give `App.tsx`'s generic `.notice` blocks an actual retry affordance instead of only "choose again."
- Verify `CameraController`'s easing/interruption logic holds up against camera presets and POI counts it hasn't seen yet (varied atmosphere-driven scenes), since it should already be free of Pittsburgh-specific assumptions — treat this as a verification item, not a rewrite.

## 6. Responsive Layout

Current breakpoints live in `src/styles/globals.css` (640px, 960px) and already handle the world-experience layout reasonably (stacked columns, hidden POI numbers, etc. on mobile) — that doesn't need rework. The new globe view needs its own responsive treatment: full-bleed sizing on mobile, and hover-label/legend placement that doesn't overlap the globe's touch/drag target.

## 7. Testing Plan

Extend `tests/exploration.spec.ts` (currently covers the full Pittsburgh/1892 flow, mobile layout + reduced motion, missing-narration recovery, and WebGL-context-loss recovery) with:

- Globe intro → morph → interactive globe is reachable and drag/zoom works.
- Hovering shows the country + sub-region outline and label.
- Clicking a supported region proceeds to era selection; clicking an unsupported region is a no-op.

Add unit coverage for the boundary-lookup utility (`src/data/geo/`). Keep the existing required verification loop from `AGENTS.md`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, plus a manual browser pass, and `npm run test:e2e` when available.

## 8. Phasing

No fixed deadline — this is open-ended, iterative work, ordered by dependency:

1. **Base globe** — land/water sphere, drag/zoom, logo intro/morph, replacing the card grid. Still only Pittsburgh is clickable.
2. **Geo data pipeline** — bundle country boundaries, build the per-country on-demand sub-region loader, wire up hover outlines + labels globally.
3. **Supported-location integration** — boundary-to-`Location` lookup, click-to-proceed behavior, and the `boundaryId` contract PR if needed.
4. **Navigation/camera hardening** for the anticipated Workstream 1 merge — loading progress, retry UX, multi-era/multi-preset robustness.
5. **Responsive polish + expanded test coverage.**
