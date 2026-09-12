# GLB asset pipeline

Owner: Workstream 1. The integration owner agreed the `SceneModel` contract in issue #6. This document and the types in `src/types/world.ts` are the integration reference. Blender is optional; the browser consumes a self-contained GLB 2.0, never a `.blend` file.

## Data ownership and coordinates

- `src/data/worlds/pittsburgh-1892.scene.ts`: geometry, model descriptor, camera presets, marker positions, and POI membership. Workstream 1 supplies camera coordinates; Workstream 2 owns camera transitions.
- `src/data/worlds/pittsburgh-1892.content.ts`: identity, era copy, POI display names, object descriptions and significance, narration path/transcript. Workstream 4 may refer to existing IDs but must not rename them.
- `src/data/worlds/pittsburgh-1892.ts`: small composition module retaining the existing exported `HistoricalWorld`. Editorial and visual changes ordinarily need no edits here.

One world unit equals one meter. Runtime/glTF coordinates are right handed with +Y up, +X right/east in the current layout, and +Z toward the south/front of the overview. The Pittsburgh origin `[0,0,0]` is the center of the illustrative local site at ground level; it is not a georeferenced survey point. Ground top is near Y=0 and the river runs along X around Z=9. Reuse the scene module's dimensions and POI targets. Model transforms default to identity: `position` is meters, `rotation` is Euler XYZ radians, and `scale` is a dimensionless `[x,y,z]` tuple. Camera and marker positions remain world coordinates after that transform, so review them if moving an entire model.

## Model contract

`scene.model` is optional. When present, it replaces the entire primitive scene only after it loads and validates. Include terrain, river, decorative buildings and selectable objects in the GLB. Keep `scene.primitives` complete: it renders during loading and after any failure, with the same working object selection, camera movement, information and narration.

```ts
model: {
  url: '/models/pittsburgh-1892.glb',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  selectableNodes: {
    furnace: 'furnace',
    stack: 'stack',
    'rail-car': 'rail-car',
    warehouse: 'warehouse',
    bridge: 'bridge',
  },
  loadingLabel: 'Loading the historical world',
  fallbackLabel: 'Detailed world unavailable. Showing the simplified world.',
}
```

Keys are existing `HistoricalObject.sceneObjectId` values. Values are exact imported mesh or group names, case sensitive. Every metadata object needs a mapping. Every required name must occur once and contain mesh geometry. Selectable groups cannot nest or map to more than one object. Prefer lowercase ASCII words separated by hyphens; keep names unique before export because importers may sanitize names. Do not rename the historical IDs `blast-furnace`, `smokestack`, `rail-car`, `warehouse`, or `river-crossing`. POI IDs remain `steel-mill`, `downtown`, and `river-bridge`; POI markers are rendered from data and need no exported nodes.

Each selectable group can contain multiple child meshes and materials. Clicks on any child resolve to its metadata object. The adapter clones selection materials per child so gold selection and hover never tint a neighboring object sharing the exported material. It restores the original color/emissive values when selection clears. Static decoration remains unselectable. Export static meshes only; animation, skinning, physics, and embedded cameras are outside this slice.

## Author and export

1. In Blender, use Metric units with Unit Scale 1. Model to the dimensions above. Apply scale and rotation deliberately, inspect normals, and triangulate where nonplanar surfaces would otherwise triangulate unpredictably. Use empties as the five selectable parent groups. Avoid nesting one selectable group inside another.
2. Author Principled BSDF materials with base color, metallic and roughness. Prefer a small shared palette and mostly opaque surfaces. Bake procedural appearance to textures before export. Use sRGB PNG/JPEG for base color/emissive maps and linear data for normal/roughness/metallic maps; use glTF-compatible tangent-space normals. Avoid authoring required shader-node effects that glTF cannot represent.
3. Prefer 1024px atlases; review 2048px textures individually. Embed PNG (alpha where needed) or JPEG (opaque). Keep texture files/source material licenses alongside the source asset. No remote textures or external `.bin` resources are accepted by this boundary.
4. Export **glTF 2.0 → glTF Binary (.glb)**. Export the intended scene/selected collection with all child meshes, materials and normals; retain node names and hierarchy. Blender's exporter performs the Y-up conversion: do not add another corrective rotation in runtime data. Exclude unused cameras/lights/animations. Export applied modifiers where intended and inspect the result afterward.
5. Leave Draco, Meshopt and KTX2 compression off for this initial pipeline: their decoders are not configured. First reduce geometry, merge static meshes by material without collapsing selectable groups, reuse materials and downsize textures. Future compression needs a small explicit decoder change and local checked-in decoder assets; never assume a remote CDN is available.
6. Save the GLB under `public/models/`, retain its authoring source or repeatable generator, and add provenance/license notes. Set its descriptor in the scene module, preserving all mappings and complete primitives.

The [Blender glTF export manual](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) describes material/export support. [Three.js GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html) documents parsing and required optional decoder configuration.

## Repeatable validation

```sh
npm run assets:fixture  # Rebuild the small checked-in fixture deterministically
npm run assets:validate # Parse the GLB and verify node/selection/disposal contracts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`pipeline-fixture.glb` is about 13 KB, contains the full 18-primitive Dummy v0 layout and all five selectable objects, and is generated by `scripts/generate-model-fixture.mjs`. Its furnace has two contiguous child meshes to prove group-wide highlights. It is a pipeline test asset, not the final historical scene. The default scene uses it until a hero model replaces the URL. Regeneration must produce no binary diff unless the primitive layout intentionally changes.

For a replacement asset, add its path and metadata to `modelAsset.test.ts` (or a focused sibling test) and parse it with `GLTFLoader.parseAsync`, then run `validateModelNodes` against the world's descriptor and objects. Verify the self-contained container with `validateGlbContainer`. Use the [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) for an independent format check. Review triangles, draw calls, textures, download size, and license/source; the later performance issue sets the hero budgets.

In the browser, verify overview, all three POI transitions repeatedly, clicks on every selectable object (including more than one child mesh of a group), gold selection, clearing selection, narration play/pause, and return to overview at desktop and mobile sizes. The existing exploration test performs real raycasting into the GLB. `tests/model-loading.spec.ts` injects HTTP 404, invalid bytes, and a missing required node; each must show a useful message and usable primitives. Also leave while loading and re-enter to exercise cancellation.

## Runtime behavior and ownership

`ModelScene` owns one uncached load per mount. Fetch is abortable, reports progress when Content-Length is known, and times out after 20 seconds. GLB structure and embedded resources are checked before parsing; required nodes are validated before replacing primitives. The DOM status uses `data-model-status="loading|ready|fallback"`; ready is announced accessibly without covering the canvas. Failure details explain the useful simplified fallback. Leaving/remounting the world retries naturally.

On unmount or a late canceled load, the adapter disposes owned geometries, original/cloned materials and textures once, including shared resources; it closes owned ImageBitmaps. No imported resource is kept in a global cache. Material mutations are limited to this selection adapter. Camera mutations remain exclusively in `CameraController`. Lighting/environment configuration remains outside the model contract until a feature actually requires it.
