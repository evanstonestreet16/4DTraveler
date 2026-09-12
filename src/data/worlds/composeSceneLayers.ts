import type { ScenePrimitive } from '../../types/world';

/** Compose authored layers in order; replacements must be explicit, never shadow an ID. */
export function composeSceneLayers(
  shared: readonly ScenePrimitive[],
  era: readonly ScenePrimitive[],
): ScenePrimitive[] {
  const primitives = [...shared, ...era];
  const ids = new Set<string>();
  for (const primitive of primitives) {
    if (ids.has(primitive.id))
      throw new Error(
        `Scene layers contain duplicate primitive ID: ${primitive.id}`,
      );
    ids.add(primitive.id);
  }
  return primitives;
}
