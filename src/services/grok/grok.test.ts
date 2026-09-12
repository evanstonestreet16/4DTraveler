import { describe, expect, it } from 'vitest';
import { seattleFixture } from './fixture';
import { deriveWorldsFromProfile } from './deriveWorld';
import {
  mergeRefinedParts,
  objectsNeedingDetail,
  parseStructureDetailResponse,
} from './refineStructures';
import { GeneratedProfileError, validateHistoryProfile } from './validate';

describe('validateHistoryProfile', () => {
  it('accepts the bundled Seattle fixture', () => {
    expect(() => validateHistoryProfile(seattleFixture)).not.toThrow();
  });

  it('bundled fixture ships with the expected 2 eras', () => {
    expect(seattleFixture.eras).toHaveLength(2);
  });

  it('caps parts to at most 36 entries silently', () => {
    const drifted = structuredClone(seattleFixture);
    const target = drifted.eras[1].pois[1].objects[0];
    const basePart = target.parts?.[0];
    expect(basePart).toBeDefined();
    if (!basePart) return;
    target.parts = Array.from({ length: 50 }, () => ({ ...basePart }));
    const validated = validateHistoryProfile(drifted);
    expect(validated.eras[1].pois[1].objects[0].parts).toHaveLength(36);
  });

  it('accepts every supported primitive shape on the primary object', () => {
    for (const shape of [
      'box',
      'cylinder',
      'cone',
      'pyramid',
      'sphere',
      'torus',
    ] as const) {
      const drifted = structuredClone(seattleFixture);
      drifted.eras[0].pois[0].objects[0].shape = shape;
      expect(() => validateHistoryProfile(drifted)).not.toThrow();
    }
  });

  it('accepts new shapes on scenery and on parts', () => {
    const drifted = structuredClone(seattleFixture);
    drifted.eras[1].scenery[0].shape = 'sphere';
    const target = drifted.eras[1].pois[1].objects[0];
    if (target.parts?.[0]) {
      target.parts[0].shape = 'torus';
    }
    expect(() => validateHistoryProfile(drifted)).not.toThrow();
  });

  it('rejects a bogus shape string', () => {
    const broken = structuredClone(seattleFixture) as unknown as {
      eras: { pois: { objects: { shape: string }[] }[] }[];
    };
    broken.eras[0].pois[0].objects[0].shape = 'tetrahedron';
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
  });

  it('accepts an optional rotation Vec3 in degrees on objects, parts, and scenery', () => {
    const drifted = structuredClone(seattleFixture);
    drifted.eras[0].pois[0].objects[0].rotation = [0, 45, 0];
    drifted.eras[1].scenery[0].rotation = [15, 0, 0];
    const target = drifted.eras[1].pois[1].objects[0];
    if (target.parts?.[0]) {
      target.parts[0].rotation = [90, 0, 0];
    }
    const validated = validateHistoryProfile(drifted);
    expect(validated.eras[0].pois[0].objects[0].rotation).toEqual([0, 45, 0]);
    expect(validated.eras[1].scenery[0].rotation).toEqual([15, 0, 0]);
    expect(validated.eras[1].pois[1].objects[0].parts?.[0].rotation).toEqual([
      90, 0, 0,
    ]);
  });

  it('rejects a rotation that is not a length-3 numeric vector', () => {
    const broken = structuredClone(seattleFixture) as unknown as {
      eras: { pois: { objects: { rotation?: unknown }[] }[] }[];
    };
    broken.eras[0].pois[0].objects[0].rotation = [0, 'twenty', 0];
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
    broken.eras[0].pois[0].objects[0].rotation = [0, 0];
    expect(() => validateHistoryProfile(broken)).toThrow(GeneratedProfileError);
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

  it('accepts an object id that collides with a scenery id (derive de-duplicates)', () => {
    const drifted = structuredClone(seattleFixture);
    drifted.eras[0].pois[0].objects[0].id = drifted.eras[0].scenery[0].id;
    expect(() => validateHistoryProfile(drifted)).not.toThrow();
  });

  it('still rejects two objects in the same era with the same id', () => {
    const broken = structuredClone(seattleFixture);
    // Force two objects in different POIs to share an id.
    broken.eras[0].pois[1].objects[0].id = broken.eras[0].pois[0].objects[0].id;
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

  it('propagates iconic + tripoPrompt from GeneratedObject to HistoricalObject', () => {
    const spaceNeedleWorld = worlds[1];
    const spaceNeedle = spaceNeedleWorld.objects.find(
      (object) => object.id === 'space-needle',
    );
    expect(spaceNeedle?.iconic).toBe(true);
    expect(typeof spaceNeedle?.tripoPrompt).toBe('string');
    expect((spaceNeedle?.tripoPrompt ?? '').length).toBeGreaterThan(10);
  });

  it('explodes object.parts into extra decorative primitives that keep the primary clickable', () => {
    const spaceNeedleWorld = worlds[1];
    const spaceNeedle = spaceNeedleWorld.objects.find(
      (object) => object.id === 'space-needle',
    );
    expect(spaceNeedle).toBeDefined();
    if (!spaceNeedle) return;
    // Primary primitive shares the object id (clickable).
    expect(
      spaceNeedleWorld.scene.primitives.some(
        (primitive) => primitive.id === 'space-needle',
      ),
    ).toBe(true);
    // Extra decorative primitives are present.
    const decorative = spaceNeedleWorld.scene.primitives.filter((primitive) =>
      primitive.id.startsWith('space-needle-part-'),
    );
    expect(decorative.length).toBeGreaterThan(0);
    // Decorative parts are NOT registered as their own selectable objects.
    for (const part of decorative) {
      expect(
        spaceNeedleWorld.objects.some(
          (object) => object.sceneObjectId === part.id,
        ),
      ).toBe(false);
    }
  });

  it('propagates rotation from GeneratedObject and ObjectPart into ScenePrimitive', () => {
    const drifted = structuredClone(seattleFixture);
    // Primary rotation on an arbitrary object in era 0.
    drifted.eras[0].pois[0].objects[0].rotation = [12, 34, 56];
    // Part rotation on the Space Needle (era 1, POI index 1, object 0).
    const spaceNeedle = drifted.eras[1].pois[1].objects[0];
    if (spaceNeedle.parts?.[0]) {
      spaceNeedle.parts[0].rotation = [10, 20, 30];
    }
    const derived = deriveWorldsFromProfile(drifted, {
      locationId: 'generated:seattle',
    });
    const primary = derived[0].scene.primitives.find(
      (primitive) => primitive.id === drifted.eras[0].pois[0].objects[0].id,
    );
    expect(primary?.rotation).toEqual([12, 34, 56]);
    const firstPart = derived[1].scene.primitives.find(
      (primitive) => primitive.id === `${spaceNeedle.id}-part-0`,
    );
    expect(firstPart?.rotation).toEqual([10, 20, 30]);
  });

  it('bundled Space Needle exercises the extended shape vocabulary', () => {
    const spaceNeedleWorld = worlds[1];
    const parts = spaceNeedleWorld.scene.primitives.filter((primitive) =>
      primitive.id.startsWith('space-needle-part-'),
    );
    const shapes = new Set(parts.map((primitive) => primitive.shape));
    // Space Needle demo must showcase at least one of the newer shapes
    // (cone/torus) so the fallback demo reads as more than boxes+cylinders.
    expect(shapes.has('torus') || shapes.has('cone')).toBe(true);
    // At least one part carries a non-identity rotation (the tripod legs).
    const anyRotated = parts.some(
      (primitive) =>
        Array.isArray(primitive.rotation) &&
        primitive.rotation.some((component) => component !== 0),
    );
    expect(anyRotated).toBe(true);
  });

  it('prepends deterministic procedural fill primitives (fill-* ids) that do not clash with Grok content', () => {
    const world = worlds[0];
    const fillPrimitives = world.scene.primitives.filter((primitive) =>
      primitive.id.startsWith('fill-'),
    );
    expect(fillPrimitives.length).toBeGreaterThan(20);
    // Fill primitives must never match a selectable object.
    for (const primitive of fillPrimitives) {
      expect(
        world.objects.some((object) => object.sceneObjectId === primitive.id),
      ).toBe(false);
    }
    // Same fixture derives the same fill set on a second call.
    const again = deriveWorldsFromProfile(seattleFixture, {
      locationId: 'generated:seattle',
    });
    const firstIds = fillPrimitives.map((p) => p.id).sort();
    const secondIds = again[0].scene.primitives
      .filter((p) => p.id.startsWith('fill-'))
      .map((p) => p.id)
      .sort();
    expect(secondIds).toEqual(firstIds);
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

describe('structure refinement', () => {
  it('flags Seattle fixture objects that are still simple boxes', () => {
    const targets = objectsNeedingDetail(seattleFixture);
    expect(targets.some((target) => target.id === 'longhouse')).toBe(true);
    expect(targets.some((target) => target.id === 'espresso-cart')).toBe(true);
    // Fixture Needle has 8 parts; iconic bar is 12, so the detail pass
    // will still ask Grok to thicken it on a live run.
    expect(targets.some((target) => target.id === 'space-needle')).toBe(true);
  });

  it('merges refined parts onto matching ids only', () => {
    const extra = {
      shape: 'pyramid' as const,
      position: [-6, 3.2, 3] as [number, number, number],
      scale: [2, 1.2, 2] as [number, number, number],
      color: '#4a3a2c',
    };
    const merged = mergeRefinedParts(seattleFixture, [
      { id: 'longhouse', parts: [extra] },
      { id: 'does-not-exist', parts: [extra] },
    ]);
    const longhouse = merged.eras[0].pois[0].objects.find(
      (object) => object.id === 'longhouse',
    );
    expect(longhouse?.parts).toEqual([extra]);
    expect(merged.eras[1].pois[1].objects[0].parts).toEqual(
      seattleFixture.eras[1].pois[1].objects[0].parts,
    );
  });

  it('parses a detail-pass payload and ignores empty ids', () => {
    const parsed = parseStructureDetailResponse({
      objects: [
        {
          id: 'longhouse',
          parts: [
            {
              shape: 'box',
              position: [0, 1, 0],
              scale: [1, 1, 1],
              color: '#7a5943',
            },
          ],
        },
        { id: '', parts: [] },
        { name: 'no-id', parts: [{ shape: 'box' }] },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('longhouse');
  });
});
