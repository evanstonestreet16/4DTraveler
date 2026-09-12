import type { HistoricalWorld, PointOfInterest } from '../../types/world';

/** Visual layout ownership: Workstream 1. Units are meters, +Y is up. */
export const pittsburgh1892Scene = {
  model: {
    url: '/models/pipeline-fixture.glb',
    selectableNodes: {
      furnace: 'furnace',
      stack: 'stack',
      'rail-car': 'rail-car',
      warehouse: 'warehouse',
      bridge: 'bridge',
    },
    loadingLabel: 'Loading the simplified world',
    fallbackLabel: 'The model could not load. Showing the simplified world.',
  },
  overviewCamera: {
    position: [30, 32, 38],
    target: [0, 0, 0],
  },
  background: '#e5e1d6',
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
} satisfies Omit<
  HistoricalWorld['scene'],
  'narrationAudio' | 'narrationTranscript'
>;

export const pittsburgh1892POILayout = [
  {
    id: 'steel-mill',
    markerPosition: [-11, 9, -5],
    camera: {
      position: [-1, 12, 15],
      target: [-10, 2, -3],
    },
    objectIds: ['blast-furnace', 'smokestack', 'rail-car'],
  },
  {
    id: 'downtown',
    markerPosition: [9, 7.5, -7],
    camera: {
      position: [20, 13, 9],
      target: [8, 1.5, -6],
    },
    objectIds: ['warehouse'],
  },
  {
    id: 'river-bridge',
    markerPosition: [7, 3, 10],
    camera: {
      position: [20, 13, 24],
      target: [7, 0, 9],
    },
    objectIds: ['river-crossing'],
  },
] satisfies Omit<PointOfInterest, 'name'>[];
