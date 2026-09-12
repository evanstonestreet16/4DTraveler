import { useEffect, useState } from 'react';
import {
  loadSubregions,
  type SubregionFeature,
} from '../../../data/geo/subregions';

/** Loads a country's sub-regions on demand, only while it's the hovered country. */
export function useHoveredSubregions(hoveredIso: string | null) {
  const [subregions, setSubregions] = useState<SubregionFeature[]>([]);

  useEffect(() => {
    if (!hoveredIso) {
      setSubregions([]);
      return;
    }
    let cancelled = false;
    loadSubregions(hoveredIso).then((result) => {
      if (!cancelled) setSubregions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [hoveredIso]);

  return subregions;
}
