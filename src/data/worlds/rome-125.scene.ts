import overview from '../../../public/images/rome-125/overview.json' with { type: 'json' };
import type {
  HistoricalWorld,
  OverviewImage,
  PointOfInterest,
} from '../../types/world';

const overviewImage = overview as unknown as OverviewImage;

/** Stable POI IDs and city coordinates are retained for the replacement views. */
export const rome125Scene: HistoricalWorld['scene'] = {
  presentation: 'overview-city',
  overviewImage,
  overviewCamera: {
    position: [-1450, 1250, 1650],
    target: [50, 40, 180],
    far: 18000,
    near: 10,
  },
  background: '#d6dfdf',
};

export const rome125POILayout: PointOfInterest[] = [
  {
    id: 'forum-trajan',
    name: 'Forum of Trajan',
    markerPosition: [0, 42, 0],
    camera: { position: [0, 1.65, 30], target: [0, 12, -40], far: 1800 },
  },
  {
    id: 'pantheon-forecourt',
    name: 'The New Pantheon',
    markerPosition: [-590, 52, -300],
    camera: { position: [0, 1.65, -42], target: [0, 13, 0], far: 1800 },
  },
  {
    id: 'colosseum-valley',
    name: 'Flavian Amphitheatre Valley',
    markerPosition: [680, 68, 630],
    camera: { position: [0, 1.65, 0], target: [80, 18, 0], far: 1800 },
  },
];
