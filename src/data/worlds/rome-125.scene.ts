import renderedImages from '../../../public/images/rome-125/manifest.json' with { type: 'json' };
import pantheonMetrics from '../../../public/models/rome-125/pantheon-forecourt.metrics.json' with { type: 'json' };
import overviewMetrics from '../../../public/models/rome-125/overview.metrics.json' with { type: 'json' };
import forumMetrics from '../../../public/models/rome-125/forum-trajan.metrics.json' with { type: 'json' };
import valleyMetrics from '../../../public/models/rome-125/colosseum-valley.metrics.json' with { type: 'json' };
import type {
  HistoricalWorld,
  OverviewImage,
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

/** Coordinates follow each delivered overview image before responsive cover cropping. */
const renderedOverview: OverviewImage = {
  ...renderedImages.overview,
  markers: Object.fromEntries(
    Object.entries(renderedImages.overview.markers).map(([id, marker]) => [
      id,
      {
        desktop: [marker.desktop[0], marker.desktop[1]] as [number, number],
        mobile: [marker.mobile[0], marker.mobile[1]] as [number, number],
      },
    ]),
  ),
};

/** Metres; Forum center is origin, +X east, +Y up, +Z south. */
export const rome125Scene: HistoricalWorld['scene'] = {
  presentation: 'immersive-city',
  overviewTransition: { group: 'rome-central', durationMs: 2200 },
  overviewImage: renderedOverview,
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
      panorama: renderedImages.panoramas['forum-trajan'],
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
    camera: { position: [0, 1.65, -42], target: [0, 13, 0], far: 1800 },
    objectIds: [
      'pantheon-agrippa-inscription',
      'pantheon-granite-columns',
      'pantheon-forecourt-colonnade',
    ],
    immersive: {
      panorama: renderedImages.panoramas['pantheon-forecourt'],
      background: '#d6dfdf',
      environment: forumEnvironment,
      look: { minPitch: (-35 * Math.PI) / 180, maxPitch: (65 * Math.PI) / 180 },
      model: {
        url: `/models/rome-125/pantheon-forecourt.glb?v=${pantheonMetrics.sha256.slice(0, 12)}`,
        selectableNodes: {
          rome125_pantheon_agrippa_inscription:
            'rome125_pantheon_agrippa_inscription',
          rome125_pantheon_granite_columns: 'rome125_pantheon_granite_columns',
          rome125_pantheon_forecourt_colonnade:
            'rome125_pantheon_forecourt_colonnade',
        },
        loadingLabel: 'Entering the Pantheon forecourt',
        fallbackLabel:
          'The detailed Pantheon could not load. Explore its simplified forecourt and objects.',
      },
      primitives: [
        box('pantheon-paving', [0, -0.3, 0], [1200, 0.6, 1200], '#bdae93'),
        {
          id: 'pantheon-rotunda',
          shape: 'cylinder',
          position: [0, 20, 28],
          scale: [44, 40, 44],
          color: '#ac967c',
        },
        box(
          'rome125_pantheon_agrippa_inscription',
          [0, 16.6, -9.6],
          [36, 1.6, 2.8],
        ),
        box(
          'rome125_pantheon_granite_columns',
          [-14.7, 8, -7],
          [1.6, 13, 1.6],
          '#ac967c',
        ),
        box(
          'rome125_pantheon_forecourt_colonnade',
          [31, 7, -35],
          [12, 14, 110],
        ),
        box('pantheon-west-portico', [-31, 7, -35], [12, 14, 110]),
        box('pantheon-entry', [0, 10, -105], [145, 20, 20]),
        box('pantheon-porch', [0, 17.5, 1], [37, 1, 25]),
      ],
    },
  },
  {
    id: 'colosseum-valley',
    name: 'Flavian Amphitheatre Valley',
    markerPosition: [680, 68, 630],
    camera: { position: [0, 1.65, 0], target: [80, 18, 0], far: 1800 },
    objectIds: ['colosseum-outer-arcade', 'meta-sudans', 'venus-roma-worksite'],
    immersive: {
      panorama: renderedImages.panoramas['colosseum-valley'],
      background: '#d6dfdf',
      environment: forumEnvironment,
      look: { minPitch: (-35 * Math.PI) / 180, maxPitch: (60 * Math.PI) / 180 },
      ambientAudio: '/audio/rome-125/colosseum-valley-ambience.wav',
      model: {
        url: `/models/rome-125/colosseum-valley.glb?v=${valleyMetrics.sha256.slice(0, 12)}`,
        selectableNodes: {
          rome125_colosseum_outer_arcade: 'rome125_colosseum_outer_arcade',
          rome125_meta_sudans: 'rome125_meta_sudans',
          rome125_venus_roma_worksite: 'rome125_venus_roma_worksite',
        },
        loadingLabel: 'Entering the Flavian Amphitheatre valley',
        fallbackLabel:
          'The detailed valley could not load. Explore its simplified landmarks and objects.',
      },
      primitives: [
        box('valley-paving', [0, -0.3, 0], [1600, 0.6, 1600], '#bdae93'),
        {
          id: 'rome125_colosseum_outer_arcade',
          shape: 'cylinder',
          position: [175, 24, 0],
          scale: [188, 48, 156],
          color: '#d9c5a1',
        },
        {
          id: 'rome125_meta_sudans',
          shape: 'cylinder',
          position: [16, 8, 36],
          scale: [8, 16, 8],
          color: '#c5b595',
        },
        box('rome125_venus_roma_worksite', [-120, 1.5, -10], [170, 3, 95]),
        box('valley-palatine', [10, 22, 220], [380, 44, 140], '#8b9068'),
        box('valley-north-closure', [0, 13, -320], [700, 26, 45]),
        box('valley-west-closure', [-320, 13, 0], [45, 26, 700]),
      ],
    },
  },
];
