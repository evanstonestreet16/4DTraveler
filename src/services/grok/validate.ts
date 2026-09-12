import type {
  GeneratedEra,
  GeneratedHistoryProfile,
  GeneratedObject,
  GeneratedPOI,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

/**
 * Runtime validator for the Grok JSON output. Strict enough to catch model
 * hallucinations before they crash the renderer; lenient enough to accept
 * cosmetic sloppiness (extra whitespace, integer vs float coordinates).
 *
 * Returns the parsed profile or throws with a human-readable path/reason so
 * failures surface in dev tools and can be logged from the proxy.
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

function validatePrimitive(raw: unknown, path: string): ScenePrimitive {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  const shape = assertString(record.shape, `${path}.shape`);
  if (shape !== 'box' && shape !== 'cylinder') {
    throw new GeneratedProfileError(
      `expected "box" or "cylinder"`,
      `${path}.shape`,
    );
  }
  return {
    id: assertString(record.id, `${path}.id`),
    shape,
    position: assertVec3(record.position, `${path}.position`),
    scale: assertPositiveVec3(record.scale, `${path}.scale`),
    color: assertHex(record.color, `${path}.color`),
  };
}

function validatePOI(raw: unknown, path: string): GeneratedPOI {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  const objectIds = assertArray(record.objectIds, `${path}.objectIds`, 1);
  return {
    id: assertString(record.id, `${path}.id`),
    name: assertString(record.name, `${path}.name`),
    markerPosition: assertVec3(record.markerPosition, `${path}.markerPosition`),
    objectIds: objectIds.map((value, index) =>
      assertString(value, `${path}.objectIds[${index}]`),
    ),
  };
}

function validateObject(raw: unknown, path: string): GeneratedObject {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  return {
    id: assertString(record.id, `${path}.id`),
    name: assertString(record.name, `${path}.name`),
    poiId: assertString(record.poiId, `${path}.poiId`),
    sceneObjectId: assertString(record.sceneObjectId, `${path}.sceneObjectId`),
    description: assertString(record.description, `${path}.description`),
    whyItMatters: assertString(record.whyItMatters, `${path}.whyItMatters`),
  };
}

function validateEra(raw: unknown, path: string): GeneratedEra {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeneratedProfileError('expected object', path);
  }
  const record = raw as Record<string, unknown>;
  const primitives = assertArray(record.primitives, `${path}.primitives`, 4);
  const pois = assertArray(record.pois, `${path}.pois`, 1);
  const objects = assertArray(record.objects, `${path}.objects`, 1);
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
    primitives: primitives.map((entry, index) =>
      validatePrimitive(entry, `${path}.primitives[${index}]`),
    ),
    pois: pois.map((entry, index) =>
      validatePOI(entry, `${path}.pois[${index}]`),
    ),
    objects: objects.map((entry, index) =>
      validateObject(entry, `${path}.objects[${index}]`),
    ),
  };

  // Cross-reference checks: every object.sceneObjectId must match a
  // primitive.id, and every poi.objectIds must reference a known object.
  const primitiveIds = new Set(era.primitives.map((primitive) => primitive.id));
  const objectIds = new Set(era.objects.map((object) => object.id));
  const poiIds = new Set(era.pois.map((poi) => poi.id));
  era.objects.forEach((object, index) => {
    if (!primitiveIds.has(object.sceneObjectId)) {
      throw new GeneratedProfileError(
        `sceneObjectId "${object.sceneObjectId}" has no matching primitive`,
        `${path}.objects[${index}].sceneObjectId`,
      );
    }
    if (!poiIds.has(object.poiId)) {
      throw new GeneratedProfileError(
        `poiId "${object.poiId}" has no matching POI`,
        `${path}.objects[${index}].poiId`,
      );
    }
  });
  era.pois.forEach((poi, index) => {
    poi.objectIds.forEach((objectId, objectIndex) => {
      if (!objectIds.has(objectId)) {
        throw new GeneratedProfileError(
          `objectIds[${objectIndex}] "${objectId}" has no matching object`,
          `${path}.pois[${index}].objectIds`,
        );
      }
    });
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
