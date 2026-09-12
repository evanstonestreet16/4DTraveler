import { expect, it } from 'vitest';
import { hotspotPosition } from './panorama';

it('aligns north, west, east and elevated hotspots with the fixed camera convention', () => {
  const eye: [number, number, number] = [0, 1.65, 30];
  expect(hotspotPosition({ yaw: 0, pitch: 0 }, eye)).toEqual([0, 1.65, 20]);
  const west = hotspotPosition({ yaw: Math.PI / 2, pitch: 0 }, eye);
  expect(west[0]).toBeCloseTo(-10);
  expect(west[2]).toBeCloseTo(30);
  const east = hotspotPosition({ yaw: -Math.PI / 2, pitch: 0 }, eye);
  expect(east[0]).toBeCloseTo(10);
  expect(east[2]).toBeCloseTo(30);
  const above = hotspotPosition({ yaw: 0, pitch: Math.PI / 6 }, eye);
  expect(above[1]).toBeCloseTo(6.65);
  expect(above[2]).toBeCloseTo(30 - Math.sqrt(75));
  expect(eye).toEqual([0, 1.65, 30]);
});
