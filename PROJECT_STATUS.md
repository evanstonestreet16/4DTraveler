# Project Status

This document is the living record of what 4DTraveler is, what currently works, and what is intentionally out of scope. **Collaborators should edit this file whenever new project information is added or the scope changes.** Keep entries short, factual, and dated when they reflect a state change.

For contributor rules, workstream ownership, and verification steps, see [AGENTS.md](AGENTS.md).

## How to update this file

- Update **Project Goal** only when the long-term vision changes; otherwise leave it alone.
- Update **Current Scope** when something new lands on `main` or a scoped-in feature is completed. Prefer past-tense, concrete statements.
- Update **Out of Scope** when the team explicitly agrees to defer or accept a capability.
- Add a bullet under **Recent Updates** (top of the list) with the date, a one-line summary, and a PR/issue link when available.
- Keep the file authoritative: if something contradicts `AGENTS.md`, `README.md`, or `docs/`, reconcile them in the same PR.

## Project Goal

4DTraveler is an interactive historical 3D explorer built with React, strict TypeScript, and React Three Fiber / Three.js. Worlds conform to shared contracts. Favor reliable hackathon vertical slices over generalized infrastructure.

## Current Scope

The 3D modeling integration on `main` supports Pittsburgh / 1892 with an original GLB industrial diorama, three POIs, five selectable objects, narration, atmospheric lighting/motion, immersive presentation and adaptive scene quality. The complete primitive world remains available during model loading or failure.

The user-selected **1850 · Blockout** adds a distinct market/wharf composition through the same era flow and renderer. It has two POIs, four illustrative objects, separate camera data and no narration. Existing 1892 IDs, content and cameras remain unchanged.

The scoped PR stack for issues #5–#12 was merged into `main` in dependency order at the project owner's request. See the [integration runbook](docs/3D_MODELING.md) for the PR history and evidence. Historical/editorial approval, adjacent workstream review and physical-phone/browser certification remain handoffs. The performance report retains normal-browser total-heap growth and a passing JIT-disabled control; merging does not claim an unrestricted heap plateau or replace those reviews.

Rome / 125 CE P0 now provides a full-viewport static city overview and a Forum of Trajan fixed-position 360° scene, three sourced inspectable objects, source-reviewed transcripts, and low-detail recovery geometry. Original Blender sources and repeatable GLB exports are checked in. Pantheon and Colosseum remain visible preview markers pending P1/P2. The additive immersive contract was agreed across navigation, objects and content workstreams before implementation.

## Planned Scope

The next hackathon direction is a city-agnostic, full-viewport experience for **Rome / 125 CE** and **Kyoto / circa 1700**. Each city will have a static bird's-eye overview plus Blender-authored POI scenes with fixed-position 360-degree looking, inspectable objects and narration. Walking, physics and runtime Blender coupling remain excluded. See the [immersive historical city plan](docs/IMMERSIVE_CITY_PLAN.md).

## Out of Scope Unless Explicitly Requested

MongoDB, authentication, multiplayer, WASD, physics, NPCs, character interactions, dynamic city generation, Gemini/Grok integration, ElevenLabs live generation, and historical preview video. Blender automation is limited to the explicitly planned offline asset-authoring pipeline; Blender is not a runtime dependency.

## Recent Updates

<!-- Newest first. Format: `- YYYY-MM-DD — summary (link to PR/issue if available)` -->

- 2026-09-12 — Completed Rome P0 overview/Forum integration with fixed look, selection, source-aware transcripts and recovery; Forum passed four-direction browser review. See [asset delivery](docs/visual/ROME_125_ASSETS.md).

- 2026-09-12 — Added the [Rome / 125 CE city generation plan](docs/ROME_125_CITY_PLAN.md), with a Forum of Trajan hero POV, ordered Pantheon and Colosseum stretch POVs, stable IDs, historical confidence boundaries, narration drafts, source references, and asset budgets.
- 2026-09-12 — Defined the city-agnostic plan for full-screen static overviews and Blender-authored fixed-position immersive POIs, with Rome / 125 CE and Kyoto / circa 1700 as the initial city configurations.
- 2026-09-11 — Merged PRs #13–#20 into `main` in dependency order, including the [final roadmap integration](https://github.com/evanstonestreet16/4DTraveler/pull/20), following the project owner's merge request. Existing editorial, device and heap-budget review notes remain documented.
- 2026-09-11 — Implemented the [3D modeling roadmap #5](https://github.com/evanstonestreet16/4DTraveler/issues/5) in a scoped PR stack, including the 1892 hero pipeline and user-selected 1850 blockout. Published measurements, resource-lifecycle investigation and desktop/mobile browser evidence; review gates remain explicit.
