import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import type { RenderedImageAsset } from '../../types/world';
import { resolvePresentation } from '../../utils/presentation';
import { kyoto1700 as world } from './kyoto-1700';

const plannedObjects = {
  'nijo-ninomaru': {
    'nijo-karamon': 'kyoto1700_nijo_karamon',
    'nijo-ninomaru-palace': 'kyoto1700_nijo_ninomaru_palace',
    'nijo-kurumayose': 'kyoto1700_nijo_kurumayose',
  },
  'kiyomizu-hillside': {
    'kiyomizu-main-hall': 'kyoto1700_kiyomizu_main_hall',
    'kiyomizu-stage': 'kyoto1700_kiyomizu_stage',
    'otowa-waterfall': 'kyoto1700_otowa_waterfall',
  },
  'nishiki-fish-market': {
    'nishiki-fish-stall': 'kyoto1700_nishiki_fish_stall',
    'nishiki-groundwater': 'kyoto1700_nishiki_groundwater',
    'nishiki-machiya-shopfront': 'kyoto1700_nishiki_machiya_shopfront',
  },
};

it('preserves the planned Kyoto identities and exposes only the active viewpoint’s three objects', () => {
  expect(world.id).toBe('kyoto-1700');
  expect(world.locationId).toBe('kyoto');
  expect(world.era.year).toBe(1700);
  expect(world.scene.presentation).toBe('immersive-city');
  expect(world.pois.map((poi) => poi.id)).toEqual(Object.keys(plannedObjects));
  expect(world.objects).toHaveLength(9);
  expect(resolvePresentation(world, 'OVERVIEW', null).objects).toEqual([]);

  for (const [poiId, identities] of Object.entries(plannedObjects)) {
    const poi = world.pois.find((item) => item.id === poiId)!;
    expect(poi.preview).not.toBe(true);
    expect(poi.objectIds).toEqual(Object.keys(identities));
    const presentation = resolvePresentation(world, 'POI', poiId);
    expect(presentation.scene).toBe(poi.immersive);
    expect(presentation.camera).toBe(poi.camera);
    expect(presentation.showMarkers).toBe(false);
    expect(
      Object.fromEntries(
        presentation.objects.map((object) => [object.id, object.sceneObjectId]),
      ),
    ).toEqual(identities);
    for (const object of presentation.objects) expect(object.poiId).toBe(poiId);

    const panorama = presentation.scene.panorama!;
    expect(panorama).toBeDefined();
    expect(panorama.hotspots.map((hotspot) => hotspot.objectId)).toEqual(
      poi.objectIds,
    );
    expect(
      new Set(panorama.hotspots.map(({ yaw, pitch }) => `${yaw}:${pitch}`))
        .size,
    ).toBe(3);
    for (const hotspot of panorama.hotspots) {
      expect(Number.isFinite(hotspot.yaw)).toBe(true);
      expect(hotspot.pitch).toBeGreaterThanOrEqual(presentation.look!.minPitch);
      expect(hotspot.pitch).toBeLessThanOrEqual(presentation.look!.maxPitch);
    }
    expect(poi.camera.position[1]).toBe(1.65);
    expect(poi.camera.position).not.toEqual(poi.camera.target);
    expect(presentation.look!.minPitch).toBeGreaterThan(-Math.PI / 2);
    expect(presentation.look!.maxPitch).toBeLessThan(Math.PI / 2);
  }
});

it('pairs every Kyoto scene with a transcript and every object with sources and reconstruction confidence', () => {
  for (const scene of [world.scene, ...world.pois.map((poi) => poi.immersive!)])
    expect(scene.narrationTranscript!.length).toBeGreaterThan(100);
  for (const object of world.objects) {
    expect(object.description.length).toBeGreaterThan(40);
    expect(object.whyItMatters.length).toBeGreaterThan(40);
    expect(object.confidence).toMatch(/documented|inferred|illustrative/i);
    expect(object.sources?.length).toBeGreaterThan(0);
    expect(new Set(object.sources!.map((source) => source.id)).size).toBe(
      object.sources!.length,
    );
    for (const source of object.sources!) {
      expect(source.title.length).toBeGreaterThan(5);
      expect(new URL(source.url).protocol).toBe('https:');
    }
  }
});

it('ships bounded panorama and still assets with complete overview marker mappings', async () => {
  const overview = world.scene.overviewImage!;
  expect(overview).toBeDefined();
  expect(Object.keys(overview.markers)).toEqual(
    world.pois.map((poi) => poi.id),
  );
  for (const point of Object.values(overview.markers)) {
    expect(point).toHaveLength(2);
    for (const coordinate of point) {
      expect(coordinate).toBeGreaterThan(0);
      expect(coordinate).toBeLessThan(1);
    }
  }

  async function checkAsset(asset: RenderedImageAsset, megabytes: number) {
    expect(asset.width).toBeGreaterThan(0);
    expect(asset.height).toBeGreaterThan(0);
    expect(asset.url).toMatch(/^\/images\/kyoto-1700\//);
    const pathname = new URL(asset.url, 'http://local').pathname;
    const bytes = await readFile(
      new URL(`../../../public${pathname}`, import.meta.url),
    );
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes.byteLength).toBeLessThanOrEqual(megabytes * 1024 * 1024);
  }

  await checkAsset(overview.desktop, 1.5);
  await checkAsset(overview.fallback, 1.5);
  for (const poi of world.pois) {
    const panorama = poi.immersive!.panorama!;
    expect(panorama.desktop.width).toBe(panorama.desktop.height * 2);
    if (poi.id === 'nishiki-fish-market') {
      expect(panorama.fieldOfView).toBe(75);
      expect(panorama.viewpoints?.map((view) => view.id)).toEqual([
        'nishiki-arcade',
        'nishiki-street',
      ]);
      expect(panorama.viewpoints![0].desktop).toEqual(panorama.desktop);
      expect(panorama.desktop.width).toBe(1440);
      await checkAsset(panorama.desktop, 3);
      await checkAsset(panorama.viewpoints![1].desktop, 6);
    } else {
      expect(panorama.desktop.width).toBeGreaterThanOrEqual(4096);
      await checkAsset(panorama.desktop, 6);
    }
    await checkAsset(panorama.fallback, 1.5);
  }
});
