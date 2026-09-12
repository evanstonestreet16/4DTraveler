# Dummy v0 Implementation Specification

## Purpose

Build the smallest complete version of the product before parallel development begins.

Dummy v0 is **not** supposed to look impressive.

Its purpose is to prove:

- the React application structure
- the 3D scene integration
- the world-data contract
- the interaction flow
- the camera architecture
- POI selection
- object selection
- information-panel behavior
- audio playback
- clean boundaries between future team workstreams

Once Dummy v0 works end-to-end, the repo should be safe for multiple developers/agents to work in parallel.

---

# Primary Instruction to Astra

Implement Dummy v0 end-to-end.

Do not optimize for visual polish.

Do not add features outside this specification unless required to make the architecture cleaner or the application functional.

Prefer simple, readable, well-separated code over clever abstractions.

Before substantial implementation:

1. inspect the repository
2. create the repo structure described below
3. create a root `AGENTS.md`
4. create/update the README
5. establish shared types/data contracts
6. then implement the vertical slice

Do not introduce MongoDB, Blender automation, an LLM API, ElevenLabs API, authentication, or deployment infrastructure in Dummy v0.

---

# Dummy v0 User Flow

The complete flow must work:

```text
Landing
   ↓
Select Pittsburgh
   ↓
Select 1892
   ↓
Load simple 3D world
   ↓
Bird's-eye camera
   ↓
See 3 POI markers
   ↓
Click POI
   ↓
Smooth camera transition
   ↓
Click/select an object
   ↓
Object becomes visibly highlighted
   ↓
Information panel opens
   ↓
Play narration audio
   ↓
Return to overview / choose another POI
```

This is the acceptance path.

---

# Dummy Content

Use exactly one implemented location:

```text
Pittsburgh
```

Use exactly one implemented era:

```text
1892
```

It is acceptable for the UI to be structured so more locations/eras can be added later, but do not spend meaningful time building unsupported content.

---

# Dummy 3D World

Do not use Blender or downloaded 3D assets for Dummy v0.

Construct the scene from simple geometry:

- plane for ground
- boxes for buildings
- cylinders or boxes for industrial structures
- optional simple river strip
- basic lights
- basic sky/background/fog

The goal is to prove scene interaction, not realism.

The world should contain three POIs:

1. Steel Mill
2. Downtown
3. River / Bridge

At least the Steel Mill POI must contain multiple selectable objects.

Example selectable objects:

- Blast Furnace
- Smokestack
- Rail Car

---

# Camera Behavior

There should be two conceptual camera modes:

```text
OVERVIEW
POI
```

## Overview

Start with an elevated bird's-eye perspective where all major POIs are visible.

## POI

Clicking a POI smoothly transitions the camera to a predefined position and target for that POI.

Do not implement WASD movement in Dummy v0.

Do not implement physics.

Do not implement collision detection.

A button/control must let the user return to overview.

Camera positioning must come from world data rather than being hardcoded throughout UI components.

---

# POI Markers

POIs should be visually identifiable in the 3D scene.

Each marker should:

- show or clearly correspond to the POI name
- be clickable
- transition the camera to the POI
- update app state with the active POI

Do not create an elaborate map-marker system.

Simple HTML overlays or Three.js markers are sufficient.

---

# Selectable Objects

At least three scene objects should be selectable.

Required behavior:

1. object is clicked
2. selected object ID enters app state
3. object receives a visible highlight
4. information panel opens
5. panel content is populated from static world data

Highlighting may be implemented with any simple reliable technique:

- emissive material
- outline
- temporary material change
- wireframe overlay

Prefer reliability over visual sophistication.

---

# Historical Information Panel

Object information must come from the static world definition.

Panel should contain:

- object name
- one short description
- one "why it matters" field
- close button

Example:

```text
Blast Furnace

A furnace used to smelt iron ore at extremely high temperatures.

Why it matters:
Blast furnaces were a core part of Pittsburgh's steel-production infrastructure.
```

Do not call an LLM.

A future LLM feature should be able to replace/extend this panel without rewriting the 3D scene code.

---

# Narration

Dummy v0 must prove audio playback.

Use one local audio file if convenient.

Acceptable alternatives:

- a short checked-in MP3
- a small generated/local placeholder
- a clearly labeled temporary narration audio asset

At minimum provide:

```text
Play Narration
Pause Narration
```

The audio source should be referenced in the world data/configuration rather than buried inside a UI component.

Do not integrate ElevenLabs yet.

---

# Required World Contract

Create explicit TypeScript types for the world definition.

A suggested shape is below.

You may improve field names or split types if needed, but preserve the conceptual model.

```ts
type Vec3 = [number, number, number];

interface HistoricalWorld {
  id: string;
  locationId: string;
  locationName: string;

  era: {
    id: string;
    label: string;
    year: number;
    subtitle?: string;
  };

  scene: {
    overviewCamera: {
      position: Vec3;
      target: Vec3;
    };

    narrationAudio?: string;
  };

  pois: PointOfInterest[];

  objects: HistoricalObject[];
}

interface PointOfInterest {
  id: string;
  name: string;

  markerPosition: Vec3;

  camera: {
    position: Vec3;
    target: Vec3;
  };

  objectIds: string[];
}

interface HistoricalObject {
  id: string;
  name: string;

  poiId: string;

  sceneObjectId: string;

  description: string;
  whyItMatters: string;
}
```

Important principle:

> UI and 3D interaction code should consume this contract rather than containing Pittsburgh-specific assumptions.

---

# State Model

Keep app state simple.

At minimum:

```text
selectedLocationId
selectedEraId
activeWorld
activePOIId
selectedObjectId
cameraMode
audioState
```

Avoid adding a heavy state-management library unless truly needed.

React state/context is sufficient for Dummy v0.

---

# Recommended Repository Structure

Create a structure similar to:

```text
/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.*
├── public/
│   ├── audio/
│   │   └── pittsburgh-1892-intro.*
│   └── models/
│       └── README.md
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── AppContext.tsx
│   │
│   ├── components/
│   │   ├── location/
│   │   │   └── LocationSelector.tsx
│   │   ├── timeline/
│   │   │   └── EraSelector.tsx
│   │   ├── world/
│   │   │   ├── WorldCanvas.tsx
│   │   │   ├── WorldScene.tsx
│   │   │   ├── CameraController.tsx
│   │   │   ├── POIMarker.tsx
│   │   │   └── SelectableObject.tsx
│   │   ├── info/
│   │   │   └── ObjectInfoPanel.tsx
│   │   └── audio/
│   │       └── NarrationControls.tsx
│   │
│   ├── data/
│   │   ├── locations.ts
│   │   └── worlds/
│   │       └── pittsburgh-1892.ts
│   │
│   ├── types/
│   │   └── world.ts
│   │
│   ├── hooks/
│   │   └── useWorld.ts
│   │
│   ├── utils/
│   │   └── camera.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── main.tsx
│
└── docs/
    ├── PROJECT_OVERVIEW.md
    └── DUMMY_V0_SPEC.md
```

This structure is guidance, not an excuse for unnecessary empty files.

If a simpler structure achieves the same separation, use it.

---

# Separation of Responsibilities

## `data/`

Pure static product/world data.

No React.

No Three.js rendering code.

---

## `types/`

Shared contracts.

This should become the source of truth for future world-generation, Blender, backend, and frontend work.

---

## `components/world/`

Owns rendering and scene interactions.

Should not contain long historical descriptions.

---

## `components/info/`

Owns presentation of metadata about selected objects.

Should not know how a Three.js mesh was constructed.

---

## `CameraController`

Own camera transitions in one place.

Do not scatter camera mutation logic across marker components.

---

## `SelectableObject`

Wrap or standardize behavior for:

- hover if desired
- click
- selected state
- highlight

Future imported GLB meshes should be able to use the same conceptual selection flow.

---

# Root AGENTS.md Requirements

Create `/AGENTS.md` before significant implementation.

It should instruct all future coding agents working in this repository.

The file should be concise and operational.

It must include the following sections.

---

## 1. Project Goal

Explain in a few sentences:

- this is an interactive historical 3D exploration app
- React/TypeScript + React Three Fiber/Three.js is the runtime
- worlds should conform to shared world contracts
- hackathon reliability and polished vertical slices matter more than generalized infrastructure

---

## 2. Current Scope

State explicitly:

Dummy v0 currently supports:

```text
Pittsburgh / 1892
```

Current priorities:

```text
location → era → overview → POI → object → info → narration
```

Do not add speculative functionality without a clear need.

---

## 3. Architectural Rules

Include rules equivalent to:

- keep historical/world data separate from rendering logic
- centralize shared TypeScript contracts
- centralize camera transitions
- avoid Pittsburgh-specific logic in generic UI components
- do not couple the frontend to Blender
- GLB files are runtime assets; Blender is only an authoring pipeline
- avoid premature backend/database abstractions
- avoid unnecessary dependencies
- prefer small focused components
- preserve clear integration boundaries for parallel contributors

---

## 4. Out of Scope Unless Explicitly Requested

List:

- MongoDB
- authentication
- multiplayer
- WASD
- physics
- NPCs
- character interactions
- dynamic city generation
- Gemini/Grok integration
- ElevenLabs live generation
- historical preview video
- Blender automation

---

## 5. Development Rules

Include:

- TypeScript strictness should remain enabled
- avoid `any` unless unavoidable and documented
- run formatter/linter/typecheck before completing changes
- do not silently change the world-data contract
- if the contract must change, update all consumers and docs
- no giant monolithic scene component
- do not hardcode camera positions outside world data unless they are true UI defaults
- do not commit secrets
- environment variables belong in `.env` with `.env.example` where appropriate
- keep future external service integrations behind small adapters/modules

---

## 6. Parallel Work Guidance

Explain likely future workstreams:

```text
3D / Blender assets
Frontend experience
Historical content/data
LLM object Q&A
Narration/audio
```

Agents should minimize overlapping ownership.

The shared integration contracts are:

```text
world types
world metadata
asset paths
POI IDs
object IDs
```

---

## 7. Verification

Before an agent considers work complete, it should check:

```text
npm run build
npm run lint      (if configured)
npm run typecheck (if configured separately)
```

Also manually verify the primary interaction path.

---

# README Requirements

Create or update `README.md`.

Keep it concise.

It should include:

- one-paragraph project description
- current Dummy v0 scope
- tech stack
- installation
- dev command
- build command
- high-level repo structure
- link/reference to `docs/PROJECT_OVERVIEW.md`
- link/reference to `docs/DUMMY_V0_SPEC.md`

Do not turn the README into a product essay.

---

# Tooling

Preferred baseline:

```text
React
TypeScript
Vite
Three.js
@react-three/fiber
@react-three/drei (only where useful)
```

Avoid installing large libraries for things easily handled locally.

Use the existing package manager if the repo already establishes one.

If starting fresh, npm is acceptable.

---

# Visual Design for Dummy v0

Keep UI clean but simple.

Recommended layout:

```text
┌───────────────────────────────────────────────┐
│ Location / Era navigation                    │
├───────────────────────────────────────────────┤
│                                               │
│                  3D WORLD                     │
│                                               │
│                        ┌────────────────────┐ │
│                        │ Object info panel  │ │
│                        └────────────────────┘ │
│                                               │
├───────────────────────────────────────────────┤
│ Narration controls                            │
└───────────────────────────────────────────────┘
```

Do not spend substantial time on branding, fancy animations, or design-system work.

Camera transitions are the one animation worth prioritizing.

---

# Error Handling

Dummy v0 should fail gracefully.

At minimum:

- missing world data should show a useful message
- missing audio should not break the app
- selecting an invalid object ID should not crash
- Three.js scene errors should not leave a blank page without feedback if reasonably preventable

---

# Performance

Keep scene complexity intentionally tiny.

Do not prematurely optimize.

Still avoid obvious issues such as:

- recreating geometry every render unnecessarily
- adding uncontrolled animation loops
- expensive state updates every frame
- putting large React state mutations inside `useFrame`

---

# What Dummy v0 Must NOT Become

Do not spend Dummy v0 time on:

```text
historical accuracy research
beautiful Blender scenes
production backend
live AI calls
advanced audio generation
procedural world generation
realistic city-scale assets
game mechanics
NPC systems
deployment complexity
```

Dummy v0 exists to create the skeleton that all of those can plug into later.

---

# Definition of Done

Dummy v0 is complete only when all of these work in the browser:

- [ ] App starts locally from documented command
- [ ] Pittsburgh can be selected
- [ ] 1892 can be selected
- [ ] Simple 3D world renders
- [ ] Initial bird's-eye camera works
- [ ] Three POIs are visible/selectable
- [ ] Clicking a POI smoothly moves the camera
- [ ] User can return to overview
- [ ] At least three historical objects are selectable
- [ ] Selected object is visibly highlighted
- [ ] Object information panel appears from static world data
- [ ] Local narration can play/pause
- [ ] World contract lives in shared TypeScript types
- [ ] Pittsburgh world data is separated from scene components
- [ ] Root `AGENTS.md` exists and follows this specification
- [ ] README documents setup
- [ ] Production build succeeds
- [ ] No external API keys are required
- [ ] No MongoDB is required
- [ ] No Blender files are required

---

# After Dummy v0

Do not implement these now, but ensure the architecture allows them.

Likely next parallel tracks:

## Track A — Visual World

Replace primitive scene geometry with high-quality GLB assets and a hero historical POI.

## Track B — Experience

Improve globe/location selection, timeline, camera transitions, loading states, and UI polish.

## Track C — Historical Intelligence

Add structured historical metadata and object-specific LLM Q&A.

## Track D — Audio

Replace dummy narration with ElevenLabs-generated narration and ambient sound.

The goal of Dummy v0 is to let all four tracks begin without requiring a major rewrite.
