import type { CameraView, Vec3 } from '../types/world';

/** Widen the view on portrait screens without putting viewport-specific presets in data. */
export function fitCameraPosition(view: CameraView, aspect: number): Vec3 {
  const factor = Math.max(1, 1 / Math.max(aspect, 0.1));
  return view.position.map(
    (value, index) =>
      view.target[index] + (value - view.target[index]) * factor,
  ) as Vec3;
}

export function smoothStep(t: number) {
  return t * t * (3 - 2 * t);
}
