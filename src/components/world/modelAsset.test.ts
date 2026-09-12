import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pittsburgh1892 as world } from '../../data/worlds/pittsburgh-1892';
import {
  disposeModelScenes,
  loadModelAsset,
  prepareModelSelection,
  resolveModelObject,
  updateModelHighlights,
  validateGlbContainer,
  validateModelNodes,
} from './modelAsset';

afterEach(() => vi.restoreAllMocks());

async function fixture() {
  const data = await readFile(
    new URL('../../../public/models/pipeline-fixture.glb', import.meta.url),
  );
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

describe('GLB asset contract', () => {
  it('loads the checked-in real GLB, retaining all stable object nodes and positions', async () => {
    const bytes = await fixture();
    validateGlbContainer(bytes);
    const gltf = await new GLTFLoader().parseAsync(bytes, '');
    const selection = validateModelNodes(
      gltf.scene,
      world.scene.model!,
      world.objects,
    );
    expect(selection.size).toBe(5);
    for (const [node, object] of selection) {
      expect(node.position.toArray()).toEqual(
        world.scene.primitives.find((p) => p.id === object.sceneObjectId)!
          .position,
      );
      expect(resolveModelObject(node.children[0], selection)).toBe(object);
    }
    disposeModelScenes(gltf.scenes);
  });

  it('rejects missing metadata mappings, missing nodes, duplicates, and empty groups', () => {
    const scene = new Group();
    expect(() =>
      validateModelNodes(scene, { url: '', selectableNodes: {} }, [
        world.objects[0],
      ]),
    ).toThrow('Missing node mapping');
    expect(() =>
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    ).toThrow('exactly once');
    const empty = new Group();
    empty.name = 'furnace';
    scene.add(empty);
    expect(() =>
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    ).toThrow('no mesh');
    const duplicate = new Group();
    duplicate.name = 'furnace';
    scene.add(duplicate);
    expect(() =>
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    ).toThrow('exactly once');
  });

  it('rejects nested selectable groups and reused node mappings', () => {
    const scene = new Group();
    const furnace = new Group();
    furnace.name = 'furnace';
    const stack = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    stack.name = 'stack';
    furnace.add(stack);
    scene.add(furnace);
    expect(() =>
      validateModelNodes(scene, world.scene.model!, world.objects.slice(0, 2)),
    ).toThrow('inside another');
    expect(() =>
      validateModelNodes(
        scene,
        { url: '', selectableNodes: { furnace: 'stack', stack: 'stack' } },
        world.objects.slice(0, 2),
      ),
    ).toThrow('multiple objects');
    disposeModelScenes([scene]);
  });

  it('highlights every child mesh without tinting another object sharing its source material, and restores original colors', () => {
    const scene = new Group();
    const furnace = new Group();
    furnace.name = 'furnace';
    const shared = new MeshStandardMaterial({
      color: '#865749',
      emissive: '#100000',
      emissiveIntensity: 0.2,
    });
    const geometry = new BoxGeometry();
    const lower = new Mesh(geometry, shared),
      upper = new Mesh(geometry, shared),
      neighbor = new Mesh(geometry, shared);
    furnace.add(lower, upper);
    scene.add(furnace, neighbor);
    const { highlights, originals } = prepareModelSelection(
      scene,
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    );
    updateModelHighlights(highlights, 'blast-furnace', null);
    for (const mesh of [lower, upper])
      expect(mesh.material.color.getHexString()).toBe(
        new Color('#efb759').getHexString(),
      );
    expect(neighbor.material.color.getHexString()).toBe('865749');
    updateModelHighlights(highlights, null, 'blast-furnace');
    expect(upper.material.emissive.getHexString()).toBe('646f50');
    updateModelHighlights(highlights, null, null);
    expect(upper.material.color.getHexString()).toBe('865749');
    expect(upper.material.emissiveIntensity).toBe(0.2);
    disposeModelScenes([scene], originals);
  });

  it('disposes shared geometry, materials and texture once across scene roots', () => {
    const texture = new Texture();
    const geometry = new BoxGeometry();
    const material = new MeshStandardMaterial({ map: texture });
    const scene = new Group();
    scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const disposeGeometry = vi.spyOn(geometry, 'dispose'),
      disposeMaterial = vi.spyOn(material, 'dispose'),
      disposeTexture = vi.spyOn(texture, 'dispose');
    disposeModelScenes([scene, scene], [material]);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });

  it('rejects corrupt GLB bytes before parsing', async () => {
    expect(() =>
      validateGlbContainer(new TextEncoder().encode('not a model').buffer),
    ).toThrow('complete GLB');
    const bytes = await fixture();
    new DataView(bytes).setUint32(8, 1, true);
    expect(() => validateGlbContainer(bytes)).toThrow('valid GLB');
  });

  it('reports progress and disposes an owned load idempotently', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(await fixture()),
    );
    const progress = vi.fn();
    const asset = await loadModelAsset(
      world.scene.model!,
      world.objects,
      new AbortController().signal,
      progress,
    );
    expect(progress).toHaveBeenCalled();
    const mesh = asset.scene.getObjectByName('furnace-surface-0') as Mesh;
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    asset.dispose();
    asset.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('propagates request cancellation and HTTP errors for the visible fallback', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }));
    await expect(
      loadModelAsset(
        world.scene.model!,
        world.objects,
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toThrow('HTTP 404');
    const controller = new AbortController();
    controller.abort();
    fetch.mockResolvedValue(new Response(await fixture()));
    await expect(
      loadModelAsset(
        world.scene.model!,
        world.objects,
        controller.signal,
        vi.fn(),
      ),
    ).rejects.toThrow('aborted');
  });
});
