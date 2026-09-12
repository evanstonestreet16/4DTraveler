import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { format } from 'prettier';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildPittsburghWorld } from './assets/pittsburgh-kit.js';

// The exporter uses the browser FileReader API only to convert Blob buffers.
// This small adapter keeps authoring offline and dependency-free in Node 22.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const world = buildPittsburghWorld();
const binary = await new GLTFExporter().parseAsync(world, {
  binary: true,
  onlyVisible: true,
});
const groups = [];
let triangles = 0;
let draws = 0;
const materials = new Set();
for (const group of world.children) {
  let groupTriangles = 0;
  group.traverse((node) => {
    if (node.isMesh) {
      groupTriangles +=
        (node.geometry.index?.count ??
          node.geometry.attributes.position.count) / 3;
      draws++;
      materials.add(node.material.name);
    }
  });
  triangles += groupTriangles;
  groups.push({
    node: group.name,
    selectable: Boolean(group.userData.sceneObjectId),
    position: group.position.toArray(),
    triangles: groupTriangles,
    materialBatches: group.children.length,
    bounds: new THREE.Box3()
      .setFromObject(group)
      .getSize(new THREE.Vector3())
      .toArray()
      .map((v) => Number(v.toFixed(3))),
  });
}
const stats = {
  asset: '/models/pittsburgh-1892.glb',
  generator: 'node scripts/generate-pittsburgh-model.js',
  historicalConfidence: 'illustrative composite',
  bytes: binary.byteLength,
  triangles,
  materialBatches: draws,
  materials: materials.size,
  textures: 0,
  externalResources: 0,
  compression:
    'gzip transport with native browser decompression; raw GLB fallback',
  gzipBytes: gzipSync(Buffer.from(binary), { level: 9 }).byteLength,
  ceilings: { bytes: 8 * 1024 * 1024, triangles: 100_000, materialBatches: 50 },
  groups,
};
if (
  stats.bytes > stats.ceilings.bytes ||
  triangles > stats.ceilings.triangles ||
  draws > stats.ceilings.materialBatches
) {
  throw new Error(`Asset budget exceeded: ${JSON.stringify(stats)}`);
}
const output = fileURLToPath(new URL('../public/models/', import.meta.url));
await mkdir(output, { recursive: true });
await writeFile(`${output}pittsburgh-1892.glb`, Buffer.from(binary));
await writeFile(
  `${output}pittsburgh-1892.glb.gz`,
  gzipSync(Buffer.from(binary), { level: 9 }),
);
await writeFile(
  `${output}pittsburgh-1892.metrics.json`,
  await format(JSON.stringify(stats), { parser: 'json' }),
);
console.log(JSON.stringify(stats, null, 2));
