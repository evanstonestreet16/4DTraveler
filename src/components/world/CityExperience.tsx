import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import type { HistoricalWorld } from '../../types/world';
import { RenderedOverviewViewer } from './RenderedOverviewViewer';
import { WorldViewport } from './WorldViewport';

/** Overview-only city presentation. POIs are selectable without opening a detail render. */
export function CityExperience({ world }: { world: HistoricalWorld }) {
  const { dispatch } = useApp();
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null);
  const [compactPortrait, setCompactPortrait] = useState(
    () => matchMedia('(max-width: 700px) and (orientation: portrait)').matches,
  );
  const container = useRef<HTMLElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const selectedPOI = world.pois.find((poi) => poi.id === selectedPOIId);

  useEffect(() => {
    const media = matchMedia('(max-width: 700px) and (orientation: portrait)');
    const update = () => setCompactPortrait(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    returnButton.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <section
      ref={container}
      className="world-experience city-experience"
      data-city-mode="overview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-heading"
    >
      <WorldViewport>
        <RenderedOverviewViewer
          world={world}
          selectedPOIId={selectedPOIId}
          onSelectPOI={setSelectedPOIId}
        />
      </WorldViewport>
      <header className="city-heading">
        <div>
          <p className="eyebrow">4DTraveler · {world.era.label}</p>
          <h1 id="world-heading">{world.locationName}</h1>
          <p className="city-location" role="status">
            Bird’s-eye overview
          </p>
        </div>
        <nav className="city-navigation" aria-label="World navigation">
          <button
            ref={returnButton}
            className="small-button"
            onClick={() => dispatch({ type: 'location', id: world.locationId })}
          >
            Choose era
          </button>
        </nav>
      </header>
      <aside className="city-explorer" aria-label="Explore this world">
        <details className="city-places" open={!compactPortrait}>
          <summary>Places in this world</summary>
          <nav className="poi-list" aria-label="Points of interest">
            {world.pois.map((poi, index) => (
              <button
                key={poi.id}
                aria-pressed={poi.id === selectedPOIId}
                onClick={() => setSelectedPOIId(poi.id)}
              >
                <span className="poi-number">0{index + 1}</span>
                {poi.name}
                <span aria-hidden="true">●</span>
              </button>
            ))}
          </nav>
        </details>
        <div className="overview-selection" aria-live="polite">
          {selectedPOI ? (
            <>
              <p className="eyebrow">Selected place</p>
              <strong>{selectedPOI.name}</strong>
              <p>Detailed POI view will be added in the next visual pass.</p>
            </>
          ) : (
            <p>Choose a marker or place name to preview a point of interest.</p>
          )}
        </div>
      </aside>
    </section>
  );
}
