import { useState } from 'react';
import type { QualityPreference } from '../../utils/quality';
import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import { ObjectInfoPanel } from '../info/ObjectInfoPanel';
import { WorldCanvas } from './WorldCanvas';
import { NarrationControls } from '../audio/NarrationControls';
import { useImmersiveView } from './useImmersiveView';
import { WorldViewport } from './WorldViewport';
import { CityExperience } from './CityExperience';

export default function WorldExperience({ world }: { world: HistoricalWorld }) {
  return world.scene.presentation === 'immersive-city' ? (
    <CityExperience world={world} />
  ) : (
    <LegacyWorldExperience world={world} />
  );
}

function LegacyWorldExperience({ world }: { world: HistoricalWorld }) {
  const { state, dispatch } = useApp();
  const [quality, setQuality] = useState<QualityPreference>('auto');
  const view = useImmersiveView();
  const poi = world.pois.find((poi) => poi.id === state.activePOIId);
  const selectedObject = world.objects.find(
    (object) => object.id === state.selectedObjectId,
  );
  const objects = poi
    ? world.objects.filter((object) => poi.objectIds.includes(object.id))
    : [];
  return (
    <section
      ref={view.containerRef}
      className={`world-experience${view.immersive ? ' is-immersive' : ''}`}
      role={view.immersive ? 'dialog' : undefined}
      aria-modal={view.immersive ? true : undefined}
      aria-labelledby="world-heading"
    >
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
        <div className="world-heading-actions">
          <p className="muted">
            {world.era.subtitle}
            <br />A moment to explore
          </p>
          <button
            ref={view.toggleRef}
            className="small-button immersive-toggle"
            aria-pressed={view.immersive}
            onClick={view.toggle}
          >
            {view.immersive ? 'Exit immersive view' : 'Enter immersive view'}
          </button>
        </div>
      </div>
      <div className="world-layout">
        <div className="scene-column">
          <div className="scene-toolbar">
            <label className="quality-control">
              Scene quality
              <select
                value={quality}
                onChange={(event) =>
                  setQuality(event.target.value as QualityPreference)
                }
              >
                <option value="auto">Auto</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
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
          <WorldViewport
            layout={view.immersive ? 'immersive' : 'standard'}
            informationOpen={!!selectedObject}
          >
            <WorldCanvas world={world} quality={quality} />
          </WorldViewport>
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
      <p className="sr-only" role="status" aria-live="polite">
        {view.announcement}
      </p>
    </section>
  );
}
