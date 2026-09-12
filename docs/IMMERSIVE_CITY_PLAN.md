# Immersive Historical City Plan

**Status:** Shared runtime and Rome P0–P2 implemented; Kyoto remains planned\
**Initial cities:** Rome, 125 CE (Imperial Rome); Kyoto, circa 1700 (Edo period)  
**Architecture:** City-agnostic viewer with offline Blender-rendered stills/360° panoramas; real-time GLBs only where needed

## 1. Goal

Create a repeatable experience in which a visitor chooses a historical city, enters a full-screen static bird's-eye overview, selects a point of interest (POI), and transitions into a full-screen, fixed-position 360-degree view at that POI. From the fixed viewpoint, the visitor can look around, inspect nearby historical objects, and listen to narration.

Rome and Kyoto are the first two city configurations. Their landmarks, objects, historical framing, visual references, and narration require separate city-specific briefs. The renderer, interaction model, data contracts, Blender pipeline, loading behavior, and acceptance criteria should remain shared.

## 2. Product Principles

- Treat the bird's-eye overview and ground-level POV as two presentations of the same historical world.
- Make the visual fill the viewport in both modes. Interface elements should be overlays, not permanent columns that reduce it.
- Preserve the cinematic clarity of a composed aerial overview.
- Create a game-like sense of presence at POIs without adding movement, physics, or an avatar.
- Build and render each POV as a convincing 360-degree historical set, not as a fully traversable city.
- Keep historical content and world layout in data, separate from rendering.
- Use Blender as an offline authoring and rendering tool. Prefer a compressed equirectangular panorama at runtime; use a GLB only when real geometry adds necessary interaction.
- Prefer one polished end-to-end path per city over a large but visibly unfinished city.

### Realism decision

The current Rome GLBs prove the navigation and content flow, but their procedural geometry is a blockout rather than the target visual quality. The preferred next step is:

- Render one high-quality overview still per city in Blender.
- Render one equirectangular 360° panorama from the exact fixed camera for each POI.
- Display the panorama in a lightweight look-around viewer and place object hotspots in yaw/pitch coordinates.
- Keep the existing content panels, narration, fixed-look controls, and overview return flow.

This is simpler to make realistic because offline rendering can use detailed geometry, richer materials, high-quality lighting, compositing, crowds, and vegetation without shipping or drawing those assets in the browser. It also removes real-time lighting, polygon, draw-call, and GPU compatibility work. The accepted limits are no positional movement or parallax, hotspot selection instead of mesh selection, and the need for sufficient panorama resolution. Those limits fit the already-fixed POI camera.

## 3. Core Experience

### 3.1 City selection

1. The visitor chooses a city and era.
2. The selected city world begins loading.
3. A city-specific loading presentation communicates progress and offers recovery if the detailed asset fails.

Initial choices:

- **Rome — 125 CE, Imperial Rome**
- **Kyoto — circa 1700, Edo-period Kyoto**

### 3.2 Bird's-eye overview

The overview is a full-screen, immersive aerial composition.

- The rendered overview occupies the complete viewport (`100vw` by `100dvh`).
- The camera is static: visitors cannot pan, orbit, zoom, or move it.
- POI markers are the primary interaction.
- Essential controls appear as lightweight overlays: city/era identity, exit or back, sound, and help.
- The composition must remain attractive at the supported aspect ratios without exposing scene boundaries.
- Selecting a POI begins a deliberate cinematic cut into its immersive POV.
- If the POI asset loads separately, the transition masks loading without showing an empty scene.

### 3.3 Immersive POI view

The POV is full-screen and game-like, but the visitor remains at a fixed position.

- The camera begins at approximately human eye level.
- Desktop visitors look around by click-dragging; optional pointer lock may be offered after an explicit click.
- Touch visitors look around by dragging on the scene.
- Horizontal rotation supports a complete 360 degrees.
- Vertical rotation is clamped to a comfortable range and cannot flip the camera.
- There is no translation, WASD movement, collision system, jumping, or avatar.
- A minimal hotspot or hover affordance indicates inspectable objects.
- A persistent, unobtrusive control returns to the bird's-eye overview.
- Escape releases pointer lock before exiting POV mode.
- Closing an object panel preserves the current viewing direction.

### 3.4 Object inspection

- Each POV contains a small set of historically meaningful inspectable objects.
- Objects use stable IDs that map panorama hotspot coordinates, or scene nodes when a GLB is justified, to structured content.
- Hover or focus provides a visible affordance without obscuring the scene.
- Selection activates the hotspot and opens an overlay panel. A GLB-backed scene may highlight its actual mesh.
- The panel contains a title, concise description, `whyItMatters`, and sources.
- The panel is dismissible and does not unmount or reset the 3D world.
- Keyboard users can reach equivalent object controls through an accessible object list or scene-adjacent overlay.
- Missing metadata produces a graceful message rather than breaking selection.

### 3.5 Narration

- Each city may have a short overview narration.
- Each immersive POV has a short location-specific narration.
- Playback controls remain available as a compact overlay in both modes.
- Narration does not autoplay with sound. The visitor explicitly starts playback.
- Entering a POV may prepare its narration but must not unexpectedly replace audio already playing.
- Play, pause, progress, replay, transcript, and failure/retry states are supported.
- Every narration has a checked-in transcript and source-aware script.

## 4. Hackathon Scope

### Required vertical slice

- Two selectable cities: Rome and Kyoto.
- One full-screen, static bird's-eye overview per city.
- At least one polished immersive POV per city.
- A shared 360-degree fixed-look controller for mouse and touch.
- At least three inspectable objects in each polished POV.
- Narration and transcript for each polished POV.
- Transition from overview to POV and back without losing the selected city.
- Loading, image/panorama-failure, audio-failure, and viewer-failure recovery.
- Desktop and mobile-responsive presentation.

### Stretch scope

- Two or three POVs per city.
- Pointer-lock look mode in addition to click-drag.
- Directional ambient audio or multiple ambient zones.
- Subtle environmental animation such as smoke, water, cloth, foliage, or distant crowds.
- Deep links to a city, era, or POI.
- Higher-quality texture and lighting tiers for capable devices.

### Explicit non-goals

- Walking or WASD movement
- Physics and general collision
- Enterable building interiors
- NPC behavior or character interaction
- Multiplayer
- VR
- A continuous, fully modeled city at street-level detail
- Dynamic or AI-generated geometry at runtime
- Blender as a browser/runtime dependency
- A surveyed reconstruction or certainty about undocumented visual details

## 5. City-Agnostic World Contract

Any contract change must be agreed as a small integration change before parallel city work begins. Update `src/types/world.ts`, active Rome/Kyoto data and consumers, one focused validation test, and this documentation together. Do not expand the change into Pittsburgh migration work.

The shared contract should express the following concepts without embedding Rome- or Kyoto-specific assumptions:

```ts
interface HistoricalCityWorld {
  id: string;
  cityId: string;
  cityName: string;
  era: HistoricalEra;
  overview: OverviewPresentation;
  pois: ImmersivePOI[];
  objects: HistoricalObject[];
}

interface OverviewPresentation {
  image: RenderedImageAsset;
  camera: CameraView;
  narration?: NarrationAsset;
}

interface ImmersivePOI {
  id: string;
  name: string;
  markerPosition: Vector3Tuple;
  preview?: string;
  panorama: PanoramaAsset;
  immersiveCamera: {
    position: Vector3Tuple;
    initialTarget: Vector3Tuple;
    minPitch: number;
    maxPitch: number;
  };
  objectIds: string[];
  hotspots: PanoramaHotspot[];
  narration?: NarrationAsset;
}
```

The exact names may change during the contract review. The required separation is more important than this illustrative shape:

- Overview render and static overview framing
- POI-specific equirectangular panorama and fixed camera anchor
- Look constraints separate from camera position
- Stable object/hotspot mapping, with optional node mapping for GLB-backed scenes
- Narration and transcript paths
- Loading and fallback information

The Rome rendered milestone implements this additively in `src/types/world.ts`:
`ScenePresentation.overviewImage` carries desktop/mobile images, a small fallback,
and normalized marker coordinates for each composition. `ScenePresentation.panorama`
carries desktop/mobile 2:1 images, an initial-view fallback still, and stable
`objectId` hotspots. Every image records its URL and encoded width/height. Hotspot
angles are radians: yaw zero faces north (`-Z`), positive yaw turns west (`-X`),
and positive pitch looks up. Panorama centers face north. Existing cameras, object
IDs, scene/content composition and optional GLB fields remain supported. Kyoto
can consume the same fields when its assets are authored.

Camera positions belong in city world data. Camera transitions and look behavior remain centralized in `CameraController` or a focused controller used by it.

## 6. Runtime Architecture

### 6.1 Experience state

Use an explicit presentation mode rather than treating fullscreen as the mode itself:

```text
CITY_SELECTION
    -> OVERVIEW_LOADING
    -> OVERVIEW
    -> POV_LOADING
    -> POV
    -> OVERVIEW
```

Fullscreen is presentation state layered over the experience. The application must still provide a CSS full-viewport fallback when the browser rejects the native Fullscreen API.

State should track at least:

- Selected city/world
- Presentation mode
- Active POI
- Selected object
- Current narration and playback state
- Requested scene quality
- Asset loading or failure state

Do not store continuously changing camera yaw and pitch in global React state. Keep them inside the look controller and preserve them only when required for a mode transition.

### 6.2 Visual loading

- Load the overview image first.
- Load each POI panorama separately so the overview is not blocked by every large image.
- Prefetch the hero panorama after the overview becomes interactive.
- Use responsive image formats and resolutions; avoid decoding every panorama at once on mobile.
- Release inactive panorama textures and listeners when leaving a city.
- Retain a compressed fallback image with accessible object-list selection for the required demo path.

### 6.3 Controls

- Disable all orbit/pan/zoom input in overview mode.
- In POV mode, rotate the camera around a fixed position using yaw and clamped pitch.
- Use pointer events so the same control can support mouse, pen, and touch.
- Distinguish a drag from a click so looking does not accidentally inspect an object.
- Pause decorative animation when the page is hidden or scene is offscreen.
- Honor reduced-motion preferences during overview-to-POV transitions.

### 6.4 Overlays

The visual viewer always owns the full viewport. UI appears in overlay layers:

- Top-left: city, era, and current location
- Top-right: back/exit and settings
- Center: optional reticle or interaction hint
- Bottom: narration controls
- Side or bottom sheet: object information

On small screens, the information panel becomes a dismissible bottom sheet. It must not permanently divide the viewport into canvas and sidebar columns.

## 7. Blender Authoring Pipeline

### 7.1 Pipeline goals

The Blender workflow must be fast to revise and optimized for final image quality. Automate repeated setup when it saves time, but do not build pipeline machinery that costs more time than it saves.

Each city-specific plan supplies references and artistic direction. The general pipeline supplies:

- Reusable scene-building helpers
- Naming and scale conventions
- Fixed camera setup
- Four-direction POV preview renders
- Overview preview render
- Equirectangular panorama render and compression
- Hotspot yaw/pitch capture
- A quick browser preview

### 7.2 Suggested source layout

```text
blender/
  references/
    <city-id>/
  scripts/
    lib/
    build-overview.py
    build-pov.py
    render-review.py
    render-panorama.py
  source/
    <world-id>/
      overview.blend
      <poi-id>.blend
  previews/
    <world-id>/
      overview.png
      <poi-id>-north.png
      <poi-id>-east.png
      <poi-id>-south.png
      <poi-id>-west.png
```

Runtime outputs remain under:

```text
public/images/<world-id>/overview.webp
public/images/<world-id>/<poi-id>-360.webp
public/audio/<world-id>/...
```

### 7.3 Authoring conventions

- Use meters and real-world scale.
- Model in Blender's native coordinate system and verify the glTF conversion into the runtime's `+Y`-up convention.
- Use a fixed POV camera at approximately 1.65 meters above its local ground.
- Use Eevee for rapid previews and Cycles for final renders when its visible gain fits the remaining time.
- Use materials, lighting, compositing, and render-only geometry freely because they do not ship to the browser.
- Record each selectable object's yaw/pitch hotspot from the final camera.
- Use modular and instanced architecture for repeated structures.
- Concentrate geometry and texture detail near the fixed POV.
- Use simpler silhouettes, skyline cards, terrain, vegetation, and fog for distant context.
- Ensure no reachable look direction reveals a plane edge, blank world, missing back face, or unfinished façade.
- Do not bake labels or POI markers into the panorama; the generic UI owns them.

### 7.4 Review loop

For every POV, Astra should:

1. Build or update the scene from the city-specific brief.
2. Save an editable `.blend` file.
3. Render north, east, south, and west views from the exact fixed camera.
4. Inspect the renders for historical plausibility, scale, intersections, missing surfaces, repeated assets, lighting, and exposed scene boundaries.
5. Correct the scene and repeat the four-view review.
6. Render and compress the final equirectangular panorama.
7. Record hotspot yaw/pitch values and verify their alignment.
8. Inspect the panorama inside the browser at desktop and one mobile viewport.

The browser panorama is the deliverable; the Blender scene remains editable source.

## 8. Asset and Performance Budgets

Initial budgets should be tested on the actual demo hardware and revised only with recorded evidence.

| Asset                       | Target budget                          |
| --------------------------- | -------------------------------------- |
| Overview image              | 1.5 MB or less                         |
| Desktop 360° panorama       | 4K–8K wide, 6 MB or less after testing |
| Mobile 360° panorama        | 2K–4K wide, 3 MB or less               |
| Simultaneously decoded POIs | One by default                         |
| Fallback                    | Small compressed image + object list   |

Performance targets:

- Smooth look-around on the designated hackathon laptop.
- Usable look-around on one mobile viewport.
- No visible panorama seam, blank pole, or unreadable hotspot.
- No permanent blank canvas while assets load or fail.
- No accumulation of decoded panorama textures after changing POIs.

## 9. Historical Content and Narration Workflow

Each city-specific plan must identify:

- Historical and visual sources
- Which details are documented, inferred, or illustrative
- POI names and stable IDs
- Inspectable objects and stable IDs
- Concise descriptions and `whyItMatters`
- Overview and POI narration scripts
- Source references displayed to visitors
- Required pronunciation review

The Blender scene may reference existing IDs but must not invent or rename content IDs after integration begins. Historical review should occur before narration is recorded. Static information and transcripts remain usable when audio is unavailable.

## 10. Workstream Plan

### Shared contract and integration

- Agree on the overview/POV data shape and state transitions.
- Implement the contract change with example data, consumers, tests, and documentation together.
- Establish asset naming, coordinate, and export conventions.
- Integrate city work without embedding city-specific assumptions in generic components.

### 3D world and visual pipeline

- Produce overview renders and equirectangular POI panoramas from city-specific briefs.
- Establish cameras, scale, materials, lighting, atmosphere, and image budgets.
- Record stable hotspot positions for inspectable objects.
- Completed addition (2026-09-12): a dedicated agent upgraded Rome's bird's-eye views against Kyoto's delivered density and finish benchmark, in parallel with the POI work. Detailed desktop/portrait images, editable layout and reviewed image markers are integrated; image budgets, build and desktop/mobile smoke tests passed. Overview-only ownership and the integration handoff are defined in [Rome's delivery plan](./ROME_125_CITY_PLAN.md#next-milestone--dedicated-rome-birds-eye-detail-agent).

### Core experience and navigation

- Make overview and POV canvases full viewport.
- Keep the overview camera static.
- Implement overview-to-POV transitions and recovery states.
- Implement fixed-position 360-degree mouse/touch look.
- Provide responsive overlay navigation and return behavior.

### Objects and intelligence

- Preserve hotspot selection while the POV camera rotates.
- Implement hover, focus, selection, and object switching.
- Present information as an overlay/bottom sheet.
- Test hotspot-to-content mapping and missing metadata behavior.

### Content, audio, and reliability

- Research and verify historical framing for each city plan.
- Produce narration scripts, recordings, transcripts, and playback states.
- Test the affected desktop/mobile view and the complete release demo path.
- Maintain a short offline demo runbook.

## 11. 24-Hour Delivery Sequence

This schedule assumes the city-specific visual briefs and references are ready when the hackathon begins.

### Hours 0–3: contract and shared prototype

- Freeze the minimum contract and stable IDs.
- Convert the canvas to a true full-viewport presentation.
- Implement the static overview mode and fixed-position look-controller prototype.
- Confirm hotspot selection still works after camera rotation.

### Hours 0–8: first city asset in parallel

- Build the first city's overview and hero POV in Blender.
- Render and inspect four-direction POV previews.
- Render and compress the overview and hero panorama.
- Draft and review its minimal content and narration.

### Hours 6–13: second city asset

- Reuse the shared Blender helpers and runtime contract.
- Build the second city's overview and hero POV.
- Render the complete 360-degree review set.
- Render and compress the overview and hero panorama.

### Hours 8–16: integration

- Connect both cities to selection, loading, overview, and POV modes.
- Integrate inspectable objects and overlays.
- Add narration and transcripts.
- Add transition masking and failure fallbacks.

### Hours 16–20: visual and performance pass

- Correct scale, framing, lighting, fog, and exposed boundaries.
- Tune image resolution, compression, hotspot alignment, and mobile memory.
- Fix accidental hotspot selection during camera dragging.

### Hours 20–24: verification and demo lock

- Run typecheck, build, and one focused smoke test for the active integration.
- Test the primary Rome and Kyoto paths on the demo laptop.
- Check one mobile viewport.
- Verify one object selection, narration/ambience, and return to overview per city.
- Stop adding features and rehearse the demo.

## 12. Scope-Control Gates

Use these gates to protect the 24-hour result:

1. Complete the shared runtime with placeholder images before waiting on final Blender renders.
2. Finish one polished POV for the first city before adding another POV.
3. Finish one polished POV for the second city before attempting stretch POIs.
4. If an overview asset is late, use an attractive simplified overview rather than blocking the city.
5. If a detailed panorama is late, use a lower-resolution render or one strong composed still with hotspots.
6. If recorded narration is late, ship the reviewed transcript with browser speech or no audio rather than unreviewed historical narration.
7. Do not add movement, collision, interiors, NPCs, or runtime AI during the hackathon.

## 13. Acceptance Criteria

### Shared behavior

- A visitor can select either Rome or Kyoto and complete the same interaction flow.
- Generic components do not contain city-specific coordinates, labels, IDs, or assumptions.
- Both overview and POV modes fill the viewport.
- The current world remains mounted where practical during overlay interactions.
- Native fullscreen failure falls back to a visually equivalent page-level full-viewport mode.

### Overview

- The overview camera does not respond to drag, wheel, pinch, keyboard, or pointer-lock input.
- POI markers remain legible and selectable at supported viewport sizes.
- No scene edge or unfinished region is visible from the static camera.
- Selecting a POI produces a clear transition and loading state.

### POV

- Camera position remains fixed while yaw supports 360-degree looking.
- Pitch is comfortably clamped and cannot invert the camera.
- Mouse and touch looking both work.
- Dragging does not accidentally select an object.
- Every viewing direction contains intentional scenery with no exposed world edge.
- A visible control always returns to the overview.

### Objects and narration

- Each hero POV has at least three inspectable objects.
- Selecting an object activates the correct hotspot and opens the correct content.
- Closing or switching object information does not reset the camera.
- Narration supports play, pause, replay, transcript, and error recovery.
- Static content remains available without audio.

### Reliability

- Panorama loading, missing image, audio failure, and viewer failure have visible recovery paths.
- Repeated overview-to-POV-to-overview transitions do not duplicate viewers or retain inactive panorama textures.
- The production build meets the agreed asset and performance budgets on demo hardware.

## 14. Required City-Specific Follow-Ups

Create one separate plan for each initial city after this general plan is approved:

- `ROME_125_CITY_PLAN.md`
- `KYOTO_1700_CITY_PLAN.md`

Each follow-up chooses the actual overview composition, hero POI and stretch POIs, inspectable objects, visual references, historical confidence, narration, Blender construction strategy, and city-specific asset budget. Those plans should consume this architecture rather than redefine it.

## 15. Definition of Done

The general system is complete when Rome and Kyoto both demonstrate this path:

```text
Choose city
  -> enter a full-screen static bird's-eye overview
  -> select a POI
  -> enter a full-screen fixed-position immersive view
  -> look through 360 degrees
  -> inspect multiple historical objects
  -> play or read narration
  -> return to the unchanged bird's-eye overview
```

The result should feel like entering two historical places, not like viewing miniature models inside a dashboard.
