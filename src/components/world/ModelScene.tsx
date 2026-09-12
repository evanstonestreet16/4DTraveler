import { useEffect, useState, type ReactNode } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import type { HistoricalObject, SceneModel } from '../../types/world';
import { shouldSuppressSceneClick } from '../../utils/fixedLook';
import {
  loadModelAsset,
  resolveModelObject,
  updateModelHighlights,
  type LoadedModelAsset,
  type ModelAssetState,
} from './modelAsset';

export function ModelScene({
  model,
  objects,
  selectedId,
  onSelect,
  onAssetState,
  fallback,
}: {
  model: SceneModel;
  objects: HistoricalObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAssetState: (state: ModelAssetState) => void;
  fallback: ReactNode;
}) {
  const [loaded, setLoaded] = useState<LoadedModelAsset | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    setLoaded(null);
    setHoveredId(null);
    const controller = new AbortController();
    let active = true;
    let asset: LoadedModelAsset | undefined;
    const loadingLabel = model.loadingLabel ?? 'Loading detailed world';
    const reportProgress = (progress?: number) => {
      if (active)
        onAssetState({ status: 'loading', message: loadingLabel, progress });
    };
    reportProgress();
    const timeout = window.setTimeout(
      () => controller.abort(new Error('Model loading timed out.')),
      20000,
    );
    loadModelAsset(model, objects, controller.signal, reportProgress)
      .then((result) => {
        asset = result;
        if (!active) {
          result.dispose();
          return;
        }
        setLoaded(result);
        onAssetState({ status: 'ready', message: 'Detailed world loaded' });
        invalidate();
      })
      .catch((error: unknown) => {
        if (!active) return;
        const reason =
          error instanceof Error ? error.message : 'The model could not load.';
        onAssetState({
          status: 'fallback',
          message: `${model.fallbackLabel ?? 'Detailed world unavailable. Showing the simplified world.'} ${reason}`,
        });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
      asset?.dispose();
    };
  }, [model, objects, onAssetState, invalidate]);
  useEffect(() => {
    if (loaded) updateModelHighlights(loaded.highlights, selectedId, hoveredId);
    invalidate();
  }, [loaded, selectedId, hoveredId, invalidate]);
  if (!loaded) return fallback;
  const handlePointer = (event: ThreeEvent<PointerEvent>) => {
    if (shouldSuppressSceneClick(canvas)) return;
    const object = resolveModelObject(event.object, loaded.selection);
    if (object) {
      event.stopPropagation();
      setHoveredId(object.id);
    }
  };
  return (
    <group
      position={model.position}
      rotation={model.rotation}
      scale={model.scale}
    >
      <primitive
        object={loaded.scene}
        dispose={null}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          const object = resolveModelObject(event.object, loaded.selection);
          if (object) {
            event.stopPropagation();
            if (shouldSuppressSceneClick(canvas)) return;
            onSelect(object.id);
          }
        }}
        onPointerOver={handlePointer}
        onPointerOut={() => setHoveredId(null)}
      />
    </group>
  );
}
