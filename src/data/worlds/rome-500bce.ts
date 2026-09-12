import type { HistoricalWorld } from '../../types/world';
import { rome500bceContent } from './rome-500bce.content';
import { rome500bcePOILayout, rome500bceScene } from './rome-500bce.scene';

export const rome500bce: HistoricalWorld = {
  id: 'rome-500bce',
  locationId: 'rome',
  locationName: 'Rome',
  era: {
    id: '500bce',
    label: 'Circa 500 BCE',
    year: -500,
    subtitle: 'Early Rome · Overview preview',
  },
  scene: { ...rome500bceScene, ...rome500bceContent.overview },
  pois: rome500bcePOILayout,
  objects: [],
};
