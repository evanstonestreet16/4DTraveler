import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from './state';
import { rome125 } from '../data/worlds/rome-125';
import { romePresent } from '../data/worlds/rome-present';

const entered = appReducer(
  { ...initialState, selectedLocationId: 'rome' },
  { type: 'era', id: '125', world: rome125 },
);
const request = {
  type: 'era-request' as const,
  requestId: 1,
  world: romePresent,
};
describe('overview era transition lifecycle', () => {
  it('preserves the entry mode from main and cancels travel when leaving for the globe', () => {
    const fromGlobe = { ...entered, mode: 'globe' as const };
    const pending = appReducer(fromGlobe, request);
    expect(appReducer(pending, { type: 'era-commit', requestId: 1 }).mode).toBe(
      'globe',
    );
    const left = appReducer(pending, { type: 'mode', mode: 'globe' });
    expect(left.activeWorld).toBeNull();
    expect(left.eraTransition).toBeNull();
    expect(appReducer(left, { type: 'era-commit', requestId: 1 })).toBe(left);
  });
  it('keeps the source authoritative until the matching request commits exactly once', () => {
    const pending = appReducer(entered, request);
    expect(pending.activeWorld).toBe(rome125);
    expect(pending.selectedEraId).toBe('125');
    expect(appReducer(pending, { type: 'era-commit', requestId: 9 })).toBe(
      pending,
    );
    const present = appReducer(pending, { type: 'era-commit', requestId: 1 });
    expect(present).toMatchObject({
      activeWorld: romePresent,
      selectedEraId: 'present',
      activePOIId: null,
      selectedObjectId: null,
      eraTransition: null,
      audioState: 'idle',
    });
    expect(appReducer(present, { type: 'era-commit', requestId: 1 })).toBe(
      present,
    );
    const back = appReducer(present, {
      ...request,
      requestId: 2,
      world: rome125,
    });
    expect(
      appReducer(back, { type: 'era-commit', requestId: 2 }).activeWorld,
    ).toBe(rome125);
  });
  it('cancels without leaving the source and ignores stale completion after navigation', () => {
    const pending = appReducer(entered, request);
    expect(appReducer(pending, { type: 'era-cancel', requestId: 1 })).toEqual(
      entered,
    );
    const left = appReducer(pending, { type: 'location', id: null });
    expect(appReducer(left, { type: 'era-commit', requestId: 1 })).toBe(left);
    const retry = appReducer(entered, { ...request, requestId: 2 });
    expect(appReducer(retry, { type: 'era-cancel', requestId: 1 })).toBe(retry);
  });
  it('rejects unsupported endpoints, POI mode and repeated requests', () => {
    for (const world of [
      rome125,
      { ...romePresent, locationId: 'elsewhere' },
      {
        ...romePresent,
        scene: { ...romePresent.scene, overviewTransition: undefined },
      },
    ]) {
      expect(appReducer(entered, { ...request, world })).toBe(entered);
    }
    const poi = appReducer(entered, { type: 'poi', id: rome125.pois[0].id });
    expect(appReducer(poi, request)).toBe(poi);
    const pending = appReducer(entered, request);
    expect(appReducer(pending, { ...request, requestId: 2 })).toBe(pending);
    expect(appReducer(pending, { type: 'poi', id: rome125.pois[0].id })).toBe(
      pending,
    );
    expect(appReducer(pending, { type: 'audio', state: 'playing' })).toBe(
      pending,
    );
  });
});
