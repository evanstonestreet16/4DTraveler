import type { ScenePrimitive } from '../../types/world';

/**
 * Deterministic procedural filler that turns the empty ground around
 * Grok-authored POIs into a recognizably-inhabited city.
 *
 * The generator is pure: given the same options it always emits the
 * same primitives, so the same city+era always looks the same on
 * reload. All scattering respects an `innerRadius` "quiet zone" so the
 * fill never overlaps the hand-authored POI cluster.
 *
 * Emitted primitives use ids prefixed with `fill-` so they never
 * collide with Grok-authored ids and never accidentally match a
 * `HistoricalObject.sceneObjectId` (i.e. they remain non-selectable
 * decoration).
 */

export type CityFillEra = 'rural' | 'preindustrial' | 'industrial' | 'modern';

export interface CityFillOptions {
  /** Stable per-city+era seed, e.g. "seattle-1962". */
  seed: string;
  /** Historical year of the era; used to pick density and palette. */
  year: number;
  /** Outer square half-extent of the fill area (world fits inside +/- outerRadius). */
  outerRadius?: number;
  /** Radius around origin that stays empty for POIs. */
  innerRadius?: number;
  /** Era background color, used to bias fill palettes toward the sky. */
  background?: string;
}

export interface CityFillResult {
  streets: ScenePrimitive[];
  buildings: ScenePrimitive[];
  vegetation: ScenePrimitive[];
}

// ---------------------------------------------------------------------------
// PRNG + tiny palette helpers.
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  // 32-bit FNV-1a. Small and deterministic; we don't need cryptographic
  // quality, just a reproducible seed integer from an arbitrary string.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classifyEra(year: number): CityFillEra {
  if (year < 1850) return 'rural';
  if (year < 1920) return 'preindustrial';
  if (year < 1980) return 'industrial';
  return 'modern';
}

/**
 * Nudge a hex color toward another hex color by a mix factor in [0, 1].
 * Used to keep procedural palettes anchored to the era background so
 * they feel like they belong to the same painting.
 */
function mixHex(a: string, b: string, factor: number): string {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ] as const;
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const t = Math.max(0, Math.min(1, factor));
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Era palette lookups. Anchored midtones — mixHex() with the era
// background at ~15% keeps them from clashing with the sky.
const ERA_PALETTES: Record<
  CityFillEra,
  {
    building: string[];
    roof: string[];
    street: string;
    treeCanopy: string[];
    treeTrunk: string;
  }
> = {
  rural: {
    building: ['#7a5943', '#8a6b4d', '#6f4f3a'],
    roof: ['#4a3628', '#3d2c22'],
    street: '#8a7c65', // dirt path
    treeCanopy: ['#4d6640', '#3d5533', '#557a45'],
    treeTrunk: '#4a3826',
  },
  preindustrial: {
    building: ['#8b7d63', '#9a8a70', '#7d6f56', '#a5987b'],
    roof: ['#5c4b34', '#4a3826', '#7a5843'],
    street: '#a89a80', // packed earth / cobbles
    treeCanopy: ['#526b3f', '#3f5330'],
    treeTrunk: '#4a3826',
  },
  industrial: {
    building: ['#9aa0a4', '#b0b3b0', '#7a8a94', '#8f8c85', '#a89f8c'],
    roof: ['#4a4e55', '#3a3a3a', '#7a5843'],
    street: '#5a5a5a', // asphalt
    treeCanopy: ['#4a6b3a', '#3d5533'],
    treeTrunk: '#5c4933',
  },
  modern: {
    building: [
      '#a8b0b8',
      '#c8cbcf',
      '#7a8a94',
      '#4a5860',
      '#a6a29a',
      '#889398',
    ],
    roof: ['#3a3f45', '#2d3238', '#5c5c5c'],
    street: '#4a4a4a', // dark asphalt
    treeCanopy: ['#4a6b3a', '#3d5533', '#5f7a44'],
    treeTrunk: '#5c4933',
  },
};

/** Density knobs by era. */
const ERA_COUNTS: Record<
  CityFillEra,
  { buildings: number; trees: number; streetGrid: number }
> = {
  rural: { buildings: 10, trees: 60, streetGrid: 0 }, // no grid, just paths
  preindustrial: { buildings: 40, trees: 22, streetGrid: 4 },
  industrial: { buildings: 65, trees: 14, streetGrid: 5 },
  modern: { buildings: 90, trees: 12, streetGrid: 6 },
};

// ---------------------------------------------------------------------------
// Sub-generators.
// ---------------------------------------------------------------------------

interface Context {
  rand: () => number;
  inner: number;
  outer: number;
  era: CityFillEra;
  palette: (typeof ERA_PALETTES)[CityFillEra];
  background: string;
}

function scatterOutsideInner(ctx: Context): [number, number] {
  // Rejection sample so scatter is uniform in the ring (annulus)
  // between innerRadius and outerRadius. Bail after a few tries so a
  // pathological ratio never becomes an infinite loop.
  for (let i = 0; i < 8; i += 1) {
    const x = (ctx.rand() * 2 - 1) * ctx.outer;
    const z = (ctx.rand() * 2 - 1) * ctx.outer;
    if (Math.max(Math.abs(x), Math.abs(z)) >= ctx.inner) return [x, z];
  }
  // Fallback: place on the perimeter.
  const side = Math.floor(ctx.rand() * 4);
  const t = ctx.rand() * 2 - 1;
  const r = ctx.outer * 0.92;
  if (side === 0) return [r, t * r];
  if (side === 1) return [-r, t * r];
  if (side === 2) return [t * r, r];
  return [t * r, -r];
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function generateStreets(ctx: Context): ScenePrimitive[] {
  const count = ERA_COUNTS[ctx.era].streetGrid;
  if (count === 0) return [];
  const streets: ScenePrimitive[] = [];
  // Two perpendicular sets of long thin strips across the full extent.
  // Y very small so it reads as painted-on-ground, not a raised curb.
  const streetY = 0.02;
  const streetHeight = 0.05;
  const width = 1.2;
  for (let i = 0; i < count; i += 1) {
    // Horizontal street (runs along +X, spaced along Z).
    const zOffset = (ctx.rand() * 2 - 1) * (ctx.outer - 2);
    streets.push({
      id: `fill-street-h-${i}`,
      shape: 'box',
      position: [0, streetY, zOffset],
      scale: [ctx.outer * 2, streetHeight, width],
      color: ctx.palette.street,
    });
    const xOffset = (ctx.rand() * 2 - 1) * (ctx.outer - 2);
    streets.push({
      id: `fill-street-v-${i}`,
      shape: 'box',
      position: [xOffset, streetY, 0],
      scale: [width, streetHeight, ctx.outer * 2],
      color: ctx.palette.street,
    });
  }
  return streets;
}

function generateBuildings(ctx: Context): ScenePrimitive[] {
  const buildings: ScenePrimitive[] = [];
  const count = ERA_COUNTS[ctx.era].buildings;
  for (let i = 0; i < count; i += 1) {
    const [x, z] = scatterOutsideInner(ctx);
    // Modern-era buildings trend taller with more variance; rural
    // eras are almost all short one-story structures.
    const heightBase =
      ctx.era === 'modern'
        ? 4
        : ctx.era === 'industrial'
          ? 3
          : ctx.era === 'preindustrial'
            ? 2
            : 1.2;
    const heightRange =
      ctx.era === 'modern'
        ? 14
        : ctx.era === 'industrial'
          ? 6
          : ctx.era === 'preindustrial'
            ? 2.5
            : 0.8;
    const h = heightBase + ctx.rand() * heightRange;
    const w = 1.6 + ctx.rand() * 3.4;
    const d = 1.6 + ctx.rand() * 3.4;
    const color = mixHex(
      pick(ctx.rand, ctx.palette.building),
      ctx.background,
      0.15,
    );
    buildings.push({
      id: `fill-building-${i}`,
      shape: 'box',
      position: [x, h / 2, z],
      scale: [w, h, d],
      color,
    });
    // Roof cap on a share of buildings — cone for pitched (rural /
    // preindustrial) or a flat box hat for modern rooftops.
    const roofChance = ctx.era === 'modern' ? 0.25 : 0.65;
    if (ctx.rand() < roofChance) {
      const roofColor = mixHex(
        pick(ctx.rand, ctx.palette.roof),
        ctx.background,
        0.1,
      );
      if (ctx.era === 'rural' || ctx.era === 'preindustrial') {
        // Pitched pyramid roof, sized to overhang slightly.
        buildings.push({
          id: `fill-building-${i}-roof`,
          shape: 'pyramid',
          position: [x, h + Math.min(w, d) * 0.35, z],
          scale: [
            Math.max(w, d) * 0.55,
            Math.min(w, d) * 0.6,
            Math.max(w, d) * 0.55,
          ],
          color: roofColor,
        });
      } else {
        // Modern parapet / rooftop equipment as a low flat box.
        buildings.push({
          id: `fill-building-${i}-roof`,
          shape: 'box',
          position: [x, h + 0.25, z],
          scale: [w * 0.5, 0.5, d * 0.5],
          color: roofColor,
        });
      }
    }
  }
  return buildings;
}

function generateVegetation(ctx: Context): ScenePrimitive[] {
  const trees: ScenePrimitive[] = [];
  const count = ERA_COUNTS[ctx.era].trees;
  for (let i = 0; i < count; i += 1) {
    const [x, z] = scatterOutsideInner(ctx);
    // Height varies by era: pre-1850 has old-growth (bigger); modern
    // trees are street-tree scale.
    const heightBase = ctx.era === 'rural' ? 4 : 2.5;
    const heightRange = ctx.era === 'rural' ? 4 : 1.5;
    const h = heightBase + ctx.rand() * heightRange;
    const trunkR = 0.18 + ctx.rand() * 0.12;
    const canopyR = 0.8 + ctx.rand() * 0.9;
    const canopyColor = pick(ctx.rand, ctx.palette.treeCanopy);
    trees.push({
      id: `fill-tree-${i}-trunk`,
      shape: 'cylinder',
      position: [x, h / 2, z],
      scale: [trunkR, h, trunkR],
      color: ctx.palette.treeTrunk,
    });
    // Rural PNW trees are conifers (cone canopy); everything else is a
    // rounded sphere canopy.
    if (ctx.era === 'rural') {
      trees.push({
        id: `fill-tree-${i}-canopy`,
        shape: 'cone',
        position: [x, h + canopyR * 0.8, z],
        scale: [canopyR, canopyR * 2.2, canopyR],
        color: canopyColor,
      });
    } else {
      trees.push({
        id: `fill-tree-${i}-canopy`,
        shape: 'sphere',
        position: [x, h + canopyR * 0.7, z],
        scale: [canopyR, canopyR * 0.9, canopyR],
        color: canopyColor,
      });
    }
  }
  return trees;
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export function generateCityFill(options: CityFillOptions): CityFillResult {
  const outer = options.outerRadius ?? 30;
  const inner = options.innerRadius ?? 16;
  const era = classifyEra(options.year);
  const ctx: Context = {
    rand: mulberry32(hashString(options.seed)),
    inner,
    outer,
    era,
    palette: ERA_PALETTES[era],
    background: options.background ?? '#dbd7c9',
  };
  return {
    // Order matters for painter's algorithm feel: streets first (low),
    // then buildings, then vegetation on top so trees can overlap the
    // building bases visually.
    streets: generateStreets(ctx),
    buildings: generateBuildings(ctx),
    vegetation: generateVegetation(ctx),
  };
}

/** Convenience: flatten the result into a single primitives list. */
export function cityFillAsPrimitives(
  options: CityFillOptions,
): ScenePrimitive[] {
  const { streets, buildings, vegetation } = generateCityFill(options);
  return [...streets, ...buildings, ...vegetation];
}

/** Exposed for tests. */
export const cityFillInternals = {
  classifyEra,
  hashString,
  mulberry32,
  ERA_COUNTS,
} as const;
