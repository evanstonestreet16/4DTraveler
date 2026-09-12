import { expect, it } from 'vitest';
import { fitCameraPosition, smoothStep } from './camera';

it('preserves landscape presets and increases distance from the target in portrait', () => {
  const view = {
    position: [10, 10, 10] as [number, number, number],
    target: [2, 0, 2] as [number, number, number],
  };
  expect(fitCameraPosition(view, 2)).toEqual(view.position);
  expect(fitCameraPosition(view, 0.5)).toEqual([18, 20, 18]);
  expect([smoothStep(0), smoothStep(0.5), smoothStep(1)]).toEqual([0, 0.5, 1]);
});
