import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Refresh resolution when zooming or moving between displays, within the render budget. */
export function ViewportDpr({ maximum = 1.75 }: { maximum?: number }) {
  const setDpr = useThree((state) => state.setDpr);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let resolution: MediaQueryList;
    const refresh = () => {
      resolution?.removeEventListener('change', refresh);
      setDpr(Math.min(maximum, Math.max(1, window.devicePixelRatio || 1)));
      invalidate();
      resolution = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      resolution.addEventListener('change', refresh);
    };
    refresh();
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('resize', refresh);
      resolution.removeEventListener('change', refresh);
    };
  }, [maximum, setDpr, invalidate]);
  return null;
}
