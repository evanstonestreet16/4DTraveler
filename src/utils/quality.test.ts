import { expect, it } from 'vitest';
import { chooseQuality, qualitySettings } from './quality';

it('uses conservative automatic tiers and always honors an explicit choice', () => {
  expect(chooseQuality('auto', false, 4)).toBe('low');
  expect(chooseQuality('auto', true, 8)).toBe('medium');
  expect(chooseQuality('auto', false, 8)).toBe('high');
  expect(chooseQuality('high', true, 2)).toBe('high');
  expect(chooseQuality('auto', false, 16, true)).toBe('low');
  expect(chooseQuality('high', false, 16, true)).toBe('high');
  expect(chooseQuality('low', false, 16)).toBe('low');
  expect(qualitySettings.low).toMatchObject({
    dpr: 1,
    shadowMap: 0,
    motion: false,
    detail: false,
  });
  expect(
    Math.max(...Object.values(qualitySettings).map((tier) => tier.dpr)),
  ).toBeLessThanOrEqual(1.75);
});
