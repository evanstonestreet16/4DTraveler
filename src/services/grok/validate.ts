import type {
  GeneratedEra,
  GeneratedHistoryProfile,
  GeneratedObject,
  GeneratedPOI,
  ObjectPart,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

/**
 * Runtime validator for the Grok JSON output. Strict about shapes and
 * numbers (they drive rendering math), lenient about cosmetic slop like
 * missing '#' on hex colors. Throws with a human-readable path/reason on
 * anything unrecoverable.
 */
export class GeneratedProfileError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'GeneratedProfileError';
  }
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new GeneratedProfileError('expected non-empty string', path);
  }
  return value;
}

function assertHex(value: unknown, path: string): string {
  const str = assertString(value, path).trim();
  // Accept "#RRGGBB", "RRGGBB", "#RGB", or "RGB" (common LLM slop) and
  // normalize to the canonical "#rrggbb" form the renderer expects.
  const match = str.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    throw new GeneratedProfileError(
      `expected #RRGGBB or #RGB hex color, got "${str}"`,
      path,
    );
  }
  const digits = match[1];
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((char) => char + char)
          .join('')
      : digits;
  return `#${expanded.toLowerCase()}`;
}

function assertNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GeneratedProfileError('expected finite number', path);
  }
  return value;
}

function assertVec3(value: unknown, path: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new GeneratedProfileError('expected [x, y, z]', path);
  }
  return [
    assertNumber(value[0], `${path}[0]`),
    assertNumber(value[1], `${path}[1]`),
    assertNumber(value[2], `${path}[2]`),
  ];
}

function assertPositiveVec3(value: unknown, path: string): Vec3 {
  const vec = assertVec3(value, path);
  vec.forEach((component, index) => {
    if (component <= 0) {
      throw new GeneratedProfileError(
        `expected positive number, got ${component}`,
        `${path}[${index}]`,
      );
    }
  });
  return vec;
}

function assertArray(
  value: unknown,
  path: string,
  minLength: number,
): unknown[] {
  if (!Array.isArray(value) || value.length < minLength) {
    throw new GeneratedProfileError(
      `expected array of length >= ${minLength}`,
      path,
    );
  }
  return value;
}

function assertShape(value: unknown, path: string): 'box' | 'cylinder' {
  const shape = assertString(value, path);
  if (shape !== 'box' && shape !== 'cylinder') {
    throw new GeneratedProfileError(
      `expected "box" or "cylinder", got "${shape}"`,
      path,
    );
  }
  return shape;
}

function validateScenery(raw: unknown, path: string): ScenePrimitive {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  return {
    id: assertString(record.id, `${path}.id`),
    shape: assertShape(record.shape, `${path}.shape`),
    position: assertVec3(record.position, `${path}.position`),
    scale: assertPositiveVec3(record.scale, `${path}.scale`),
    color: assertHex(record.color, `${path}.color`),
  };
}

const MAX_PARTS = 5;

function validatePart(raw: unknown, path: string): ObjectPart {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  return {
    shape: assertShape(record.shape, `${path}.shape`),
    position: assertVec3(record.position, `${path}.position`),
    scale: assertPositiveVec3(record.scale, `${path}.scale`),
    color: assertHex(record.color, `${path}.color`),
  };
}

function validateObject(raw: unknown, path: string): GeneratedObject {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  let parts: ObjectPart[] | undefined;
  if (record.parts !== undefined && record.parts !== null) {
    if (!Array.isArray(record.parts)) {
      throw new GeneratedProfileError(
        'expected array of parts',
        `${path}.parts`,
      );
    }
    // Cap silently at MAX_PARTS to protect the renderer from over-eager
    // silhouettes; discard the tail rather than fail the whole era.
    parts = record.parts
      .slice(0, MAX_PARTS)
      .map((entry, index) => validatePart(entry, `${path}.parts[${index}]`));
    if (parts.length === 0) parts = undefined;
  }
  return {
    id: assertString(record.id, `${path}.id`),
    name: assertString(record.name, `${path}.name`),
    shape: assertShape(record.shape, `${path}.shape`),
    position: assertVec3(record.position, `${path}.position`),
    scale: assertPositiveVec3(record.scale, `${path}.scale`),
    color: assertHex(record.color, `${path}.color`),
    parts,
    description: assertString(record.description, `${path}.description`),
    whyItMatters: assertString(record.whyItMatters, `${path}.whyItMatters`),
  };
}

function validatePOI(raw: unknown, path: string): GeneratedPOI {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  const objects = assertArray(record.objects, `${path}.objects`, 1);
  return {
    id: assertString(record.id, `${path}.id`),
    name: assertString(record.name, `${path}.name`),
    markerPosition: assertVec3(record.markerPosition, `${path}.markerPosition`),
    objects: objects.map((entry, index) =>
      validateObject(entry, `${path}.objects[${index}]`),
    ),
  };
}

function validateEra(raw: unknown, path: string): GeneratedEra {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  // Accept `scenery` (canonical) or `primitives` (LLM sometimes reverts to
  // the older name) so a small nomenclature drift doesn't fail the run.
  const sceneryField = record.scenery ?? record.primitives ?? [];
  const scenery = Array.isArray(sceneryField) ? sceneryField : [];
  const pois = assertArray(record.pois, `${path}.pois`, 1);

  const era: GeneratedEra = {
    id: assertString(record.id, `${path}.id`),
    label: assertString(record.label, `${path}.label`),
    year: assertNumber(record.year, `${path}.year`),
    subtitle: assertString(record.subtitle, `${path}.subtitle`),
    historicalContext: assertString(
      record.historicalContext,
      `${path}.historicalContext`,
    ),
    background:
      record.background === undefined
        ? undefined
        : assertHex(record.background, `${path}.background`),
    scenery: scenery.map((entry, index) =>
      validateScenery(entry, `${path}.scenery[${index}]`),
    ),
    pois: pois.map((entry, index) =>
      validatePOI(entry, `${path}.pois[${index}]`),
    ),
  };

  // Uniqueness check across every id we will use as a stable renderer key.
  const allIds = new Set<string>();
  const track = (id: string, where: string) => {
    if (allIds.has(id)) {
      throw new GeneratedProfileError(`duplicate id "${id}"`, where);
    }
    allIds.add(id);
  };
  era.scenery.forEach((primitive, index) =>
    track(primitive.id, `${path}.scenery[${index}].id`),
  );
  era.pois.forEach((poi, poiIndex) => {
    track(poi.id, `${path}.pois[${poiIndex}].id`);
    poi.objects.forEach((object, objectIndex) =>
      track(object.id, `${path}.pois[${poiIndex}].objects[${objectIndex}].id`),
    );
  });

  return era;
}

export function validateHistoryProfile(raw: unknown): GeneratedHistoryProfile {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', '$');
  }
  const record = raw as Record<string, unknown>;
  const eras = assertArray(record.eras, '$.eras', 1);
  const profile: GeneratedHistoryProfile = {
    cityName: assertString(record.cityName, '$.cityName'),
    region: assertString(record.region, '$.region'),
    description: assertString(record.description, '$.description'),
    eras: eras.map((entry, index) => validateEra(entry, `$.eras[${index}]`)),
  };
  const eraIds = new Set<string>();
  profile.eras.forEach((era, index) => {
    if (eraIds.has(era.id)) {
      throw new GeneratedProfileError(
        `duplicate era id "${era.id}"`,
        `$.eras[${index}].id`,
      );
    }
    eraIds.add(era.id);
  });
  return profile;
}
