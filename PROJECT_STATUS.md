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

The 3D modeling integration on `codex/3d-modeling` supports Pittsburgh / 1892 with an original GLB industrial diorama, three POIs, five selectable objects, narration, atmospheric lighting/motion, immersive presentation and adaptive scene quality. The complete primitive world remains available during model loading or failure.

The user-selected **1850 · Blockout** adds a distinct market/wharf composition through the same era flow and renderer. It has two POIs, four illustrative objects, separate camera data and no narration. Existing 1892 IDs, content and cameras remain unchanged.

The scoped PR stack for issues #5–#12 is open for review; it has not been merged. See the [integration runbook](docs/3D_MODELING.md) for evidence and merge order. Historical/editorial approval, adjacent workstream review and physical-phone/browser certification remain handoffs. The performance report retains normal-browser total-heap growth and a passing JIT-disabled control; it does not claim an unrestricted heap plateau.

## Out of Scope Unless Explicitly Requested

MongoDB, authentication, multiplayer, WASD, physics, NPCs, character interactions, dynamic city generation, Gemini/Grok integration, ElevenLabs live generation, historical preview video, and Blender automation.

## Recent Updates

<!-- Newest first. Format: `- YYYY-MM-DD — summary (link to PR/issue if available)` -->

- 2026-09-11 — Implemented the [3D modeling roadmap #5](https://github.com/evanstonestreet16/4DTraveler/issues/5) in a scoped PR stack, including the 1892 hero pipeline and user-selected 1850 blockout. Published measurements, resource-lifecycle investigation and desktop/mobile browser evidence; review gates remain explicit.
