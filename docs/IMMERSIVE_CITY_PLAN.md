# Historical city overview plan

## Current milestone

Ship reliable full-viewport bird’s-eye views for Rome / 125 CE and Kyoto / circa 1700. Each world provides:

- desktop, portrait, and fallback overview images;
- three stable POI IDs;
- authored marker coordinates for desktop and portrait compositions;
- clickable image markers and matching keyboard-accessible list controls.

Selecting a POI highlights the destination without leaving the overview. Ground-level views and their assets are deferred until replacement artwork is approved.

## Integration contract

World data owns image dimensions, versioned paths, POI IDs, and normalized marker coordinates. `RenderedOverviewViewer` owns cover-crop projection, responsive image choice, marker clamping, fallback behavior, and selection affordances.

## Acceptance path

For both cities, verify location → era → overview, select all three markers from the image and list, switch between desktop and portrait sizes, and confirm the fallback image after a failed primary request.
