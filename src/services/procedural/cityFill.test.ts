import { describe, expect, it } from 'vitest';
import {
  cityFillAsPrimitives,
  cityFillInternals,
  generateCityFill,
} from './cityFill';

describe('procedural cityFill', () => {
  it('is deterministic for the same seed', () => {
    const a = cityFillAsPrimitives({ seed: 'seattle-1962', year: 1962 });
    const b = cityFillAsPrimitives({ seed: 'seattle-1962', year: 1962 });
    expect(a).toEqual(b);
  });

  it('produces different scatter for different seeds', () => {
    const seattle = cityFillAsPrimitives({ seed: 'seattle-1962', year: 1962 });
    const paris = cityFillAsPrimitives({ seed: 'paris-1962', year: 1962 });
    // At least some of the emitted positions must differ.
    expect(JSON.stringify(seattle)).not.toBe(JSON.stringify(paris));
  });

  it('classifies era correctly by year', () => {
    expect(cityFillInternals.classifyEra(1780)).toBe('rural');
    expect(cityFillInternals.classifyEra(1900)).toBe('preindustrial');
    expect(cityFillInternals.classifyEra(1962)).toBe('industrial');
    expect(cityFillInternals.classifyEra(2005)).toBe('modern');
  });

  it('scales density with era: modern > rural in buildings', () => {
    const rural = generateCityFill({ seed: 'x', year: 1780 });
    const modern = generateCityFill({ seed: 'x', year: 2005 });
    expect(modern.buildings.length).toBeGreaterThan(rural.buildings.length);
  });

  it('scales density with era: rural > modern in vegetation', () => {
    const rural = generateCityFill({ seed: 'x', year: 1780 });
    const modern = generateCityFill({ seed: 'x', year: 2005 });
    expect(rural.vegetation.length).toBeGreaterThan(modern.vegetation.length);
  });

  it('rural era emits no street-grid strips', () => {
    const rural = generateCityFill({ seed: 'x', year: 1780 });
    expect(rural.streets.length).toBe(0);
  });

  it('every scattered building sits outside the inner "quiet zone"', () => {
    const inner = 16;
    const { buildings } = generateCityFill({
      seed: 'seed',
      year: 2005,
      innerRadius: inner,
      outerRadius: 30,
    });
    for (const b of buildings) {
      // Skip roof caps — they share the parent's X/Z so the base row
      // already proves the invariant.
      if (b.id.endsWith('-roof')) continue;
      const [x, , z] = b.position;
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeGreaterThanOrEqual(
        inner - 0.01,
      );
    }
  });

  it('every scattered building fits inside the outer radius', () => {
    const outer = 30;
    const { buildings } = generateCityFill({
      seed: 'seed',
      year: 2005,
      innerRadius: 16,
      outerRadius: outer,
    });
    for (const b of buildings) {
      const [x, , z] = b.position;
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThanOrEqual(outer);
    }
  });

  it('all emitted primitives have ids prefixed with fill-', () => {
    const all = cityFillAsPrimitives({ seed: 's', year: 1900 });
    for (const p of all) {
      expect(p.id.startsWith('fill-')).toBe(true);
    }
  });

  it('emits only supported primitive shapes', () => {
    const allowed = new Set(['box', 'cylinder', 'cone', 'sphere', 'pyramid']);
    const all = cityFillAsPrimitives({ seed: 's', year: 1780 });
    for (const p of all) {
      expect(allowed.has(p.shape)).toBe(true);
    }
  });

  it('all colors are canonical hex form', () => {
    const all = cityFillAsPrimitives({
      seed: 's',
      year: 2005,
      background: '#dbd7c9',
    });
    for (const p of all) {
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
