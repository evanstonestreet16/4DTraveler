import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Object3D, ShaderMaterial } from 'three';
import type { WorldEnvironment } from '../../types/world';

const waterVertex = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const waterFragment = `
uniform float time;
varying vec2 vUv;
void main() {
  float ripple = sin(vUv.x * 210.0 + sin(vUv.y * 90.0 + time * .25) * 2.0 + time * .5);
  float glint = pow(max(0.0, ripple), 18.0) * .20;
  gl_FragColor = vec4(vec3(.46, .58, .56) + glint, .16 + glint * .35);
}
`;

/** Bounded decorative effects; no hit targets and no per-frame React updates. */
export function EnvironmentEffects({
  environment,
  animated,
  detail = true,
}: {
  environment: WorldEnvironment;
  animated: boolean;
  detail?: boolean;
}) {
  const smoke = useRef<InstancedMesh>(null);
  const clock = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const dummy = useMemo(() => new Object3D(), []);
  const sources = environment.smokeSources ?? [];
  const count = detail ? sources.length * 8 : 0;
  const waterMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => waterMaterial.dispose(), [waterMaterial]);
  useEffect(() => {
    invalidate();
  }, [animated, detail, invalidate]);
  useFrame((_, delta) => {
    if (animated) clock.current += Math.min(delta, 0.05);
    waterMaterial.uniforms.time.value = clock.current;
    if (smoke.current) {
      sources.forEach((source, index) => {
        for (let particle = 0; particle < 8; particle++) {
          const phase = (particle / 8 + clock.current * 0.035) % 1;
          dummy.position.set(
            source[0] + phase * 3.3,
            source[1] + phase * 5.5,
            source[2] - phase * 0.7,
          );
          dummy.scale.setScalar(
            (0.24 + phase * 0.9) * Math.sin(Math.PI * phase),
          );
          dummy.updateMatrix();
          smoke.current?.setMatrixAt(index * 8 + particle, dummy.matrix);
        }
      });
      smoke.current.instanceMatrix.needsUpdate = true;
    }
    if (animated) invalidate();
  });
  return (
    <group name="environment-effects">
      {count > 0 && (
        <instancedMesh
          ref={smoke}
          args={[undefined, undefined, count]}
          frustumCulled={false}
          raycast={() => {}}
        >
          <sphereGeometry args={[1, 7, 5]} />
          <meshStandardMaterial
            color="#989389"
            transparent
            opacity={0.13}
            depthWrite={false}
            roughness={1}
          />
        </instancedMesh>
      )}
      {environment.water && detail && (
        <mesh
          position={environment.water.position}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => {}}
        >
          <planeGeometry args={environment.water.size} />
          <primitive object={waterMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
