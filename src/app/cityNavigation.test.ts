import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from './state';
import { pittsburgh1892 } from '../data/worlds/pittsburgh-1892';
import type { HistoricalWorld } from '../types/world';

const city: HistoricalWorld = {
  ...pittsburgh1892,
  scene: { ...pittsburgh1892.scene, presentation: 'immersive-city' },
  pois: pittsburgh1892.pois.map((poi, index) => ({
    ...poi,
    preview: index === 1,
    immersive:
      index === 2
        ? undefined
        : {
            background: '#eeeeee',
            primitives: [],
            look: { minPitch: -0.5, maxPitch: 0.8 },
          },
  })),
};
const state = { ...initialState, activeWorld: city };

describe('city navigation guards', () => {
  it('does not enter preview or unfinished viewpoints, even when requested directly', () => {
    expect(appReducer(state, { type: 'poi', id: city.pois[1].id })).toBe(state);
    expect(appReducer(state, { type: 'poi', id: city.pois[2].id })).toBe(state);
    expect(
      appReducer(state, { type: 'poi', id: city.pois[0].id }),
    ).toMatchObject({ activePOIId: city.pois[0].id, cameraMode: 'POI' });
  });
});
