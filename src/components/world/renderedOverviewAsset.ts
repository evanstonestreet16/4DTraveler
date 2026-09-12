import type { RenderedImageAsset } from '../../types/world';

/** Match centered object-fit: cover, including cropped image edges. */
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
