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

Desktop browsers are the only supported product and demo target (owner decision, 2026-09-12). Mobile/tablet support, layouts, asset variants, optimization and testing are out of scope. The latest desktop cleanup removes runtime mobile variants. Earlier desktop/mobile delivery records below are historical and do not establish current support requirements.

Rome's timeline now includes **Circa 500 BCE → 125 CE → Present**, with the existing 2.2-second reveal in both directions. The older overview uses its delivered desktop/portrait/fallback images and three display-only Preview POIs: Capitoline Temple, Roman Forum and Circus Valley. These markers and list entries do not open viewpoints or object panels. Image registration remains approximate.

Pittsburgh is legacy code pending deletion. It is outside active development, documentation, and verification scope unless the project owner explicitly reactivates it.

Rome / 125 CE P0–P2 established the full-viewport overview, Forum of Trajan, Pantheon forecourt and Flavian Amphitheatre valley. All three POIs are available, with nine sourced objects, reviewed transcripts, original Blender sources and an unfinished Temple of Venus and Roma worksite. The additive immersive contract was agreed across navigation, objects and content workstreams before implementation.

The rendered Rome milestone replaces the normal GLB viewing path with an offline-rendered desktop overview. The original nine camera-authored hotspots preserved the existing objects, sources, fixed eyes and narration. Materials, light, architectural detail, people and foliage are authored offline. Image retries and compressed stills keep exploration available after image or WebGL failure; only one panorama texture is retained, and idle prefetch warms encoded hero-image bytes. Original GLBs remain available. The visuals are stylized interpretations, with reviewed written narration.

Rome's bird's-eye detail upgrade was completed on 2026-09-12 by a separate visual agent, using Kyoto's shipped overview as the finish reference. A denser editable Blender layout and an AI-enhanced desktop illustration add varied roofs, courtyards, monumental detail, greenery and riverfront activity. Both shipped overview images fit their budgets; reviewed image markers preserve stable IDs and world coordinates. The build, focused overview asset check and desktop navigation smoke tests passed. See [overview delivery and source workflow](docs/visual/ROME_125_ASSETS.md).

Rome's three POIs now open ten supplied street-view illustrations from `pano-explorer/public/images/citystreetviews/rome/`: three Forum, three Pantheon and four Colosseum views. Previous/next arrows switch views within each POI, with image retry and return-to-entry behavior. Lossless WebPs preserve native 1440 × 720 source pixels, and a 75° field of view matches the original street-view module. Opening camera presets and stable IDs are preserved; five entry-image hotspots mark visible features, and all nine objects remain accessible in the object list. These AI illustrations include interpretive or anachronistic details and are not surveyed walking routes or verified 125 CE reconstructions. See [asset delivery](docs/visual/ROME_125_ASSETS.md).

Rome's bird's-eye overview now supports a 125 CE / Present timeline and a 2.2-second bidirectional reveal. Present has an original AI-generated desktop illustration aligned approximately to the historical composition, with an explicit reference-grounded-reconstruction label and no present-day POIs. Destination decoding precedes travel; Skip, reduced motion, failure/retry and resource cleanup preserve access to the endpoint images. The full historical POI/object path remains available after returning to 125 CE. See the [transition delivery and plan](docs/ROME_125_TO_PRESENT_TRANSITION_PLAN.md).

Kyoto / circa 1700 provides a rendered desktop overview plus three original Blender-rendered 360° panoramas for Nijō Castle, Kiyomizu-dera and Nishiki Fish Market. Nine sourced objects, four reviewed transcripts, projected hotspots, fixed viewpoints and image/WebGL recovery complete the same overview → POI → object → return flow used by Rome. See [Kyoto delivery](docs/visual/KYOTO_1700_ASSETS.md).

Kyoto's era picker and overview slider now offer **circa 1700 ↔ Present**, using Rome's 2.2-second bidirectional reveal with destination decoding, Skip, reduced motion and image recovery. Present is overview-only; returning to circa 1700 restores the three historical POIs and their object paths. Modern desktop, phone and fallback BEVs preserve the historical compositions approximately while adding modern urban fabric. Prompts, references and source PNGs are in [the asset delivery](blender/source/kyoto-present/README.md).

All ten Rome street views now use 8192 × 4096 panoramas produced for free with local RealESRGAN_x4plus: four Flavian Amphitheatre, three Forum of Trajan and three Pantheon views. The Flavian entry restores the earlier 1774 × 887 enhancement at native 4× (7096 × 3548); the other nine restore the original 1440 × 720 images at native 4× (5760 × 2880). Lanczos sizing produces exactly 8K, with budgeted high-quality WebP and matching still fallbacks. This supersedes native-source/lossless desktop delivery for all ten views. Original images, stable IDs, cameras and angular hotspots remain; restored detail is inferred rather than native 8K capture. Source PNGs and provenance are in `blender/source/rome-125/*-ai-8k.{png,json}`. The viewer always selects desktop panoramas, including in narrow desktop panels.

City pins on the landing globe open Rome and Kyoto in the **Present** overview. Visitors change year with the overview time slider; there is no separate era-picker page.

## Planned Scope

The Rome Present accuracy correction landed on 2026-09-12. The replacement desktop composition now distinguishes the modern city with the Vittoriano/Piazza Venezia, the Via dei Fori Imperiali axis, excavated fora, ruined Colosseum, green Circus Maximus and post-antique urban blocks. Official Rome references and review criteria are recorded with the source assets. The endpoint remains a reference-grounded visual reconstruction, not surveyed imagery; fine-grained geometry and building placement remain approximate.

Optional AI-generated transition video remains deferred. Present-day POIs and transitions inside panoramas remain outside the Rome time-transition milestone. The circa 500 BCE desktop, portrait and fallback assets are integrated into the timeline, with three preview-only POIs. Source PNGs, prompts and provenance are in [the asset delivery](blender/source/rome-500bce/README.md). They depict an interpretive early Republican city with open terrain and low archaic buildings; geographic alignment is approximate.

The owner clarified the Rome visual target on 2026-09-12: photographic realism comparable to the supplied warm, atmospheric Roman architectural reference. The current stylized assets do not meet that target. The rendered viewer is a working foundation; the next visual milestone is one convincing Forum frame with detailed architecture, realistic materials and vegetation, photographic lighting and historically appropriate 125 CE condition, before extending that quality through the full panorama and other POIs.

The active demo uses rendered overviews and fixed-position panoramas for **Rome / 125 CE** and **Kyoto / circa 1700**. Recorded narration remains deferred; reviewed written transcripts are available. Scene ambience is not part of the product. Walking, physics and runtime Blender coupling remain excluded. See the [immersive historical city plan](docs/IMMERSIVE_CITY_PLAN.md).

## Out of Scope Unless Explicitly Requested

MongoDB, authentication, multiplayer, WASD, physics, NPCs, character interactions, dynamic city generation, Gemini/Grok integration, ElevenLabs live generation, scene ambience, and historical preview video. Blender automation is limited to the explicitly planned offline asset-authoring pipeline; Blender is not a runtime dependency.

## Recent Updates

<!-- Newest first. Format: `- YYYY-MM-DD — summary (link to PR/issue if available)` -->

- 2026-09-12 — Integrated the Rome 8K panorama/flicker improvements with the latest desktop-only, Present-entry navigation. Preserved the updated overview-marker contract and ambience removal, aligned the Rome packager, and repaired committed App import conflict markers. Build, lint, 34 focused tests and desktop globe → Present → 125 CE → POI → object → nearby view → return checks passed.

- 2026-09-12 — Fixed the beige flash between nearby panoramas: reuse the canvas, retain the current image through destination decode/GPU drawing, and release it after the replacement frame. Initial loading retains the still until first draw; rapid requests and exit clean up their resources. Frame/decode regression tests, Rome asset/look tests, typecheck/lint/build and desktop loading/rapid-switch/hotspot/return checks passed.

- 2026-09-12 — Extended free local AI upscaling to all ten Rome panoramas (four Flavian, three Forum, three Pantheon), with versioned 8192 × 4096 WebPs, matching fallbacks and preserved originals. Five asset tests, typecheck/lint/build and desktop loading/navigation across all ten views passed. The separate live-summary service reported unavailable during hotspot checks; panorama delivery was unaffected.

- 2026-09-12 — Delivered the free, locally AI-upscaled 8192 × 4096 Flavian entry panorama (5.90 MB WebP). Desktop panorama selection no longer switches to mobile assets. Verified exact source/runtime dimensions, GPU texture limit 16384, five desktop asset checks, typecheck/build, and globe → Rome → overview → 8K POI → object → nearby view → return navigation. Earlier images remain available.

- 2026-09-12 — Established desktop-only product scope, beyond testing alone. Investigated Flavian Amphitheatre blur: the AI source and shipped WebP are 1774 × 887, both image variants resolve to the same file, and the 1440 × 900 desktop canvas renders at full viewport resolution on High. The attempted generation did not deliver 4K; its opening view spans roughly 501 × 370 source pixels.

- 2026-09-12 — Added a 1774 × 887 AI-enhanced Flavian Amphitheatre entry panorama for visual testing, retaining the original and all nearby images. Five panorama checks, production build and desktop hotspot/return navigation passed. Owner testing priority is desktop only; mobile testing is deferred.

- 2026-09-12 — Removed the Choose era page; city entry opens Present and the overview slider is the only year control.

- 2026-09-12 — Removed scene ambience from the product, including the Play ambience control, generation API, and unused loop files.

- 2026-09-12 — Removed mobile and portrait support; the app is desktop only.

- 2026-09-12 — City pins skip the era picker and open the present-day overview.

- 2026-09-12 — Integrated Rome street-view navigation, Rome’s 500 BCE era and Kyoto Present with the latest globe-navigation and ambience changes. Preserved both sides of the status-log conflict; production build, 100 active/generic unit checks, and Rome/Kyoto globe → overview → POI → object → return browser smoke paths passed. Existing browser-test entry helpers still target the former city-list buttons.

- 2026-09-12 — Integrated Kyoto Present into the era picker and overview slider, reusing Rome's bidirectional transition and recovery behavior; retained the circa 1700 POIs and object exploration.

- 2026-09-12 — Added nearby-view arrows for all ten supplied Rome street views, lossless source-pixel packaging, and the original module’s wider 75° view. Existing POI/object identities and Kyoto’s default panorama behavior are preserved.

- 2026-09-12 — Generated and packaged modern-day Kyoto desktop, portrait and fallback BEVs with the Rome Present workflow; reviewed the images and checked decoding, hashes and asset budgets. Timeline integration remains pending.

- 2026-09-12 — Integrated circa 500 BCE into Rome's era picker and overview timeline, reusing bidirectional travel and image recovery; added three inert preview POIs with desktop/portrait marker placement. Build/typecheck, 12 focused unit tests and desktop/mobile exploration checks passed.

- 2026-09-12 — Connected the three Rome POIs to the newly supplied street views, with native-resolution WebPs, matching recovery stills, and visible-feature hotspots; retained all nine object-list entries and existing overview navigation.

- 2026-09-12 — Generated and packaged the Rome / circa 500 BCE desktop, portrait and fallback overviews using the existing Rome image-edit workflow; checked image decoding, hashes and budgets. Timeline integration remains pending. See [asset delivery](blender/source/rome-500bce/README.md).
- 2026-09-12 — Generate looping street ambience from city, year, and place (period crowd speech included), shrink the ambience control, and add Back to globe on bird’s-eye overview.

- 2026-09-12 — Integrated Kyoto P0–P2 with Rome's latest rendered viewer and Present transition, preserving both cities' responsive overviews, panoramic POIs, object paths and recovery behavior.

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
