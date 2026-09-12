# Project Overview

## Concept

Build an interactive historical world explorer that lets a user:

1. Select a location on a globe.
2. Browse historically relevant time periods for that location.
3. Enter a 3D bird's-eye reconstruction of that place and era.
4. Select points of interest (POIs) and smoothly zoom into them.
5. Highlight objects in the immersive scene to learn what they are and why they matter.
6. Hear contextual voice narration while exploring.

The long-term vision is:

> Explore not only where the world is, but where the world was.

This is a 24-hour hackathon project, so the implementation should optimize for a polished vertical slice rather than broad geographic or historical coverage.

---

## Core User Experience

### 1. Location Selection

The user starts from a globe or globe-like location selector.

For the hackathon version, only a small number of supported locations need to appear.

Selecting a location should reveal historically meaningful time periods for that place.

Example:

```text
Pittsburgh
1758 ─── 1850 ─── 1892 ─── 1945 ─── 2026
                       ▲
                Industrial boom
```

---

### 2. Time Period Selection

Each location has a curated list of relevant eras.

The time periods do not need to be continuous or dynamically generated. They should represent moments where the place changed meaningfully.

For the hackathon, depth is more important than breadth.

A strong demo can have:

- several apparent locations/eras in the UI
- one deeply polished location + era as the hero path

---

### 3. Bird's-Eye Historical World

After selecting a location and era, the user enters a 3D world rendered in the browser.

The default perspective is a bird's-eye or elevated cinematic view.

The world contains several selectable POIs.

Example:

```text
                    ● Steel Mill

         buildings / streets / terrain

               ● Downtown

~~~~~~~~~~~~ Monongahela River ~~~~~~~~~~~~

                    ● Bridge
```

The world does not need to be a perfectly accurate full-city simulation.

The goal is a believable, visually compelling historical reconstruction.

---

### 4. POI Exploration

Selecting a POI should trigger a smooth camera movement from the overview into a closer immersive view.

The POI may have significantly more visual detail than the surrounding city.

This is intentional.

Hackathon strategy:

- lower-detail environment at city scale
- higher-detail hero POIs
- avoid trying to model an entire city at POI-level fidelity

---

### 5. Object Inspection

Objects inside a POI can be highlighted or selected.

Selecting an object opens an information panel containing:

- object name
- short historical explanation
- why it mattered in this place/time
- optional follow-up question interface

Eventually, an LLM can answer follow-up questions using the selected object and scene metadata as context.

Example:

```text
Blast Furnace

Used to smelt iron using coke and extremely high heat.

Why it matters:
Blast furnaces were central to Pittsburgh's steel industry.

[ Ask a question about this object... ]
```

---

### 6. Narration

Voice narration should provide historical context while the user explores.

Possible triggers:

- entering a world
- selecting a POI
- arriving at a POI
- selecting an important object

Final architecture may use ElevenLabs for narration.

For the hackathon demo, important narration may be pre-generated and cached so the live demo does not depend on network latency or an API succeeding.

---

## Feature Priority

### Must Have

1. Location selection
2. Time-period selection
3. 3D historical environment
4. Bird's-eye overview
5. POI markers
6. Smooth POI camera transition
7. Selectable/highlightable scene objects
8. Historical information panel
9. Narration

### Nice to Have

- LLM-powered follow-up object questions
- multiple historical eras
- multiple locations
- richer scene transitions
- atmospheric environmental audio

### Only If Time Remains

- WASD/free movement
- historical context preview video
- procedural/dynamic world generation

### Explicit Non-Goal

Do **not** build character interaction systems or NPC conversations for the hackathon MVP.

---

## Technical Direction

### Frontend

- React
- TypeScript
- Three.js
- Prefer React Three Fiber for integrating Three.js into React
- Optional helper libraries such as Drei where useful

Responsibilities:

- application UI
- location and era selection
- 3D rendering
- camera behavior
- POI selection
- object selection/highlighting
- information panels
- narration playback

---

### 3D Asset Pipeline

Blender is an asset creation/preparation tool, not the runtime.

Its role may include:

- creating or modifying buildings
- assembling POI scenes
- adjusting scale
- applying materials/textures
- reducing polygon counts
- fixing generated/imported assets
- exporting browser-friendly `.glb` files

Runtime flow:

```text
Blender / generated assets
          ↓
       .glb files
          ↓
 React + React Three Fiber
          ↓
 Interactive browser scene
```

Do not require Blender in Dummy v0.

Dummy v0 should use primitive geometry first.

---

### World Data

The frontend should eventually consume a predictable world definition.

Conceptually, each world should have:

```text
world.glb
world.json
optional narration/audio files
```

`world.json` should describe things such as:

- location
- era
- starting camera
- POIs
- POI camera targets
- selectable objects
- historical metadata
- narration references

The frontend should not care whether the world was:

- hand-authored
- assembled in Blender
- generated by Astra
- generated by another tool

Everything should conform to the same runtime contract.

---

### Database

Planned database:

- MongoDB

Use MongoDB for metadata, not raw 3D scene files.

Likely MongoDB data:

- locations
- time periods
- POIs
- selectable objects
- descriptions
- historical context
- source references
- narration metadata

Likely file/object storage:

- `.glb` models
- textures
- audio
- images

For Dummy v0, do **not** add MongoDB.

Use local static data.

---

### LLM Layer

Planned use:

- Gemini or Grok API
- object-specific questions
- contextual historical explanations

Input should eventually include:

- selected location
- selected era
- selected POI
- selected object
- curated historical context for that object/world
- user question

Dummy v0 should **not** call an LLM.

Simulate this with static text.

---

### Audio

Planned:

- ElevenLabs

For Dummy v0:

- use a local audio file or browser-safe placeholder
- prove the audio-control flow
- do not depend on an external API

---

## Important Product Principle

Do not try to dynamically generate arbitrary historically accurate cities during the hackathon.

Instead:

> Build one excellent historical experience and design the architecture so additional worlds can be plugged in later.

A strong demo is preferable to an ambitious but unstable generator.

---

## Hero Demo Philosophy

The ideal demo flow is:

```text
Globe
  ↓
Select Pittsburgh
  ↓
Select 1892
  ↓
Historical world loads
  ↓
Bird's-eye city view
  ↓
Select Steel Mill
  ↓
Cinematic camera descent
  ↓
Detailed POI
  ↓
Select Blast Furnace
  ↓
Historical context appears
  ↓
Narration plays
  ↓
Ask a contextual question
```

The UI can imply that many worlds are possible even if the hackathon only fully implements one.

---

## Visual Quality Strategy

Realism is primarily driven by:

- good assets
- strong composition
- good textures
- lighting
- atmospheric fog
- particles/smoke where appropriate
- ambient audio
- smooth camera movement

Do not spend the first development hours on realism.

First prove the complete interaction loop using simple primitives.

Then replace primitive geometry with higher-quality assets.

---

## Success Criteria

The project succeeds if a judge can understand the concept without explanation and complete this flow:

1. choose a place
2. choose a time
3. enter its historical world
4. identify interesting POIs
5. zoom into one
6. inspect an object
7. learn something useful
8. hear contextual narration

The experience should feel cohesive, fast, visually memorable, and reliable.
