import { describe, expect, it } from 'vitest';
import { materialFinish } from './SelectableObject';

describe('materialFinish', () => {
  it('reads cool light hues as metal or glass', () => {
    expect(materialFinish('#c8cbcf').metalness).toBeGreaterThan(0.15);
    expect(materialFinish('#c8cbcf').roughness).toBeLessThan(0.5);
  });

  it('keeps warm masonry matte', () => {
    const finish = materialFinish('#6b5744');
    expect(finish.metalness).toBeLessThan(0.1);
    expect(finish.roughness).toBeGreaterThan(0.55);
  });
});
