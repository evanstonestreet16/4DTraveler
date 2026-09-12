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
  const environment = world.scene.environment;
  const poi = world.pois.find((poi) => poi.id === state.activePOIId);
  const view =
    state.cameraMode === 'POI' && poi ? poi.camera : world.scene.overviewCamera;
  const primitives = world.scene.primitives.map((primitive) => {
    const object = world.objects.find(
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
      <color attach="background" args={[world.scene.background]} />
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
        castShadow={shadowMap > 0}
        shadow-mapSize={[shadowMap || 512, shadowMap || 512]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-normalBias={0.05}
      />
      <CameraController view={view} initialView={world.scene.overviewCamera} />
      {world.scene.model ? (
        <ModelScene
          key={`${world.id}:${world.scene.model.url}`}
          model={world.scene.model}
          objects={world.objects}
          selectedId={state.selectedObjectId}
          onSelect={(id) => dispatch({ type: 'object', id })}
          onAssetState={onAssetState}
          fallback={primitives}
        />
      ) : (
        primitives
      )}
      {world.pois.map((poi) => (
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
