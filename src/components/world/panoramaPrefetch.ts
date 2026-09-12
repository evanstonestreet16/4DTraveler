import type { HistoricalWorld } from '../../types/world';

export const PANORAMA_PREFETCH_BYTE_LIMIT = 6 * 1024 * 1024;

/** Cache encoded bytes for only the first available (hero) panorama; never decode. */
export function createPanoramaPrefetchSession(world: HistoricalWorld) {
  const hero = world.pois.find((poi) => !poi.preview && poi.immersive?.panorama)
    ?.immersive?.panorama;
  const completed = new Set<string>();
  return {
    async run(mobile: boolean, signal: AbortSignal) {
      const asset = mobile ? (hero?.mobile ?? hero?.desktop) : hero?.desktop;
      if (!asset || completed.has(asset.url) || signal.aborted) return;
      try {
        const response = await fetch(asset.url, {
          signal,
          cache: 'force-cache',
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const abort = () => {
          void reader.cancel().catch(() => undefined);
        };
        signal.addEventListener('abort', abort, { once: true });
        let bytes = 0;
        try {
          if (
            Number(response.headers.get('content-length')) >
            PANORAMA_PREFETCH_BYTE_LIMIT
          ) {
            completed.add(asset.url);
            await reader.cancel();
            return;
          }
          if (signal.aborted) {
            await reader.cancel();
            return;
          }
          while (!signal.aborted) {
            const chunk = await reader.read();
            if (chunk.done) {
              if (!signal.aborted) completed.add(asset.url);
              return;
            }
            bytes += chunk.value.byteLength;
            if (bytes > PANORAMA_PREFETCH_BYTE_LIMIT) {
              completed.add(asset.url);
              await reader.cancel();
              return;
            }
          }
        } finally {
          signal.removeEventListener('abort', abort);
          reader.releaseLock();
        }
      } catch {
        // Optional cache warming must never block entering the viewpoint.
      }
    },
  };
}
