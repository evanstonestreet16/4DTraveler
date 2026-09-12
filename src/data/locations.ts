import type { Location } from '../types/world';
import { pittsburgh1892 } from './worlds/pittsburgh-1892';
import { pittsburgh1850 } from './worlds/pittsburgh-1850';

export const worlds = [pittsburgh1892, pittsburgh1850];
export const locations: Location[] = [
  {
    id: pittsburgh1892.locationId,
    name: pittsburgh1892.locationName,
    region: 'Pennsylvania, United States',
    description:
      'Follow the rivers into a city of mills, railroads, and industry.',
    eras: [pittsburgh1892.era, pittsburgh1850.era],
<<<<<<< HEAD
    globe: {
      countryIsoA3: 'USA',
      coordinates: { lat: 40.4406, lng: -79.9959 },
    },
=======
    globe: { countryIsoA3: 'USA', city: 'Pittsburgh' },
>>>>>>> 9eff075 (rough pins)
  },
];

export function findWorld(locationId: string | null, eraId: string | null) {
  return (
    worlds.find(
      (world) => world.locationId === locationId && world.era.id === eraId,
    ) ?? null
  );
}
