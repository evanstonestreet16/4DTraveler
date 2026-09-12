import type { CameraView } from '../types/world';

export interface LookLimits {
  minPitch: number;
  maxPitch: number;
}

export interface LookDirection {
  yaw: number;
  pitch: number;
}

const suppressedClicks = new WeakSet<HTMLCanvasElement>();

/** Shared only by the camera gesture and scene picking; keyboard controls bypass it. */
export function shouldSuppressSceneClick(canvas: HTMLCanvasElement) {
  return suppressedClicks.has(canvas);
}

export function setSceneClickSuppressed(
  canvas: HTMLCanvasElement,
  suppressed: boolean,
) {
  if (suppressed) suppressedClicks.add(canvas);
  else suppressedClicks.delete(canvas);
}

export function initialLook(
  view: CameraView,
  limits: LookLimits,
): LookDirection {
  const x = view.target[0] - view.position[0];
  const y = view.target[1] - view.position[1];
  const z = view.target[2] - view.position[2];
  return {
    yaw: Math.atan2(-x, -z),
    pitch: Math.max(
      limits.minPitch,
      Math.min(limits.maxPitch, Math.atan2(y, Math.hypot(x, z))),
    ),
  };
}

/** Keep direction local to the controller; a full turn never changes the eye anchor. */
export function moveLook(
  direction: LookDirection,
  deltaX: number,
  deltaY: number,
  limits: LookLimits,
): LookDirection {
  const yaw = direction.yaw - deltaX * 0.004;
  return {
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch: Math.max(
      limits.minPitch,
      Math.min(limits.maxPitch, direction.pitch - deltaY * 0.004),
    ),
  };
}

export function isLookDrag(deltaX: number, deltaY: number) {
  return Math.hypot(deltaX, deltaY) > 5;
}
