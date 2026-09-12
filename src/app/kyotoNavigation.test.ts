import { describe, expect, it } from 'vitest';
import { findWorld, locations } from '../data/locations';
import { kyoto1700 } from '../data/worlds/kyoto-1700';
import { kyotoPresent } from '../data/worlds/kyoto-present';
import { resolvePresentation } from '../utils/presentation';
import { appReducer, initialState } from './state';

describe('Kyoto location and era navigation', () => {
  it('enters the registered Kyoto era and returns from object inspection to the same overview', () => {
    const location = locations.find((item) => item.id === 'kyoto');
    expect(location?.eras).toEqual([kyoto1700.era, kyotoPresent.era]);
    expect(findWorld('kyoto', '1700')).toBe(kyoto1700);
    expect(findWorld('kyoto', '125')).toBeNull();

    const atLocation = appReducer(initialState, {
      type: 'location',
      id: 'kyoto',
    });
    const overview = appReducer(atLocation, {
      type: 'era',
      id: '1700',
      world: findWorld('kyoto', '1700'),
    });
    const atNijo = appReducer(overview, {
      type: 'poi',
      id: 'nijo-ninomaru',
    });
    expect(atNijo.activePOIId).toBe('nijo-ninomaru');
    expect(
      resolvePresentation(kyoto1700, atNijo.cameraMode, atNijo.activePOIId)
        .scene.panorama,
    ).toBeDefined();

    const inspecting = appReducer(atNijo, {
      type: 'object',
      id: 'nijo-karamon',
    });
    expect(inspecting.selectedObjectId).toBe('nijo-karamon');
    const returned = appReducer(inspecting, { type: 'overview' });
    expect(returned).toEqual(overview);
    expect(returned.activeWorld).toBe(kyoto1700);
    expect(
      resolvePresentation(kyoto1700, returned.cameraMode, returned.activePOIId)
        .scene,
    ).toBe(kyoto1700.scene);

    expect(appReducer(overview, { type: 'mode', mode: 'catalog' })).toEqual({
      ...initialState,
      mode: 'catalog',
    });
  });

  it('rejects unavailable viewpoints and keeps object selection within the active place', () => {
    const overview = {
      ...initialState,
      selectedLocationId: 'kyoto',
      selectedEraId: '1700',
      activeWorld: kyoto1700,
    };
    expect(appReducer(overview, { type: 'object', id: 'nijo-karamon' })).toBe(
      overview,
    );
    expect(
      appReducer(overview, { type: 'poi', id: 'unavailable-viewpoint' }),
    ).toBe(overview);
    for (const poi of kyoto1700.pois) {
      if (poi.preview || !poi.immersive) {
        expect(appReducer(overview, { type: 'poi', id: poi.id })).toBe(
          overview,
        );
        continue;
      }
      const entered = appReducer(overview, { type: 'poi', id: poi.id });
      for (const object of kyoto1700.objects) {
        const result = appReducer(entered, { type: 'object', id: object.id });
        if (poi.objectIds.includes(object.id))
          expect(result.selectedObjectId).toBe(object.id);
        else expect(result).toBe(entered);
      }
    }
  });
});
