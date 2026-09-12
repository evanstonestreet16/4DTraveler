import { describe, expect, it } from 'vitest';
import { initialLook, isLookDrag, moveLook } from './fixedLook';

const limits = {
  minPitch: (-35 * Math.PI) / 180,
  maxPitch: (55 * Math.PI) / 180,
};

describe('fixed-position look', () => {
  it('uses the authored view direction without changing the eye anchor', () => {
    const view = {
      position: [2, 1.65, 20] as [number, number, number],
      target: [2, 12, -50] as [number, number, number],
    };
    const original = structuredClone(view);
    const direction = initialLook(view, limits);
    expect(direction.yaw).toBeCloseTo(0);
    expect(direction.pitch).toBeCloseTo(Math.atan2(10.35, 70));
    moveLook(direction, 300, 100, limits);
    expect(view).toEqual(original);
  });

  it('permits complete horizontal turns and clamps vertical extremes', () => {
    const initial = { yaw: 0.4, pitch: 0 };
    expect(moveLook(initial, (2 * Math.PI) / 0.004, 0, limits).yaw).toBeCloseTo(
      initial.yaw,
    );
    expect(moveLook(initial, 0, -10000, limits).pitch).toBe(limits.maxPitch);
    expect(moveLook(initial, 0, 10000, limits).pitch).toBe(limits.minPitch);
  });

  it('keeps an ordinary shaky click selectable but treats diagonal movement as a drag', () => {
    expect(isLookDrag(3, 3)).toBe(false);
    expect(isLookDrag(4, 4)).toBe(true);
    expect(isLookDrag(-8, 0)).toBe(true);
  });
});
