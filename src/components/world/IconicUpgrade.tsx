import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { HistoricalObject, ScenePrimitive, Vec3 } from '../../types/world';
import { generateTripoMesh, TripoError } from '../../services/tripo';

export type TripoStatusPhase = 'queued' | 'running' | 'success' | 'failed';

export interface TripoStatus {
  objectId: string;
  name: string;
  phase: TripoStatusPhase;
  /** Tripo-reported percent (0–100). */
  progress: number;
}

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
  onStatusChange,
}: {
  object: HistoricalObject;
  primitive: ScenePrimitive;
  onMeshReady: (objectId: string) => void;
  /**
   * Optional hook for a global loading UI outside the 3D canvas. Fires
   * every time the request phase or progress changes.
   */
  onStatusChange?: (status: TripoStatus) => void;
}) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    status: string;
    percent: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const notifiedRef = useRef(false);
  // Keep the latest onStatusChange in a ref so callback identity doesn't
  // re-trigger the whole Tripo request every parent render.
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;

  useEffect(() => {
    if (!object.iconic || !object.tripoPrompt) return;
    const controller = new AbortController();
    console.info(`[tripo] requesting iconic mesh for "${object.id}"`);
    const emit = (phase: TripoStatusPhase, percent: number) => {
      statusRef.current?.({
        objectId: object.id,
        name: object.name,
        phase,
        progress: percent,
      });
    };
    setProgress({ status: 'queued', percent: 0 });
    emit('queued', 0);
    generateTripoMesh({
      prompt: object.tripoPrompt,
      signal: controller.signal,
      onProgress: (update) => {
        if (controller.signal.aborted) return;
        setProgress({ status: update.status, percent: update.progress });
        emit('running', update.progress);
      },
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        console.info(
          `[tripo] mesh ready for "${object.id}" (task ${result.taskId})`,
        );
        setModelUrl(result.modelUrl);
        emit('success', 100);
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
        setFailed(true);
        setProgress(null);
        emit('failed', 0);
      });
    return () => controller.abort();
  }, [object.id, object.name, object.iconic, object.tripoPrompt]);

  // While the mesh is being generated, float a small label above the
  // primitive so the user sees the progress instead of an unchanged
  // silhouette.
  const labelPosition: Vec3 = [
    primitive.position[0],
    primitive.position[1] + primitive.scale[1] / 2 + 1.5,
    primitive.position[2],
  ];

  if (!modelUrl) {
    if (failed || !progress) return null;
    return (
      <Html
        position={labelPosition}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            background: 'rgba(0, 0, 0, 0.65)',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            fontSize: 11,
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Generating {object.name}…
          <div style={{ opacity: 0.7, fontSize: 10 }}>
            {progress.status} {progress.percent}%
          </div>
        </div>
      </Html>
    );
  }

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
