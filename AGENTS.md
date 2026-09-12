# Contributor and Agent Rules

Rules for anyone (human or agent) contributing to 4DTraveler. For the project's goal, current scope, and what is out of scope, see [PROJECT_STATUS.md](PROJECT_STATUS.md); update that file whenever project information changes.

## Architectural Rules

- Keep historical content and world layout in `src/data/`, separate from rendering.
- Centralize contracts in `src/types/world.ts`; update consumers and docs together when changing them.
- Centralize camera movement in `CameraController`; camera positions belong in world data.
- Keep generic UI free of Pittsburgh-specific assumptions and components small and focused.
- Blender is an optional future authoring pipeline; GLB files are runtime assets. Do not couple the frontend to Blender.
- Avoid premature backend/database abstractions and unnecessary dependencies.
- Preserve clear integration boundaries for contributors; avoid monolithic scene components.

## Development Rules

- Keep TypeScript strict; avoid `any` unless unavoidable and documented.
- Run formatting, lint, typecheck, tests, and build before completing code changes.
- Do not silently change the world contract or scatter camera mutation across components.
- Never commit secrets. Use `.env` and `.env.example` if environment configuration becomes necessary.
- Keep future external integrations behind small adapters/modules.

## Parallel Work Ownership

Use four workstreams after Dummy v0 is merged. Each workstream owns its listed files and decisions. A contributor may read or consume another workstream's output, but should not redesign or rewrite it inside an unrelated PR.

### Workstream 1 — Project Owner + Astra: 3D World / Visual Pipeline

**Main deliverable:** a high-quality hero historical world and a repeatable asset path from Blender or another authoring tool into the browser.

**Owns:**

- `public/models/`, model textures, material assets, and asset-pipeline documentation.
- Components that load and compose GLB assets in `src/components/world/`.
- World geometry, scale, coordinates, lighting, fog, atmosphere, shadows, and scene performance.
- The visual placement of POIs and selectable meshes, including each mesh's `sceneObjectId` mapping.
- Model export settings, compression, browser budgets, loading validation, and visual fallback assets.

**Boundary:** this workstream supplies POI camera positions and targets as world data, but Workstream 2 owns the transition behavior and navigation UX. It exposes selectable scene nodes by stable IDs, but Workstream 3 owns what selection does. It does not own historical prose or narration scripts.

### Workstream 2 — Person 2: Core Experience / Navigation

**Main deliverable:** a polished and understandable path from globe → location → era → world → POI.

**Owns:**

- `src/components/location/`, `src/components/timeline/`, and world-loading UI.
- Globe/location selection, era timeline, navigation hierarchy, loading/progress states, and route or deep-link behavior if introduced.
- `CameraController` behavior: easing, duration, interruption, reduced motion, return-to-overview, and repeated POI transitions.
- Responsive layout and transitions around the world canvas, excluding object information and narration content.
- User-facing recovery when a world or model cannot load.

**Boundary:** consume camera presets from world data; do not place Pittsburgh-specific camera coordinates in UI code. Do not edit GLB geometry or asset composition. Selecting a POI may update shared state, but object selection and information behavior belong to Workstream 3.

### Workstream 3 — Person 3: Objects + Intelligence

**Main deliverable:** reliable object discovery, selection, explanation, and contextual Q&A.

**Owns:**

- `SelectableObject`, selection/highlight behavior, object affordances, and the object information panel.
- Object selection state and the mapping from stable object IDs to displayed information.
- Q&A UI, request lifecycle, prompt construction, context assembly, citations/source display, and Gemini/Grok adapters when explicitly approved.
- Graceful states for missing object metadata, unavailable AI services, unsafe/unsupported questions, and network errors.
- Tests for selection, highlighting, object switching, panel behavior, and Q&A context boundaries.

**Boundary:** Workstream 4 authors and verifies historical facts, descriptions, source references, and narration text. Workstream 3 defines how that content is consumed. It must not rename POI/object IDs or alter scene coordinates. External providers stay behind small adapters and the static information panel must remain usable without them.

### Workstream 4 — Person 4: Content + Audio + Reliability

**Main deliverable:** credible structured content, dependable audio, deployment, and a stable demo build.

**Owns:**

- Historical descriptions, `whyItMatters`, source references, editorial review, and content completeness.
- Narration scripts and files in `public/audio/`, ambient audio, playback policy/content, and ElevenLabs adapters when explicitly approved.
- Deployment configuration, environment documentation, CI, cross-browser checks, acceptance tests, smoke tests, and demo runbooks.
- Release triage, performance/error monitoring if introduced, and final pre-demo verification.

**Boundary:** content files may reference existing POI/object IDs but must not rename them. This workstream owns end-to-end release confidence; each feature owner still writes and runs focused tests for their changes. Deployment changes must not hide failing checks or require secrets for local development.

## Shared Contracts and Integration

The integration owner is Astra unless the team explicitly assigns someone else. The integration owner reviews changes to shared contracts and resolves cross-workstream conflicts; this does not transfer feature ownership.

Shared integration contracts are:

- Types in `src/types/world.ts`.
- World IDs, location IDs, era IDs, POI IDs, object IDs, and `sceneObjectId` values.
- Model, texture, audio, and source-reference paths.
- Camera presets and coordinate conventions.
- App state/action shapes used across workstreams.

Before changing a shared contract, open a small contract PR or agree on the exact change with every affected workstream. The contract PR must update types, example world data, all current consumers, validation tests, and relevant docs together. Do not merge parallel PRs that each invent a different version of the same contract.

Keep world data split into scene and content modules with one composition module, as in `src/data/worlds/pittsburgh-1892.{scene,content}.ts` and `pittsburgh-1892.ts`. Preserve the exported `HistoricalWorld` and all stable IDs. Workstream 1 owns scene fields and shared geography; Workstream 4 owns prose, sources, and narration fields.

Prefer this integration order when work is dependent:

1. Contract or data-shape changes.
2. Content and asset-path additions.
3. 3D loading/composition and feature adapters.
4. Experience integration and release verification.

Keep PRs scoped to one workstream or one agreed contract change. In every PR description, name the owning workstream, list shared IDs/contracts changed, link dependent PRs, and state how the primary user path was tested. Rebase or update from `main` before final verification. Avoid drive-by edits in another workstream's files; request a small follow-up from that owner when practical.

## Verification

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Manually verify the complete browser path, including visible object highlighting, repeated POI transitions, narration play/pause, and return to overview. Use `npm run test:e2e` for browser regression coverage when available.
