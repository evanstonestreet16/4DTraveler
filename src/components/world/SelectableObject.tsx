import { useState } from 'react';
import type { HistoricalObject, ScenePrimitive } from '../../types/world';

export function SelectableObject({
  primitive,
  object,
  selected,
  onSelect,
}: {
  primitive: ScenePrimitive;
  object?: HistoricalObject;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      name={primitive.id}
      position={primitive.position}
      scale={primitive.scale}
      castShadow
      receiveShadow
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
      {primitive.shape === 'box' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : (
        <cylinderGeometry args={[0.5, 0.5, 1, 20]} />
      )}
      <meshStandardMaterial
        color={selected ? '#efb759' : primitive.color}
        emissive={selected ? '#d88617' : hovered ? '#646f50' : '#000000'}
        emissiveIntensity={selected ? 0.42 : 0.15}
        roughness={0.85}
      />
    </mesh>
  );
}
