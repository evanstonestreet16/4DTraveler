import type { Era, HistoricalObject } from '../../types/world';

/** Editorial ownership: Workstream 4. Keep stable IDs aligned with scene data. */
export const pittsburgh1892Content = {
  id: 'pittsburgh-1892',
  locationId: 'pittsburgh',
  locationName: 'Pittsburgh',
  era: {
    id: '1892',
    label: '1892',
    year: 1892,
    subtitle: 'An industrial city',
  },
  narrationAudio: '/audio/pittsburgh-1892-intro.wav',
  narrationTranscript:
    'Welcome to Pittsburgh in 1892. This simplified scene explores an industrial city shaped by steel, railroads, and rivers. Visit the steel mill to inspect a blast furnace, smokestack, and rail car. Then explore downtown and the river crossing. These shapes are illustrative placeholders, not an exact reconstruction.',
  poiNames: {
    'steel-mill': 'Steel Mill',
    downtown: 'Downtown',
    'river-bridge': 'River / Bridge',
  },
  objects: [
    {
      id: 'blast-furnace',
      name: 'Blast Furnace',
      poiId: 'steel-mill',
      sceneObjectId: 'furnace',
      description:
        'A furnace used to smelt iron ore at extremely high temperatures, producing iron for further processing.',
      whyItMatters:
        'Blast furnaces supplied the iron that helped sustain Pittsburgh’s steel industry.',
    },
    {
      id: 'smokestack',
      name: 'Smokestack',
      poiId: 'steel-mill',
      sceneObjectId: 'stack',
      description:
        'A tall chimney that carried exhaust gases away from industrial furnaces and boilers.',
      whyItMatters:
        'Stacks marked the city’s industrial skyline and the environmental cost of coal-powered production.',
    },
    {
      id: 'rail-car',
      name: 'Rail Car',
      poiId: 'steel-mill',
      sceneObjectId: 'rail-car',
      description:
        'A freight car for moving bulky raw materials and finished products along rail lines.',
      whyItMatters:
        'Rail connections linked mills to supplies and markets beyond the city.',
    },
    {
      id: 'warehouse',
      name: 'Warehouse',
      poiId: 'downtown',
      sceneObjectId: 'warehouse',
      description:
        'A building for storing goods before they moved on to shops, factories, or transport routes.',
      whyItMatters:
        'Storage and trade supported the city’s growing industrial economy.',
    },
    {
      id: 'river-crossing',
      name: 'River Crossing',
      poiId: 'river-bridge',
      sceneObjectId: 'bridge',
      description:
        'An illustrative bridge connecting districts across a river.',
      whyItMatters:
        'River crossings connected communities and industries divided by Pittsburgh’s waterways.',
    },
  ],
} satisfies {
  id: string;
  locationId: string;
  locationName: string;
  era: Era;
  narrationAudio: string;
  narrationTranscript: string;
  poiNames: Record<string, string>;
  objects: HistoricalObject[];
};
