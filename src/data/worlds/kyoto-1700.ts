import type { HistoricalWorld } from '../../types/world';
import { kyoto1700POILayout, kyoto1700Scene } from './kyoto-1700.scene';

export const kyoto1700: HistoricalWorld = {
  id: 'kyoto-1700',
  locationId: 'kyoto',
  locationName: 'Kyoto',
  era: {
    id: '1700',
    label: 'circa 1700',
    year: 1700,
    subtitle: 'Genroku era · Court, castle, and city life',
  },
  scene: kyoto1700Scene,
  pois: kyoto1700POILayout,
};
