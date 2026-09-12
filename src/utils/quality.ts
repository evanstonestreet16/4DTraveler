export type SceneQuality = 'low' | 'medium' | 'high';
export type QualityPreference = 'auto' | SceneQuality;

/** These switches only affect rendering; all model nodes stay selectable. */
export const qualitySettings = {
  low: { dpr: 1, shadowMap: 0, motion: false, detail: false },
  medium: { dpr: 1.25, shadowMap: 512, motion: true, detail: true },
  high: { dpr: 1.75, shadowMap: 1024, motion: true, detail: true },
} as const;

export function chooseQuality(
  preference: QualityPreference,
  coarsePointer: boolean,
  cores: number,
  softwareRenderer = false,
): SceneQuality {
  if (preference !== 'auto') return preference;
  if (softwareRenderer || (cores > 0 && cores <= 4)) return 'low';
  return coarsePointer ? 'medium' : 'high';
}
