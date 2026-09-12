import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from './state';
import { pittsburgh1892 } from '../data/worlds/pittsburgh-1892';
import type { HistoricalWorld } from '../types/world';

const world: HistoricalWorld = {
  ...pittsburgh1892,
  scene: { ...pittsburgh1892.scene, presentation: 'immersive-city' },
  pois: pittsburgh1892.pois.map((poi, index) => ({
    ...poi,
    preview: index === 2,
    immersive:
      index === 2
        ? undefined
        : {
            background: '#d8d1b8',
            primitives: [],
            look: { minPitch: -0.5, maxPitch: 1 },
          },
  })),
};
const overview = {
  ...initialState,
  selectedLocationId: world.locationId,
  selectedEraId: world.era.id,
  activeWorld: world,
};

describe('immersive object selection boundaries', () => {
  it('accepts only an object in the active available presentation', () => {
    expect(
      appReducer(overview, { type: 'object', id: world.objects[0].id }),
    ).toBe(overview);
    const inPoi = appReducer(overview, { type: 'poi', id: world.pois[0].id });
    const selected = appReducer(inPoi, {
      type: 'object',
      id: world.pois[0].objectIds[0],
    });
    expect(selected.selectedObjectId).toBe(world.pois[0].objectIds[0]);
    expect(
      appReducer(selected, { type: 'object', id: world.pois[1].objectIds[0] }),
    ).toBe(selected);
    expect(
      appReducer(selected, { type: 'object', id: world.pois[2].objectIds[0] }),
    ).toBe(selected);
    expect(
      appReducer(selected, { type: 'object', id: 'missing-metadata' }),
    ).toBe(selected);
  });

  it('closing and switching field notes preserve the active presentation and camera mode', () => {
    const inPoi = appReducer(overview, { type: 'poi', id: world.pois[0].id });
    let selected = appReducer(inPoi, {
      type: 'object',
      id: world.pois[0].objectIds[0],
    });
    selected = appReducer(selected, {
      type: 'object',
      id: world.pois[0].objectIds[1],
    });
    const closed = appReducer(selected, { type: 'object', id: null });
    expect(closed).toEqual({ ...selected, selectedObjectId: null });
    expect(closed.activeWorld).toBe(world);
    expect(closed.activePOIId).toBe(world.pois[0].id);
    expect(closed.cameraMode).toBe('POI');
  });
});
