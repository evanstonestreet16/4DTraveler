import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import type { CameraView } from '../../types/world';
import { fitCameraPosition, smoothStep } from '../../utils/camera';
import {
  initialLook,
  isLookDrag,
  moveLook,
  setSceneClickSuppressed,
  type LookLimits,
} from '../../utils/fixedLook';

export function CameraController({
  view,
  initialView,
  fixedLook,
  staticView = false,
  hotspotInput = false,
}: {
  view: CameraView;
  initialView: CameraView;
  fixedLook?: LookLimits;
  staticView?: boolean;
  /** Include projected HTML hotspot buttons in the same look gesture surface. */
  hotspotInput?: boolean;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const eventSurface = useThree((state) => state.events.connected);
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
    if (camera instanceof PerspectiveCamera) {
      camera.far = view.far ?? 400;
      camera.near = view.near ?? 0.1;
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, view, invalidate]);

  useEffect(() => {
    if (fixedLook) return;
    if (staticView) {
      transition.current = null;
      camera.position.copy(destination);
      target.current.copy(destinationTarget);
      camera.lookAt(target.current);
    } else {
      transition.current = {
        fromPosition: camera.position.clone(),
        fromTarget: target.current.clone(),
        elapsed: 0,
      };
    }
    invalidate();
  }, [
    camera,
    destination,
    destinationTarget,
    fixedLook,
    staticView,
    invalidate,
  ]);

  useEffect(() => {
    if (!fixedLook) return;
    const canvas = gl.domElement;
    // Drei Html portals into R3F's connected event surface, which can sit outside
    // the canvas measurement div. Use that same surface for marker drags.
    const input = hotspotInput
      ? eventSurface instanceof HTMLElement
        ? eventSurface
        : (canvas.parentElement ?? canvas)
      : canvas;
    const previousTabIndex = canvas.tabIndex;
    const previousLabel = canvas.getAttribute('aria-label');
    let direction = initialLook(view, fixedLook);
    let pointer: {
      id: number;
      startX: number;
      startY: number;
      x: number;
      y: number;
      dragging: boolean;
    } | null = null;
    transition.current = null;
    camera.position.set(...view.position);
    const applyLook = () => {
      camera.rotation.set(direction.pitch, direction.yaw, 0, 'YXZ');
      camera.getWorldDirection(target.current).add(camera.position);
      invalidate();
    };
    applyLook();
    canvas.dataset.fixedLook = 'true';
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      'Fixed viewpoint. Drag to look around, or focus this scene and use arrow keys. Use the object list to inspect objects.',
    );
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      setSceneClickSuppressed(canvas, false);
      pointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
      // Leave short button presses native; take capture only once they become drags.
      if (event.target === canvas) canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      pointer.dragging ||= isLookDrag(
        event.clientX - pointer.startX,
        event.clientY - pointer.startY,
      );
      if (pointer.dragging) {
        if (!canvas.hasPointerCapture(event.pointerId))
          canvas.setPointerCapture(event.pointerId);
        setSceneClickSuppressed(canvas, true);
        direction = moveLook(
          direction,
          event.clientX - pointer.x,
          event.clientY - pointer.y,
          fixedLook,
        );
        applyLook();
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (pointer.dragging || event.type === 'pointercancel')
        setSceneClickSuppressed(canvas, true);
      pointer = null;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    };
    const keydown = (event: KeyboardEvent) => {
      const movement = {
        ArrowLeft: [-24, 0],
        ArrowRight: [24, 0],
        ArrowUp: [0, -24],
        ArrowDown: [0, 24],
      }[event.key];
      if (!movement) return;
      event.preventDefault();
      direction = moveLook(direction, movement[0], movement[1], fixedLook);
      applyLook();
    };
    input.addEventListener('pointerdown', down, true);
    input.addEventListener('pointermove', move, true);
    input.addEventListener('pointerup', up, true);
    input.addEventListener('pointercancel', up, true);
    canvas.addEventListener('keydown', keydown);
    return () => {
      input.removeEventListener('pointerdown', down, true);
      input.removeEventListener('pointermove', move, true);
      input.removeEventListener('pointerup', up, true);
      input.removeEventListener('pointercancel', up, true);
      canvas.removeEventListener('keydown', keydown);
      if (pointer && canvas.hasPointerCapture(pointer.id))
        canvas.releasePointerCapture(pointer.id);
      setSceneClickSuppressed(canvas, false);
      delete canvas.dataset.fixedLook;
      canvas.tabIndex = previousTabIndex;
      if (previousLabel) canvas.setAttribute('aria-label', previousLabel);
      else canvas.removeAttribute('aria-label');
    };
  }, [camera, eventSurface, fixedLook, gl, hotspotInput, invalidate, view]);

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
