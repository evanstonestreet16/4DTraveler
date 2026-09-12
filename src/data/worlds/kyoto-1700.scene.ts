import overview from '../../../public/images/kyoto-1700/overview.json' with { type: 'json' };
import type {
  HistoricalWorld,
  OverviewImage,
  PointOfInterest,
} from '../../types/world';

const overviewImage = overview as unknown as OverviewImage;

/** Approximate city coordinates; visible marker placement is authored in the manifest. */
export const kyoto1700Scene: HistoricalWorld['scene'] = {
  presentation: 'overview-city',
  overviewImage,
  overviewCamera: {
    position: [-2800, 2200, 3800],
    target: [1400, 100, 700],
    near: 10,
    far: 50000,
  },
  background: '#acb7af',
};

export const kyoto1700POILayout: PointOfInterest[] = [
  {
    id: 'nijo-ninomaru',
    name: 'Nijō Castle: Ninomaru Approach',
    markerPosition: [0, 55, 0],
    camera: { position: [0, 1.65, 0], target: [0, 6, -24], far: 1800 },
  },
  {
    id: 'kiyomizu-hillside',
    name: 'Kiyomizu-dera Hillside',
    markerPosition: [3350, 210, 2150],
    camera: { position: [18, 1.65, 24], target: [0, 10, 0], far: 1800 },
  },
  {
    id: 'nishiki-fish-market',
    name: 'Nishiki Fish Market',
    markerPosition: [1500, 28, 1000],
    camera: { position: [0, 1.65, 0], target: [0, 1.8, -18], far: 1800 },
  },
];
