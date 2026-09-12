import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pittsburgh1892 as world } from '../../data/worlds/pittsburgh-1892';
import {
  disposeModelScenes,
  validateGlbContainer,
  validateModelNodes,
} from './modelAsset';

it('the shipped hero meets geometry budgets and contains visible geometry at every stable object center', async () => {
  const bytes = await readFile(
    new URL('../../../public/models/pittsburgh-1892.glb', import.meta.url),
  );
  expect(bytes.byteLength).toBeLessThan(8 * 1024 * 1024);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  validateGlbContainer(buffer);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  gltf.scene.updateMatrixWorld(true);
  const selection = validateModelNodes(
    gltf.scene,
    world.scene.model!,
    world.objects,
  );
  expect(selection.size).toBe(5);
  for (const [node, object] of selection) {
    const center = world.scene.primitives.find(
      (item) => item.id === object.sceneObjectId,
    )!.position;
    expect(
      new Box3().setFromObject(node).containsPoint(new Vector3(...center)),
      object.name,
    ).toBe(true);
  }
  let triangles = 0;
  let draws = 0;
  gltf.scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    triangles +=
      (node.geometry.index?.count ?? node.geometry.attributes.position.count) /
      3;
    draws += Math.max(1, node.geometry.groups.length);
  });
  expect(triangles).toBeGreaterThan(1000);
  expect(triangles).toBeLessThanOrEqual(100000);
  expect(draws).toBeLessThanOrEqual(50);
  disposeModelScenes(gltf.scenes);
});
