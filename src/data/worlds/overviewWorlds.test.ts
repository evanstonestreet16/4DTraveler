import { describe, expect, it } from 'vitest';
import { findWorld, locations, worlds } from '../locations';

describe('active overview worlds', () => {
  it('registers only Rome and Kyoto with three selectable markers each', () => {
    expect(locations.map((location) => location.id)).toEqual(['rome', 'kyoto']);
    expect(worlds.map((world) => world.id)).toEqual(['rome-125', 'kyoto-1700']);

    for (const world of worlds) {
      const overview = world.scene.overviewImage;
      expect(overview).toBeDefined();
      expect(world.pois).toHaveLength(3);
      expect(Object.keys(overview!.markers).sort()).toEqual(
        world.pois.map((poi) => poi.id).sort(),
      );
      expect(world.scene.presentation).toBe('overview-city');
    }
  });

  it('resolves each active era and rejects mismatched selections', () => {
    expect(findWorld('rome', '125')?.id).toBe('rome-125');
    expect(findWorld('kyoto', '1700')?.id).toBe('kyoto-1700');
    expect(findWorld('rome', '1700')).toBeNull();
    expect(findWorld('kyoto', '125')).toBeNull();
  });
});
