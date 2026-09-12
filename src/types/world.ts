export type Vec3 = [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface Era {
  id: string;
  label: string;
  year: number;
  subtitle?: string;
}

export interface Location {
  id: string;
  name: string;
  region: string;
  description: string;
  eras: Era[];
}

/** Temporary geometry adapter. Metadata/selection IDs survive replacement with GLBs. */
export interface ScenePrimitive {
  id: string;
  shape: 'box' | 'cylinder';
  position: Vec3;
  scale: Vec3;
  color: string;
}

/** A complete, self-contained GLB scene; primitives remain its usable fallback. */
export interface SceneModel {
  url: string;
  /** Optional gzip transport; unsupported browsers or failed transport retry url. */
  compressedUrl?: string;
  position?: Vec3;
  /** Euler XYZ angles, in radians. */
  rotation?: Vec3;
  scale?: Vec3;
  /** Stable sceneObjectId -> unique imported node name (mesh or group). */
  selectableNodes: Record<string, string>;
  loadingLabel?: string;
  fallbackLabel?: string;
}

export interface PointOfInterest {
  id: string;
  name: string;
  markerPosition: Vec3;
  camera: CameraView;
  objectIds: string[];
}

export interface HistoricalObject {
  id: string;
  name: string;
  poiId: string;
  sceneObjectId: string;
  description: string;
  whyItMatters: string;
}

/** Scene-owned atmosphere and audio authoring locations; no playback policy. */
export interface WorldEnvironment {
  ambientIntensity: number;
  skyColor: string;
  groundColor: string;
  keyLight: { position: Vec3; color: string; intensity: number };
  fog: { color: string; near: number; far: number };
  exposure: number;
  smokeSources?: Vec3[];
  water?: { position: Vec3; size: [number, number] };
  ambientAudioZones?: {
    id: string;
    position: Vec3;
    radius: number;
    cue: string;
  }[];
}

export interface HistoricalWorld {
  id: string;
  locationId: string;
  locationName: string;
  era: Era;
  scene: {
    overviewCamera: CameraView;
    background: string;
    narrationAudio?: string;
    narrationTranscript?: string;
    primitives: ScenePrimitive[];
    model?: SceneModel;
    environment?: WorldEnvironment;
  };
  pois: PointOfInterest[];
  objects: HistoricalObject[];
}

export type CameraMode = 'OVERVIEW' | 'POI';
export type AudioState =
  'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

/**
 * LLM-generated world contract. Deliberately **denormalized** so the model
 * never has to keep multiple id namespaces in sync — the biggest source of
 * schema drift in practice.
 *
 * Instead of separate `primitives[]`, `objects[]`, and `pois[]` arrays
 * linked by ids, each POI owns its `GeneratedObject`s and each object
 * carries its own primitive spec inline. The client explodes this shape
 * into the runtime `HistoricalWorld` inside `deriveWorldFromEra`.
 */
export interface GeneratedHistoryProfile {
  cityName: string;
  region: string;
  description: string;
  eras: GeneratedEra[];
}

export interface GeneratedEra {
  id: string;
  label: string;
  year: number;
  subtitle: string;
  historicalContext: string;
  background?: string;
  /** Decorative shapes with no metadata — background, terrain, filler. */
  scenery: ScenePrimitive[];
  pois: GeneratedPOI[];
}

export interface GeneratedPOI {
  id: string;
  name: string;
  markerPosition: Vec3;
  /** Objects clustered at this POI. Each carries its own primitive spec. */
  objects: GeneratedObject[];
}

/**
 * One historical thing that is both rendered (as a primitive) and
 * selectable (with metadata). No cross-references — the shape lives right
 * next to the description.
 */
export interface GeneratedObject {
  id: string;
  name: string;
  shape: 'box' | 'cylinder';
  position: Vec3;
  scale: Vec3;
  color: string;
  description: string;
  whyItMatters: string;
}
