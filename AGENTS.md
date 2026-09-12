# Project Goal

4DTraveler is an interactive historical 3D explorer built with React, strict TypeScript, and React Three Fiber / Three.js. Worlds conform to shared contracts. Favor reliable hackathon vertical slices over generalized infrastructure.

## Current Scope

Dummy v0 supports Pittsburgh / 1892: location → era → overview → POI → object → info → narration. Add speculative functionality only when explicitly needed.

## Architectural Rules

- Keep historical content and world layout in `src/data/`, separate from rendering.
- Centralize contracts in `src/types/world.ts`; update consumers and docs together when changing them.
- Centralize camera movement in `CameraController`; camera positions belong in world data.
- Keep generic UI free of Pittsburgh-specific assumptions and components small and focused.
- Blender is an optional future authoring pipeline; GLB files are runtime assets. Do not couple the frontend to Blender.
- Avoid premature backend/database abstractions and unnecessary dependencies.
- Preserve clear integration boundaries for contributors; avoid monolithic scene components.

## Out of Scope Unless Explicitly Requested

MongoDB, authentication, multiplayer, WASD, physics, NPCs, character interactions, dynamic city generation, Gemini/Grok integration, ElevenLabs live generation, historical preview video, and Blender automation.

## Development Rules

- Keep TypeScript strict; avoid `any` unless unavoidable and documented.
- Run formatting, lint, typecheck, tests, and build before completing code changes.
- Do not silently change the world contract or scatter camera mutation across components.
- Never commit secrets. Use `.env` and `.env.example` if environment configuration becomes necessary.
- Keep future external integrations behind small adapters/modules.

## Parallel Work Guidance

Future workstreams: 3D / Blender assets, frontend experience, historical content/data, LLM object Q&A, narration/audio. Minimize overlapping file ownership. Coordinate shared world types, world metadata, asset paths, POI IDs, and object IDs before changing them.

## Verification

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Manually verify the complete browser path, including visible object highlighting, repeated POI transitions, narration play/pause, and return to overview. Use `npm run test:e2e` for browser regression coverage when available.
