import type { HistoricalWorld } from '../../types/world';
import { pittsburgh1850Content as content } from './pittsburgh-1850.content';
import {
  pittsburgh1850POILayout,
  pittsburgh1850Scene,
} from './pittsburgh-1850.scene';

export const pittsburgh1850: HistoricalWorld = {
  id: content.id,
  locationId: content.locationId,
  locationName: content.locationName,
  era: content.era,
  scene: pittsburgh1850Scene,
  pois: pittsburgh1850POILayout.map((poi) => ({
    ...poi,
    name: content.poiNames[poi.id as keyof typeof content.poiNames],
  })),
  objects: content.objects,
};
