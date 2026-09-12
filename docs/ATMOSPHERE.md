# Industrial atmosphere

Issue #9 · Workstream 1. All weather, light and motion are illustrative art direction; historical prose and the temporary narration remain unchanged.

The hero uses warm afternoon key light, a cooler hemispheric fill, a subdued ambient floor and ACES exposure. Directional shadows ground the model on the riverbank. Fog leaves close POI compositions clear and softens distant buildings in overview. Colors, source positions, water bounds and ambient-audio cue locations live in the scene data; renderer code does not know the city or year.

A fixed pool of eight instanced smoke volumes rises from each configured source. A transparent water shader creates restrained moving glints over the existing river surface. Neither effect receives pointer events. Smoke stays above the stack, with a narrow drift that does not cross the selectable furnace/wagon centers. Gold selection uses emissive as well as base-color treatment, preserving recognition under the warm light.

Motion uses refs/uniforms and capped frame delta, never per-frame React state. An IntersectionObserver, document visibility and live prefers-reduced-motion listener stop environmental animation when the scene is offscreen, the tab is hidden or reduced motion is requested. Static scene rendering and camera/selection remain available. Resource cleanup disposes the water material; React Three Fiber owns the instanced geometry/material. The subsequent quality PR adds a low tier that removes decorative effects while preserving every selectable mesh.

World data exposes ambient audio cue regions with IDs, centers, radii and a cue name. These are authoring hooks only: Content + Audio supplies files and playback policy in a separate change. No ambient autoplay, audio fetch, audio library or provider integration is introduced.

Loading renders the complete primitive scene first. Decorative effects appear with the detailed model; failures keep the simplified scene and its visible status message. Ready overview, active POI and selected-object states share one environment; they do not switch lights or generate flicker.

See checked-in desktop/mobile before/after captures and JSON frame traces linked in the PR. Software-rendered Chromium is a reproducible regression environment, not evidence of physical demo-laptop FPS.

Verified: formatting, lint, typecheck, 14 unit tests, production build and all nine browser tests pass. The new browser case changes reduced-motion preferences live, confirms effects pause offscreen, and verifies object selection remains available. [Desktop after](evidence/atmosphere/overview.png), [selected object](evidence/atmosphere/selected-object.png) and [mobile after](evidence/atmosphere/mobile.png) were inspected against [desktop before](evidence/hero/overview.png) and [mobile before](evidence/hero/mobile.png). Lighting remains static across selection states; gold highlighting is legible and the smoke plume stays clear of the object centers. Performance traces from this exact hero/effects build are linked in the performance evidence produced for #11.
