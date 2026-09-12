import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type {
  HistoricalObject,
  PanoramaHotspot,
  Vec3,
} from '../../types/world';
import { shouldSuppressSceneClick } from '../../utils/fixedLook';
import { hotspotPosition } from '../../utils/panorama';
import './PanoramaHotspots.css';

function Hotspot({
  hotspot,
  object,
  index,
  selected,
  cameraPosition,
  onSelect,
}: {
  hotspot: PanoramaHotspot;
  object: HistoricalObject;
  index: number;
  selected: boolean;
  cameraPosition: Vec3;
  onSelect: (id: string) => void;
}) {
  const position = useMemo(
    () => hotspotPosition(hotspot, cameraPosition),
    [hotspot, cameraPosition],
  );
  const button = useRef<HTMLButtonElement | null>(null);
  const projected = useRef(new Vector3());
  const visible = useRef<boolean | null>(null);
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const attach = useCallback(
    (element: HTMLButtonElement | null) => {
      button.current = element;
      visible.current = null;
      invalidate();
    },
    [invalidate],
  );

  useFrame(({ camera, size }) => {
    const element = button.current;
    if (!element) return;
    const point = projected.current.set(...position).project(camera);
    const x = ((point.x + 1) * size.width) / 2;
    const y = ((1 - point.y) * size.height) / 2;
    const margin = 26;
    const fits =
      point.z >= -1 &&
      point.z <= 1 &&
      x >= margin &&
      x <= size.width - margin &&
      y >= margin &&
      y <= size.height - margin;
    if (visible.current === fits) return;
    visible.current = fits;
    element.style.visibility = fits ? 'visible' : 'hidden';
    element.tabIndex = fits ? 0 : -1;
    element.setAttribute('aria-hidden', String(!fits));
  });

  return (
    <Html position={position} center zIndexRange={[20, 0]}>
      <button
        ref={attach}
        type="button"
        className="panorama-hotspot"
        style={{ visibility: 'hidden' }}
        tabIndex={-1}
        data-panorama-hotspot={object.id}
        aria-label={`Inspect ${object.name}`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          // Keyboard activation is independent of the last look gesture.
          if (event.detail > 0 && shouldSuppressSceneClick(canvas)) return;
          onSelect(object.id);
        }}
      >
        <span aria-hidden="true">{index + 1}</span>
        <span className="panorama-hotspot-label" aria-hidden="true">
          {object.name}
        </span>
      </button>
    </Html>
  );
}

/** Only objects in the active presentation can be reached by a hotspot. */
export function PanoramaHotspots({
  hotspots,
  objects,
  selectedId,
  onSelect,
  cameraPosition,
}: {
  hotspots: PanoramaHotspot[];
  objects: HistoricalObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  cameraPosition: Vec3;
}) {
  return hotspots.map((hotspot, index) => {
    const object = objects.find((item) => item.id === hotspot.objectId);
    return object ? (
      <Hotspot
        key={hotspot.objectId}
        hotspot={hotspot}
        object={object}
        index={index}
        selected={selectedId === object.id}
        cameraPosition={cameraPosition}
        onSelect={onSelect}
      />
    ) : null;
  });
}
