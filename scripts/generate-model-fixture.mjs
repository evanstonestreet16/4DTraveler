import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import console from 'node:console';
import { writeFile } from 'node:fs/promises';
import { BoxGeometry, Color, CylinderGeometry } from 'three';
import { pittsburgh1892Scene } from '../src/data/worlds/pittsburgh-1892.scene.ts';

// A deterministic, self-contained GLB built from the fallback geometry.
// This fixture is a pipeline test asset, not a historical reconstruction.
const document = {
  asset: { version: '2.0', generator: '4DTraveler fixture generator' },
  scene: 0,
  scenes: [{ name: 'pipeline-fixture', nodes: [] }],
  nodes: [],
  meshes: [],
  materials: [],
  accessors: [],
  bufferViews: [],
  buffers: [],
};
const chunks = [];
let byteLength = 0;
function accessor(array, itemSize, target) {
  const padding = (4 - (byteLength % 4)) % 4;
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    byteLength += padding;
  }
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const bufferView =
    document.bufferViews.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: bytes.length,
      target,
    }) - 1;
  chunks.push(bytes);
  byteLength += bytes.length;
  const min = Array(itemSize).fill(Infinity);
  const max = Array(itemSize).fill(-Infinity);
  for (let i = 0; i < array.length; i++) {
    min[i % itemSize] = Math.min(min[i % itemSize], array[i]);
    max[i % itemSize] = Math.max(max[i % itemSize], array[i]);
  }
  return (
    document.accessors.push({
      bufferView,
      componentType: array instanceof Float32Array ? 5126 : 5123,
      count: array.length / itemSize,
      type: itemSize === 1 ? 'SCALAR' : 'VEC3',
      min,
      max,
    }) - 1
  );
}
const primitives = new Map();
for (const [shape, geometry] of [
  ['box', new BoxGeometry(1, 1, 1)],
  ['cylinder', new CylinderGeometry(0.5, 0.5, 1, 20)],
]) {
  primitives.set(shape, {
    attributes: {
      POSITION: accessor(geometry.attributes.position.array, 3, 34962),
      NORMAL: accessor(geometry.attributes.normal.array, 3, 34962),
    },
    indices: accessor(geometry.index.array, 1, 34963),
  });
  geometry.dispose();
}
for (const primitive of pittsburgh1892Scene.primitives) {
  const material =
    document.materials.push({
      name: `${primitive.id}-material`,
      pbrMetallicRoughness: {
        baseColorFactor: [...new Color(primitive.color).toArray(), 1],
        roughnessFactor: 0.85,
        metallicFactor: 0,
      },
    }) - 1;
  const mesh =
    document.meshes.push({
      name: `${primitive.id}-geometry`,
      primitives: [{ ...primitives.get(primitive.shape), material }],
    }) - 1;
  const children = [];
  // Two child meshes exercise group-wide selection/highlights without changing the silhouette.
  for (let half = 0; half < (primitive.id === 'furnace' ? 2 : 1); half++) {
    children.push(
      document.nodes.push({
        name: `${primitive.id}-surface-${half}`,
        mesh,
        ...(primitive.id === 'furnace'
          ? { translation: [0, half ? 0.25 : -0.25, 0], scale: [1, 0.5, 1] }
          : {}),
      }) - 1,
    );
  }
  document.scenes[0].nodes.push(
    document.nodes.push({
      name: primitive.id,
      translation: primitive.position,
      scale: primitive.scale,
      children,
    }) - 1,
  );
}
const padding = (4 - (byteLength % 4)) % 4;
if (padding) chunks.push(Buffer.alloc(padding));
const binary = Buffer.concat(chunks);
document.buffers.push({ byteLength: binary.length });
const json = Buffer.from(JSON.stringify(document));
const jsonPadding = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
const jsonChunk = Buffer.concat([json, jsonPadding]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + jsonChunk.length + 8 + binary.length, 8);
header.writeUInt32LE(jsonChunk.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);
const output = new URL(
  '../public/models/pipeline-fixture.glb',
  import.meta.url,
);
await writeFile(
  output,
  Buffer.concat([header, jsonChunk, binaryHeader, binary]),
);
console.log(`Generated ${output.pathname} (${header.readUInt32LE(8)} bytes)`);
