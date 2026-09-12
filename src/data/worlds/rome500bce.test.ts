import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { appReducer, initialState } from '../../app/state';
import { findWorld } from '../locations';
import { rome125 } from './rome-125';
import { rome500bce } from './rome-500bce';
import manifest from '../../../public/images/rome-500bce/manifest.json' with { type: 'json' };

it('loads the delivered early Rome images and provides a marker for every preview place', async () => {
  expect(findWorld('rome', '500bce')).toBe(rome500bce);
  expect(rome500bce.scene.overviewTransition).toEqual(
    rome125.scene.overviewTransition,
  );
  const overview = rome500bce.scene.overviewImage!;
  expect(Object.keys(overview.markers).sort()).toEqual(
    rome500bce.pois.map((poi) => poi.id).sort(),
  );
  for (const marker of Object.values(overview.markers)) {
    for (const point of [marker.desktop, marker.mobile!]) {
      expect(point).toHaveLength(2);
      for (const coordinate of point) {
        expect(coordinate).toBeGreaterThan(0);
        expect(coordinate).toBeLessThan(1);
      }
    }
  }
  for (const variant of ['desktop', 'mobile', 'fallback'] as const) {
    const asset = manifest.overview[variant];
    const bytes = await readFile(
      new URL(`../../../public${asset.url.split('?')[0]}`, import.meta.url),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    expect(bytes.length).toBeLessThan(
      variant === 'fallback' ? 500000 : 1500000,
    );
  }
});

it('travels in both directions and rejects every preview POI even when dispatched directly', () => {
  let state = appReducer(initialState, { type: 'enterWorld', world: rome125 });
  state = appReducer(state, {
    type: 'era-request',
    requestId: 1,
    world: rome500bce,
  });
  expect(state.activeWorld).toBe(rome125);
  state = appReducer(state, { type: 'era-commit', requestId: 1 });
  expect(state.activeWorld).toBe(rome500bce);
  for (const poi of rome500bce.pois) {
    expect(poi.preview).toBe(true);
    expect(poi.immersive).toBeUndefined();
    expect(appReducer(state, { type: 'poi', id: poi.id })).toBe(state);
  }
  state = appReducer(state, {
    type: 'era-request',
    requestId: 2,
    world: rome125,
  });
  state = appReducer(state, { type: 'era-commit', requestId: 2 });
  state = appReducer(state, { type: 'poi', id: rome125.pois[0].id });
  expect(state.cameraMode).toBe('POI');
  expect(state.activeWorld).toBe(rome125);
});
