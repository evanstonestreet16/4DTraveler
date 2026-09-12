import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
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

  it('validates only the active presentation objects and ignores scenery outside its mapping', () => {
    const scene = new Group();
    const furnace = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    furnace.name = 'furnace';
    const scenery = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    scenery.name = 'distant-roof';
    scene.add(furnace, scenery);
    const selection = validateModelNodes(
      scene,
      { url: 'active-poi.glb', selectableNodes: { furnace: 'furnace' } },
      [world.objects[0]],
    );
    expect(resolveModelObject(furnace, selection)).toBe(world.objects[0]);
    expect(resolveModelObject(scenery, selection)).toBeUndefined();
    expect(selection.size).toBe(1);
    disposeModelScenes([scene]);
  });

  it('rejects invisible selection colliders even beside a visible mesh', () => {
    const scene = new Group();
    const furnace = new Group();
    furnace.name = 'furnace';
    const visible = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    const collider = new Mesh(
      new BoxGeometry(),
      new MeshBasicMaterial({ transparent: true, opacity: 0 }),
    );
    furnace.add(visible, collider);
    scene.add(furnace);
    expect(() =>
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    ).toThrow('hidden selection geometry');
    collider.material.opacity = 1;
    furnace.visible = false;
    expect(() =>
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    ).toThrow('no mesh geometry that is visible');
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

  it('makes unlit meshes visibly hoverable and restores them without mutating shared materials', () => {
    const scene = new Group();
    const source = new MeshBasicMaterial({ color: '#786d61' });
    const object = new Mesh(new BoxGeometry(), source);
    object.name = 'furnace';
    scene.add(object);
    const { highlights, originals } = prepareModelSelection(
      scene,
      validateModelNodes(scene, world.scene.model!, [world.objects[0]]),
    );
    updateModelHighlights(highlights, null, world.objects[0].id);
    expect(object.material.color.getHexString()).not.toBe('786d61');
    expect(source.color.getHexString()).toBe('786d61');
    updateModelHighlights(highlights, null, null);
    expect(object.material.color.getHexString()).toBe('786d61');
    disposeModelScenes([scene], originals);
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
      new Response(await fixture(), {
        headers: { 'content-encoding': 'gzip', 'content-length': '12' },
      }),
    );
    const progress = vi.fn();
    const asset = await loadModelAsset(
      world.scene.model!,
      world.objects,
      new AbortController().signal,
      progress,
    );
    // Fetch has decoded the body, so the encoded Content-Length is not a valid percentage total.
    expect(progress).toHaveBeenCalledWith(undefined);
    const mesh = asset.scene.getObjectByName('furnace-surface-0') as Mesh;
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    asset.dispose();
    asset.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('decodes gzip transport without relying on HTTP Content-Encoding', async () => {
    const compressed = gzipSync(new Uint8Array(await fixture()));
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(compressed, {
        headers: { 'content-length': String(compressed.byteLength) },
      }),
    );
    const asset = await loadModelAsset(
      world.scene.model!,
      world.objects,
      new AbortController().signal,
      vi.fn(),
    );
    expect(asset.selection.size).toBe(5);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      world.scene.model!.compressedUrl,
      expect.objectContaining({ cache: 'force-cache' }),
    );
    asset.dispose();
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
