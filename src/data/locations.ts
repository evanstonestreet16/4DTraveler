import { rome125 } from './worlds/rome-125';
import type { Location } from '../types/world';
import { pittsburgh1892 } from './worlds/pittsburgh-1892';
import { pittsburgh1850 } from './worlds/pittsburgh-1850';

export const worlds = [rome125, pittsburgh1892, pittsburgh1850];
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
    id: pittsburgh1892.locationId,
    name: pittsburgh1892.locationName,
    region: 'Pennsylvania, United States',
    description:
      'Follow the rivers into a city of mills, railroads, and industry.',
    eras: [pittsburgh1892.era, pittsburgh1850.era],
  },
];

export function findWorld(locationId: string | null, eraId: string | null) {
  return (
    worlds.find(
      (world) => world.locationId === locationId && world.era.id === eraId,
    ) ?? null
  );
}
