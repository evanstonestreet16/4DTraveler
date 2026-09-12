import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import type { QualityPreference } from '../../utils/quality';
import { ObjectInfoPanel } from '../info/ObjectInfoPanel';
import { WorldCanvas } from './WorldCanvas';
import { RenderedCityViewer } from './RenderedCityViewer';
import { WorldViewport } from './WorldViewport';
import { OverviewTimeSlider } from '../timeline/OverviewTimeSlider';

/** City presentations keep the canvas at viewport size while controls float above it. */
export function CityExperience({ world }: { world: HistoricalWorld }) {
  const { state, dispatch } = useApp();
  const transitioning = !!state.eraTransition;
  const [quality, setQuality] = useState<QualityPreference>('auto');
  const container = useRef<HTMLElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const poi = world.pois.find((item) => item.id === state.activePOIId);
  const selectedObject = world.objects.find(
    (object) => object.id === state.selectedObjectId,
  );
  const presentation = poi?.immersive ?? world.scene;
  const closeObject = useCallback(() => {
    if (selectedObject)
      container.current
        ?.querySelector<HTMLButtonElement>(
          `[data-city-object="${CSS.escape(selectedObject.id)}"]`,
        )
        ?.focus({ preventScroll: true });
    dispatch({ type: 'object', id: null });
  }, [dispatch, selectedObject]);
  const objects = world.objects.filter((object) =>
    poi?.objectIds.includes(object.id),
  );

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const backgrounds: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = element;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          backgrounds.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    document.body.style.overflow = 'hidden';
    returnButton.current?.focus({ preventScroll: true });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = [
        ...element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select, input:not(:disabled), a[href], summary, [tabindex="0"]',
        ),
      ].filter(
        (control) =>
          control.tabIndex >= 0 &&
          control.getClientRects().length &&
          !control.closest('[inert]'),
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element.addEventListener('keydown', trapFocus);
    return () => {
      element.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = previousOverflow;
      for (const background of backgrounds)
        background.element.inert = background.inert;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (poi)
      container.current
        ?.querySelector('canvas')
        ?.focus({ preventScroll: true });
    else returnButton.current?.focus({ preventScroll: true });
  }, [poi]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (transitioning) return;
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (document.pointerLockElement) document.exitPointerLock();
      else if (selectedObject) closeObject();
      else if (poi) dispatch({ type: 'overview' });
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [closeObject, dispatch, poi, selectedObject, transitioning]);

  return (
    <section
      ref={container}
      className="world-experience city-experience"
      data-city-mode={poi ? 'pov' : 'overview'}
      data-era-transition={transitioning}
      data-world-id={world.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-heading"
    >
      <WorldViewport layout="city" informationOpen={!!selectedObject}>
        {(poi ? presentation.panorama : presentation.overviewImage) ? (
          <RenderedCityViewer world={world} quality={quality} />
        ) : (
          <WorldCanvas world={world} quality={quality} />
        )}
      </WorldViewport>
      <header className="city-heading">
        <div>
          <p className="eyebrow">4DTraveler · {world.era.label}</p>
          <h1 id="world-heading">{world.locationName}</h1>
          <p className="city-location" role="status">
            {poi ? poi.name : 'Bird’s-eye overview'}
          </p>
        </div>
        <nav className="city-navigation" aria-label="World navigation">
          {poi ? (
            <button
              className="small-button"
              onClick={() => dispatch({ type: 'overview' })}
            >
              ← Return to overview
            </button>
          ) : (
            <button
              className="small-button"
              onClick={() =>
                dispatch({
                  type: 'mode',
                  mode: state.mode === 'globe' ? 'globe' : 'catalog',
                })
              }
            >
              ← Back to globe
            </button>
          )}
          <button
            ref={returnButton}
            className="small-button"
            onClick={() => dispatch({ type: 'location', id: world.locationId })}
          >
            Choose era
          </button>
        </nav>
      </header>
      {world.pois.length > 0 && (
        <aside
          className="city-explorer"
          aria-label="Explore this world"
          inert={transitioning}
        >
          <details
            key={poi?.id ?? 'overview'}
            className="city-places"
            open={!poi}
          >
            <summary>Places in this world</summary>
            <nav className="poi-list" aria-label="Points of interest">
              {world.pois.map((item, index) => (
                <button
                  key={item.id}
                  disabled={item.preview || !item.immersive}
                  aria-pressed={item.id === poi?.id}
                  onClick={() => dispatch({ type: 'poi', id: item.id })}
                >
                  <span className="poi-number">0{index + 1}</span>
                  {item.name}
                  <span>
                    {item.preview || !item.immersive ? 'Preview' : '↗'}
                  </span>
                </button>
              ))}
            </nav>
          </details>
          {poi && (
            <details className="city-objects" open>
              <summary>Inspect an object</summary>
              <section
                className="object-list"
                aria-label={`Objects at ${poi.name}`}
              >
                <div>
                  {objects.map((object) => (
                    <button
                      key={object.id}
                      data-city-object={object.id}
                      aria-pressed={object.id === selectedObject?.id}
                      onClick={() =>
                        dispatch({ type: 'object', id: object.id })
                      }
                    >
                      {object.name}
                    </button>
                  ))}
                </div>
              </section>
            </details>
          )}
          <details className="city-help">
            <summary>View controls</summary>
            <p>
              {poi
                ? 'Drag to look around. On a keyboard, focus the scene and use the arrow keys. Select a highlighted object or use the object list.'
                : world.pois.every((item) => item.preview || !item.immersive)
                  ? 'These places are overview previews. Use the timeline to travel to another era.'
                  : 'Choose a marker or a place from the list to enter a fixed viewpoint.'}
            </p>
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
          </details>
        </aside>
      )}
      {poi && <div className="city-look-hint">Drag to look around · 360°</div>}
      {selectedObject && (
        <div className="city-information">
          <ObjectInfoPanel
            object={selectedObject}
            cityName={world.locationName}
            year={world.era.year}
            onClose={closeObject}
          />
        </div>
      )}
      {!poi && world.scene.overviewTransition ? (
        <div className="city-overview-footer">
          <p className="city-overview-caption">
            {world.scene.overviewImage?.description ??
              `${world.era.label} · Illustrated reconstruction`}
          </p>
          <OverviewTimeSlider world={world} />
          <details
            key={world.id}
            className="city-overview-story"
            inert={transitioning}
            style={{ visibility: transitioning ? 'hidden' : undefined }}
          >
            <summary>Read narration transcript</summary>
            <p>{presentation.narrationTranscript}</p>
          </details>
        </div>
      ) : presentation.narrationTranscript ? (
        <div className="city-narration" key={world.id}>
          <details className="transcript">
            <summary>Read narration transcript</summary>
            <p>{presentation.narrationTranscript}</p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
