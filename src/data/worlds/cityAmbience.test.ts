import { expect, it } from 'vitest';
import { ambienceCacheKey } from '../../services/cityRetrieval';

it('keys generated ambience by city, place, and year without baking a region in', () => {
  expect(
    ambienceCacheKey({ city: 'Rome', place: 'Forum of Trajan', year: 125 }),
  ).toContain('Rome');
  expect(
    ambienceCacheKey({
      city: 'Kyoto',
      place: 'Nijō Castle: Ninomaru Approach',
      year: 1700,
    }),
  ).toContain('1700');
  expect(
    ambienceCacheKey({ city: 'Rome', place: 'Forum of Trajan', year: 125 }),
  ).not.toEqual(
    ambienceCacheKey({
      city: 'Kyoto',
      place: 'Nijō Castle: Ninomaru Approach',
      year: 1700,
    }),
  );
});
