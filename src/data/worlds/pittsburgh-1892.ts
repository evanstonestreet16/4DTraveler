import type { HistoricalWorld } from '../../types/world';
import { pittsburgh1892Content as content } from './pittsburgh-1892.content';
import {
  pittsburgh1892Scene,
  pittsburgh1892POILayout,
} from './pittsburgh-1892.scene';

export const pittsburgh1892: HistoricalWorld = {
  id: content.id,
  locationId: content.locationId,
  locationName: content.locationName,
  era: content.era,
  scene: {
    ...pittsburgh1892Scene,
    narrationAudio: content.narrationAudio,
    narrationTranscript: content.narrationTranscript,
  },
  pois: pittsburgh1892POILayout.map((poi) => ({
    ...poi,
    name: content.poiNames[poi.id as keyof typeof content.poiNames],
  })),
  objects: content.objects,
};
