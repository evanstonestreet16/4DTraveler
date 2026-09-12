import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from './state';
import { pittsburgh1892 as world } from '../data/worlds/pittsburgh-1892';
import { findWorld } from '../data/locations';

const locationState = appReducer(initialState, {
  type: 'location',
  id: world.locationId,
});
const worldState = appReducer(locationState, {
  type: 'era',
  id: world.era.id,
  world,
});

describe('exploration state', () => {
  it('enters a world in overview and resets dependent state when changing location', () => {
    expect(worldState.activeWorld).toBe(world);
    expect(worldState.cameraMode).toBe('OVERVIEW');
    const selected = appReducer(worldState, {
      type: 'object',
      id: 'blast-furnace',
    });
    const playing = appReducer(selected, { type: 'audio', state: 'playing' });
    expect(appReducer(playing, { type: 'location', id: null })).toEqual(
      initialState,
    );
  });
  it('selects an object in its owning POI and clears it on navigation', () => {
    const selected = appReducer(worldState, {
      type: 'object',
      id: 'blast-furnace',
    });
    expect(selected).toMatchObject({
      selectedObjectId: 'blast-furnace',
      activePOIId: 'steel-mill',
      cameraMode: 'POI',
    });
    expect(appReducer(selected, { type: 'poi', id: 'downtown' })).toMatchObject(
      { selectedObjectId: null, activePOIId: 'downtown' },
    );
    expect(appReducer(selected, { type: 'overview' })).toMatchObject({
      selectedObjectId: null,
      activePOIId: null,
      cameraMode: 'OVERVIEW',
    });
    expect(appReducer(selected, { type: 'object', id: null }).activePOIId).toBe(
      'steel-mill',
    );
  });
  it('ignores invalid selection IDs and handles missing/mismatched worlds', () => {
    expect(appReducer(worldState, { type: 'object', id: 'missing' })).toBe(
      worldState,
    );
    expect(appReducer(worldState, { type: 'poi', id: 'missing' })).toBe(
      worldState,
    );
    expect(findWorld('missing', '1892')).toBeNull();
    expect(
      appReducer(initialState, { type: 'era', id: '1892', world }).activeWorld,
    ).toBeNull();
    expect(
      appReducer(locationState, { type: 'era', id: '404', world: null })
        .activeWorld,
    ).toBeNull();
  });
});

describe('static world integrity', () => {
  it('has unique IDs, valid references, and complete bidirectional POI membership', () => {
    for (const entries of [world.objects, world.pois, world.scene.primitives]) {
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(
        entries.length,
      );
    }
    for (const object of world.objects) {
      expect(
        world.scene.primitives.some(
          (primitive) => primitive.id === object.sceneObjectId,
        ),
      ).toBe(true);
      expect(
        world.pois.find((poi) => poi.id === object.poiId)?.objectIds,
      ).toContain(object.id);
    }
    for (const poi of world.pois) {
      expect(poi.objectIds).toEqual(
        world.objects
          .filter((object) => object.poiId === poi.id)
          .map((object) => object.id),
      );
    }
    expect(world.pois).toHaveLength(3);
    expect(world.pois[0].objectIds.length).toBeGreaterThanOrEqual(3);
  });
});
