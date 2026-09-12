import { expect, it } from 'vitest';
import { overviewMarkerPosition } from './renderedOverviewAsset';

it('projects authored markers through the same centered crop as the image', () => {
  expect(
    overviewMarkerPosition(
      [0.5, 0.5],
      { width: 1600, height: 900 },
      { width: 390, height: 844 },
    ),
  ).toEqual({ left: 195, top: 422 });
  expect(
    overviewMarkerPosition(
      [0.25, 0.75],
      { width: 1600, height: 900 },
      { width: 1600, height: 900 },
    ),
  ).toEqual({ left: 400, top: 675 });
});
