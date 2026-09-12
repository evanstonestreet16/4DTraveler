import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { HistoricalObject, ScenePrimitive, Vec3 } from '../../types/world';
import { generateTripoMesh, TripoError } from '../../services/tripo';

/**
 * Optional Tripo P1 visual upgrade for iconic landmarks.
 *
 * Behavior:
 *   1. On mount, kicks off a Tripo request using `object.tripoPrompt`.
 *   2. While it's generating, this component renders nothing — the
 *      primitive SelectableObject already fills the space.
 *   3. When the mesh URL arrives, we load it via `useGLTF` and place it
 *      at the primitive's position, scaled to roughly match the
 *      primitive's footprint. Pointer events are disabled so clicks
 *      pass through to the invisible primitive underneath.
 *   4. Once we notify the parent, WorldScene fades the primitive
 *      material to opacity 0 while keeping it raycastable.
 *
 * Any failure (bad key, timeout, upstream error) is caught and logged;
 * the primitive silhouette stays visible as the fallback.
 */
export function IconicUpgrade({
  object,
  primitive,
  onMeshReady,
}: {
  object: HistoricalObject;
  primitive: ScenePrimitive;
  onMeshReady: (objectId: string) => void;
}) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!object.iconic || !object.tripoPrompt) return;
    const controller = new AbortController();
    generateTripoMesh({
      prompt: object.tripoPrompt,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setModelUrl(result.modelUrl);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        const reason =
          error instanceof TripoError
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error);
        console.warn(
          `[tripo] iconic upgrade failed for "${object.id}", keeping primitive silhouette:`,
          reason,
        );
      });
    return () => controller.abort();
  }, [object.id, object.iconic, object.tripoPrompt]);

  if (!modelUrl) return null;

  return (
    <Suspense fallback={null}>
      <IconicMesh
        url={modelUrl}
        objectId={object.id}
        position={primitive.position}
        primitiveScale={primitive.scale}
        onLoaded={() => {
          if (notifiedRef.current) return;
          notifiedRef.current = true;
          onMeshReady(object.id);
        }}
      />
    </Suspense>
  );
}

function IconicMesh({
  url,
  objectId,
  position,
  primitiveScale,
  onLoaded,
}: {
  url: string;
  objectId: string;
  position: Vec3;
  primitiveScale: Vec3;
  onLoaded: () => void;
}) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Object3D };

  // Clone the loaded scene once so multiple mounts don't share transforms,
  // disable raycasting on every descendant so the invisible primitive
  // underneath catches clicks reliably, and enable shadows to match the
  // rest of the world.
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      child.raycast = () => {
        // no-op: iconic meshes never intercept clicks
      };
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Compute a uniform scale so the loaded model roughly fits the
  // primitive's bounding box. Tripo P1 meshes are normalized to a unit
  // cube-ish scale, so we multiply by the smallest primitive extent to
  // avoid overshooting.
  const fitScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const largest = Math.max(size.x, size.y, size.z, 0.0001);
    // Target size = the mean of the primitive scale so tall thin things
    // and wide flat things both land in a reasonable place.
    const targetExtent =
      (primitiveScale[0] + primitiveScale[1] + primitiveScale[2]) / 3;
    return targetExtent / largest;
  }, [cloned, primitiveScale]);

  useEffect(() => {
    onLoaded();
    // Signals that the primitive can now fade out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group
      name={`iconic-mesh:${objectId}`}
      position={position}
      scale={fitScale}
    >
      <primitive object={cloned} />
    </group>
  );
}
