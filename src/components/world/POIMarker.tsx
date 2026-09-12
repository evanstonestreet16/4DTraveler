import { Html } from '@react-three/drei';
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
  return (
    <Html position={poi.markerPosition} center zIndexRange={[20, 0]}>
      <button
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
