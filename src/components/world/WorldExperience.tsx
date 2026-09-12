import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import { ObjectInfoPanel } from '../info/ObjectInfoPanel';
import { WorldCanvas } from './WorldCanvas';
import { NarrationControls } from '../audio/NarrationControls';

export default function WorldExperience({ world }: { world: HistoricalWorld }) {
  const { state, dispatch } = useApp();
  const poi = world.pois.find((poi) => poi.id === state.activePOIId);
  const selectedObject = world.objects.find(
    (object) => object.id === state.selectedObjectId,
  );
  const objects = poi
    ? world.objects.filter((object) => poi.objectIds.includes(object.id))
    : [];
  return (
    <section className="world-experience" aria-labelledby="world-heading">
      <div className="world-heading">
        <div>
          <button
            className="text-button"
            onClick={() => dispatch({ type: 'location', id: world.locationId })}
          >
            ← Choose era
          </button>
          <h1 id="world-heading">
            {world.locationName} <span>/ {world.era.label}</span>
          </h1>
        </div>
        <p className="muted">
          {world.era.subtitle}
          <br />A moment to explore
        </p>
      </div>
      <div className="world-layout">
        <div className="scene-column">
          <div className="scene-toolbar">
            <span className="eyebrow" role="status">
              {poi ? `Exploring ${poi.name}` : 'Bird’s-eye overview'}
            </span>
            <button
              className="small-button"
              disabled={state.cameraMode === 'OVERVIEW'}
              onClick={() => dispatch({ type: 'overview' })}
            >
              Return to overview
            </button>
          </div>
          <WorldCanvas world={world} />
          <div className="scene-caption">
            <span>
              <span className="gold-dot" />
              Selected objects turn gold
            </span>
            <span>Click a marker to travel</span>
          </div>
        </div>
        <aside className="explorer-panel" aria-label="Explore this world">
          <p className="eyebrow">Places in this world</p>
          <nav className="poi-list" aria-label="Points of interest">
            {world.pois.map((item, index) => (
              <button
                key={item.id}
                aria-pressed={item.id === state.activePOIId}
                onClick={() => dispatch({ type: 'poi', id: item.id })}
              >
                <span className="poi-number">0{index + 1}</span>
                {item.name}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </nav>
          {poi ? (
            <section
              className="object-list"
              aria-label={`Objects at ${poi.name}`}
            >
              <p className="eyebrow">Inspect an object</p>
              <div>
                {objects.map((object) => (
                  <button
                    key={object.id}
                    aria-pressed={object.id === state.selectedObjectId}
                    onClick={() => dispatch({ type: 'object', id: object.id })}
                  >
                    {object.name}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="explore-hint">
              <h2>Look a little closer.</h2>
              <p>
                Choose a place to move into the scene. Select an object to
                uncover its story.
              </p>
            </div>
          )}
          {selectedObject && (
            <ObjectInfoPanel
              object={selectedObject}
              onClose={() => dispatch({ type: 'object', id: null })}
            />
          )}
        </aside>
      </div>
      <NarrationControls
        src={world.scene.narrationAudio}
        transcript={world.scene.narrationTranscript}
      />
    </section>
  );
}
