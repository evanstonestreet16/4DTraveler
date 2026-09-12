import { rome125 } from './worlds/rome-125';
import { romePresent } from './worlds/rome-present';
import { kyoto1700 } from './worlds/kyoto-1700';
import type { Location } from '../types/world';
import { pittsburgh1892 } from './worlds/pittsburgh-1892';
import { pittsburgh1850 } from './worlds/pittsburgh-1850';

export const worlds = [
  rome125,
  romePresent,
  kyoto1700,
  pittsburgh1892,
  pittsburgh1850,
];
export const locations: Location[] = [
  {
    id: rome125.locationId,
    name: rome125.locationName,
    region: 'Italy · Ancient Mediterranean',
    description:
      'Enter the living capital of Hadrian: marble forums, a new Pantheon, and the Flavian Amphitheatre.',
    eras: [rome125.era, romePresent.era],
    globe: { countryIsoA3: 'ITA', coordinates: { lat: 41.895, lng: 12.485 } },
  },
  {
    id: kyoto1700.locationId,
    name: kyoto1700.locationName,
    region: 'Japan · Kyoto basin',
    description:
      'Look across the mountain-framed capital, then step inside the guarded approach to Nijō Castle.',
    eras: [kyoto1700.era],
  },
  {
    id: pittsburgh1892.locationId,
    name: pittsburgh1892.locationName,
    region: 'Pennsylvania, United States',
    description:
      'Follow the rivers into a city of mills, railroads, and industry.',
    eras: [pittsburgh1892.era, pittsburgh1850.era],
    globe: {
      countryIsoA3: 'USA',
      coordinates: { lat: 40.4406, lng: -79.9959 },
    },
  },
];

export function findWorld(locationId: string | null, eraId: string | null) {
  return (
    worlds.find(
      (world) => world.locationId === locationId && world.era.id === eraId,
    ) ?? null
  );
}
