import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { kyoto1700 } from './kyoto-1700';
import { kyotoPresent } from './kyoto-present';
import { romePresent } from './rome-present';
import { findWorld } from '../locations';
import { appReducer, initialState } from '../../app/state';
import manifest from '../../../public/images/kyoto-present/manifest.json' with { type: 'json' };

it('registers modern Kyoto with responsive assets in its own transition group', async () => {
  expect(findWorld('kyoto', 'present')).toBe(kyotoPresent);
  expect(findWorld('rome', 'present')).toBe(romePresent);
  expect(kyotoPresent.pois).toEqual([]);
  expect(kyotoPresent.objects).toEqual([]);
  expect(kyotoPresent.scene.overviewImage?.markers).toEqual({});
  expect(kyotoPresent.scene.overviewTransition).toEqual({
    group: 'kyoto-central',
    durationMs: 2200,
  });
  expect(kyotoPresent.scene.overviewTransition).toEqual(
    kyoto1700.scene.overviewTransition,
  );
  expect(kyotoPresent.scene.overviewCamera).toEqual(
    kyoto1700.scene.overviewCamera,
  );
  for (const variant of ['desktop', 'mobile', 'fallback'] as const) {
    const asset = kyotoPresent.scene.overviewImage![variant]!;
    expect(asset).toEqual(manifest.overview[variant]);
    const bytes = await readFile(
      new URL(
        `../../../public${new URL(asset.url, 'http://local').pathname}`,
        import.meta.url,
      ),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      manifest.overview[variant].sha256,
    );
    expect(bytes.length).toBe(manifest.overview[variant].bytes);
    expect(bytes.length).toBeLessThan(
      variant === 'fallback' ? 500000 : 1500000,
    );
    const reference = kyoto1700.scene.overviewImage![variant]!;
    if (variant !== 'fallback')
      expect(asset.width / asset.height).toBeCloseTo(
        reference.width / reference.height,
        2,
      );
  }
});

it('travels both ways, rejects Rome and restores historical exploration', () => {
  const entered = appReducer(
    { ...initialState, selectedLocationId: 'kyoto' },
    { type: 'era', id: '1700', world: kyoto1700 },
  );
  const pending = appReducer(entered, {
    type: 'era-request',
    requestId: 1,
    world: kyotoPresent,
  });
  expect(pending.activeWorld).toBe(kyoto1700);
  expect(pending.eraTransition?.world).toBe(kyotoPresent);
  const present = appReducer(pending, { type: 'era-commit', requestId: 1 });
  expect(present.activeWorld).toBe(kyotoPresent);
  expect(present.selectedEraId).toBe('present');
  expect(appReducer(present, { type: 'poi', id: 'nijo-ninomaru' })).toBe(
    present,
  );
  expect(
    appReducer(present, {
      type: 'era-request',
      requestId: 2,
      world: romePresent,
    }),
  ).toBe(present);
  const back = appReducer(present, {
    type: 'era-request',
    requestId: 3,
    world: kyoto1700,
  });
  const returned = appReducer(back, { type: 'era-commit', requestId: 3 });
  expect(returned).toEqual(entered);
  const poi = appReducer(returned, { type: 'poi', id: 'nijo-ninomaru' });
  expect(
    appReducer(poi, { type: 'object', id: 'nijo-karamon' }).selectedObjectId,
  ).toBe('nijo-karamon');
});
