import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from '../../app/state';
import type { HistoricalWorld } from '../../types/world';
import { findWorld, locations, worlds } from '../locations';
import { composeSceneLayers } from './composeSceneLayers';
import { pittsburgh1892 } from './pittsburgh-1892';
import { pittsburgh1850 } from './pittsburgh-1850';
import {
  pittsburghGeography,
  pittsburghWaterSurface,
} from './pittsburgh.geography';

function enter(world: HistoricalWorld) {
  return appReducer(
    appReducer(initialState, { type: 'location', id: world.locationId }),
    { type: 'era', id: world.era.id, world },
  );
}

describe('Pittsburgh era composition', () => {
  it('preserves every 1892 world value from the approved c87afe3 benchmark', () => {
    // Deliberate golden digest: includes IDs, order, cameras, model URLs, content, audio, environment.
    // Do not update merely to make a change pass; review a new hero benchmark first.
    expect(
      createHash('sha256').update(JSON.stringify(pittsburgh1892)).digest('hex'),
    ).toBe('9cdd7356ea1c1bf8de4d5055957cd46c9cdd00aa554a4e0e47c519219d047b1a');
  });

  it('reuses geography once per scene while the second era owns distinct content and views', () => {
    expect(pittsburgh1850.era.label).toContain('Blockout');
    expect(pittsburgh1850.scene.model).toBeUndefined();
    expect(pittsburgh1850.scene.narrationAudio).toBeUndefined();
    expect(pittsburgh1850.scene.narrationTranscript).toBeUndefined();
    expect(pittsburgh1850.scene.overviewCamera).not.toEqual(
      pittsburgh1892.scene.overviewCamera,
    );
    expect(pittsburgh1850.scene.environment).not.toEqual(
      pittsburgh1892.scene.environment,
    );
    for (const world of [pittsburgh1892, pittsburgh1850]) {
      for (const shared of pittsburghGeography) {
        const instances = world.scene.primitives.filter(
          (primitive) => primitive.id === shared.id,
        );
        expect(instances).toHaveLength(1);
        expect(instances[0]).toBe(shared);
      }
      expect(world.scene.environment?.water).toBe(pittsburghWaterSurface);
      for (const entries of [world.objects, world.pois, world.scene.primitives])
        expect(new Set(entries.map((entry) => entry.id)).size).toBe(
          entries.length,
        );
      for (const poi of world.pois) {
        expect(poi.objectIds).toEqual(
          world.objects
            .filter((object) => object.poiId === poi.id)
            .map((object) => object.id),
        );
        for (const object of world.objects.filter(
          (object) => object.poiId === poi.id,
        ))
          expect(
            world.scene.primitives.some(
              (primitive) => primitive.id === object.sceneObjectId,
            ),
          ).toBe(true);
      }
    }
    for (const entry of [...pittsburgh1850.pois, ...pittsburgh1850.objects])
      expect(entry.id).toMatch(/^1850-/);
    expect(pittsburgh1850.pois.map((poi) => poi.camera)).not.toEqual(
      pittsburgh1892.pois.map((poi) => poi.camera),
    );
    expect(composeSceneLayers(pittsburghGeography, [])).not.toBe(
      pittsburghGeography,
    );
    expect(() =>
      composeSceneLayers(pittsburghGeography, [pittsburghGeography[0]]),
    ).toThrow('duplicate primitive ID: ground');
  });

  it('registers each era through the existing lookup and keeps 1892 first', () => {
    expect(worlds).toEqual([pittsburgh1892, pittsburgh1850]);
    expect(locations[0].eras).toEqual([pittsburgh1892.era, pittsburgh1850.era]);
    expect(findWorld('pittsburgh', '1850')).toBe(pittsburgh1850);
    expect(findWorld('pittsburgh', '1892')).toBe(pittsburgh1892);
    expect(findWorld('pittsburgh', '1849')).toBeNull();
    expect(findWorld('unavailable', '1850')).toBeNull();
  });
});

describe('era state isolation', () => {
  it('resets selections and audio on repeated era changes and ignores every foreign POI/object ID', () => {
    let state = enter(pittsburgh1892);
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const [current, previous] of [
        [pittsburgh1850, pittsburgh1892],
        [pittsburgh1892, pittsburgh1850],
      ]) {
        state = appReducer(state, {
          type: 'object',
          id: previous.objects[0].id,
        });
        state = appReducer(state, { type: 'audio', state: 'playing' });
        state = appReducer(state, {
          type: 'era',
          id: current.era.id,
          world: current,
        });
        expect(state).toMatchObject({
          activeWorld: current,
          selectedEraId: current.era.id,
          activePOIId: null,
          selectedObjectId: null,
          cameraMode: 'OVERVIEW',
          audioState: 'idle',
        });
        for (const poi of previous.pois)
          expect(appReducer(state, { type: 'poi', id: poi.id })).toBe(state);
        for (const object of previous.objects) {
          expect(appReducer(state, { type: 'object', id: object.id })).toBe(
            state,
          );
          expect(
            appReducer(state, { type: 'object', id: object.sceneObjectId }),
          ).toBe(state);
        }
        for (const object of current.objects)
          expect(
            appReducer(state, { type: 'object', id: object.id }),
          ).toMatchObject({
            selectedObjectId: object.id,
            activePOIId: object.poiId,
          });
      }
    }
  });

  it('never activates a world under a mismatched location or era ID', () => {
    for (const world of worlds) {
      expect(
        appReducer(initialState, { type: 'era', id: world.era.id, world })
          .activeWorld,
      ).toBeNull();
      const wrongEra =
        world === pittsburgh1850 ? pittsburgh1892 : pittsburgh1850;
      expect(
        appReducer(enter(world), { type: 'era', id: wrongEra.era.id, world })
          .activeWorld,
      ).toBeNull();
      expect(
        appReducer(enter(world), { type: 'era', id: 'missing', world: null })
          .activeWorld,
      ).toBeNull();
    }
  });
});
