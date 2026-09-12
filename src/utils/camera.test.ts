import { expect, it } from 'vitest';
import { smoothStep } from './camera';

it('eases from rest to rest across the transition', () => {
  expect([smoothStep(0), smoothStep(0.5), smoothStep(1)]).toEqual([0, 0.5, 1]);
});
