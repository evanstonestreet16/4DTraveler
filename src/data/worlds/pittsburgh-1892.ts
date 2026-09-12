import type { HistoricalWorld } from '../../types/world';

export const pittsburgh1892: HistoricalWorld = {
  id: 'pittsburgh-1892',
  locationId: 'pittsburgh',
  locationName: 'Pittsburgh',
  era: {
    id: '1892',
    label: '1892',
    year: 1892,
    subtitle: 'An industrial city',
  },
  scene: {
    overviewCamera: { position: [30, 32, 38], target: [0, 0, 0] },
    background: '#e5e1d6',
    narrationAudio: '/audio/pittsburgh-1892-intro.wav',
    narrationTranscript:
      'Welcome to Pittsburgh in 1892. This simplified scene explores an industrial city shaped by steel, railroads, and rivers. Visit the steel mill to inspect a blast furnace, smokestack, and rail car. Then explore downtown and the river crossing. These shapes are illustrative placeholders, not an exact reconstruction.',
    primitives: [
      {
        id: 'ground',
        shape: 'box',
        position: [0, -0.3, 0],
        scale: [44, 0.5, 34],
        color: '#ada98c',
      },
      {
        id: 'river',
        shape: 'box',
        position: [0, 0, 9],
        scale: [44, 0.12, 7],
        color: '#668e98',
      },
      {
        id: 'mill-yard',
        shape: 'box',
        position: [-10, 0, -3],
        scale: [17, 0.15, 12],
        color: '#858477',
      },
      {
        id: 'furnace',
        shape: 'cylinder',
        position: [-13, 2.5, -4],
        scale: [3.4, 5, 3.4],
        color: '#855749',
      },
      {
        id: 'stack',
        shape: 'cylinder',
        position: [-8, 4, -6],
        scale: [1.6, 8, 1.6],
        color: '#9c735b',
      },
      {
        id: 'rail-car',
        shape: 'box',
        position: [-7, 1, 0],
        scale: [5, 1.6, 2],
        color: '#56605c',
      },
      {
        id: 'rail-left',
        shape: 'box',
        position: [-9, 0.12, -0.7],
        scale: [15, 0.15, 0.12],
        color: '#454d48',
      },
      {
        id: 'rail-right',
        shape: 'box',
        position: [-9, 0.12, 0.7],
        scale: [15, 0.15, 0.12],
        color: '#454d48',
      },
      {
        id: 'mill-shed',
        shape: 'box',
        position: [-16, 1.2, 0],
        scale: [3, 2.4, 3],
        color: '#6f736b',
      },
      {
        id: 'street',
        shape: 'box',
        position: [8, 0, -4],
        scale: [18, 0.16, 3],
        color: '#8b897e',
      },
      {
        id: 'warehouse',
        shape: 'box',
        position: [5, 2, -8],
        scale: [4, 4, 4],
        color: '#ac8265',
      },
      {
        id: 'downtown-2',
        shape: 'box',
        position: [11, 3, -9],
        scale: [4, 6, 4],
        color: '#969585',
      },
      {
        id: 'downtown-3',
        shape: 'box',
        position: [15, 1.5, -7],
        scale: [2, 3, 3],
        color: '#b39474',
      },
      {
        id: 'downtown-4',
        shape: 'box',
        position: [5, 1.5, 0],
        scale: [3, 3, 3],
        color: '#a69b84',
      },
      {
        id: 'downtown-5',
        shape: 'box',
        position: [11, 2, 0],
        scale: [4, 4, 3],
        color: '#9e7966',
      },
      {
        id: 'bridge',
        shape: 'box',
        position: [7, 1, 9],
        scale: [3.5, 0.7, 12],
        color: '#6c736c',
      },
      {
        id: 'bridge-pier-1',
        shape: 'box',
        position: [7, 0.45, 6],
        scale: [2, 0.9, 1],
        color: '#696e67',
      },
      {
        id: 'bridge-pier-2',
        shape: 'box',
        position: [7, 0.45, 12],
        scale: [2, 0.9, 1],
        color: '#696e67',
      },
    ],
  },
  pois: [
    {
      id: 'steel-mill',
      name: 'Steel Mill',
      markerPosition: [-11, 9, -5],
      camera: { position: [-1, 12, 15], target: [-10, 2, -3] },
      objectIds: ['blast-furnace', 'smokestack', 'rail-car'],
    },
    {
      id: 'downtown',
      name: 'Downtown',
      markerPosition: [9, 7.5, -7],
      camera: { position: [20, 13, 9], target: [8, 1.5, -6] },
      objectIds: ['warehouse'],
    },
    {
      id: 'river-bridge',
      name: 'River / Bridge',
      markerPosition: [7, 3, 10],
      camera: { position: [20, 13, 24], target: [7, 0, 9] },
      objectIds: ['river-crossing'],
    },
  ],
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
};
