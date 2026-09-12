import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import { CameraController } from './CameraController';
import { POIMarker } from './POIMarker';
import { SelectableObject } from './SelectableObject';

export function WorldScene({ world }: { world: HistoricalWorld }) {
  const { state, dispatch } = useApp();
  const poi = world.pois.find((poi) => poi.id === state.activePOIId);
  const view =
    state.cameraMode === 'POI' && poi ? poi.camera : world.scene.overviewCamera;
  return (
    <>
      <color attach="background" args={[world.scene.background]} />
      <ambientLight intensity={1.4} />
      <directionalLight
        position={[12, 30, 14]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-normalBias={0.05}
      />
      <CameraController view={view} initialView={world.scene.overviewCamera} />
      {world.scene.primitives.map((primitive) => {
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
      })}
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
