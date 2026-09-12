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

Pittsburgh is legacy code pending deletion. It is outside active development, documentation, and verification scope unless the project owner explicitly reactivates it.

Rome / 125 CE P0–P2 established the full-viewport overview, Forum of Trajan, Pantheon forecourt and Flavian Amphitheatre valley. All three POIs are available, with nine sourced objects, reviewed transcripts, original Blender sources and an unfinished Temple of Venus and Roma worksite. The valley has original manually started construction/water ambience. The additive immersive contract was agreed across navigation, objects and content workstreams before implementation.

The rendered Rome milestone replaces the normal GLB viewing path with an offline-rendered overview, a separate portrait composition, and three 6K panoramas with 4K mobile variants. Nine camera-authored hotspots preserve the existing objects, sources, fixed eyes and narration. Materials, light, architectural detail, people and foliage are authored offline. Image retries and compressed stills keep exploration available after image or WebGL failure; only one panorama texture is retained, and idle prefetch warms encoded hero-image bytes. Original GLBs remain available. The visuals are stylized interpretations, with reviewed written narration and optional valley ambience.

Rome's bird's-eye detail upgrade was completed on 2026-09-12 by a separate visual agent, using Kyoto's shipped overview as the finish reference. A denser editable Blender layout and AI-enhanced desktop/portrait illustrations add varied roofs, courtyards, monumental detail, greenery and riverfront activity. All three overview images fit their budgets; reviewed image markers preserve stable IDs and world coordinates. The build, focused overview asset check and desktop/mobile navigation smoke tests passed. See [overview delivery and source workflow](docs/visual/ROME_125_ASSETS.md).

Rome's POI atmosphere/detail pass is complete: generated sky and generic stone texture inputs are packed into the three Blender sources, with prompts and source hashes recorded. The panoramas add richer stone, paving, foliage, façades and distance haze, with 6K desktop and sharper 4K mobile images. All nine camera-authored hotspots and fixed viewpoints are unchanged. Production build/typecheck, four asset/provenance tests, desktop/mobile smoke paths and visual seam review passed. These remain stylized reconstructions; the photographic quality target is open.

Rome's bird's-eye overview now supports a 125 CE / Present timeline and a 2.2-second bidirectional reveal. Present has original AI-generated desktop/portrait illustrations aligned approximately to the historical compositions, with an explicit reference-grounded-reconstruction label and no present-day POIs. Destination decoding precedes travel; Skip, reduced motion, failure/retry, responsive crop changes, and resource cleanup preserve access to the endpoint images. The full historical POI/object path remains available after returning to 125 CE. See the [transition delivery and plan](docs/ROME_125_TO_PRESENT_TRANSITION_PLAN.md).

## Planned Scope

The Rome Present accuracy correction landed on 2026-09-12. The replacement desktop and portrait compositions now distinguish the modern city with the Vittoriano/Piazza Venezia, the Via dei Fori Imperiali axis, excavated fora, ruined Colosseum, green Circus Maximus and post-antique urban blocks. Official Rome references and review criteria are recorded with the source assets. The endpoint remains a reference-grounded visual reconstruction, not surveyed imagery; fine-grained geometry and building placement remain approximate.

Optional AI-generated transition video remains deferred. Present-day POIs, additional periods, and transitions inside panoramas are outside the Rome time-transition milestone.

The owner clarified the Rome visual target on 2026-09-12: photographic realism comparable to the supplied warm, atmospheric Roman architectural reference. The current stylized assets do not meet that target. The rendered viewer is a working foundation; the next visual milestone is one convincing Forum frame with detailed architecture, realistic materials and vegetation, photographic lighting and historically appropriate 125 CE condition, before extending that quality through the full panorama and other POIs.

The active hackathon direction is a full-viewport experience for **Rome / 125 CE** and **Kyoto / circa 1700**. Rome now supplies the shared rendered overview/panorama viewer that Kyoto can consume when its assets are authored. Kyoto implementation and recorded Rome narration remain future work. Walking, physics and runtime Blender coupling remain excluded. See the [immersive historical city plan](docs/IMMERSIVE_CITY_PLAN.md).

## Out of Scope Unless Explicitly Requested

MongoDB, authentication, multiplayer, WASD, physics, NPCs, character interactions, dynamic city generation, Gemini/Grok integration, ElevenLabs live generation, and historical preview video. Blender automation is limited to the explicitly planned offline asset-authoring pipeline; Blender is not a runtime dependency.

## Recent Updates

<!-- Newest first. Format: `- YYYY-MM-DD — summary (link to PR/issue if available)` -->

- 2026-09-12 — Replaced the provisional Rome Present endpoint with reference-grounded desktop/portrait compositions centered on the Vittoriano, Via dei Fori Imperiali and the excavated archaeological landscape; refreshed asset provenance, UI copy and accuracy checks.

- 2026-09-12 — Implemented Rome's 125 CE / Present overview slider, illustrative modern desktop/portrait images, and a 2.2-second bidirectional reveal with loading recovery, Skip, reduced motion, and bounded image ownership. Build, focused checks, and desktop/mobile Rome exploration passed. See the [delivery and plan](docs/ROME_125_TO_PRESENT_TRANSITION_PLAN.md).

- 2026-09-12 — Planned the [POI realism pipeline](docs/POI_REALISM_PIPELINE.md): cheap Blender proxy renders as a structure oracle, AI generation for surface realism, and MongoDB as the source of both geometry parameters and generated prompts. Opened the committed handoff lane at `blender/renders/rome-125/`.

- 2026-09-12 — Planned the Rome 125 CE / Present overview slider and bidirectional transition, with licensed registered endpoint assets, a deterministic runtime fallback, optional offline AI middle plates, and focused release gates.

- 2026-09-12 — Completed Rome's independent bird's-eye upgrade against Kyoto's visual benchmark: detailed desktop/portrait images, editable layout, reviewed markers and budgeted fallback. Build, focused overview asset check and desktop/mobile smoke tests passed; panorama packaging preserves the overview delivery.

- 2026-09-12 — Implemented Rome's rendered visual milestone: responsive aerial images, three 6K panoramas, nine hotspots, still-image recovery and bounded texture loading. Production build, 15 focused unit tests and nine desktop/mobile Chromium tests passed; all three panoramas received cardinal browser review. See [asset delivery](docs/visual/ROME_125_ASSETS.md).

- 2026-09-12 — Narrowed active scope to Rome and Kyoto, moved Pittsburgh to legacy pending deletion, selected rendered 360° panoramas as the preferred realism path, and reduced process to focused checks plus a release smoke path.

- 2026-09-12 — Completed Rome P2 valley, bringing Rome to three immersive POIs and nine sourced objects, with optional original ambience and selectable recovery scenes. See [asset delivery](docs/visual/ROME_125_ASSETS.md).

- 2026-09-12 — Completed [Rome P1 #22](https://github.com/evanstonestreet16/4DTraveler/pull/22) Pantheon forecourt and bounded model prefetch on top of [P0 #21](https://github.com/evanstonestreet16/4DTraveler/pull/21). Six Rome objects now share the same inspection path.

- 2026-09-12 — Added the [Kyoto / circa 1700 city generation plan](docs/KYOTO_1700_CITY_PLAN.md), now aligned with the rendered-overview/360°-panorama path, Nijō-first cut line, stable hotspots, image budgets, and lean milestone verification.
- 2026-09-12 — Completed Rome P0 overview/Forum integration with fixed look, selection, source-aware transcripts and recovery; Forum passed four-direction browser review. See [asset delivery](docs/visual/ROME_125_ASSETS.md).

- 2026-09-12 — Added the [Rome / 125 CE city generation plan](docs/ROME_125_CITY_PLAN.md), with a Forum of Trajan hero POV, ordered Pantheon and Colosseum stretch POVs, stable IDs, historical confidence boundaries, narration drafts, source references, and asset budgets.
- 2026-09-12 — Defined the city-agnostic plan for full-screen static overviews and Blender-authored fixed-position immersive POIs, with Rome / 125 CE and Kyoto / circa 1700 as the initial city configurations.
- 2026-09-11 — Merged PRs #13–#20 into `main` in dependency order, including the [final roadmap integration](https://github.com/evanstonestreet16/4DTraveler/pull/20), following the project owner's merge request. Existing editorial, device and heap-budget review notes remain documented.
- 2026-09-11 — Implemented the [3D modeling roadmap #5](https://github.com/evanstonestreet16/4DTraveler/issues/5) in a scoped PR stack, including the 1892 hero pipeline and user-selected 1850 blockout. Published measurements, resource-lifecycle investigation and desktop/mobile browser evidence; review gates remain explicit.
