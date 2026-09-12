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
  it('identifies and fingerprints AI atmosphere and material inputs as visual interpretation', async () => {
    const manifest: typeof renderedManifest & {
      aiInputs?: {
        path: string;
        role: string;
        generator: string;
        historicalEvidence: boolean;
        sha256: string;
      }[];
    } = renderedManifest;
    expect(manifest.aiInputs).toBeDefined();
    expect(manifest.aiInputs!.map((input) => input.role).sort()).toEqual([
      'generic-stone-albedo',
      'sky-background',
    ]);
    for (const input of manifest.aiInputs!) {
      expect(input.path).toMatch(
        /^blender\/assets\/rome-125\/ai\/[\w-]+\.png$/,
      );
      expect(input.generator).toBe('Codex built-in image generation');
      expect(input.historicalEvidence).toBe(false);
      const bytes = await readFile(
        new URL(`../../../${input.path}`, import.meta.url),
      );
      expect(input.sha256).toBe(
        createHash('sha256').update(bytes).digest('hex'),
      );
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

  it('ships all three 2:1 panoramas with exact stable object mappings and still fallbacks', async () => {
    expect(rome125.pois).toHaveLength(3);
    for (const poi of rome125.pois) {
      const panorama = poi.immersive!.panorama!;
      const authored: Record<
        string,
        {
          eye: number[];
          initialTarget: number[];
          anchors: Record<string, number[]>;
        }
      > = renderedManifest.panoramas;
      expect(authored[poi.id].eye).toEqual(poi.camera.position);
      expect(authored[poi.id].initialTarget).toEqual(poi.camera.target);
      expect(panorama).toBeDefined();
      expect(poi.preview).not.toBe(true);
      await checkImage(panorama.desktop, 6);
      await checkImage(panorama.mobile!, 3);
      await checkImage(panorama.fallback, 0.5);
      expect(panorama.desktop.width).toBeGreaterThanOrEqual(4096);
      expect(panorama.desktop.width).toBeLessThanOrEqual(8192);
      expect(panorama.mobile!.width).toBeGreaterThanOrEqual(2048);
      expect(panorama.mobile!.width).toBeLessThanOrEqual(4096);
      for (const image of [panorama.desktop, panorama.mobile!])
        expect(image.width / image.height).toBe(2);
      expect(panorama.hotspots.map((hotspot) => hotspot.objectId)).toEqual(
        poi.objectIds,
      );
      expect(
        new Set(panorama.hotspots.map((hotspot) => hotspot.objectId)).size,
      ).toBe(3);
      for (const hotspot of panorama.hotspots) {
        expect(Number.isFinite(hotspot.yaw)).toBe(true);
        const anchor = authored[poi.id].anchors[hotspot.objectId];
        expect(anchor).toHaveLength(3);
        const [dx, dy, dz] = anchor.map(
          (coordinate, axis) => coordinate - poi.camera.position[axis],
        );
        // Compare circular yaw so rounded +pi and atan2(-0, -z) agree at south.
        const yawDifference = hotspot.yaw - Math.atan2(-dx, -dz);
        expect(
          Math.atan2(Math.sin(yawDifference), Math.cos(yawDifference)),
        ).toBeCloseTo(0, 7);
        expect(hotspot.pitch).toBeCloseTo(
          Math.atan2(dy, Math.hypot(dx, dz)),
          7,
        );
        // The authoring export rounds radians to seven decimal places.
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
