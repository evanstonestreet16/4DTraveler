export const START_ALTITUDE = 1.8;
export const MIN_ALTITUDE = 0.35;
export const MAX_ALTITUDE = 3.6;

/** Pixel-delta gain. Trackpad events are a few pixels; a mouse notch is ~100. */
export const ZOOM_PIXEL_GAIN = 0.00135;
/** Exponential follow rate (1/seconds). About 200ms to settle at 60fps. */
export const ZOOM_FOLLOW = 14;

export function clampAltitude(altitude: number) {
  return Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, altitude));
}

export function wheelZoomFactor(deltaY: number, deltaMode: number) {
  let delta = deltaY;
  if (deltaMode === 1) delta *= 16;
  if (deltaMode === 2) delta *= 100;
  return Math.exp(delta * ZOOM_PIXEL_GAIN);
}

export function followAltitude(
  current: number,
  target: number,
  dtSeconds: number,
) {
  const t = 1 - Math.exp(-ZOOM_FOLLOW * Math.max(0, dtSeconds));
  return current + (target - current) * t;
}
