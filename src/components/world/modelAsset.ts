import {
  Color,
  Material,
  Mesh,
  Object3D,
  Texture,
  type BufferGeometry,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { HistoricalObject, SceneModel } from '../../types/world';

export type ModelAssetState = {
  status: 'loading' | 'ready' | 'fallback';
  message: string;
  progress?: number;
};

/** Every selectable group must exist once and own visible geometry. */
export function validateModelNodes(
  scene: Object3D,
  model: SceneModel,
  objects: HistoricalObject[],
) {
  const selection = new Map<Object3D, HistoricalObject>();
  for (const object of objects) {
    const name = model.selectableNodes[object.sceneObjectId];
    if (!name)
      throw new Error(`Missing node mapping for ${object.sceneObjectId}.`);
    const matches: Object3D[] = [];
    scene.traverse((node) => {
      if (node.name === name) matches.push(node);
    });
    if (matches.length !== 1)
      throw new Error(`Required node "${name}" must occur exactly once.`);
    const node = matches[0];
    if (selection.has(node))
      throw new Error(`Node "${name}" maps to multiple objects.`);
    let hasMesh = false;
    node.traverse((child) => {
      if (
        child instanceof Mesh &&
        child.geometry.getAttribute('position')?.count
      )
        hasMesh = true;
    });
    if (!hasMesh)
      throw new Error(`Required node "${name}" has no mesh geometry.`);
    selection.set(node, object);
  }
  for (const node of selection.keys()) {
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
      if (selection.has(ancestor))
        throw new Error(
          `Selectable node "${node.name}" is inside another selectable node.`,
        );
    }
  }
  return selection;
}

export function resolveModelObject(
  node: Object3D,
  selection: Map<Object3D, HistoricalObject>,
) {
  for (
    let ancestor: Object3D | null = node;
    ancestor;
    ancestor = ancestor.parent
  ) {
    const object = selection.get(ancestor);
    if (object) return object;
  }
  return undefined;
}

type ColoredMaterial = Material & {
  color: Color;
  emissive?: Color;
  emissiveIntensity?: number;
};
type HighlightBinding = {
  objectId: string;
  material: ColoredMaterial;
  color: Color;
  emissive?: Color;
  emissiveIntensity?: number;
};

/** GLTF shares materials; clone each selected mesh's material so neighbors stay unchanged. */
export function prepareModelSelection(
  scene: Object3D,
  selection: Map<Object3D, HistoricalObject>,
) {
  const originals = new Set<Material>();
  const highlights: HighlightBinding[] = [];
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
    const object = resolveModelObject(node, selection);
    if (!object) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    const cloned = materials.map((source: Material) => {
      originals.add(source);
      const material = source.clone();
      if ('color' in material && material.color instanceof Color) {
        const colored = material as ColoredMaterial;
        highlights.push({
          objectId: object.id,
          material: colored,
          color: colored.color.clone(),
          emissive: colored.emissive?.clone(),
          emissiveIntensity: colored.emissiveIntensity,
        });
      }
      return material;
    });
    node.material = Array.isArray(node.material) ? cloned : cloned[0];
  });
  return { originals, highlights };
}

export function updateModelHighlights(
  highlights: HighlightBinding[],
  selectedId: string | null,
  hoveredId: string | null,
) {
  for (const binding of highlights) {
    const selected = binding.objectId === selectedId;
    const hovered = binding.objectId === hoveredId;
    binding.material.color.copy(
      selected ? new Color('#efb759') : binding.color,
    );
    if (binding.material.emissive && binding.emissive) {
      binding.material.emissive.copy(
        selected
          ? new Color('#d88617')
          : hovered
            ? new Color('#646f50')
            : binding.emissive,
      );
      binding.material.emissiveIntensity = selected
        ? 0.42
        : hovered
          ? 0.15
          : binding.emissiveIntensity;
    }
  }
}

/** Each load owns its resources; deduplicate disposal across shared scene nodes/materials. */
export function disposeModelScenes(
  scenes: Object3D[],
  extraMaterials: Iterable<Material> = [],
) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set(extraMaterials);
  const textures = new Set<Texture>();
  const images = new Set<ImageBitmap>();
  for (const scene of scenes)
    scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material])
        materials.add(material);
    });
  for (const material of materials) {
    for (const value of Object.values(material))
      if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
      images.add(image);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const geometry of geometries) geometry.dispose();
}

/** This pipeline accepts GLB 2.0 with embedded resources, avoiding uncancelled side requests. */
export function validateGlbContainer(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20)
    throw new Error('The model is not a complete GLB file.');
  const header = new DataView(buffer);
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== buffer.byteLength
  )
    throw new Error('The model is not a valid GLB 2.0 file.');
  const length = header.getUint32(12, true);
  if (
    header.getUint32(16, true) !== 0x4e4f534a ||
    20 + length > buffer.byteLength
  )
    throw new Error('The GLB JSON chunk is invalid.');
  const document: unknown = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, length)),
  );
  if (typeof document !== 'object' || !document)
    throw new Error('The GLB document is invalid.');
  for (const key of ['buffers', 'images']) {
    const entries: unknown = Reflect.get(document, key);
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const uri: unknown =
        typeof entry === 'object' && entry
          ? Reflect.get(entry, 'uri')
          : undefined;
      if (typeof uri === 'string' && !uri.startsWith('data:'))
        throw new Error(
          'Export a self-contained GLB with embedded textures and buffers.',
        );
    }
  }
}

export async function loadModelAsset(
  model: SceneModel,
  objects: HistoricalObject[],
  signal: AbortSignal,
  onProgress: (progress: number | undefined) => void,
) {
  const response = await fetch(model.url, { signal });
  if (!response.ok)
    throw new Error(`Model request failed (HTTP ${response.status}).`);
  const total = Number(response.headers.get('content-length'));
  const chunks: Uint8Array[] = [];
  let received = 0;
  if (!response.body) throw new Error('The model response was empty.');
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(
      total > 0
        ? Math.min(99, Math.round((received / total) * 100))
        : undefined,
    );
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  signal.throwIfAborted();
  validateGlbContainer(bytes.buffer);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '');
  let originals = new Set<Material>();
  try {
    signal.throwIfAborted();
    const selection = validateModelNodes(gltf.scene, model, objects);
    const prepared = prepareModelSelection(gltf.scene, selection);
    originals = prepared.originals;
    let disposed = false;
    return {
      scene: gltf.scene,
      selection,
      highlights: prepared.highlights,
      dispose() {
        if (disposed) return;
        disposed = true;
        disposeModelScenes(gltf.scenes, originals);
      },
    };
  } catch (error) {
    disposeModelScenes(gltf.scenes, originals);
    throw error;
  }
}

export type LoadedModelAsset = Awaited<ReturnType<typeof loadModelAsset>>;
