# Rome / 125 CE to present — overview time transition plan

**Status:** Required overview transition implemented (2026-09-12); optional video deferred

**Initial endpoints:** Rome / 125 CE and present-day Rome

**Surface:** Bird's-eye overview only
**Priority:** Reliable demo transition first; optional AI polish second

## Delivered implementation

**Visual review correction (2026-09-12):** the provisional Present illustration
was replaced after owner review found it too similar to 125 CE. The corrected
desktop and portrait compositions now establish the recognizable
[Vittoriano/Piazza Venezia](https://www.turismoroma.it/it/luoghi/monumento-vittorio-emanuele-ii-vittoriano),
the straight [Via dei Fori Imperiali](https://www.turismoroma.it/en/places/dei-fori-imperiali)
axis to the Colosseum, open excavated fora, a ruined Colosseum, green Circus
Maximus and visibly modern surrounding blocks. Fixed geographic anchors and the
camera relationship remain aligned across eras without preserving the ancient
street fabric. This is a reference-grounded visual reconstruction, not a
surveyed aerial photograph; runtime verification does not certify fine-grained
geographic accuracy.

Rome now has a `rome-present` world and a two-stop overview slider. Desktop and
portrait present-day illustrations were generated from project-owned endpoint
frames with the built-in image tool. They are explicitly labeled as
reference-grounded reconstructions: broad registration and defining modern
geography are retained, but architectural detail is not surveyed. The selected sources and exact
prompts are in `blender/source/rome-present/`; the runtime image set and manifest
are in `public/images/rome-present/`. Encoded sizes are approximately 685 / 684 /
324 kB for desktop / portrait / fallback.

The implemented contract is the optional `scene.overviewTransition` field with
`group` and `durationMs`; existing world IDs and era years supply endpoint
identity and order. Both Rome endpoints use `rome-central` and 2200 ms. The
reducer holds a request ID and destination until the decoded image lands. The
viewer retains the incoming DOM image on commit, disposes the outgoing image,
and suspends panorama prefetch during travel. It needs no video or extra runtime
dependency. The optional AI video milestone remains deferred.

Escape/Cancel during preparation preserves the source. Once the destination is
ready, Skip/Escape finishes at that destination. A changed orientation keeps the
source visible until the new composition is decoded, then finishes without
motion. Reduced motion skips animation. The overview transcript is collapsed
below the timeline; panorama narration controls retain their existing layout.

Verification covers the production build, typecheck, focused lint and unit
tests, desktop/portrait travel followed by POI/object exploration, all nine
historical panorama hotspots, image failure and retry, cancellation, reduced
motion, orientation changes, and resource release on repeated visits. See
`tests/rome-time-transition.spec.ts` and `tests/rome-panoramas.spec.ts`.

The sections below retain the implementation brief and optional stretch scope;
the decisions above describe the shipped cut line.

## 1. Outcome

Add a compact time slider beneath the Rome bird's-eye view. It has two initial
stops, **125 CE** and **Present**. Selecting the other stop keeps the current
overview visible while the destination assets load, plays a short cinematic
transition, then lands on the exact authored destination image.

The historical and present-day images are the authoritative frames. The
transition may be expressive, but it must not imply that its intermediate
frames are historically reconstructed evidence.

The initial experience ends at the overview. Present-day POIs, present-day
object content, additional historical periods, and transitions inside a 360°
POI are outside this milestone.

## 2. Product behavior

### Entry

- Entering Rome / 125 CE continues to open the existing historical overview.
- A centered timeline control appears near the bottom of the overview, above
  narration and device safe areas.
- The control shows both endpoint labels and the selected endpoint. It is not
  displayed inside a POI panorama.
- Entering Rome / Present from the pre-entry era screen is allowed once that
  endpoint is shipped; it opens without playing an initial transition.

### Switching endpoints

1. A visitor selects the other endpoint with the slider, endpoint label, or
   keyboard.
2. POI markers and nonessential overview controls fade out and become inert.
3. The destination desktop or portrait image is fetched and decoded while the
   source remains fully visible. A small `Preparing Present…` or
   `Preparing 125 CE…` status appears only if loading is perceptible.
4. A 1.8–2.4 second transition plays.
5. The last displayed frame is the exact destination overview image, not a
   generated approximation.
6. The city heading, era label, timeline value, narration, and POI controls
   update together. Historical POIs return only on the 125 CE endpoint.

While a transition is running, the control is disabled. With only two stops,
queuing multiple requests adds no value. A visitor can use a visible **Skip**
action or `Escape` to finish immediately at the requested endpoint.

### Motion treatment

The required transition is deterministic and browser-rendered:

- a restrained 1–2% camera push;
- a warm atmospheric veil or cloud-shadow pass;
- a directional reveal that follows the monumental center rather than a
  generic full-frame crossfade;
- a subtle exposure and color-grade blend between the source images; and
- a short final dissolve onto the untouched destination image.

The transition must remain legible as a passage through time, not resemble a
page-loading animation. It should not make individual buildings visibly melt,
bend, or grow unless a later reviewed asset pass supplies controlled masks for
that effect.

For `prefers-reduced-motion: reduce`, skip the push, displacement, and animated
atmosphere. Use an immediate endpoint change or a crossfade no longer than
150 ms.

## 3. Asset requirements

### Present-day endpoint

Author three present-day images matching the existing overview delivery:

| Asset             | Composition                                                                                    | Initial budget |
| ----------------- | ---------------------------------------------------------------------------------------------- | -------------: |
| Desktop overview  | Same projection, camera direction, crop, and landmark registration as the 125 CE desktop image |         1.5 MB |
| Portrait overview | Separately composed to match the 125 CE portrait framing and mobile safe areas                 |         1.5 MB |
| Fallback still    | Compressed but complete destination frame                                                      |         0.5 MB |

The destination does not need pixel-identical buildings, but geographic
anchors must stay registered. At minimum, review the Pantheon, Forum/Capitoline
axis, Colosseum, Tiber bends, Palatine ridge, and Circus Maximus at a 50%
overlay. Preserve the existing 125 CE images unchanged.

Record in the Rome image manifest:

- encoded dimensions, byte counts, hashes, and endpoint ID;
- source camera and crop information;
- the shared geographic anchors used for registration;
- reference and licensing provenance for modern geography or imagery; and
- any AI-generated input, its prompt, its role, and its source hash.

Do not ship Google, Apple, or other map/aerial imagery unless the selected
license explicitly permits redistribution in the application. Prefer an
authored render built from permitted geographic references or appropriately
licensed source data.

### Optional transition media

AI may be used offline to create a short middle plate from first and last
keyframes. It is an enhancement, not the source of truth.

- Produce separate landscape and portrait clips when the crops differ.
- Keep each clip short and silent; target at most 4 MB for landscape and 3 MB
  for portrait after browser packaging.
- Keep the first and final 10–15% of the runtime transition deterministic.
  Blend the generated footage only into the middle, then resolve onto the exact
  destination still.
- Package forward and reverse files rather than depending on negative video
  playback behavior.
- Never call an AI service at runtime.
- If the clip is late, missing, unsupported, or rejected during review, use the
  deterministic transition without changing the interaction.

Reject a generated clip if landmarks drift, text or roads shimmer, the river
changes course, buildings deform conspicuously, or the final composition does
not settle cleanly. A subtle atmospheric transition is preferable to a more
ambitious unstable morph.

## 4. Data and contract design

Represent **Present** as a second Rome world endpoint rather than an image mode
hidden inside `rome-125`. This lets future eras remain normal entries in the
existing world/location model and avoids putting city-specific dates in UI
code.

Add a lightweight `rome-present` scene/content composition under `src/data/`:

- `id: 'rome-present'`;
- `locationId: 'rome'`;
- a present-day era record with a stable ID, label, and sortable numeric year;
- `scene.presentation: 'immersive-city'`;
- the present overview image set;
- no POIs or objects for this milestone; and
- concise overview copy that distinguishes the modern view from the historical
  reconstruction.

Add only the shared transition metadata required by the runtime. A suitable
shape is an optional scene field describing:

- endpoint ID;
- endpoint order;
- deterministic transition style;
- optional forward/reverse desktop and mobile video assets; and
- optional transition duration.

The exact TypeScript names must be agreed by the integration owner and the
affected visual/navigation workstreams before implementation. Update both Rome
endpoints and one focused validation test in the same contract change. Do not
put asset paths, years, or transition pairings directly in
`CityExperience.tsx` or `RenderedCityViewer.tsx`.

## 5. Runtime design

### Transition state

The existing `era` action commits a world immediately and causes the viewer to
remount. Introduce an explicit, bounded transition lifecycle instead:

```text
idle(source)
  -> preparing(source, destination)
  -> playing(source, destination)
  -> idle(destination)
```

The reducer should own the committed endpoint and requested destination. A
focused transition controller should own decoded temporary media and animation
progress. Do not put per-frame progress in global React state.

Required state changes:

- request a valid destination for the same location;
- cancel safely before playback if its destination image fails;
- commit the destination exactly once after completion or Skip; and
- clear active POI, object, and audio state before an overview-era transition.

Direct entry and ordinary location/era selection keep their current behavior.
Only an in-overview change uses the transition lifecycle.

### Components

Keep responsibilities focused:

- `OverviewTimeSlider`: accessible two-stop control; consumes endpoint data and
  emits a requested endpoint ID.
- `OverviewEraTransition`: owns the outgoing still, incoming still, optional
  video plate, deterministic layers, load status, Skip behavior, and cleanup.
- `RenderedCityViewer`: continues to own image selection, cover cropping, and
  marker placement; exposes the overview layers needed by the transition.
- `CityExperience`: positions the timeline and coordinates overview-only
  availability. It does not contain Rome-specific years or asset paths.

Both source and destination images must use the same `object-fit: cover`
calculation during the transition. On resize or orientation change during
playback, finish at the destination rather than attempting to recompose an
in-flight animation.

### Loading and memory

- Fetch/decode only the currently appropriate destination composition.
- Keep the source visible until the destination is ready.
- Release temporary object URLs, decoded images, video elements, timers, and
  animation listeners after completion or cancellation.
- Do not decode landscape and portrait transition videos together on mobile.
- The existing panorama prefetch must not compete with a requested era
  transition. Requested destination media has priority.
- Once idle at Present, do not prefetch historical POI panoramas until a return
  to 125 CE is requested or completed.

## 6. Interaction and accessibility

Use a native range input with two stops, paired with clickable endpoint labels.
Expose `min`, `max`, `step`, the current value, and an `aria-valuetext` such as
`Rome, 125 CE` or `Rome, Present day`.

- Left/right arrows select the adjacent endpoint.
- Focus stays on the control after a completed transition.
- Announce `Traveling to Present`, followed by `Now viewing Rome, Present
day`, through a polite live region.
- Add `input[type='range']` to the city dialog's focus-trap query.
- During playback, make underlying markers and explorer controls inert rather
  than merely transparent.
- Maintain a 44 px minimum touch target for the thumb and endpoint labels.
- Keep the control reachable at 390 × 844 portrait and clear of narration,
  browser chrome, and safe-area insets.

If JavaScript animation fails but the destination image loaded, commit the
destination and announce it. Animation is never required to access an endpoint.

## 7. Failure and interruption behavior

| Condition                         | Required result                                                               |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Destination image fails           | Stay on the source endpoint; show Retry; do not leave a blank layer           |
| Optional AI video fails           | Play the deterministic transition                                             |
| Reduced motion                    | Immediate change or ≤150 ms crossfade                                         |
| `Escape` or Skip                  | Commit the requested destination immediately                                  |
| Tab becomes hidden                | Resolve to the requested destination and release transition media             |
| Orientation changes while playing | Resolve to the destination using the newly appropriate still                  |
| Rapid repeated input              | Ignore while disabled; never start overlapping transitions                    |
| Present has no POIs               | Hide the places panel and POI markers; keep Choose era and timeline available |

## 8. Milestones and cut line

### M0 — endpoint and registration review

- Approve the present-day imagery source and redistribution rights.
- Lock the historical desktop/portrait images as the camera references.
- Produce low-resolution registered present-day proofs.
- Review the six shared geographic anchors at 50% overlay on desktop and
  portrait.

**Gate:** Do not animate until both endpoint compositions align convincingly.

### M1 — deterministic proof

- Build a throwaway or isolated browser proof using the final endpoint aspect
  ratios.
- Test the camera push, veil, directional reveal, duration, and exact landing.
- Review forward and reverse motion on desktop and mobile.

**Gate:** The proof must look intentional without any AI-generated video.

### M2 — assets and shared contract

- Package the present desktop, portrait, and fallback images.
- Add `rome-present` data and the smallest agreed transition metadata.
- Extend manifest validation for dimensions, hashes, budgets, endpoint IDs,
  and asset existence.
- Add Present to Rome's era list.

### M3 — runtime integration

- Add the transition lifecycle and overview-only slider.
- Preload/decode the destination before playback.
- Implement marker/control suppression, endpoint commit, Skip, cleanup, and
  reduced motion.
- Hide empty present-day exploration controls.
- Add unit and component coverage for state and failures.

This milestone is the required release cut line.

### M4 — optional AI polish

- Generate several first/last-keyframe transition plates offline.
- Review geographic stability and select at most one restrained direction.
- Package forward/reverse landscape and portrait variants.
- Blend them only into the deterministic middle layer and retain the fallback.

Drop M4 without hesitation if it produces warping, increases load latency, or
threatens the demo path.

### M5 — release verification

- Run focused unit tests and `npm run typecheck`.
- Run the production build because this changes runtime integration.
- Run one desktop and one portrait smoke path:

```text
Rome -> 125 CE overview -> Present -> 125 CE -> POI -> object -> overview
```

- Repeat once with transition video blocked and once with reduced motion.
- Review a throttled destination load and a forced image failure.
- Check that panorama memory/prefetch behavior remains bounded after returning
  to 125 CE.

## 9. Acceptance criteria

The milestone is complete when:

- the timeline has exactly two functioning stops, 125 CE and Present;
- it appears in Rome overview mode on desktop and mobile and not inside a POI;
- both directions start only after the destination still is decoded;
- no transition shows a blank frame or a generated final frame;
- the displayed heading, narration, markers, and selected timeline value always
  describe the same committed endpoint;
- Present shows no historical POI controls;
- Skip, image failure, video failure, reduced motion, and orientation change
  all leave the application in a valid endpoint state;
- keyboard and touch operation work and transition announcements are audible to
  assistive technology;
- all temporary image/video resources are released after switching repeatedly;
- the present assets meet their encoded budgets and have recorded provenance;
  and
- the production build and primary Rome smoke path pass without running or
  modifying Pittsburgh-specific checks.

## 10. Ownership and estimated effort

| Work                                                                             | Owner        | Estimate after source assets are available |
| -------------------------------------------------------------------------------- | ------------ | -----------------------------------------: |
| Present-day camera match, desktop/portrait/fallback images, optional masks/video | Workstream 1 |  1–3 days, dominated by endpoint authoring |
| Slider, transition lifecycle, loading, responsive layout, reduced motion         | Workstream 2 |                                   1–2 days |
| Present endpoint copy, provenance, acceptance and release checks                 | Workstream 4 |                                  0.5–1 day |
| Shared contract review and integration                                           | Astra        |                                    0.5 day |

Workstream 3 should only confirm that historical selection state is cleared and
that no object controls appear at Present. No Q&A or object work is required.

The main uncertainty is not the slider or browser animation. It is obtaining a
licensed, convincing present-day Rome BEV that registers closely enough with
the existing authored 125 CE compositions. Resolve that before committing time
to AI-generated motion.
