import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import { Vector3 } from 'three';
import type { PointOfInterest } from '../../types/world';

export function POIMarker({
  poi,
  active,
  onSelect,
}: {
  poi: PointOfInterest;
  active: boolean;
  onSelect: () => void;
}) {
  const marker = useRef<HTMLButtonElement | null>(null);
  const projected = useRef(new Vector3());
  const visible = useRef<boolean | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const attachMarker = useCallback(
    (element: HTMLButtonElement | null) => {
      marker.current = element;
      visible.current = null;
      invalidate();
    },
    [invalidate],
  );

  useFrame(({ camera, size }) => {
    const element = marker.current;
    if (!element) return;
    const point = projected.current.set(...poi.markerPosition).project(camera);
    const x = ((point.x + 1) * size.width) / 2;
    const y = ((1 - point.y) * size.height) / 2;
    // Leave room for the focus ring. Off-screen places still have the POI nav.
    const halfWidth = element.offsetWidth / 2 + 4;
    const halfHeight = element.offsetHeight / 2 + 4;
    const fits =
      point.z >= -1 &&
      point.z <= 1 &&
      x >= halfWidth &&
      x <= size.width - halfWidth &&
      y >= halfHeight &&
      y <= size.height - halfHeight;
    if (visible.current === fits) return;
    visible.current = fits;
    element.style.visibility = fits ? 'visible' : 'hidden';
    element.tabIndex = fits ? 0 : -1;
    element.setAttribute('aria-hidden', String(!fits));
  });

  return (
    <Html position={poi.markerPosition} center zIndexRange={[20, 0]}>
      <button
        ref={attachMarker}
        style={{ visibility: 'hidden' }}
        tabIndex={-1}
        className={`poi-marker${active ? ' active' : ''}`}
        aria-label={`Visit ${poi.name}`}
        aria-pressed={active}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <span className="marker-dot" aria-hidden="true" />
        {poi.name}
      </button>
    </Html>
  );
}
