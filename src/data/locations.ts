import { rome125 } from './worlds/rome-125';
import { kyoto1700 } from './worlds/kyoto-1700';
import type { Location } from '../types/world';

export const worlds = [rome125, kyoto1700];
export const locations: Location[] = [
  {
    id: rome125.locationId,
    name: rome125.locationName,
    region: 'Italy · Ancient Mediterranean',
    description:
      'Enter the living capital of Hadrian: marble forums, a new Pantheon, and the Flavian Amphitheatre.',
    eras: [rome125.era],
  },
  {
    id: kyoto1700.locationId,
    name: kyoto1700.locationName,
    region: 'Japan · Kyoto basin',
    description:
      'Look across the mountain-framed capital and discover its castle, temple, and market districts.',
    eras: [kyoto1700.era],
  },
];

export function findWorld(locationId: string | null, eraId: string | null) {
  return (
    worlds.find(
      (world) => world.locationId === locationId && world.era.id === eraId,
    ) ?? null
  );
}
