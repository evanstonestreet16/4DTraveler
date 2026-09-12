import type {
  GeneratedHistoryProfile,
  GeneratedObject,
  ObjectPart,
} from '../../types/world';
import { MAX_OBJECT_PARTS } from './validate';

export const MIN_ORDINARY_PARTS = 6;
export const MIN_ICONIC_PARTS = 12;

export interface StructureDetailTarget {
  id: string;
  name: string;
  year: number;
  iconic?: boolean;
  shape: GeneratedObject['shape'];
  position: GeneratedObject['position'];
  scale: GeneratedObject['scale'];
  color: string;
  rotation?: GeneratedObject['rotation'];
  parts: ObjectPart[];
}

export interface RefinedObjectParts {
  id: string;
  parts: ObjectPart[];
}

function partCount(object: GeneratedObject): number {
  return object.parts?.length ?? 0;
}

function needsMoreParts(object: GeneratedObject): boolean {
  const minimum = object.iconic ? MIN_ICONIC_PARTS : MIN_ORDINARY_PARTS;
  return partCount(object) < minimum;
}

/** Objects whose silhouettes are too thin for the current detail bar. */
export function objectsNeedingDetail(
  profile: GeneratedHistoryProfile,
): StructureDetailTarget[] {
  const targets: StructureDetailTarget[] = [];
  for (const era of profile.eras) {
    for (const poi of era.pois) {
      for (const object of poi.objects) {
        if (!needsMoreParts(object)) continue;
        targets.push({
          id: object.id,
          name: object.name,
          year: era.year,
          iconic: object.iconic,
          shape: object.shape,
          position: object.position,
          scale: object.scale,
          color: object.color,
          rotation: object.rotation,
          parts: object.parts ?? [],
        });
      }
    }
  }
  return targets;
}

/**
 * Replace `parts` on matching object ids. Unknown ids are ignored so a
 * sloppy refinement pass cannot invent new clickable objects.
 */
export function mergeRefinedParts(
  profile: GeneratedHistoryProfile,
  refinements: RefinedObjectParts[],
): GeneratedHistoryProfile {
  const byId = new Map(
    refinements
      .filter((entry) => entry.parts.length > 0)
      .map((entry) => [entry.id, entry.parts.slice(0, MAX_OBJECT_PARTS)]),
  );
  if (byId.size === 0) return profile;

  return {
    ...profile,
    eras: profile.eras.map((era) => ({
      ...era,
      pois: era.pois.map((poi) => ({
        ...poi,
        objects: poi.objects.map((object) => {
          const parts = byId.get(object.id);
          if (!parts) return object;
          return { ...object, parts };
        }),
      })),
    })),
  };
}

export function structureDetailUserPrompt(
  cityName: string,
  targets: StructureDetailTarget[],
): string {
  return [
    `City: ${cityName}`,
    'Thicken these existing structures. Each object includes its era year.',
    'Keep each primary primitive unchanged.',
    JSON.stringify({ objects: targets }),
  ].join('\n');
}

export function parseStructureDetailResponse(
  raw: unknown,
): RefinedObjectParts[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.objects)) return [];
  const parsed: RefinedObjectParts[] = [];
  for (const entry of record.objects) {
    if (typeof entry !== 'object' || entry === null) continue;
    const object = entry as Record<string, unknown>;
    if (typeof object.id !== 'string' || object.id.length === 0) continue;
    if (!Array.isArray(object.parts) || object.parts.length === 0) continue;
    parsed.push({
      id: object.id,
      parts: object.parts as ObjectPart[],
    });
  }
  return parsed;
}
