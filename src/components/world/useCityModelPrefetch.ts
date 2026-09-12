import { useEffect, useRef } from 'react';
import type { HistoricalWorld } from '../../types/world';
import { createModelPrefetchSession } from './modelPrefetch';

/** Call only with the active overview's ready state, including visibility/WebGL. */
export function useCityModelPrefetch(
  world: HistoricalWorld,
  overviewInteractive: boolean,
) {
  const session = useRef<ReturnType<typeof createModelPrefetchSession> | null>(
    null,
  );
  useEffect(() => {
    session.current = createModelPrefetchSession(world);
    return () => {
      session.current = null;
    };
  }, [world]);
  useEffect(() => {
    if (!overviewInteractive || world.scene.presentation !== 'immersive-city')
      return;
    const current = session.current;
    if (!current) return;
    const controller = new AbortController();
    let idle: number | undefined;
    let timeout: number | undefined;
    const begin = () => {
      if (controller.signal.aborted) return;
      timeout = window.setTimeout(() => controller.abort(), 15000);
      void current
        .run(controller.signal)
        .finally(() => window.clearTimeout(timeout));
    };
    // Let the detailed overview paint and become usable before using idle time.
    const delay = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function')
        idle = window.requestIdleCallback(begin, { timeout: 1500 });
      else begin();
    }, 500);
    return () => {
      window.clearTimeout(delay);
      window.clearTimeout(timeout);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      controller.abort();
    };
  }, [world, overviewInteractive]);
}
