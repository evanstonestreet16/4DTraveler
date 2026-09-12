export type Vec3 = [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
  far?: number;
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

export interface RenderedImageAsset {
  url: string;
  width: number;
  height: number;
}

export interface OverviewImage {
  desktop: RenderedImageAsset;
  mobile?: RenderedImageAsset;
  fallback: RenderedImageAsset;
  /** Normalized coordinates in each authored image before cover cropping. */
  markers: Record<
    string,
    { desktop: [number, number]; mobile?: [number, number] }
  >;
}

export interface PointOfInterest {
  id: string;
  name: string;
  /** Preserved city-space anchor for the replacement detail experience. */
  markerPosition: Vec3;
  /** Preserved camera preset for the replacement detail experience. */
  camera: CameraView;
}

export interface HistoricalWorld {
  id: string;
  locationId: string;
  locationName: string;
  era: Era;
  scene: {
    presentation: 'overview-city';
    overviewImage: OverviewImage;
    overviewCamera: CameraView;
    background: string;
  };
  pois: PointOfInterest[];
}
