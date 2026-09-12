import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { rome125 } from './rome-125';
import { romePresent } from './rome-present';
import { findOpeningWorld, findWorld, locations } from '../locations';
import manifest from '../../../public/images/rome-present/manifest.json' with { type: 'json' };
import { overviewAsset } from '../../components/world/OverviewEraTransition';

it('registers an overview-only present endpoint with responsive, fingerprinted images', async () => {
  expect(findWorld('rome', 'present')).toBe(romePresent);
  expect(findOpeningWorld('rome')).toBe(romePresent);
  expect(
    locations
      .find((location) => location.id === 'rome')!
      .eras.map((era) => era.id),
  ).toEqual(['125', '500bce', 'present']);
  expect(romePresent.pois).toEqual([]);
  expect(romePresent.objects).toEqual([]);
  expect(romePresent.scene.overviewTransition).toEqual(
    rome125.scene.overviewTransition,
  );
  expect(romePresent.scene.overviewImage?.description).toContain(
    'Reference-grounded',
  );
  expect(manifest.anchors).toEqual(
    expect.arrayContaining([
      'Vittoriano / Piazza Venezia',
      'Via dei Fori Imperiali',
      'Colosseum',
    ]),
  );
  expect(manifest.modernGeographyReferences).toHaveLength(4);
  expect(
    manifest.modernGeographyReferences.every((reference) =>
      reference.url.startsWith('https://www.turismoroma.it/'),
    ),
  ).toBe(true);
  for (const variant of ['desktop', 'mobile', 'fallback'] as const) {
    const asset = manifest.overview[variant];
    const bytes = await readFile(
      new URL(
        `../../../public${new URL(asset.url, 'http://local').pathname}`,
        import.meta.url,
      ),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    expect(bytes.length).toBe(asset.bytes);
    expect(bytes.length).toBeLessThan(
      variant === 'fallback' ? 500000 : 1500000,
    );
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    if (variant !== 'fallback') {
      expect([asset.width, asset.height]).toEqual([
        rome125.scene.overviewImage![variant]!.width,
        rome125.scene.overviewImage![variant]!.height,
      ]);
    }
  }
  for (const input of manifest.inputs) {
    const bytes = await readFile(
      new URL(`../../../${input.path}`, import.meta.url),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(input.sha256);
  }
  expect(overviewAsset(romePresent.scene.overviewImage!, true)).toEqual(
    manifest.overview.mobile,
  );
  expect(overviewAsset(romePresent.scene.overviewImage!, false)).toEqual(
    manifest.overview.desktop,
  );
});
