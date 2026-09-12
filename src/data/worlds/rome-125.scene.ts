import overviewMetrics from '../../../public/models/rome-125/overview.metrics.json' with { type: 'json' };
import forumMetrics from '../../../public/models/rome-125/forum-trajan.metrics.json' with { type: 'json' };
import type {
  HistoricalWorld,
  PointOfInterest,
  ScenePrimitive,
  WorldEnvironment,
} from '../../types/world';

const box = (
  id: string,
  position: ScenePrimitive['position'],
  scale: ScenePrimitive['scale'],
  color = '#d9c5a1',
): ScenePrimitive => ({ id, shape: 'box', position, scale, color });
const forumEnvironment: WorldEnvironment = {
  ambientIntensity: 1.1,
  skyColor: '#d9e5ec',
  groundColor: '#b09b7d',
  keyLight: { position: [-45, 85, 30], color: '#fff0d4', intensity: 3.1 },
  fog: { color: '#d6dfdf', near: 200, far: 850 },
  exposure: 1.1,
};

/** Metres; Forum center is origin, +X east, +Y up, +Z south. */
export const rome125Scene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewCamera: {
    position: [-1450, 1250, 1650],
    target: [50, 40, 180],
    far: 18000,
    near: 10,
  },
  background: '#d6dfdf',
  environment: {
    ...forumEnvironment,
    keyLight: { position: [-900, 1500, 800], color: '#fff0d4', intensity: 3.1 },
    fog: { color: '#d6dfdf', near: 2200, far: 10500 },
  },
  model: {
    url: `/models/rome-125/overview.glb?v=${overviewMetrics.sha256.slice(0, 12)}`,
    selectableNodes: {},
    loadingLabel: 'Loading Rome’s monumental center',
    fallbackLabel:
      'Rome’s detailed overview could not load. Explore the simplified city.',
  },
  primitives: [
    box('rome-ground', [0, -4, 0], [26000, 8, 26000], '#92866b'),
    box('tiber', [-1050, 0.1, 0], [160, 0.2, 6000], '#668c87'),
    box('forum-square', [0, 0.2, 0], [110, 0.4, 86], '#ece2cc'),
    box('basilica-silhouette', [0, 13, -59], [116, 26, 29]),
    {
      id: 'pantheon-dome',
      shape: 'cylinder',
      position: [-590, 16, -300],
      scale: [48, 32, 48],
      color: '#d9c5a1',
    },
    {
      id: 'amphitheatre-silhouette',
      shape: 'cylinder',
      position: [680, 24, 630],
      scale: [188, 48, 156],
      color: '#d9c5a1',
    },
    box('palatine', [350, 25, 700], [260, 50, 220], '#8b9068'),
    box('circus', [230, 1, 1070], [620, 2, 140], '#bdae93'),
  ],
};

export const rome125POILayout: PointOfInterest[] = [
  {
    id: 'forum-trajan',
    name: 'Forum of Trajan',
    markerPosition: [0, 42, 0],
    camera: { position: [0, 1.65, 30], target: [0, 12, -40], far: 1800 },
    objectIds: [
      'trajan-equestrian-statue',
      'basilica-ulpia-facade',
      'dacian-prisoner-statue',
    ],
    immersive: {
      background: '#d6dfdf',
      environment: forumEnvironment,
      look: { minPitch: (-35 * Math.PI) / 180, maxPitch: (55 * Math.PI) / 180 },
      model: {
        url: `/models/rome-125/forum-trajan.glb?v=${forumMetrics.sha256.slice(0, 12)}`,
        selectableNodes: {
          rome125_trajan_equestrian_statue: 'rome125_trajan_equestrian_statue',
          rome125_basilica_ulpia_facade: 'rome125_basilica_ulpia_facade',
          rome125_dacian_prisoner_statue: 'rome125_dacian_prisoner_statue',
        },
        loadingLabel: 'Entering the Forum of Trajan',
        fallbackLabel:
          'The detailed Forum could not load. Its simplified scene and objects remain available.',
      },
      primitives: [
        box('forum-paving', [0, -0.3, 0], [1200, 0.6, 1200], '#bdae93'),
        box('rome125_basilica_ulpia_facade', [0, 13, -59], [116, 26, 29]),
        box('forum-east-portico', [55, 10, 0], [14, 20, 100]),
        box('forum-west-portico', [-55, 10, 0], [14, 20, 100]),
        box('forum-entrance', [0, 8, 55], [120, 16, 10]),
        box(
          'rome125_trajan_equestrian_statue',
          [0, 3.5, 0],
          [6, 7, 3],
          '#a77f36',
        ),
        box(
          'rome125_dacian_prisoner_statue',
          [42, 2.5, -9],
          [2, 5, 2],
          '#7d4f49',
        ),
      ],
    },
  },
  {
    id: 'pantheon-forecourt',
    name: 'The New Pantheon',
    markerPosition: [-590, 52, -300],
    camera: { position: [0, 1.65, -32], target: [0, 11, 0], far: 1800 },
    objectIds: [],
    preview: true,
  },
  {
    id: 'colosseum-valley',
    name: 'Flavian Amphitheatre Valley',
    markerPosition: [680, 68, 630],
    camera: { position: [0, 1.65, 0], target: [80, 18, 0], far: 1800 },
    objectIds: [],
    preview: true,
  },
];
