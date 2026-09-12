import type { HistoricalWorld } from '../../types/world';
import { rome125Content as content } from './rome-125.content';
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
  scene: { ...rome125Scene, ...content.overview },
  pois: rome125POILayout.map((poi) => ({
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
