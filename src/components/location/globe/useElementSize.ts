import { useCallback, useState } from 'react';

/** Tracks an element's content-box size via ResizeObserver, for canvas libraries that need explicit pixel dimensions. */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const apply = (width: number, height: number) => {
      if (!width || !height) return;
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };
    apply(node.clientWidth, node.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      apply(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
