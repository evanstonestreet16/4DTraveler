import type { HistoricalWorld, SceneModel } from '../../types/world';

export const CITY_PREFETCH_BYTE_LIMIT = 20_000_000;

/** The authored URL, including its content hash, must match the foreground load. */
export function preferredModelUrl(model: SceneModel) {
  return model.compressedUrl && typeof DecompressionStream !== 'undefined'
    ? model.compressedUrl
    : model.url;
}

export function modelPrefetchCandidates(world: HistoricalWorld) {
  if (world.scene.presentation !== 'immersive-city') return [];
  const overview = world.scene.model && preferredModelUrl(world.scene.model);
  const urls = new Set<string>();
  for (const poi of world.pois) {
    if (poi.preview || !poi.immersive?.model) continue;
    const url = preferredModelUrl(poi.immersive.model);
    if (url !== overview) urls.add(url);
    if (urls.size === 2) break;
  }
  return [...urls];
}

/**
 * Warm the browser HTTP cache without retaining buffers, parsed scenes, or GPU
 * resources. The small bookkeeping object belongs to one mounted city session.
 */
export function createModelPrefetchSession(world: HistoricalWorld) {
  const urls = modelPrefetchCandidates(world);
  const finished = new Set<string>();
  let usedBytes = 0;

  return {
    async run(signal: AbortSignal) {
      for (const url of urls) {
        if (signal.aborted || usedBytes >= CITY_PREFETCH_BYTE_LIMIT) return;
        if (finished.has(url)) continue;
        try {
          const response = await fetch(url, { signal, cache: 'force-cache' });
          const length = Number(response.headers.get('content-length'));
          const remaining = CITY_PREFETCH_BYTE_LIMIT - usedBytes;
          // An encoded response's length does not describe fetch's decoded body.
          // Unknown/oversized transfers are left to the ordinary requested load.
          if (
            !response.ok ||
            !response.body ||
            response.headers.has('content-encoding') ||
            !Number.isSafeInteger(length) ||
            length <= 0 ||
            length > remaining
          ) {
            await response.body?.cancel();
            finished.add(url);
            continue;
          }
          const reader = response.body.getReader();
          const cancel = () => {
            void reader.cancel().catch(() => {});
          };
          signal.addEventListener('abort', cancel, { once: true });
          let complete = false;
          try {
            while (!signal.aborted) {
              const { done, value } = await reader.read();
              if (done) {
                complete = true;
                break;
              }
              // Charge partial transfers too: returning to overview cannot reset
              // the city budget. Stop if a server misreports Content-Length.
              usedBytes = Math.min(
                CITY_PREFETCH_BYTE_LIMIT,
                usedBytes + value.byteLength,
              );
              if (usedBytes === CITY_PREFETCH_BYTE_LIMIT) break;
            }
          } finally {
            signal.removeEventListener('abort', cancel);
            if (!complete) await reader.cancel().catch(() => {});
            reader.releaseLock();
          }
          if (!signal.aborted) finished.add(url);
        } catch {
          // Abort may resume on a later overview visit. Other prefetch failures
          // are optional; a foreground load performs its own request normally.
          if (!signal.aborted) finished.add(url);
        }
      }
    },
  };
}
