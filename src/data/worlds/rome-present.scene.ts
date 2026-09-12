import images from '../../../public/images/rome-present/manifest.json' with { type: 'json' };
import { rome125Scene } from './rome-125.scene';
import type { HistoricalWorld } from '../../types/world';

export const romePresentScene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewTransition: rome125Scene.overviewTransition,
  overviewCamera: rome125Scene.overviewCamera,
  overviewImage: {
    ...images.overview,
    markers: {},
    description: 'Present-day Rome · Reference-grounded reconstruction',
  },
  background: '#b7ab93',
  primitives: [],
};
