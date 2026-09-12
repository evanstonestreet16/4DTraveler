export type Vec3 = [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
  /** Scene clipping distance in metres; legacy dioramas default to 400. */
  far?: number;
  /** Near clipping plane in metres; default 0.1 for ground-level views. */
  near?: number;
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

/** Offline-rendered pixels; dimensions describe the actual encoded image. */
export interface RenderedImageAsset {
  url: string;
  width: number;
  height: number;
}

export interface OverviewImage {
  desktop: RenderedImageAsset;
  mobile?: RenderedImageAsset;
  fallback: RenderedImageAsset;
  /** Normalized coordinates in each authored image, before CSS cover cropping. */
  markers: Record<
    string,
    { desktop: [number, number]; mobile?: [number, number] }
  >;
}

export interface PanoramaHotspot {
  objectId: string;
  /** Radians: zero faces north (-Z); positive yaw turns west (-X). */
  yaw: number;
  /** Radians above the horizontal. */
  pitch: number;
}

/** A 2:1 equirectangular image centered on north, with a composed still fallback. */
export interface PanoramaAsset {
  desktop: RenderedImageAsset;
  mobile?: RenderedImageAsset;
  fallback: RenderedImageAsset;
  hotspots: PanoramaHotspot[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  markerPosition: Vec3;
  camera: CameraView;
  objectIds: string[];
  /** Visible overview marker whose immersive set is not available yet. */
  preview?: boolean;
  /** Separate local-coordinate set; camera is a fixed eye-level anchor. */
  immersive?: ScenePresentation & {
    /** Pitch limits in radians. Yaw is unrestricted. */
    look: { minPitch: number; maxPitch: number };
  };
}

export interface SourceReference {
  id: string;
  title: string;
  url: string;
}

export interface HistoricalObject {
  id: string;
  name: string;
  poiId: string;
  sceneObjectId: string;
  description: string;
  whyItMatters: string;
  sources?: SourceReference[];
  /** Clearly distinguishes supported claims from reconstruction choices. */
  confidence?: string;
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

export interface ScenePresentation {
  background: string;
  overviewImage?: OverviewImage;
  panorama?: PanoramaAsset;
  narrationAudio?: string;
  narrationTranscript?: string;
  /** Optional ambient loop, played only after a visitor action. */
  ambientAudio?: string;
  primitives: ScenePrimitive[];
  model?: SceneModel;
  environment?: WorldEnvironment;
}

export interface HistoricalWorld {
  id: string;
  locationId: string;
  locationName: string;
  era: Era;
  scene: ScenePresentation & {
    overviewCamera: CameraView;
    presentation?: 'immersive-city';
  };
  pois: PointOfInterest[];
  objects: HistoricalObject[];
}

export type CameraMode = 'OVERVIEW' | 'POI';
export type AudioState =
  'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
