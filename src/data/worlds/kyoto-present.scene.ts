import images from '../../../public/images/kyoto-present/manifest.json' with { type: 'json' };
import { kyoto1700Scene } from './kyoto-1700.scene';
import type { HistoricalWorld } from '../../types/world';

export const kyotoPresentScene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewTransition: kyoto1700Scene.overviewTransition,
  overviewCamera: kyoto1700Scene.overviewCamera,
  overviewImage: {
    ...images.overview,
    markers: {},
    description: 'Present-day Kyoto · Illustrated reconstruction',
  },
  background: kyoto1700Scene.background,
  primitives: [],
};
