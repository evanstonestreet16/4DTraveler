import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { HistoricalWorld } from '../../types/world';
import { WorldScene } from './WorldScene';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { useSceneActivity } from './useSceneActivity';
import type { ModelAssetState } from './modelAsset';

function ContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    return () => canvas.removeEventListener('webglcontextlost', handleLost);
  }, [gl, onLost]);
  return null;
}

export function WorldCanvas({ world }: { world: HistoricalWorld }) {
  const [lost, setLost] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const active = useSceneActivity(container);
  const [assetState, setAssetState] = useState<ModelAssetState | null>(null);
  return (
    <div
      ref={container}
      className="world-canvas"
      aria-label="Interactive historical world"
      data-environment-motion={active ? 'active' : 'paused'}
    >
      <SceneErrorBoundary>
        {lost ? (
          <div className="scene-fallback" role="alert">
            <h2>The 3D scene was interrupted.</h2>
            <p>Your browser lost its graphics context.</p>
            <button className="primary-button" onClick={() => setLost(false)}>
              Reload scene
            </button>
          </div>
        ) : (
          <Canvas
            shadows
            frameloop="demand"
            dpr={[1, 1.75]}
            camera={{
              position: world.scene.overviewCamera.position,
              fov: 48,
              near: 0.1,
              far: 400,
            }}
            onCreated={({ camera, gl }) => {
              gl.toneMappingExposure = world.scene.environment?.exposure ?? 1;
              camera.lookAt(...world.scene.overviewCamera.target);
              gl.domElement.setAttribute('role', 'img');
              gl.domElement.setAttribute(
                'aria-label',
                '3D historical scene. Use the adjacent POI and object buttons for keyboard exploration.',
              );
            }}
            fallback={
              <div className="scene-fallback" role="alert">
                3D rendering is unavailable. Enable WebGL or try another
                browser. You can still explore the object list.
              </div>
            }
          >
            <ContextGuard onLost={() => setLost(true)} />
            <WorldScene
              world={world}
              onAssetState={setAssetState}
              animated={active}
              effectsReady={
                !world.scene.model || assetState?.status === 'ready'
              }
            />
          </Canvas>
        )}
      </SceneErrorBoundary>
      {!lost && world.scene.model && assetState && (
        <div
          className={`model-status model-status-${assetState.status}`}
          role="status"
          aria-live="polite"
          data-model-status={assetState.status}
        >
          {assetState.message}
          {assetState.status === 'loading' && assetState.progress !== undefined
            ? ` (${assetState.progress}%)`
            : ''}
        </div>
      )}
    </div>
  );
}
