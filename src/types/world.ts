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
  };
  pois: PointOfInterest[];
  objects: HistoricalObject[];
}

export type CameraMode = 'OVERVIEW' | 'POI';
export type AudioState =
  'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
