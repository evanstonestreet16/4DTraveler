import { describe, expect, it } from 'vitest';
import { seattleFixture } from './fixture';
import { deriveWorldsFromProfile } from './deriveWorld';
import { GeneratedProfileError, validateHistoryProfile } from './validate';

describe('validateHistoryProfile', () => {
  it('accepts the bundled Seattle fixture', () => {
    expect(() => validateHistoryProfile(seattleFixture)).not.toThrow();
  });

  it('rejects negative scale components', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[0].pois[0].objects[0].scale[0] = -1;
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
    relaxed.eras[0].pois[0].objects[0].color = 'AbC';
    const validated = validateHistoryProfile(relaxed);
    expect(validated.eras[0].background).toBe('#8fa87b');
    expect(validated.eras[0].pois[0].objects[0].color).toBe('#aabbcc');
  });

  it('rejects duplicate era ids', () => {
    const broken = structuredClone(seattleFixture);
    broken.eras[1].id = broken.eras[0].id;
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('rejects duplicate ids within an era across scenery/pois/objects', () => {
    const broken = structuredClone(seattleFixture);
    // Set an object.id equal to a scenery.id in the same era.
    broken.eras[0].pois[0].objects[0].id = broken.eras[0].scenery[0].id;
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('accepts "primitives" as an alias for "scenery" (nomenclature drift)', () => {
    const drifted = structuredClone(seattleFixture) as unknown as Record<
      string,
      unknown
    >;
    const eras = drifted.eras as Record<string, unknown>[];
    const era = eras[0];
    era.primitives = era.scenery;
    delete era.scenery;
    expect(() => validateHistoryProfile(drifted)).not.toThrow();
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

  it('every object.sceneObjectId matches a primitive.id after explosion', () => {
    for (const world of worlds) {
      const primitiveIds = new Set(
        world.scene.primitives.map((primitive) => primitive.id),
      );
      for (const object of world.objects) {
        expect(primitiveIds.has(object.sceneObjectId)).toBe(true);
      }
    }
  });

  it('every POI.objectIds resolves to a known object', () => {
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

  it('de-duplicates ids that collide between scenery and objects', () => {
    // Force a collision: rename first object to match first scenery id.
    const drifted = structuredClone(seattleFixture);
    drifted.eras[0].pois[0].objects[0].id = drifted.eras[0].scenery[0].id;
    // Bypass the validator (which would reject) to test derive's guard.
    const [firstEra] = deriveWorldsFromProfile(drifted, {
      locationId: 'generated:test',
    });
    const seen = new Set<string>();
    for (const primitive of firstEra.scene.primitives) {
      expect(seen.has(primitive.id)).toBe(false);
      seen.add(primitive.id);
    }
  });
});
