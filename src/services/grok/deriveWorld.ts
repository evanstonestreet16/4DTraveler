import type {
  CameraView,
  GeneratedEra,
  GeneratedHistoryProfile,
  HistoricalWorld,
  Vec3,
} from '../../types/world';

/**
 * Convert a validated `GeneratedHistoryProfile` into a list of renderable
 * `HistoricalWorld`s. The LLM does not emit cameras or environment; we
 * compute them from primitive geometry so we get consistent framing across
 * every generated city without asking the model to do cinematography math.
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

function boundsFromEra(era: GeneratedEra): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const primitive of era.primitives) {
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

export function deriveWorldFromEra(
  era: GeneratedEra,
  profile: GeneratedHistoryProfile,
  options: DeriveOptions,
): HistoricalWorld {
  const bounds = boundsFromEra(era);
  const background = era.background ?? '#dbd7c9';
  const pois = era.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    markerPosition: poi.markerPosition,
    camera: poiCameraFor(poi.markerPosition),
    objectIds: poi.objectIds,
  }));
  const objects = era.objects.map((object) => ({
    id: object.id,
    name: object.name,
    poiId: object.poiId,
    sceneObjectId: object.sceneObjectId,
    description: object.description,
    whyItMatters: object.whyItMatters,
  }));
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
      primitives: era.primitives,
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
