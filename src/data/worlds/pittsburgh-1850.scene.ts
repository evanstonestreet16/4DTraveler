import type { HistoricalWorld, PointOfInterest } from '../../types/world';
import { composeSceneLayers } from './composeSceneLayers';
import {
  pittsburghGeography,
  pittsburghWaterSurface,
} from './pittsburgh.geography';

/** Workstream 1 blockout: all footprints, density, and placement await Content review. */
export const pittsburgh1850Scene = {
  overviewCamera: { position: [32, 30, 40], target: [0, 0, 1] },
  background: '#e1e4d9',
  environment: {
    ambientIntensity: 0.85,
    skyColor: '#dce9e8',
    groundColor: '#918363',
    keyLight: { position: [-12, 26, 18], color: '#fff0d5', intensity: 2.1 },
    fog: { color: '#e1e4d9', near: 55, far: 145 },
    exposure: 1,
    water: pittsburghWaterSurface,
  },
  primitives: composeSceneLayers(pittsburghGeography, [
    {
      id: '1850-market-square',
      shape: 'box',
      position: [-8, 0, -4],
      scale: [17, 0.12, 13],
      color: '#b5a385',
    },
    {
      id: '1850-river-road',
      shape: 'box',
      position: [1, 0.03, 3],
      scale: [36, 0.12, 2.6],
      color: '#bbaa8b',
    },
    {
      id: '1850-stall-counter',
      shape: 'box',
      position: [-9, 0.85, -2],
      scale: [4.5, 1.7, 2.3],
      color: '#976c46',
    },
    {
      id: '1850-market-stall',
      shape: 'box',
      position: [-9, 2.05, -2],
      scale: [5, 0.3, 2.8],
      color: '#d0ae72',
    },
    {
      id: '1850-market-table',
      shape: 'box',
      position: [-3, 0.55, -2],
      scale: [3.4, 1.1, 1.7],
      color: '#a98458',
    },
    {
      id: '1850-street-frontage',
      shape: 'box',
      position: [-12, 1.65, -8],
      scale: [4, 3.3, 4],
      color: '#b98b70',
    },
    {
      id: '1850-market-frontage-2',
      shape: 'box',
      position: [-6, 1.4, -8],
      scale: [4, 2.8, 3.5],
      color: '#a4987f',
    },
    {
      id: '1850-market-frontage-3',
      shape: 'box',
      position: [0, 1.5, -8],
      scale: [3.5, 3, 4],
      color: '#ba9b78',
    },
    {
      id: '1850-river-frontage-1',
      shape: 'box',
      position: [10, 1.5, -3],
      scale: [5, 3, 4],
      color: '#b09273',
    },
    {
      id: '1850-river-frontage-2',
      shape: 'box',
      position: [16, 1.25, -3],
      scale: [4, 2.5, 4],
      color: '#a79b80',
    },
    {
      id: '1850-wharf-landing',
      shape: 'box',
      position: [10, 0.3, 5.1],
      scale: [12, 0.6, 3.2],
      color: '#8c7559',
    },
    {
      id: '1850-cargo-stack',
      shape: 'box',
      position: [12, 1.1, 4.8],
      scale: [2.8, 1.6, 2],
      color: '#b7955e',
    },
    {
      id: '1850-cargo-crate-2',
      shape: 'box',
      position: [7.7, 0.75, 5.2],
      scale: [1.5, 0.9, 1.4],
      color: '#b29a71',
    },
    {
      id: '1850-mooring-post',
      shape: 'cylinder',
      position: [5, 0.8, 6.2],
      scale: [0.5, 1, 0.5],
      color: '#7f674a',
    },
  ]),
} satisfies Omit<
  HistoricalWorld['scene'],
  'narrationAudio' | 'narrationTranscript'
>;

export const pittsburgh1850POILayout = [
  {
    id: '1850-market',
    markerPosition: [-8, 5, -4],
    camera: { position: [5, 11, 13], target: [-8, 1, -4] },
    objectIds: ['1850-market-stall', '1850-street-frontage'],
  },
  {
    id: '1850-wharf',
    markerPosition: [10, 3.5, 4.8],
    camera: { position: [23, 10, 22], target: [10, 0.7, 4.8] },
    objectIds: ['1850-wharf-landing', '1850-cargo-stack'],
  },
] satisfies Omit<PointOfInterest, 'name'>[];
