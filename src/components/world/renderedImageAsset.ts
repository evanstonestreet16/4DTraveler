import type { RenderedImageAsset } from '../../types/world';

export interface LoadedRenderedImage {
  image: HTMLImageElement;
  dispose: () => void;
}

/** One active decoded image. The caller owns it until dispose, including on late results. */
export async function loadRenderedImage(
  asset: RenderedImageAsset,
  signal: AbortSignal,
): Promise<LoadedRenderedImage> {
  signal.throwIfAborted();
  const response = await fetch(asset.url, { signal, cache: 'force-cache' });
  if (!response.ok)
    throw new Error(`Image request failed (${response.status}).`);
  const blob = await response.blob();
  signal.throwIfAborted();
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    image.removeAttribute('src');
    URL.revokeObjectURL(objectUrl);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        dispose();
        reject(
          signal.reason ?? new DOMException('Image canceled', 'AbortError'),
        );
      };
      signal.addEventListener('abort', abort, { once: true });
      image.src = objectUrl;
      void image.decode().then(
        () => {
          signal.removeEventListener('abort', abort);
          if (signal.aborted) abort();
          else resolve();
        },
        (error: unknown) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      );
    });
    signal.throwIfAborted();
    if (
      image.naturalWidth !== asset.width ||
      image.naturalHeight !== asset.height
    )
      throw new Error('Image dimensions do not match the authored view.');
    return { image, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Match centered object-fit: cover, including its cropped edges. */
export function overviewMarkerPosition(
  marker: [number, number],
  image: Pick<RenderedImageAsset, 'width' | 'height'>,
  viewport: { width: number; height: number },
) {
  const scale = Math.max(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  return {
    left:
      (viewport.width - image.width * scale) / 2 +
      marker[0] * image.width * scale,
    top:
      (viewport.height - image.height * scale) / 2 +
      marker[1] * image.height * scale,
  };
}
