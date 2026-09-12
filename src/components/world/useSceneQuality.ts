import { useEffect, useState } from 'react';
import {
  chooseQuality,
  qualitySettings,
  type QualityPreference,
} from '../../utils/quality';

export function useSceneQuality(
  preference: QualityPreference,
  softwareRenderer = false,
) {
  const [coarse, setCoarse] = useState(
    () => matchMedia('(pointer: coarse)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(pointer: coarse)');
    const update = () => setCoarse(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const quality = chooseQuality(
    preference,
    coarse,
    navigator.hardwareConcurrency || 8,
    softwareRenderer,
  );
  return { quality, settings: qualitySettings[quality] };
}
