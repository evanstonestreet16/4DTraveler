import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { Mesh, Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rome125 } from './rome-125';
import { pittsburgh1892 } from './pittsburgh-1892';
import { resolvePresentation } from '../../utils/presentation';
import {
  disposeModelScenes,
  validateGlbContainer,
  validateModelNodes,
} from '../../components/world/modelAsset';

it('keeps the city contract additive and presents only active POV objects', () => {
  expect(resolvePresentation(pittsburgh1892, 'OVERVIEW', null).objects).toBe(
    pittsburgh1892.objects,
  );
  expect(resolvePresentation(rome125, 'OVERVIEW', null).objects).toEqual([]);
  expect(rome125.pois.map((poi) => poi.id)).toEqual([
    'forum-trajan',
    'pantheon-forecourt',
    'colosseum-valley',
  ]);
  for (const poi of rome125.pois) {
    const presentation = resolvePresentation(rome125, 'POI', poi.id);
    if (poi.preview) {
      expect(presentation.scene).toBe(rome125.scene);
      expect(presentation.camera).toBe(rome125.scene.overviewCamera);
      continue;
    }
    expect(poi.immersive).toBeDefined();
    expect(presentation.objects.map((object) => object.id)).toEqual(
      poi.objectIds,
    );
    expect(poi.objectIds).toHaveLength(3);
    expect(poi.camera.position[1]).toBe(1.65);
    expect(presentation.look!.minPitch).toBeGreaterThan(-Math.PI / 2);
    expect(presentation.look!.maxPitch).toBeLessThan(Math.PI / 2);
    expect(presentation.scene.narrationTranscript!.length).toBeGreaterThan(100);
    for (const object of presentation.objects) {
      expect(object.poiId).toBe(poi.id);
      expect(object.sources?.length).toBeGreaterThan(0);
      expect(object.confidence).toBeTruthy();
      expect(new Set(object.sources?.map((source) => source.id)).size).toBe(
        object.sources?.length,
      );
    }
  }
});

it('ships each Rome GLB within its own budget with exact visible selectable nodes and fallbacks', async () => {
  const presentations = [
    resolvePresentation(rome125, 'OVERVIEW', null),
    ...rome125.pois
      .filter((poi) => !poi.preview)
      .map((poi) => resolvePresentation(rome125, 'POI', poi.id)),
  ];
  for (const presentation of presentations) {
    expect(presentation.camera.near ?? 0.1).toBeGreaterThan(0);
    expect(presentation.camera.near ?? 0.1).toBeLessThan(
      presentation.camera.far ?? 400,
    );
    const model = presentation.scene.model!;
    const bytes = await readFile(
      new URL(
        `../../../public${new URL(model.url, 'http://local').pathname}`,
        import.meta.url,
      ),
    );
    const isOverview = model.url.includes('/overview.glb');
    expect(new URL(model.url, 'http://local').searchParams.get('v')).toBe(
      createHash('sha256').update(bytes).digest('hex').slice(0, 12),
    );
    expect(bytes.byteLength).toBeLessThan((isOverview ? 8 : 10) * 1024 * 1024);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    validateGlbContainer(buffer);
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    try {
      gltf.scene.updateMatrixWorld(true);
      const selection = validateModelNodes(
        gltf.scene,
        model,
        presentation.objects,
      );
      expect(selection.size).toBe(presentation.objects.length);
      for (const [node, object] of selection) {
        expect(node.name).toBe(object.sceneObjectId);
        const primitive = presentation.scene.primitives.find(
          (primitive) => primitive.id === object.sceneObjectId,
        )!;
        expect(primitive).toBeDefined();
        expect(
          new Box3()
            .setFromObject(node)
            .containsPoint(new Vector3(...primitive.position)),
        ).toBe(true);
      }
      let triangles = 0;
      let batches = 0;
      gltf.scene.traverse((node) => {
        if (node instanceof Mesh) {
          triangles +=
            (node.geometry.index?.count ??
              node.geometry.attributes.position.count) / 3;
          batches += Math.max(1, node.geometry.groups.length);
        }
      });
      expect(triangles).toBeGreaterThan(1000);
      expect(triangles).toBeLessThanOrEqual(isOverview ? 100000 : 150000);
      expect(batches).toBeLessThanOrEqual(50);
    } finally {
      disposeModelScenes(gltf.scenes);
    }
  }
});
