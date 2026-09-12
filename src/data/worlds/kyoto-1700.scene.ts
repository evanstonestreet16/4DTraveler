import manifest from '../../../public/images/kyoto-1700/manifest.json' with { type: 'json' };
import type {
  HistoricalWorld,
  OverviewImage,
  PanoramaAsset,
  PointOfInterest,
} from '../../types/world';

// Arrays in authored JSON are fixed-length coordinates; the focused asset test validates them.
const images = manifest as unknown as {
  overview: OverviewImage;
  panoramas: Record<string, PanoramaAsset>;
};

/** Metres from Nijō; +X east, +Y up, +Z south. Geographic anchors are approximate. */
export const kyoto1700Scene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewTransition: { group: 'kyoto-central', durationMs: 2200 },
  background: '#acb7af',
  overviewCamera: {
    position: [-2800, 2200, 3800],
    target: [1400, 100, 700],
    near: 10,
    far: 50000,
  },
  overviewImage: images.overview,
  primitives: [],
};

const layout: PointOfInterest[] = [
  {
    id: 'nijo-ninomaru',
    name: 'Nijō Castle: Ninomaru Approach',
    markerPosition: [0, 55, 0],
    camera: { position: [0, 1.65, 0], target: [0, 6, -24], far: 1800 },
    objectIds: ['nijo-karamon', 'nijo-ninomaru-palace', 'nijo-kurumayose'],
  },
  {
    id: 'kiyomizu-hillside',
    name: 'Kiyomizu-dera Hillside',
    markerPosition: [3350, 210, 2150],
    camera: { position: [18, 1.65, 24], target: [0, 10, 0], far: 1800 },
    objectIds: ['kiyomizu-main-hall', 'kiyomizu-stage', 'otowa-waterfall'],
  },
  {
    id: 'nishiki-fish-market',
    name: 'Nishiki Fish Market',
    markerPosition: [1500, 28, 1000],
    camera: { position: [0, 1.65, 0], target: [0, 1.8, -18], far: 1800 },
    objectIds: [
      'nishiki-fish-stall',
      'nishiki-groundwater',
      'nishiki-machiya-shopfront',
    ],
  },
];

export const kyoto1700POILayout: PointOfInterest[] = layout.map(
  (poi, index) => {
    const panorama = images.panoramas[poi.id];
    const limits = [
      [-35, 60],
      [-45, 65],
      [-35, 50],
    ][index];
    return {
      ...poi,
      preview: !panorama,
      immersive: panorama
        ? {
            background: '#acb7af',
            panorama,
            primitives: [],
            look: {
              minPitch: (limits[0] * Math.PI) / 180,
              maxPitch: (limits[1] * Math.PI) / 180,
            },
          }
        : undefined,
    };
  },
);
