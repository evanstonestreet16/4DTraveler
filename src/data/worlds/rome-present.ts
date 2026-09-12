import type { HistoricalWorld } from '../../types/world';
import { romePresentScene } from './rome-present.scene';
import { romePresentContent } from './rome-present.content';

export const romePresent: HistoricalWorld = {
  id: 'rome-present',
  locationId: 'rome',
  locationName: 'Rome',
  // Snapshot year, deliberately not derived from the visitor's clock.
  era: {
    id: 'present',
    label: 'Present',
    year: 2026,
    subtitle: 'The city today · Reference-grounded reconstruction',
  },
  scene: { ...romePresentScene, ...romePresentContent.overview },
  pois: [],
  objects: [],
};
