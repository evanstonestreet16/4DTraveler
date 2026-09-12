import { describe, expect, it } from 'vitest';
import {
  clampAltitude,
  followAltitude,
  MAX_ALTITUDE,
  MIN_ALTITUDE,
  wheelZoomFactor,
} from './globeZoom';

describe('globe zoom', () => {
  it('clamps altitude to the authored range', () => {
    expect(clampAltitude(0)).toBe(MIN_ALTITUDE);
    expect(clampAltitude(9)).toBe(MAX_ALTITUDE);
    expect(clampAltitude(1.8)).toBe(1.8);
  });

  it('treats a positive wheel delta as zooming out', () => {
    expect(wheelZoomFactor(100, 0)).toBeGreaterThan(1);
    expect(wheelZoomFactor(-100, 0)).toBeLessThan(1);
  });

  it('scales line-mode wheel ticks up to pixel-sized deltas', () => {
    expect(wheelZoomFactor(1, 1)).toBeCloseTo(wheelZoomFactor(16, 0));
  });

  it('eases toward the target instead of jumping', () => {
    const next = followAltitude(1.8, 1, 1 / 60);
    expect(next).toBeGreaterThan(1);
    expect(next).toBeLessThan(1.8);
  });

  it('reaches the target after a long step', () => {
    expect(followAltitude(1.8, 0.5, 4)).toBeCloseTo(0.5, 5);
  });
});
