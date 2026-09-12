import { useEffect, useMemo } from 'react';
import type { HistoricalWorld } from '../../types/world';
import { createPanoramaPrefetchSession } from './panoramaPrefetch';

export function usePanoramaPrefetch(world: HistoricalWorld, ready: boolean) {
  const session = useMemo(() => createPanoramaPrefetchSession(world), [world]);
  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (!ready || connection?.saveData || document.hidden) return;
    const controller = new AbortController();
    let idle: number | undefined;
    let deadline: number | undefined;
    const begin = () => {
      if (controller.signal.aborted || document.hidden) return;
      deadline = window.setTimeout(() => controller.abort(), 15000);
      void session
        .run(controller.signal)
        .finally(() => window.clearTimeout(deadline));
    };
    const delay = window.setTimeout(() => {
      if (window.requestIdleCallback)
        idle = window.requestIdleCallback(begin, { timeout: 1500 });
      else begin();
    }, 300);
    const hidden = () => {
      if (document.hidden) controller.abort();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.clearTimeout(delay);
      window.clearTimeout(deadline);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      document.removeEventListener('visibilitychange', hidden);
      controller.abort();
    };
  }, [session, ready]);
}
