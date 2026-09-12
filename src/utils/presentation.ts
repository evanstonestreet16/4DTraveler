import type { CameraMode, HistoricalWorld } from '../types/world';

/** Resolve local POV coordinates without modifying the city or legacy world. */
export function resolvePresentation(
  world: HistoricalWorld,
  mode: CameraMode,
  poiId: string | null,
) {
  const poi =
    mode === 'POI' ? world.pois.find((item) => item.id === poiId) : undefined;
  const immersive = poi && !poi.preview ? poi.immersive : undefined;
  return {
    scene: immersive ?? world.scene,
    camera: poi && !poi.preview ? poi.camera : world.scene.overviewCamera,
    look: immersive?.look,
    objects:
      immersive && poi
        ? world.objects.filter((object) => poi.objectIds.includes(object.id))
        : world.scene.presentation === 'immersive-city'
          ? []
          : world.objects,
    showMarkers: !immersive,
  };
}
