import { describe, expect, it } from 'vitest';
import { seattleFixture } from './fixture';
import { deriveWorldsFromProfile } from './deriveWorld';
import { GeneratedProfileError, validateHistoryProfile } from './validate';

describe('validateHistoryProfile', () => {
  it('accepts the bundled Seattle fixture', () => {
    expect(() => validateHistoryProfile(seattleFixture)).not.toThrow();
  });

  it('rejects missing cross-references between primitives and objects', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[0].objects[0].sceneObjectId = 'does-not-exist';
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('rejects negative scale components', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[0].primitives[0].scale[0] = -1;
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('rejects non-hex background colors', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[0].background = 'blue';
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('normalizes hex colors emitted without a leading "#"', () => {
    const relaxed = structuredClone(seattleFixture);
    relaxed.eras[0].background = '8FA87B';
    relaxed.eras[0].primitives[0].color = 'AbC';
    const validated = validateHistoryProfile(relaxed);
    expect(validated.eras[0].background).toBe('#8fa87b');
    expect(validated.eras[0].primitives[0].color).toBe('#aabbcc');
  });

  it('rejects duplicate era ids', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[1].id = broken.eras[0].id;
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });
});

describe('deriveWorldsFromProfile', () => {
  const worlds = deriveWorldsFromProfile(seattleFixture, {
    locationId: 'generated:seattle',
  });

  it('produces one HistoricalWorld per era with stable ids', () => {
    expect(worlds).toHaveLength(seattleFixture.eras.length);
    for (let index = 0; index < worlds.length; index += 1) {
      expect(worlds[index].id).toBe(
        `generated:seattle:${seattleFixture.eras[index].id}`,
      );
      expect(worlds[index].locationId).toBe('generated:seattle');
      expect(worlds[index].era.id).toBe(seattleFixture.eras[index].id);
    }
  });

  it('every object.sceneObjectId matches a primitive.id', () => {
    for (const world of worlds) {
      const primitiveIds = new Set(
        world.scene.primitives.map((primitive) => primitive.id),
      );
      for (const object of world.objects) {
        expect(primitiveIds.has(object.sceneObjectId)).toBe(true);
      }
    }
  });

  it('POI objectIds only reference known objects', () => {
    for (const world of worlds) {
      const objectIds = new Set(world.objects.map((object) => object.id));
      for (const poi of world.pois) {
        for (const id of poi.objectIds) expect(objectIds.has(id)).toBe(true);
      }
    }
  });

  it('camera looks at a target within the scene bounds', () => {
    for (const world of worlds) {
      const [, , tz] = world.scene.overviewCamera.target;
      expect(tz).toBeGreaterThan(-25);
      expect(tz).toBeLessThan(25);
    }
  });
});
