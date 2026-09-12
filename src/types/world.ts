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
  /**
   * Real-world anchor used by the globe UI. `city` must match a pin baked into
   * `src/data/geo/cities.json`; coordinates come from there, not from here.
   * Omit for locations not yet placeable on the globe.
   */
  globe?: {
    countryIsoA3: string;
    city: string;
  };
}

/**
 * Supported primitive silhouette shapes. `scale` interpretation is
 * shape-dependent — keep this table in sync with the Grok system prompt
 * and the renderer:
 *
 *   box      — full extents          [width, height, depth]
 *   cylinder — cylinder              [radius, height, radius]
 *   cone     — cone (round taper)    [radius, height, radius]
 *   pyramid  — 4-sided pyramid       [baseHalfSize, height, baseHalfSize]
 *   sphere   — ellipsoid             [radiusX, radiusY, radiusZ]
 *   torus    — flat ring (horizontal by default; ring lies in the X-Z plane)
 *                                     [ringOuterRadiusX, tubeThickness (height), ringOuterRadiusZ]
 */
export type PrimitiveShape =
  'box' | 'cylinder' | 'cone' | 'pyramid' | 'sphere' | 'torus';

/** Temporary geometry adapter. Metadata/selection IDs survive replacement with GLBs. */
export interface ScenePrimitive {
  id: string;
  shape: PrimitiveShape;
  position: Vec3;
  scale: Vec3;
  color: string;
  /** Euler XYZ angles in degrees. Defaults to [0, 0, 0] when omitted. */
  rotation?: Vec3;
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
  /** Visible editorial label, also used as the image's accessible description. */
  description?: string;
  desktop: RenderedImageAsset;
  fallback: RenderedImageAsset;
  /** Normalized coordinates in the authored image, before CSS cover cropping. */
  markers: Record<string, [number, number]>;
}

export interface PanoramaHotspot {
  objectId: string;
  /** Radians: zero faces north (-Z); positive yaw turns west (-X). */
  yaw: number;
  /** Radians above the horizontal. */
  pitch: number;
}

/** A 2:1 equirectangular image centered on north, with a composed still fallback. */
export interface PanoramaImage {
  desktop: RenderedImageAsset;
  fallback: RenderedImageAsset;
  hotspots: PanoramaHotspot[];
}

export interface PanoramaViewpoint extends PanoramaImage {
  /** Stable within this POI; does not replace its POI or object IDs. */
  id: string;
  label: string;
}

export interface PanoramaAsset extends PanoramaImage {
  /** Vertical field of view in degrees. Defaults to the existing 62° view. */
  fieldOfView?: number;
  /** Ordered nearby views. The first is the POI's entry image. */
  viewpoints?: PanoramaViewpoint[];
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
  /** When true, the renderer will attempt a Tripo text-to-3D visual upgrade. */
  iconic?: boolean;
  /** Prompt fed to Tripo when `iconic` is true (visual style, brief). */
  tripoPrompt?: string;
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
    /** Only registered overview compositions in the same group can transition. */
    overviewTransition?: { group: string; durationMs: number };
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
 *
 * The top-level `shape/position/scale/color/rotation` fields define the
 * object's **primary** (clickable) primitive. The model may also supply
 * `parts[]` — up to 20 extra primitives with absolute world positions
 * that together sketch a recognizable silhouette (e.g. Space Needle
 * tripod legs + observation deck ring + antenna). Parts are decorative;
 * only the primary primitive participates in click-to-select.
 */
export interface GeneratedObject {
  id: string;
  name: string;
  shape: PrimitiveShape;
  position: Vec3;
  scale: Vec3;
  color: string;
  /** Euler XYZ angles in degrees. Defaults to [0, 0, 0] when omitted. */
  rotation?: Vec3;
  parts?: ObjectPart[];
  /**
   * If true, the client will kick off a Tripo text-to-3D request in the
   * background using `tripoPrompt` and swap the primitive silhouette for
   * the generated mesh once it arrives. Reserve for real landmarks.
   */
  iconic?: boolean;
  /** Short, visual prompt for Tripo when `iconic` is true. */
  tripoPrompt?: string;
  description: string;
  whyItMatters: string;
}

/**
 * One additional primitive that renders alongside a `GeneratedObject`'s
 * primary shape. Positions are in world coordinates (not offsets), so
 * Grok never has to reason about local frames.
 */
export interface ObjectPart {
  shape: PrimitiveShape;
  position: Vec3;
  scale: Vec3;
  color: string;
  /** Euler XYZ angles in degrees. Defaults to [0, 0, 0] when omitted. */
  rotation?: Vec3;
}
