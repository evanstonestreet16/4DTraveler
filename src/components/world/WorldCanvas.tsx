import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { HistoricalWorld } from '../../types/world';
import { WorldScene } from './WorldScene';
import { SceneErrorBoundary } from './SceneErrorBoundary';

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
  return (
    <div className="world-canvas" aria-label="Interactive historical world">
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
            <WorldScene world={world} />
          </Canvas>
        )}
      </SceneErrorBoundary>
    </div>
  );
}
