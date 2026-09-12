import type { HistoricalWorld } from '../../types/world';
import { kyotoPresentScene } from './kyoto-present.scene';
import { kyotoPresentContent } from './kyoto-present.content';

export const kyotoPresent: HistoricalWorld = {
  id: 'kyoto-present',
  locationId: 'kyoto',
  locationName: 'Kyoto',
  era: {
    id: 'present',
    label: 'Present',
    year: 2026,
    subtitle: 'The city today · Illustrated reconstruction',
  },
  scene: { ...kyotoPresentScene, ...kyotoPresentContent.overview },
  pois: [],
  objects: [],
};
