import type {
  CameraView,
  GeneratedEra,
  GeneratedHistoryProfile,
  HistoricalObject,
  HistoricalWorld,
  PointOfInterest,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

/**
 * Convert a validated `GeneratedHistoryProfile` into a list of renderable
 * `HistoricalWorld`s.
 *
 * The LLM emits a denormalized tree (era → pois → objects, each object
 * carrying its own shape). This function *explodes* that tree into the
 * flat runtime contract:
 *   • `primitives[]` = era.scenery + one entry per object (id = object.id)
 *   • `objects[]`    = flatten poi.objects with poiId and sceneObjectId
 *   • `pois[]`       = { id, name, markerPosition, camera, objectIds }
 *
 * Cameras and environment defaults are computed from primitive bounds so
 * the model doesn't have to reason about cinematography or lighting math.
 */

export interface DeriveOptions {
  /** Stable, per-city identifier (e.g. "generated:seattle"). */
  locationId: string;
}

interface Bounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  radius: number;
}

function boundsFromPrimitives(primitives: ScenePrimitive[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const primitive of primitives) {
    const halfX = primitive.scale[0] / 2;
    const halfY = primitive.scale[1] / 2;
    const halfZ = primitive.scale[2] / 2;
    const [px, py, pz] = primitive.position;
    min[0] = Math.min(min[0], px - halfX);
    min[1] = Math.min(min[1], py - halfY);
    min[2] = Math.min(min[2], pz - halfZ);
    max[0] = Math.max(max[0], px + halfX);
    max[1] = Math.max(max[1], py + halfY);
    max[2] = Math.max(max[2], pz + halfZ);
  }
  const center: Vec3 = [
    (min[0] + max[0]) / 2,
    Math.max(0, (min[1] + max[1]) / 2),
    (min[2] + max[2]) / 2,
  ];
  const radius = Math.max((max[0] - min[0]) / 2, (max[2] - min[2]) / 2, 8);
  return { min, max, center, radius };
}

function overviewCameraForBounds(bounds: Bounds): CameraView {
  const distance = bounds.radius * 1.9;
  const height = Math.max(bounds.radius * 1.1, 18);
  return {
    position: [
      bounds.center[0] + distance,
      bounds.center[1] + height,
      bounds.center[2] + distance,
    ],
    target: bounds.center,
  };
}

function poiCameraFor(marker: Vec3): CameraView {
  const [mx, my, mz] = marker;
  return {
    position: [mx + 10, Math.max(my + 6, 8), mz + 12],
    target: [mx, Math.max(0, my - 1), mz],
  };
}

function environmentFor(
  background: string,
): HistoricalWorld['scene']['environment'] {
  return {
    ambientIntensity: 0.85,
    skyColor: background,
    groundColor: '#4a4638',
    keyLight: {
      position: [18, 30, 14],
      color: '#ffe8c8',
      intensity: 2.4,
    },
    fog: {
      color: background,
      near: 40,
      far: 140,
    },
    exposure: 1.05,
  };
}

/**
 * Ensure a set of ids is unique by suffixing duplicates. Guards against
 * an LLM that reused an id between scenery and an object.
 */
function uniqueId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) {
    taken.add(id);
    return id;
  }
  let suffix = 2;
  while (taken.has(`${id}-${suffix}`)) suffix += 1;
  const next = `${id}-${suffix}`;
  taken.add(next);
  return next;
}

export function deriveWorldFromEra(
  era: GeneratedEra,
  profile: GeneratedHistoryProfile,
  options: DeriveOptions,
): HistoricalWorld {
  const takenIds = new Set<string>();
  const primitives: ScenePrimitive[] = era.scenery.map((primitive) => ({
    ...primitive,
    id: uniqueId(primitive.id, takenIds),
  }));

  const pois: PointOfInterest[] = [];
  const objects: HistoricalObject[] = [];

  for (const poi of era.pois) {
    const poiObjectIds: string[] = [];
    for (const object of poi.objects) {
      const objectId = uniqueId(object.id, takenIds);
      // Each object contributes one primitive with the same id, so
      // click-to-select in SelectableObject "just works".
      primitives.push({
        id: objectId,
        shape: object.shape,
        position: object.position,
        scale: object.scale,
        color: object.color,
      });
      objects.push({
        id: objectId,
        name: object.name,
        poiId: poi.id,
        sceneObjectId: objectId,
        description: object.description,
        whyItMatters: object.whyItMatters,
      });
      poiObjectIds.push(objectId);
    }
    pois.push({
      id: poi.id,
      name: poi.name,
      markerPosition: poi.markerPosition,
      camera: poiCameraFor(poi.markerPosition),
      objectIds: poiObjectIds,
    });
  }

  const bounds = boundsFromPrimitives(primitives);
  const background = era.background ?? '#dbd7c9';

  return {
    id: `${options.locationId}:${era.id}`,
    locationId: options.locationId,
    locationName: profile.cityName,
    era: {
      id: era.id,
      label: era.label,
      year: era.year,
      subtitle: era.subtitle,
    },
    scene: {
      overviewCamera: overviewCameraForBounds(bounds),
      background,
      primitives,
      environment: environmentFor(background),
    },
    pois,
    objects,
  };
}

export function deriveWorldsFromProfile(
  profile: GeneratedHistoryProfile,
  options: DeriveOptions,
): HistoricalWorld[] {
  return profile.eras.map((era) => deriveWorldFromEra(era, profile, options));
}
