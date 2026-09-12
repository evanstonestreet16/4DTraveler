import { useEffect, useState, type RefObject } from 'react';

/** Suspend environmental motion when hidden, offscreen, or reduced motion is requested. */
export function useSceneActivity(container: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let intersecting = true;
    const update = () =>
      setActive(intersecting && !document.hidden && !media.matches);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [container]);
  return active;
}
