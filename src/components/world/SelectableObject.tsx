import { useState } from 'react';
import * as THREE from 'three';
import type {
  HistoricalObject,
  PrimitiveShape,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

/**
 * Return the appropriate three.js geometry element for a supported
 * primitive shape. Scale semantics per shape live in
 * [src/types/world.ts](../../types/world.ts).
 *
 * All geometries are authored at unit size so the mesh's `scale` prop is
 * the single source of truth. Segment counts are picked to look smooth
 * at miniature-diorama scale without ballooning the vertex budget.
 */
function primitiveGeometry(shape: PrimitiveShape) {
  switch (shape) {
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 20]} />;
    case 'cone':
      return <coneGeometry args={[0.5, 1, 20]} />;
    case 'pyramid':
      // A cone with 4 radial segments is a square-base pyramid.
      return <coneGeometry args={[0.5, 1, 4]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 24, 16]} />;
    case 'torus':
      // Radial and tubular ratios chosen so scale.x reads as the ring
      // outer radius and scale.y as the tube thickness (see world.ts).
      return <torusGeometry args={[0.4, 0.12, 12, 24]} />;
    default: {
      // Exhaustiveness guard — the union should be exhausted above.
      const _exhaustive: never = shape;
      void _exhaustive;
      return <boxGeometry args={[1, 1, 1]} />;
    }
  }
}

/** Convert an optional degree tuple to a three.js radian tuple. */
function radianRotation(degrees: Vec3 | undefined): Vec3 {
  if (!degrees) return [0, 0, 0];
  return [
    THREE.MathUtils.degToRad(degrees[0]),
    THREE.MathUtils.degToRad(degrees[1]),
    THREE.MathUtils.degToRad(degrees[2]),
  ];
}

export function SelectableObject({
  primitive,
  object,
  selected,
  onSelect,
  hidden = false,
}: {
  primitive: ScenePrimitive;
  object?: HistoricalObject;
  selected: boolean;
  onSelect: (id: string) => void;
  /**
   * When true, the primitive material fades to opacity 0. The mesh is
   * still rendered (and still raycasts) so click-to-select keeps working
   * even after an iconic Tripo mesh has been layered on top.
   */
  hidden?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      name={primitive.id}
      position={primitive.position}
      rotation={radianRotation(primitive.rotation)}
      scale={primitive.scale}
      castShadow={!hidden}
      receiveShadow={!hidden}
      onClick={
        object
          ? (event) => {
              event.stopPropagation();
              onSelect(object.id);
            }
          : undefined
      }
      onPointerOver={
        object
          ? (event) => {
              event.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={object ? () => setHovered(false) : undefined}
    >
      {primitiveGeometry(primitive.shape)}
      <meshStandardMaterial
        color={selected ? '#efb759' : primitive.color}
        emissive={selected ? '#d88617' : hovered ? '#646f50' : '#000000'}
        emissiveIntensity={selected ? 0.42 : 0.15}
        roughness={0.85}
        transparent={hidden}
        opacity={hidden ? 0 : 1}
        depthWrite={!hidden}
      />
    </mesh>
  );
}
