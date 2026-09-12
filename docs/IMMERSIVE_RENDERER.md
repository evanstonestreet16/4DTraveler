# Immersive world presentation

Owning workstreams: Astra supplies renderer readiness; Core Experience supplies the presentation, fullscreen lifecycle, and keyboard behavior. This coordinated change preserves all shared world and object IDs and the `HistoricalWorld` contract.

`WorldViewport` is the presentation boundary. Its `layout` (`standard` or `immersive`) and `informationOpen` fields describe the shell without introducing page-layout conditions into the scene. CSS reserves a separate canvas grid track: the toolbar, information panel, and narration never cover selectable meshes or POI markers. Portrait layouts put the independently scrollable information panel below the canvas; landscape layouts place it to the right. Loading and graphics-recovery content remain within the same viewport region. Markers that cannot fit entirely in the canvas (including their focus ring) are hidden and removed from the tab order; their places remain available in the POI navigation. Projection checks update marker visibility only when it changes, without React updates on animation frames.

React Three Fiber measures the actual canvas region and updates its projection aspect. `CameraController` alone adjusts the camera position and target, using the existing camera presets and portrait fitting. The optional `ViewportDpr` renderer child watches resolution media queries and window resizing, clamps device pixel ratio to its `maximum` prop (default 1.75), and invalidates the demand renderer. A performance tier can supply a lower cap.

`useImmersiveView` requests browser fullscreen from the toggle's user gesture. Missing or rejected APIs retain a CSS immersive view. Native fullscreen exit and Escape return to the original layout. A failed native exit keeps the immersive controls available and announces the browser exit control. The shell keeps `WorldCanvas`, object controls, and `NarrationControls` mounted, preserving selection, camera destination, audio element identity, and playback position.

Immersive presentation makes background siblings inert, contains keyboard focus, restores the toggle's focus on exit, and restores scroll and inert state on navigation. Controls have a minimum 44px touch height. Narrow panes scroll independently, including open information and narration transcripts. The exit and overview controls remain outside those scroll panes.

## Acceptance coverage

`tests/immersive.spec.ts` covers repeated CSS transitions with live audio and DOM identity checks; camera target/aspect via real marker projection; native browser exit and Escape; rejected and unavailable APIs; portrait and landscape touch controls; reserved composition bounds; graphics recovery; and navigation cleanup. Run after a production build with `npm run test:e2e -- tests/immersive.spec.ts`.

Chromium acceptance uses both desktop and mobile touch contexts. Real-device Safari browser chrome, operating-system fullscreen gestures, and moving a window between physical monitors remain manual checks for release verification.
