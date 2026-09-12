import { useThree } from '@react-three/fiber';
import { shouldSuppressSceneClick } from '../../utils/fixedLook';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import type {
  HistoricalObject,
  PrimitiveShape,
  ScenePrimitive,
  Vec3,
} from '../../types/world';

/**
 * A unit-size torus whose ring lies FLAT in the X-Z plane (like a donut
 * on a table). Three.js's default `TorusGeometry` sits in the X-Y plane
 * (standing vertical, like a wheel), which is almost never what you
 * want for observation-deck rims, halos, or wheel-hubs on the ground.
 * We bake a 90-degree X rotation into the geometry so authors can just
 * scale the primitive and get a flat ring — matching the documented
 * scale convention in [src/types/world.ts](../../types/world.ts).
 */
function useHorizontalTorusGeometry(): THREE.TorusGeometry {
  return useMemo(() => {
    const g = new THREE.TorusGeometry(0.4, 0.12, 16, 32);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
}

/**
 * Return the appropriate three.js geometry element for a supported
 * primitive shape. Scale semantics per shape live in
 * [src/types/world.ts](../../types/world.ts).
 *
 * All geometries are authored at unit size so the mesh's `scale` prop is
 * the single source of truth. Segment counts are picked to look smooth
 * at miniature-diorama scale without ballooning the vertex budget.
 */
function PrimitiveGeometry({ shape }: { shape: PrimitiveShape }) {
  const torusGeometry = useHorizontalTorusGeometry();
  switch (shape) {
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 28]} />;
    case 'cone':
      return <coneGeometry args={[0.5, 1, 24]} />;
    case 'pyramid':
      // A cone with 4 radial segments is a square-base pyramid.
      return <coneGeometry args={[0.5, 1, 4]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 32, 20]} />;
    case 'torus':
      // Pre-rotated in useHorizontalTorusGeometry so scale.x/z read as
      // ring outer radius and scale.y reads as tube-diameter height.
      return <primitive object={torusGeometry} attach="geometry" />;
    default: {
      // Exhaustiveness guard — the union should be exhausted above.
      const _exhaustive: never = shape;
      void _exhaustive;
      return <boxGeometry args={[1, 1, 1]} />;
    }
  }
}

/**
 * Give painted primitives a slightly more modeled finish: cool/light
 * hues read as metal or glass, warm earth hues stay matte stone/wood.
 */
export function materialFinish(hex: string): {
  roughness: number;
  metalness: number;
} {
  const match = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return { roughness: 0.68, metalness: 0.06 };
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const average = (r + g + b) / 3;
  if (b > r + 10 && average > 140) return { roughness: 0.26, metalness: 0.42 };
  if (b > r + 8) return { roughness: 0.38, metalness: 0.28 };
  if (chroma < 22 && average > 150) return { roughness: 0.36, metalness: 0.2 };
  return { roughness: 0.68, metalness: 0.05 };
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
  const canvas = useThree((state) => state.gl.domElement);
  return (
    <mesh
      name={primitive.id}
      position={primitive.position}
      rotation={radianRotation(primitive.rotation)}
      scale={primitive.scale}
      castShadow={!hidden}
      receiveShadow={!hidden}
      onClick={(event) => {
        event.stopPropagation();
        if (!object || shouldSuppressSceneClick(canvas)) return;
        onSelect(object.id);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        setHovered(
          !!object && !(event.buttons && shouldSuppressSceneClick(canvas)),
        );
      }}
      onPointerOut={object ? () => setHovered(false) : undefined}
    >
      <PrimitiveGeometry shape={primitive.shape} />
      <meshStandardMaterial
        color={selected ? '#efb759' : primitive.color}
        emissive={selected ? '#d88617' : hovered ? '#646f50' : '#000000'}
        emissiveIntensity={selected ? 0.42 : hovered ? 0.12 : 0.04}
        {...materialFinish(primitive.color)}
        transparent={hidden}
        opacity={hidden ? 0 : 1}
        depthWrite={!hidden}
      />
    </mesh>
  );
}
