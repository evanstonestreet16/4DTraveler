import { useMemo } from 'react';
import { resolvePresentation } from '../../utils/presentation';
import { EnvironmentEffects } from './EnvironmentEffects';
import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import { CameraController } from './CameraController';
import { POIMarker } from './POIMarker';
import { SelectableObject } from './SelectableObject';
import { ModelScene } from './ModelScene';
import type { ModelAssetState } from './modelAsset';

export function WorldScene({
  world,
  onAssetState,
  animated = false,
  effectsReady = false,
  shadowMap = 1024,
  detail = true,
}: {
  world: HistoricalWorld;
  onAssetState: (state: ModelAssetState) => void;
  animated?: boolean;
  effectsReady?: boolean;
  shadowMap?: number;
  detail?: boolean;
}) {
  const { state, dispatch } = useApp();
  const presentation = useMemo(
    () => resolvePresentation(world, state.cameraMode, state.activePOIId),
    [world, state.cameraMode, state.activePOIId],
  );
  const { scene, camera: view, look, objects, showMarkers } = presentation;
  const city = world.scene.presentation === 'immersive-city';
  const environment = scene.environment;
  const shadowExtent = city ? (look ? 100 : 1600) : 25;
  const primitives = scene.primitives.map((primitive) => {
    const object = objects.find(
      (object) => object.sceneObjectId === primitive.id,
    );
    return (
      <SelectableObject
        key={primitive.id}
        primitive={primitive}
        object={object}
        selected={!!object && state.selectedObjectId === object.id}
        onSelect={(id) => dispatch({ type: 'object', id })}
      />
    );
  });
  return (
    <>
      <color attach="background" args={[scene.background]} />
      <ambientLight intensity={environment?.ambientIntensity ?? 1.4} />
      {environment && (
        <>
          <hemisphereLight
            args={[environment.skyColor, environment.groundColor, 0.8]}
          />
          <fog
            attach="fog"
            args={[
              environment.fog.color,
              environment.fog.near,
              environment.fog.far,
            ]}
          />
          {effectsReady && (
            <EnvironmentEffects
              environment={environment}
              animated={animated}
              detail={detail}
            />
          )}
        </>
      )}
      <directionalLight
        key={shadowMap}
        position={environment?.keyLight.position ?? [12, 30, 14]}
        color={environment?.keyLight.color ?? '#ffffff'}
        intensity={environment?.keyLight.intensity ?? 2.2}
        castShadow={shadowMap > 0 && (!city || !!look)}
        shadow-mapSize={[shadowMap || 512, shadowMap || 512]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={city ? 4000 : 500}
        shadow-normalBias={0.05}
      />
      <CameraController
        view={view}
        initialView={world.scene.overviewCamera}
        fixedLook={look}
        staticView={city}
      />
      {scene.model ? (
        <ModelScene
          key={`${world.id}:${scene.model.url}`}
          model={scene.model}
          objects={objects}
          selectedId={state.selectedObjectId}
          onSelect={(id) => dispatch({ type: 'object', id })}
          onAssetState={onAssetState}
          fallback={primitives}
        />
      ) : (
        primitives
      )}
      {showMarkers &&
        world.pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            active={poi.id === state.activePOIId}
            onSelect={() => dispatch({ type: 'poi', id: poi.id })}
          />
        ))}
    </>
  );
}
