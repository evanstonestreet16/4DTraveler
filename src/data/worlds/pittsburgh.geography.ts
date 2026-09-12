import type { ScenePrimitive, WorldEnvironment } from '../../types/world';

/** Shared illustrative board, not surveyed geography. Meters; +Y up; origin [0, 0, 0]. */
export const pittsburghGeography = [
  {
    id: 'ground',
    shape: 'box',
    position: [0, -0.3, 0],
    scale: [44, 0.5, 34],
    color: '#ada98c',
  },
  {
    id: 'river',
    shape: 'box',
    position: [0, 0, 9],
    scale: [44, 0.12, 7],
    color: '#668e98',
  },
] satisfies ScenePrimitive[];

export const pittsburghWaterSurface = {
  position: [0, 0.1, 9],
  size: [43.8, 6.8],
} satisfies NonNullable<WorldEnvironment['water']>;
