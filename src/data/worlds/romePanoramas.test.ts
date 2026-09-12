import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { rome125 } from './rome-125';
import renderedManifest from '../../../public/images/rome-125/manifest.json' with { type: 'json' };
import type { RenderedImageAsset } from '../../types/world';
import { resolvePresentation } from '../../utils/presentation';
import { appReducer, initialState } from '../../app/state';

async function checkImage(image: RenderedImageAsset, budgetMB: number) {
  expect(image.url).toMatch(/^\/images\/rome-125\/.+\.webp(?:\?.+)?$/);
  const bytes = await readFile(
    new URL(
      `../../../public${new URL(image.url, 'http://local').pathname}`,
      import.meta.url,
    ),
  );
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
  expect(new URL(image.url, 'http://local').searchParams.get('v')).toBe(
    createHash('sha256').update(bytes).digest('hex').slice(0, 12),
  );
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.length).toBeLessThanOrEqual(budgetMB * 1024 * 1024);
  expect(image.width).toBeGreaterThan(0);
  expect(image.height).toBeGreaterThan(0);
}

describe('Rome rendered asset delivery', () => {
  it('ships all ten nearby views with lossless native-resolution images and stable POI entry frames', async () => {
    let total = 0;
    for (const poi of rome125.pois) {
      const panorama = poi.immersive!.panorama!;
      const views = panorama.viewpoints!;
      expect(panorama.fieldOfView).toBe(75);
      expect(views.length).toBeGreaterThanOrEqual(3);
      expect(new Set(views.map((view) => view.id)).size).toBe(views.length);
      expect(views[0].desktop).toEqual(panorama.desktop);
      expect(views[0].hotspots).toEqual(panorama.hotspots);
      for (const view of views) {
        total++;
        await checkImage(view.desktop, 3);
        await checkImage(view.mobile!, 3);
        await checkImage(view.fallback, 0.5);
        const bytes = await readFile(
          new URL(
            `../../../public${new URL(view.desktop.url, 'http://local').pathname}`,
            import.meta.url,
          ),
        );
        // VP8L is WebP's lossless bitstream, unlike the former lossy VP8 files.
        expect(bytes.toString('ascii', 12, 16)).toBe('VP8L');
        expect([view.desktop.width, view.desktop.height]).toEqual([1440, 720]);
        expect(view.label.length).toBeGreaterThan(0);
        for (const hotspot of view.hotspots)
          expect(poi.objectIds).toContain(hotspot.objectId);
      }
    }
    expect(total).toBe(10);
  });

  it('fingerprints the supplied street views used by each POI', async () => {
    for (const panorama of Object.values(renderedManifest.panoramas)) {
      const source = panorama.source;
      expect(source.path).toMatch(
        /^pano-explorer\/public\/images\/citystreetviews\/rome\/(trajan|pantheon|colosseum)\/.+\.jpg$/,
      );
      const bytes = await readFile(
        new URL(`../../../${source.path}`, import.meta.url),
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        source.sha256,
      );
      expect(panorama.desktop.width).toBe(source.width);
      expect(panorama.desktop.height).toBe(source.height);
    }
  });

  it('ships a budgeted overview with authored desktop and portrait markers', async () => {
    const overview = rome125.scene.overviewImage!;
    expect(overview).toBeDefined();
    await checkImage(overview.desktop, 1.5);
    await checkImage(overview.mobile!, 1.5);
    await checkImage(overview.fallback, 0.5);
    expect(overview.desktop.width).toBeGreaterThan(overview.desktop.height);
    expect(overview.mobile!.height).toBeGreaterThan(overview.mobile!.width);
    expect(Object.keys(overview.markers).sort()).toEqual(
      rome125.pois.map((poi) => poi.id).sort(),
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
  });

  it('ships all three 2:1 panoramas with visible object mappings and matching still fallbacks', async () => {
    expect(rome125.pois).toHaveLength(3);
    for (const poi of rome125.pois) {
      const panorama = poi.immersive!.panorama!;
      const authored: Record<
        string,
        {
          eye: number[];
          initialTarget: number[];
          source: {
            width: number;
            height: number;
            horizontalShiftPixels: number;
            hotspotPixels: Record<string, number[]>;
          };
        }
      > = renderedManifest.panoramas;
      expect(authored[poi.id].eye).toEqual(poi.camera.position);
      expect(authored[poi.id].initialTarget).toEqual(poi.camera.target);
      expect(panorama).toBeDefined();
      expect(poi.preview).not.toBe(true);
      await checkImage(panorama.desktop, 6);
      await checkImage(panorama.mobile!, 3);
      await checkImage(panorama.fallback, 0.5);
      expect(panorama.desktop.width).toBeGreaterThanOrEqual(1440);
      expect(panorama.desktop.width).toBeLessThanOrEqual(8192);
      expect(panorama.mobile!.width).toBeGreaterThanOrEqual(1440);
      expect(panorama.mobile!.width).toBeLessThanOrEqual(4096);
      for (const image of [panorama.desktop, panorama.mobile!])
        expect(image.width / image.height).toBe(2);
      const source = authored[poi.id].source;
      expect(panorama.hotspots.map((hotspot) => hotspot.objectId)).toEqual(
        Object.keys(source.hotspotPixels),
      );
      expect(
        new Set(panorama.hotspots.map((hotspot) => hotspot.objectId)).size,
      ).toBe(panorama.hotspots.length);
      // Every original object remains discoverable even when absent from the new image.
      expect(
        resolvePresentation(rome125, 'POI', poi.id).objects.map(
          (object) => object.id,
        ),
      ).toEqual(poi.objectIds);
      for (const hotspot of panorama.hotspots) {
        expect(Number.isFinite(hotspot.yaw)).toBe(true);
        const [x, y] = source.hotspotPixels[hotspot.objectId];
        expect(hotspot.yaw).toBeCloseTo(
          (0.5 -
            ((x + source.horizontalShiftPixels) % source.width) /
              source.width) *
            2 *
            Math.PI,
          7,
        );
        expect(hotspot.pitch).toBeCloseTo(
          (0.5 - y / source.height) * Math.PI,
          7,
        );
        expect(hotspot.yaw).toBeGreaterThanOrEqual(-Math.PI - 1e-7);
        expect(hotspot.yaw).toBeLessThanOrEqual(Math.PI + 1e-7);
        expect(hotspot.pitch).toBeGreaterThan(poi.immersive!.look.minPitch);
        expect(hotspot.pitch).toBeLessThan(poi.immersive!.look.maxPitch);
        expect(
          rome125.objects.find((object) => object.id === hotspot.objectId)
            ?.poiId,
        ).toBe(poi.id);
      }
      // Rendered delivery is additive; retained GLBs remain available to authors.
      expect(poi.immersive!.model?.url).toMatch(/\.glb/);
    }
  });

  it('keeps panorama selection within the active POI and preserves the fixed camera', () => {
    const overview = { ...initialState, activeWorld: rome125 };
    const forum = rome125.pois[0];
    expect(
      appReducer(overview, { type: 'object', id: forum.objectIds[0] }),
    ).toBe(overview);
    const inForum = appReducer(overview, { type: 'poi', id: forum.id });
    const selected = appReducer(inForum, {
      type: 'object',
      id: forum.objectIds[0],
    });
    expect(selected.selectedObjectId).toBe(forum.objectIds[0]);
    expect(
      appReducer(selected, {
        type: 'object',
        id: rome125.pois[1].objectIds[0],
      }),
    ).toBe(selected);
    const presentation = resolvePresentation(rome125, 'POI', forum.id);
    expect(presentation.camera).toBe(forum.camera);
    expect(presentation.scene.panorama).toBe(forum.immersive!.panorama);
    expect(presentation.objects.map((object) => object.id)).toEqual(
      forum.objectIds,
    );
    const returned = appReducer(selected, { type: 'overview' });
    expect(returned.selectedObjectId).toBeNull();
    expect(returned.cameraMode).toBe('OVERVIEW');
  });
});
