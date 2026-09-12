# Pittsburgh era composition

Issue #12 adds **1850 · Blockout**, building on the 1892 hero, immersive presentation, and measured quality-tier work. The user selected 1850. It is a lightweight scene for evaluating the era pipeline, not an approved historical reconstruction. Content signoff and a separate visual-production plan are still required. The existing 1892 world remains the polished benchmark and appears first in the era picker. This extension does not certify all performance gates: raw total heap still fails its strict growth threshold despite stable retained world/GPU resources.

## Ownership and boundaries

Workstream 1 owns shared geography and era scene modules. Workstream 4 owns editorial content, references, and the decision to remove the blockout label. Core Experience's existing era picker and world teardown handle navigation. No renderer or UI component branches on a literal year or location. `HistoricalWorld` is unchanged.

`src/data/worlds/pittsburgh.geography.ts` holds the shared illustrative ground and river strip plus the water-effect surface. `composeSceneLayers` joins shared and era primitive layers in authored order and rejects ID collisions instead of silently replacing geometry. Each era has separate scene and content modules, joined by its composition module. `src/data/locations.ts` registers both worlds through the existing lookup.

| Layer                                               | Shared or era-specific | Rule                                                                                                                                      |
| --------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinate origin and units                         | Shared                 | Origin `[0, 0, 0]`, meters, +Y up. This is a compact illustrative board, not georeferenced terrain.                                       |
| Ground and river base                               | Shared                 | One reference per scene, with existing 1892 values preserved. Sharing is a visual convention, not a claim that shorelines were unchanged. |
| Water surface and generic renderer                  | Shared                 | Same water region and renderer capability; animation and quality policy remain generic.                                                   |
| Infrastructure, streets, bridges, skyline, industry | Era-specific           | Reuse only after evidence establishes continuity. The 1850 scene does not borrow the 1892 mill, rail car, warehouse, or bridge.           |
| Building materials, atmosphere, cameras             | Era-specific           | Each era supplies its palette, lighting/fog/exposure, overview camera, and POI cameras.                                                   |
| POIs, objects, narration                            | Era-specific           | Explicit availability and membership; no implied persistence of equipment. 1850 has no narration asset or transcript.                     |

The 1892 GLB deliberately remains a self-contained hero, including its embedded terrain and water base. Its primitive fallback and the shared data board provide usable geometry before loading or after a model failure. These are alternate render paths, never both drawn together. Retaining embedded terrain avoids changing the verified hero export or making it depend on separately loaded geography. The raw GLB and its `.gz` transport are the same content; clients request one successful transport. There is no new 1850 GLB, texture, audio file, or duplicated renderer bundle.

## IDs and asset versions

The new world ID is `pittsburgh-1850`; location `pittsburgh` and era `1850` use the existing registration scheme. Its POIs are `1850-market` and `1850-wharf`. Its object and selectable primitive IDs are `1850-market-stall`, `1850-street-frontage`, `1850-wharf-landing`, and `1850-cargo-stack`. All existing 1892 IDs and values remain unchanged. Shared nonselectable primitives retain `ground` and `river`; these IDs are local to each mounted world.

An object absent from an era must be absent from its object array, POI membership, and selectable-node map. A new building or an unverified continuity claim gets a distinct era-scoped ID. A replacement mesh for the same verified object keeps the stable object/scene IDs and updates the asset URL version and export mapping together. Evidence of cross-era continuity belongs in editorial documentation; do not infer it from a reused name or mesh. Shared layer replacements must be explicit: remove the old primitive from the chosen base before composition, rather than supplying a duplicate ID.

## Historical review status

All 1850 footprints, density, dimensions, materials, street/wharf placement, and object identities are illustrative. Its market and landing are conceptual review locations. The era label includes **Blockout** in both the picker and world heading, including the immersive layout. Object descriptions explain the uncertainty. No particular operator, commodity, shipment, or named historical building is claimed.

The primary reference lead is the University of Pittsburgh's [1850 Map of the County of Allegheny, Pennsylvania](https://historicpittsburgh.org/islandora/object/pitt%3ADARMAP0090). The catalog confirms an inset showing parts of Pittsburgh and Allegheny, and labels its rights **Copyright Not Evaluated**. No map imagery has been copied or traced. This reference establishes a review source, not the blockout's building footprints.

The supplied [UWM Pittsburgh/Allegheny map reference](https://collections.lib.uwm.edu/digital/collection/agdm/id/32267/) is a lead for adjacent 1852 context, not evidence of exact 1850 conditions. Content should verify the full item metadata and assess the date difference before using it for reconstruction. `pittsburgh-1850.content.ts` retains these reference leads beside the provisional content. Links are provided for review; no external images or files are shipped.

## Switching and verification

The existing world boundary is keyed by world ID. Leaving an era unmounts its canvas and narration; the model loader aborts pending requests and disposes loaded resources. Era actions reset POI, object, camera mode, and audio state. The reducer rejects foreign POI/object IDs instead of carrying a selection into a different world.

`multiEra.test.ts` checks the complete 1892 world against a golden digest captured from `c87afe3`, shared geometry identity and unique IDs, registration, distinct cameras, absent 1850 narration, reference membership, and every foreign selection ID in both directions. Changes to that digest require an intentional review of a new 1892 benchmark.

`tests/multi-era.spec.ts` covers the existing selection path, actual blockout mesh selection, era labeling, repeated transitions and teardown, leaving a slow 1892 load, and missing model → 1850 → recovered 1892. Run after `npm run build` with `npm run test:e2e -- tests/multi-era.spec.ts`; run the existing 1892 suite before release.
