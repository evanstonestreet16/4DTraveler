// Original procedural art source. All architecture is an illustrative composite.
// Repeated unit geometries are baked into a small set of material batches;
// selectable batches are kept under their five stable, visible parent nodes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const palette = {
  soil: ['#646857', 1, 0],
  ground: ['#9c9c7c', 1, 0],
  stone: ['#b2a38b', 0.96, 0],
  paving: ['#858579', 1, 0],
  brick: ['#956b52', 0.94, 0],
  paleBrick: ['#b39a79', 0.94, 0],
  oxide: ['#79564b', 0.84, 0.45],
  iron: ['#374540', 0.7, 0.65],
  roof: ['#59635c', 0.9, 0.2],
  wood: ['#76664d', 0.98, 0],
  glass: ['#334541', 0.35, 0.2],
  water: ['#628b8a', 0.38, 0.3],
};

const boxUnit = new THREE.BoxGeometry(1, 1, 1);
const sphereUnit = new THREE.IcosahedronGeometry(1, 0);

/** Build the complete scene without lights, cameras, textures or network use. */
export function buildPittsburghWorld() {
  const world = new THREE.Group();
  world.name = 'pittsburgh-1892-hero';
  world.userData = {
    historicalConfidence: 'illustrative',
    authoring: 'scripts/assets/pittsburgh-kit.js',
    units: 'meters; compressed tabletop composition; Y up',
  };
  const materials = Object.fromEntries(
    Object.entries(palette).map(([name, [color, roughness, metalness]]) => [
      name,
      new THREE.MeshStandardMaterial({ name, color, roughness, metalness }),
    ]),
  );
  const batches = new Map();

  function makeGroup(name, center = [0, 0, 0], selectable = false) {
    const group = new THREE.Group();
    group.name = name;
    group.position.fromArray(center);
    if (selectable) group.userData.sceneObjectId = name;
    group.userData.historicalConfidence = 'illustrative';
    world.add(group);
    batches.set(group, new Map());
    return group;
  }

  const environment = makeGroup('environment');
  const furnace = makeGroup('furnace', [-13, 2.5, -4], true);
  const stack = makeGroup('stack', [-8, 4, -6], true);
  const wagon = makeGroup('rail-car', [-7, 1, 0], true);
  const warehouse = makeGroup('warehouse', [5, 2, -8], true);
  const bridge = makeGroup('bridge', [7, 1, 9], true);

  function add(
    group,
    material,
    geometry,
    position,
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
  ) {
    const transformed = geometry.clone();
    transformed.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...position).sub(group.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...scale),
      ),
    );
    const map = batches.get(group);
    if (!map.has(material)) map.set(material, []);
    const triangles = transformed.index
      ? transformed.toNonIndexed()
      : transformed;
    triangles.deleteAttribute('uv');
    map.get(material).push(triangles);
    if (triangles !== transformed) transformed.dispose();
  }

  const box = (g, m, x, y, z, w, h, d, rotation) =>
    add(g, m, boxUnit, [x, y, z], [w, h, d], rotation);
  const cylinder = (
    g,
    m,
    x,
    y,
    z,
    top,
    bottom,
    height,
    segments = 16,
    rotation,
  ) => {
    const geometry = new THREE.CylinderGeometry(top, bottom, height, segments);
    add(g, m, geometry, [x, y, z], [1, 1, 1], rotation);
    geometry.dispose();
  };
  const beam = (g, m, start, end, width = 0.09, depth = width) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    const r = new THREE.Euler().setFromQuaternion(q);
    add(
      g,
      m,
      boxUnit,
      a.add(b).multiplyScalar(0.5).toArray(),
      [width, direction.length(), depth],
      [r.x, r.y, r.z],
    );
  };
  const ring = (
    g,
    m,
    x,
    y,
    z,
    radius,
    tube,
    rotation = [Math.PI / 2, 0, 0],
  ) => {
    const geo = new THREE.TorusGeometry(radius, tube, 6, 16);
    add(g, m, geo, [x, y, z], [1, 1, 1], rotation);
    geo.dispose();
  };
  const stone = (x, y, z, size, material = 'stone', seed = 1) =>
    add(
      environment,
      material,
      sphereUnit,
      [x, y, z],
      [size, size * 0.6, size * 0.8],
      [seed, seed * 0.7, seed * 1.7],
    );

  function roof(g, x, y, z, w, d, rise, material = 'roof') {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: false,
      steps: 1,
    });
    add(g, material, geo, [x, y, z - d / 2]);
    geo.dispose();
  }

  function roundedSlab(g, material, x, z, w, d, top, bottom, radius) {
    const s = new THREE.Shape();
    const left = -w / 2,
      right = w / 2,
      front = -d / 2,
      back = d / 2;
    s.moveTo(left + radius, front);
    s.lineTo(right - radius, front);
    s.quadraticCurveTo(right, front, right, front + radius);
    s.lineTo(right, back - radius);
    s.quadraticCurveTo(right, back, right - radius, back);
    s.lineTo(left + radius, back);
    s.quadraticCurveTo(left, back, left, back - radius);
    s.lineTo(left, front + radius);
    s.quadraticCurveTo(left, front, left + radius, front);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: top - bottom,
      bevelEnabled: false,
      curveSegments: 5,
    });
    add(g, material, geo, [x, top, z], [1, 1, 1], [Math.PI / 2, 0, 0]);
    geo.dispose();
  }

  // A layered cutaway plinth, low river banks, and a thin, opaque water surface.
  roundedSlab(environment, 'soil', 0, 0, 44, 34, -0.3, -1.35, 1.6);
  roundedSlab(environment, 'ground', 0, -5.9, 44, 22.2, 0, -0.5, 1.35);
  roundedSlab(environment, 'ground', 0, 14.9, 44, 4.2, 0, -0.5, 1.1);
  box(environment, 'water', 0, -0.18, 9, 43.8, 0.14, 7.8);
  for (const z of [5.25, 12.75]) {
    box(environment, 'stone', 0, -0.05, z, 43.7, 0.33, 0.38);
    for (let x = -21; x < 21.5; x += 1.1) {
      box(environment, 'paving', x, 0.13, z, 1.02, 0.12, 0.53);
    }
  }
  // Horizontal glints are modeled into the water, with no alpha/sorting cost.
  for (let i = 0; i < 55; i++) {
    const x = -20 + ((i * 9.43) % 40);
    const z = 5.9 + ((i * 1.77) % 6.2);
    box(
      environment,
      'water',
      x,
      -0.092,
      z,
      0.6 + (i % 4) * 0.35,
      0.016,
      0.025,
      [0, 0.07, 0],
    );
  }
  box(environment, 'paving', -10.5, 0.045, -3.5, 18.5, 0.09, 13);
  box(environment, 'paving', 9, 0.055, -4, 20, 0.11, 2.7);
  box(environment, 'paving', 7, 0.055, 1.6, 3.2, 0.11, 8.7);
  // Kerbs and cross-street seams create small-scale rhythm without textures.
  for (const z of [-5.5, -2.5])
    box(environment, 'stone', 9, 0.11, z, 20, 0.16, 0.2);
  for (let x = -0.5; x < 20; x += 0.8) {
    box(environment, 'stone', x, 0.151, -5.17, 0.72, 0.025, 0.33);
  }

  // Railroad modules: two-yard tracks, sleepers, fasteners and stop buffers.
  function track(z, start, length) {
    box(environment, 'soil', start + length / 2, 0.1, z, length, 0.16, 2.35);
    for (let x = start + 0.22; x < start + length; x += 0.48) {
      box(environment, 'wood', x, 0.23, z, 0.18, 0.13, 2.02);
      for (const side of [-0.7, 0.7])
        box(environment, 'iron', x, 0.315, z + side, 0.22, 0.04, 0.2);
    }
    for (const offset of [-0.7, 0.7]) {
      box(
        environment,
        'iron',
        start + length / 2,
        0.34,
        z + offset,
        length,
        0.14,
        0.08,
      );
      box(
        environment,
        'iron',
        start + length / 2,
        0.4,
        z + offset,
        length,
        0.045,
        0.13,
      );
    }
  }
  track(0, -20.5, 19.5);
  track(-10, -20.5, 18);
  for (const z of [0, -10]) {
    for (const side of [-0.75, 0.75])
      beam(
        environment,
        'iron',
        [-1.7, 0.2, z + side],
        [-1.15, 1, z + side],
        0.18,
      );
    box(environment, 'wood', -1.15, 1, z, 0.25, 0.22, 2);
  }

  // Blast furnace: faceted tapered shell, collars, splayed feet and service deck.
  cylinder(furnace, 'stone', -13, 0.22, -4, 1.75, 1.9, 0.35, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    beam(
      furnace,
      'iron',
      [-13 + Math.cos(a) * 1.48, 0.3, -4 + Math.sin(a) * 1.48],
      [-13 + Math.cos(a) * 1.03, 1.9, -4 + Math.sin(a) * 1.03],
      0.18,
    );
  }
  const profile = [
    [0, 0.75],
    [1.08, 0.75],
    [1.42, 1.4],
    [1.42, 1.95],
    [1.22, 2.25],
    [1.03, 3.75],
    [0.63, 4.5],
    [0.63, 4.78],
    [0, 4.78],
  ];
  const shell = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    24,
  );
  add(furnace, 'oxide', shell, [-13, 0, -4]);
  shell.dispose();
  for (const [y, r] of [
    [1.35, 1.43],
    [1.95, 1.43],
    [2.65, 1.17],
    [3.42, 1.08],
    [4.48, 0.66],
  ]) {
    ring(furnace, 'iron', -13, y, -4, r, 0.055);
  }
  cylinder(furnace, 'iron', -13, 4.88, -4, 0.78, 0.78, 0.2, 16);
  cylinder(furnace, 'oxide', -13, 5.1, -4, 0.18, 0.55, 0.25, 16);
  // Tuyere ring with short radial delivery pipes.
  ring(furnace, 'iron', -13, 1.62, -4, 1.67, 0.17);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    beam(
      furnace,
      'iron',
      [-13 + Math.cos(a) * 1.24, 1.44, -4 + Math.sin(a) * 1.24],
      [-13 + Math.cos(a) * 1.65, 1.62, -4 + Math.sin(a) * 1.65],
      0.18,
    );
  }
  box(furnace, 'iron', -13, 3.83, -4, 3.35, 0.12, 3.15);
  for (const x of [-14.64, -11.36]) {
    beam(furnace, 'iron', [x, 3.9, -5.5], [x, 3.9, -2.5], 0.055);
    beam(furnace, 'iron', [x, 4.42, -5.5], [x, 4.42, -2.5], 0.055);
    for (const z of [-5.5, -4.5, -3.5, -2.5])
      beam(furnace, 'iron', [x, 3.9, z], [x, 4.42, z], 0.045);
  }
  // Ladder and angular hoist stand to rear, leaving front silhouette clear.
  for (const x of [-14.6, -14.2])
    beam(furnace, 'iron', [x, 0.3, -5.8], [x, 4.35, -5.8], 0.055);
  for (let y = 0.5; y < 4.4; y += 0.24)
    box(furnace, 'iron', -14.4, y, -5.8, 0.43, 0.04, 0.06);
  beam(furnace, 'iron', [-12.65, 4.5, -4.4], [-11.9, 5.7, -5.8], 0.16);
  beam(furnace, 'iron', [-11.9, 0.3, -5.8], [-11.9, 5.7, -5.8], 0.14);
  cylinder(furnace, 'iron', -11.9, 3.2, -6.4, 0.27, 0.27, 3.7, 12);
  beam(furnace, 'oxide', [-12.5, 4.7, -4.3], [-11.9, 4.7, -6.4], 0.42);
  box(furnace, 'stone', -12.65, 0.22, -1.94, 0.65, 0.28, 1.0);

  // Smokestack: tapered masonry, wide footing, recessed open flue and ring cap.
  box(stack, 'stone', -8, 0.27, -6, 2.15, 0.5, 2.15);
  cylinder(stack, 'brick', -8, 3.98, -6, 0.59, 0.89, 7.4, 24);
  for (let i = 0; i < 19; i++) {
    const y = 0.55 + i * 0.37;
    const r = 0.9 - ((y - 0.3) / 7.4) * 0.3;
    ring(
      stack,
      i % 5 === 0 ? 'iron' : 'brick',
      -8,
      y,
      -6,
      r,
      i % 5 === 0 ? 0.028 : 0.018,
    );
  }
  cylinder(stack, 'brick', -8, 7.63, -6, 0.72, 0.64, 0.18, 24);
  cylinder(stack, 'iron', -8, 7.79, -6, 0.52, 0.52, 0.04, 24);
  ring(stack, 'brick', -8, 7.84, -6, 0.64, 0.12);
  for (const x of [-8.19, -7.81])
    beam(stack, 'iron', [x, 0.5, -5.09], [x, 7.5, -5.36], 0.037);
  for (let y = 0.7; y < 7.5; y += 0.3)
    box(
      stack,
      'iron',
      -8,
      y,
      -5.09 - ((y - 0.5) / 7) * 0.27,
      0.44,
      0.035,
      0.05,
    );

  // Freight wagon: an actual open body, all wheel/frame/rib surfaces selectable.
  box(wagon, 'iron', -7, 0.76, 0, 5.1, 0.22, 1.95);
  box(wagon, 'wood', -7, 0.95, 0, 4.95, 0.16, 1.88);
  for (const z of [-0.95, 0.95]) {
    box(wagon, 'roof', -7, 1.39, z, 5, 0.92, 0.1);
    box(wagon, 'iron', -7, 1.88, z, 5.15, 0.1, 0.15);
    for (let x = -9.4; x < -4.5; x += 0.62)
      box(wagon, 'iron', x, 1.4, z * 1.08, 0.085, 1.03, 0.075);
    for (let y = 1.11; y < 1.8; y += 0.2)
      box(wagon, 'wood', -7, y, z * 1.01, 4.9, 0.018, 0.02);
  }
  for (const x of [-9.48, -4.52])
    box(wagon, 'roof', x, 1.4, 0, 0.13, 0.94, 1.9);
  for (const x of [-8.55, -5.45]) {
    cylinder(wagon, 'iron', x, 0.53, 0, 0.095, 0.095, 2.03, 8, [
      Math.PI / 2,
      0,
      0,
    ]);
    for (const z of [-0.82, 0.82]) {
      cylinder(wagon, 'iron', x, 0.57, z, 0.3, 0.3, 0.16, 16, [
        Math.PI / 2,
        0,
        0,
      ]);
      cylinder(wagon, 'oxide', x, 0.57, z * 1.12, 0.12, 0.12, 0.035, 12, [
        Math.PI / 2,
        0,
        0,
      ]);
      box(wagon, 'iron', x, 0.68, z, 0.7, 0.1, 0.12);
    }
  }
  for (const x of [-9.85, -4.15])
    box(wagon, 'iron', x, 0.83, 0, 0.65, 0.13, 0.2);
  for (let i = 0; i < 24; i++) {
    add(
      wagon,
      'iron',
      sphereUnit,
      [
        -9.1 + (i % 8) * 0.58,
        1.05 + (i % 3) * 0.05,
        -0.53 + Math.floor(i / 8) * 0.5,
      ],
      [0.37, 0.26, 0.37],
      [i, i * 0.5, 0],
    );
  }

  function building(
    g,
    {
      x,
      z,
      w,
      d,
      h,
      material = 'brick',
      pitched = false,
      bays = 3,
      hero = false,
    },
  ) {
    box(g, 'stone', x, 0.16, z, w + 0.18, 0.3, d + 0.18);
    box(g, material, x, h / 2 + 0.1, z, w, h, d);
    box(g, 'stone', x, h - 0.18, z, w + 0.16, 0.16, d + 0.16);
    box(g, 'roof', x, h + 0.11, z, w + 0.32, 0.22, d + 0.32);
    if (pitched) {
      roof(g, x, h + 0.21, z, w + 0.34, d + 0.32, w * 0.21);
      box(g, 'iron', x, h + w * 0.21 + 0.23, z, 0.09, 0.09, d + 0.34);
    } else {
      for (const side of [-1, 1])
        box(g, material, x + side * (w / 2 - 0.06), h + 0.32, z, 0.15, 0.42, d);
      for (const side of [-1, 1])
        box(g, material, x, h + 0.32, z + side * (d / 2 - 0.06), w, 0.42, 0.15);
    }
    const floors = Math.max(1, Math.floor(h / 1.25));
    // Repeated bays face both street and camera-visible side walls.
    for (const side of [-1, 1]) {
      for (let level = 0; level < floors; level++) {
        const y = 0.88 + level * ((h - 0.7) / floors);
        for (let bay = 0; bay < bays; bay++) {
          const wx = x - w / 2 + ((bay + 0.5) * w) / bays;
          const ww = Math.min(0.55, (w / bays) * 0.5);
          box(g, 'glass', wx, y, z + side * (d / 2 + 0.014), ww, 0.67, 0.04);
          box(
            g,
            'stone',
            wx,
            y - 0.38,
            z + side * (d / 2 + 0.035),
            ww + 0.14,
            0.085,
            0.12,
          );
          box(
            g,
            'stone',
            wx,
            y + 0.37,
            z + side * (d / 2 + 0.022),
            ww + 0.1,
            0.095,
            0.075,
          );
          if (hero)
            box(g, 'wood', wx, y, z + side * (d / 2 + 0.04), 0.045, 0.67, 0.04);
        }
      }
      for (let bay = 0; bay < Math.floor(d / 1.3); bay++) {
        for (let level = 0; level < floors; level++) {
          const wz = z - d / 2 + 0.65 + bay * 1.3;
          const y = 0.88 + level * ((h - 0.7) / floors);
          box(g, 'glass', x + side * (w / 2 + 0.014), y, wz, 0.04, 0.67, 0.48);
          box(
            g,
            'stone',
            x + side * (w / 2 + 0.035),
            y - 0.38,
            wz,
            0.12,
            0.085,
            0.61,
          );
        }
      }
    }
    if (hero) {
      box(g, 'wood', x, 0.84, z + d / 2 + 0.08, 1.15, 1.4, 0.12);
      for (let k = -2; k <= 2; k++)
        box(
          g,
          'iron',
          x + k * 0.21,
          0.84,
          z + d / 2 + 0.16,
          0.025,
          1.32,
          0.025,
        );
      box(g, 'stone', x, 0.15, z + d / 2 + 0.4, 1.8, 0.25, 0.8);
      box(g, 'roof', x, 1.82, z + d / 2 + 0.25, 1.8, 0.1, 0.65, [0.12, 0, 0]);
      for (const side of [-1, 1])
        box(
          g,
          'stone',
          x + side * (w / 2 - 0.08),
          h / 2,
          z + d / 2 + 0.04,
          0.16,
          h,
          0.13,
        );
    }
    box(
      g,
      material,
      x + w * 0.26,
      h + (pitched ? w * 0.15 : 0.3),
      z - d * 0.22,
      0.38,
      0.9,
      0.42,
    );
    box(
      g,
      'stone',
      x + w * 0.26,
      h + (pitched ? w * 0.15 : 0.3) + 0.47,
      z - d * 0.22,
      0.48,
      0.1,
      0.53,
    );
  }

  building(warehouse, {
    x: 5,
    z: -8,
    w: 4,
    d: 4,
    h: 3.65,
    bays: 3,
    hero: true,
    pitched: true,
  });
  building(environment, {
    x: 11,
    z: -9,
    w: 4,
    d: 4,
    h: 5.45,
    material: 'paleBrick',
    bays: 4,
  });
  building(environment, {
    x: 15.2,
    z: -7.8,
    w: 2.4,
    d: 3.4,
    h: 3.1,
    bays: 2,
    pitched: true,
  });
  building(environment, {
    x: 5,
    z: 0,
    w: 2.8,
    d: 2.5,
    h: 2.55,
    material: 'paleBrick',
    bays: 2,
    pitched: true,
  });
  building(environment, { x: 11, z: 0, w: 3.8, d: 2.7, h: 3.2, bays: 3 });
  // Far city uses the same bay/roof kit, stepped rather than extruded uniformly.
  for (const [x, z, h, w] of [
    [2.3, -12.8, 2.8, 2.6],
    [5.3, -13.5, 3.1, 2.4],
    [8.3, -14, 3.8, 2.6],
    [11.4, -14, 4.4, 2.5],
    [14.3, -13.1, 3.6, 2.5],
    [17.2, -12.4, 3.2, 2.5],
    [18.3, -7.5, 2.7, 2.2],
    [15.8, -0.1, 2.6, 3.1],
  ]) {
    building(environment, {
      x,
      z,
      w,
      d: 2.5,
      h,
      material: x % 3 > 1.5 ? 'paleBrick' : 'brick',
      bays: 2,
      pitched: x % 3 < 1.5,
    });
  }
  // Low far-bank buildings anchor bridge approach without blocking river view.
  for (const [x, h] of [
    [-14, 1.8],
    [-11, 2.2],
    [-8, 1.9],
    [14, 1.7],
    [17, 2.1],
  ]) {
    building(environment, {
      x,
      z: 15.1,
      w: 2.4,
      d: 2.4,
      h,
      material: 'paleBrick',
      bays: 2,
      pitched: true,
    });
  }

  // Industrial shed: pitched roof, ridge ventilator and strong visible structure.
  function shed(x, z, w, d, h) {
    box(environment, 'stone', x, 0.16, z, w + 0.2, 0.22, d + 0.2);
    box(environment, 'brick', x, h / 2, z, w, h, d);
    roof(environment, x, h, z, w + 0.35, d + 0.4, w * 0.23);
    box(environment, 'roof', x, h + w * 0.23, z, w * 0.22, 0.5, d * 0.8);
    roof(environment, x, h + w * 0.23 + 0.25, z, w * 0.34, d * 0.86, 0.23);
    for (const side of [-1, 1]) {
      for (let zz = z - d / 2 + 0.3; zz <= z + d / 2; zz += 1.12) {
        box(environment, 'iron', x + (side * w) / 2, h / 2, zz, 0.12, h, 0.12);
        box(
          environment,
          'glass',
          x + side * (w / 2 + 0.035),
          h * 0.72,
          zz + 0.33,
          0.05,
          0.53,
          0.55,
        );
      }
      for (let zz = z - d / 2; zz <= z + d / 2; zz += 0.58)
        beam(
          environment,
          'iron',
          [x, h + w * 0.23 + 0.02, zz],
          [x + side * (w / 2 + 0.2), h + 0.01, zz],
          0.035,
        );
    }
    box(environment, 'iron', x, 1, z + d / 2 + 0.04, w * 0.56, 1.98, 0.05);
    for (const side of [-1, 1])
      box(
        environment,
        'wood',
        x + side * w * 0.14,
        1,
        z + d / 2 + 0.08,
        w * 0.26,
        1.9,
        0.06,
      );
  }
  shed(-17.45, -5.4, 4.6, 6.2, 2.8);
  shed(-17.3, 2.9, 4.4, 2.2, 1.65);
  shed(-5.0, -7.1, 3.4, 3.6, 2.0);
  // Small service tanks behind the hero, linked by elevated conduits.
  for (const x of [-13.2, -10.8]) {
    cylinder(environment, 'oxide', x, 1.6, -8.1, 0.67, 0.72, 2.8, 16);
    cylinder(environment, 'iron', x, 3.08, -8.1, 0.1, 0.67, 0.32, 16);
    ring(environment, 'iron', x, 0.62, -8.1, 0.74, 0.035);
    ring(environment, 'iron', x, 2.65, -8.1, 0.69, 0.035);
  }
  for (const x of [-13.2, -10.8, -8.2])
    box(environment, 'iron', x, 2.5, -8.95, 0.12, 4.8, 0.12);
  beam(environment, 'oxide', [-14.5, 4.7, -8.95], [-6.5, 4.7, -8.95], 0.3);

  // River crossing: open repetitive truss panels, tied overhead, masonry piers.
  box(bridge, 'wood', 7, 0.96, 9, 3.35, 0.3, 12);
  for (let z = 3.1; z < 15; z += 0.35)
    box(bridge, 'wood', 7, 1.124, z, 3.28, 0.027, 0.026);
  for (const x of [5.32, 8.68]) {
    beam(bridge, 'iron', [x, 0.82, 3], [x, 0.82, 15], 0.18);
    beam(bridge, 'iron', [x, 2.78, 3], [x, 2.78, 15], 0.15);
    for (let z = 3; z <= 15; z += 2) {
      beam(bridge, 'iron', [x, 0.85, z], [x, 2.8, z], 0.14);
      if (z < 15) {
        beam(bridge, 'iron', [x, 0.93, z], [x, 2.72, z + 2], 0.1);
        beam(bridge, 'iron', [x, 2.72, z], [x, 0.93, z + 2], 0.075);
      }
    }
    beam(bridge, 'iron', [x, 1.5, 3], [x, 1.5, 15], 0.055);
  }
  for (let z = 3; z <= 15; z += 2) {
    beam(bridge, 'iron', [5.32, 2.8, z], [8.68, 2.8, z], 0.09);
    beam(bridge, 'iron', [5.32, 0.77, z], [8.68, 0.77, z], 0.16);
    if (z < 15)
      beam(bridge, 'iron', [5.32, 2.81, z], [8.68, 2.81, z + 2], 0.065);
  }
  for (const z of [5.2, 9, 12.8]) {
    box(bridge, 'stone', 7, 0.23, z, 2.7, 1.0, 0.92);
    box(bridge, 'stone', 7, 0.75, z, 3.1, 0.19, 1.2);
    for (let y = -0.15; y < 0.7; y += 0.26)
      box(bridge, 'paving', 7, y, z + 0.465, 2.7, 0.023, 0.018);
  }
  for (const z of [2.4, 15.6])
    box(environment, 'paving', 7, 0.5, z, 3.4, 0.7, 1.4);

  // Set dressing uses repeated source geometries merged into background batches.
  function crate(x, z, size = 0.6) {
    box(environment, 'wood', x, size / 2 + 0.1, z, size, size, size);
    for (const side of [-1, 1]) {
      box(
        environment,
        'iron',
        x + side * size * 0.32,
        size / 2 + 0.1,
        z,
        0.045,
        size + 0.02,
        size + 0.02,
      );
    }
  }
  for (const [x, z, s] of [
    [-19, 0.9, 0.65],
    [-19.8, 0.9, 0.7],
    [-18.9, 1.7, 0.6],
    [-3.5, -4.4, 0.8],
    [2.5, -6.1, 0.5],
    [3.1, -6.0, 0.65],
    [13.7, -5.9, 0.55],
    [15, 3.7, 0.6],
  ])
    crate(x, z, s);
  for (let i = 0; i < 20; i++)
    stone(
      -5.5 + (i % 5) * 0.55,
      0.31 + Math.sin(i) * 0.1,
      -2.7 + Math.floor(i / 5) * 0.48,
      0.53,
      'iron',
      i,
    );
  for (const x of [-19, -15, -11, -7, -3, 1, 11, 15, 19]) {
    cylinder(environment, 'iron', x, 0.3, 4.75, 0.11, 0.14, 0.44, 8);
    cylinder(environment, 'iron', x, 0.51, 4.75, 0.18, 0.18, 0.08, 8);
  }
  for (let i = 0; i < 11; i++) {
    const x = -20 + i * 3.9;
    stone(x, -0.15, 13.15, 0.36, 'stone', i);
    if (i % 2 === 0) {
      cylinder(environment, 'wood', x, 0.6, -15.0, 0.07, 0.1, 1.2, 6);
      add(
        environment,
        'ground',
        sphereUnit,
        [x, 1.4, -15],
        [0.72, 0.9, 0.65],
        [0, i, 0],
      );
    }
  }
  // One simple cargo barge, deliberately generic and unselectable.
  roundedSlab(environment, 'iron', -11, 9.25, 6.0, 1.8, 0.24, -0.15, 0.5);
  roundedSlab(environment, 'wood', -11, 9.25, 5.3, 1.45, 0.34, 0.24, 0.2);
  for (const z of [8.45, 10.05])
    box(environment, 'iron', -11, 0.42, z, 5.25, 0.35, 0.08);
  for (let i = 0; i < 14; i++)
    stone(
      -12.8 + (i % 7) * 0.58,
      0.46,
      8.95 + Math.floor(i / 7) * 0.6,
      0.37,
      'iron',
      i,
    );

  for (const [group, materialBatches] of batches) {
    for (const [materialName, geometries] of materialBatches) {
      const geometry = mergeGeometries(geometries, false);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, materials[materialName]);
      mesh.name = `${group.name}-${materialName}`;
      mesh.castShadow = materialName !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
      for (const part of geometries) part.dispose();
    }
  }
  return world;
}
