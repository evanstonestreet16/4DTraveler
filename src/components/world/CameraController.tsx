import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { CameraView } from '../../types/world';
import { fitCameraPosition, smoothStep } from '../../utils/camera';

export function CameraController({
  view,
  initialView,
}: {
  view: CameraView;
  initialView: CameraView;
}) {
  const { camera, size, invalidate } = useThree();
  const target = useRef(new Vector3(...initialView.target));
  const transition = useRef<{
    fromPosition: Vector3;
    fromTarget: Vector3;
    elapsed: number;
  } | null>(null);
  const destination = useMemo(
    () => new Vector3(...fitCameraPosition(view, size.width / size.height)),
    [view, size.width, size.height],
  );
  const destinationTarget = useMemo(() => new Vector3(...view.target), [view]);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotion.current = media.matches;
      invalidate();
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [invalidate]);

  useEffect(() => {
    transition.current = {
      fromPosition: camera.position.clone(),
      fromTarget: target.current.clone(),
      elapsed: 0,
    };
    invalidate();
  }, [camera, destination, destinationTarget, invalidate]);

  useFrame((_, delta) => {
    const movement = transition.current;
    if (!movement) return;
    movement.elapsed += Math.min(delta, 0.05);
    const progress = reducedMotion.current
      ? 1
      : Math.min(movement.elapsed / 0.95, 1);
    const eased = smoothStep(progress);
    camera.position.lerpVectors(movement.fromPosition, destination, eased);
    target.current.lerpVectors(movement.fromTarget, destinationTarget, eased);
    camera.lookAt(target.current);
    if (progress < 1) invalidate();
    else transition.current = null;
  });
  return null;
}
