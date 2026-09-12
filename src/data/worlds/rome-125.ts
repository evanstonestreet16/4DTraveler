import type { HistoricalWorld } from '../../types/world';
import { rome125Scene, rome125POILayout } from './rome-125.scene';

export const rome125: HistoricalWorld = {
  id: 'rome-125',
  locationId: 'rome',
  locationName: 'Rome',
  era: {
    id: '125',
    label: '125 CE',
    year: 125,
    subtitle: 'Imperial Rome · Hadrian’s reign',
  },
  scene: rome125Scene,
  pois: rome125POILayout,
};
