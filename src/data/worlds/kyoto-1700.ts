import type { HistoricalWorld } from '../../types/world';
import { kyoto1700Content as content } from './kyoto-1700.content';
import { kyoto1700Scene, kyoto1700POILayout } from './kyoto-1700.scene';

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
  scene: { ...kyoto1700Scene, ...content.overview },
  pois: kyoto1700POILayout.map((poi) => ({
    ...poi,
    immersive: poi.immersive
      ? {
          ...poi.immersive,
          ...content.pois[poi.id as keyof typeof content.pois],
        }
      : undefined,
  })),
  objects: content.objects,
};
