import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { globeCities, type GlobeCity } from './cities';
import { latLonToVec3 } from './latLon';

const GLOBE_RADIUS = 1.5;
const MARKER_LIFT = 0.06;

interface GlobeCanvasProps {
  onSelectCity: (city: GlobeCity) => void;
  disabled?: boolean;
}

/**
 * Stylized R3F globe. No textures — we render a matte sphere with a low-
 * opacity wireframe shell for readability, then attach clickable markers
 * at each city's lat/lon. Deliberately abstract to fit the "miniature
 * diorama" art direction of the generated worlds.
 */
export function GlobeCanvas({ onSelectCity, disabled }: GlobeCanvasProps) {
  return (
    <Canvas
      className="globe-canvas"
      camera={{ position: [0, 1.2, 4.6], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#111a24']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 4, 6]} intensity={1.4} color="#f4e4c4" />
      <directionalLight
        position={[-6, -3, -4]}
        intensity={0.5}
        color="#5a8ab4"
      />
      <GlobeMesh />
      <Wireframe />
      {globeCities.map((city) => (
        <CityMarker
          key={city.id}
          city={city}
          onSelect={onSelectCity}
          disabled={disabled}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.35}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}

function GlobeMesh() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial
        color="#1c2a3a"
        roughness={0.9}
        metalness={0.1}
        emissive="#0a1220"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

function Wireframe() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.002, 24, 16]} />
      <meshBasicMaterial
        color="#5a8ab4"
        wireframe
        transparent
        opacity={0.16}
        depthWrite={false}
      />
    </mesh>
  );
}

interface CityMarkerProps {
  city: GlobeCity;
  onSelect: (city: GlobeCity) => void;
  disabled?: boolean;
}

function CityMarker({ city, onSelect, disabled }: CityMarkerProps) {
  const [x, y, z] = useMemo(
    () =>
      latLonToVec3(city.latitude, city.longitude, GLOBE_RADIUS + MARKER_LIFT),
    [city.latitude, city.longitude],
  );
  const anchor = useMemo(
    () => latLonToVec3(city.latitude, city.longitude, GLOBE_RADIUS),
    [city.latitude, city.longitude],
  );
  const postMidpoint = useMemo<[number, number, number]>(
    () => [(x + anchor[0]) / 2, (y + anchor[1]) / 2, (z + anchor[2]) / 2],
    [x, y, z, anchor],
  );
  const postRotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(x, y, z)
      .sub(new THREE.Vector3(anchor[0], anchor[1], anchor[2]))
      .normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as const;
  }, [x, y, z, anchor]);
  return (
    <group>
      <mesh position={postMidpoint} rotation={postRotation}>
        <cylinderGeometry args={[0.007, 0.007, MARKER_LIFT, 8]} />
        <meshBasicMaterial color="#f4c66a" />
      </mesh>
      <mesh
        position={[x, y, z]}
        onClick={(event) => {
          if (disabled) return;
          event.stopPropagation();
          onSelect(city);
        }}
        onPointerOver={(event) => {
          if (disabled) return;
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial
          color="#f4c66a"
          emissive="#f4c66a"
          emissiveIntensity={disabled ? 0.4 : 1.1}
          toneMapped={false}
        />
      </mesh>
      <Html
        position={[x, y + 0.12, z]}
        center
        distanceFactor={4.4}
        occlude
        style={{ pointerEvents: 'none' }}
      >
        <div className="globe-city-label">{city.name}</div>
      </Html>
    </group>
  );
}
