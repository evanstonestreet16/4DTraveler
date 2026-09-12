import type {
  GeneratedEra,
  GeneratedHistoryProfile,
  GeneratedObject,
  GeneratedPOI,
  ObjectPart,
  PrimitiveShape,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

const SUPPORTED_SHAPES: readonly PrimitiveShape[] = [
  'box',
  'cylinder',
  'cone',
  'pyramid',
  'sphere',
  'torus',
];

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

function assertShape(value: unknown, path: string): PrimitiveShape {
  const shape = assertString(value, path);
  if (!SUPPORTED_SHAPES.includes(shape as PrimitiveShape)) {
    throw new GeneratedProfileError(
      `expected one of ${SUPPORTED_SHAPES.map((s) => `"${s}"`).join(', ')}, got "${shape}"`,
      path,
    );
  }
  return shape as PrimitiveShape;
}

/**
 * Optional Euler XYZ rotation in degrees. Missing/null returns
 * `undefined` so the renderer can skip applying a rotation prop and
 * keep the mesh at its identity transform.
 */
function validateOptionalRotation(
  value: unknown,
  path: string,
): Vec3 | undefined {
  if (value === undefined || value === null) return undefined;
  return assertVec3(value, path);
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
    rotation: validateOptionalRotation(record.rotation, `${path}.rotation`),
  };
}

/**
 * Ceiling on how many extra silhouette primitives a single object can
 * contribute. 20 gives Grok enough room to draft an ambitious landmark
 * (Space Needle wants ~12, a cathedral wants ~10) while still keeping
 * the primitive budget bounded on the renderer side.
 */
const MAX_PARTS = 20;

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
    rotation: validateOptionalRotation(record.rotation, `${path}.rotation`),
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
  const iconic = record.iconic === true;
  let tripoPrompt: string | undefined;
  if (typeof record.tripoPrompt === 'string' && record.tripoPrompt.length > 0) {
    tripoPrompt = record.tripoPrompt;
  }
  return {
    id: assertString(record.id, `${path}.id`),
    name: assertString(record.name, `${path}.name`),
    shape: assertShape(record.shape, `${path}.shape`),
    position: assertVec3(record.position, `${path}.position`),
    scale: assertPositiveVec3(record.scale, `${path}.scale`),
    color: assertHex(record.color, `${path}.color`),
    rotation: validateOptionalRotation(record.rotation, `${path}.rotation`),
    parts,
    iconic: iconic || undefined,
    tripoPrompt,
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

  // Uniqueness within each namespace only. Cross-namespace collisions
  // (e.g. a scenery id matching an object id) are handled by
  // `deriveWorld` via automatic suffixing, so we don't need to fail the
  // whole run for that class of drift.
  const trackWithin = (
    kind: string,
    entries: { id: string }[],
    pathPrefix: string,
  ) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        throw new GeneratedProfileError(
          `duplicate ${kind} id "${entry.id}"`,
          `${pathPrefix}[${index}].id`,
        );
      }
      seen.add(entry.id);
    });
  };
  trackWithin('scenery', era.scenery, `${path}.scenery`);
  trackWithin('poi', era.pois, `${path}.pois`);
  const flatObjects = era.pois.flatMap((poi, poiIndex) =>
    poi.objects.map((object, objectIndex) => ({
      id: object.id,
      objectIndex,
      poiIndex,
    })),
  );
  const seenObjectIds = new Set<string>();
  flatObjects.forEach((entry) => {
    if (seenObjectIds.has(entry.id)) {
      throw new GeneratedProfileError(
        `duplicate object id "${entry.id}"`,
        `${path}.pois[${entry.poiIndex}].objects[${entry.objectIndex}].id`,
      );
    }
    seenObjectIds.add(entry.id);
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
