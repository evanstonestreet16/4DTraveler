import { lazy, Suspense, useEffect, useState } from 'react';
import { locations } from '../../data/locations';
import { GlobeLogo } from './globe/GlobeLogo';
import { useApp } from '../../app/AppContext';

// Deferred: react-globe.gl/three-globe are heavy, and the logo intro gives them time to load in the background.
const GlobeView = lazy(() =>
  import('./globe/GlobeView').then((module) => ({ default: module.GlobeView })),
);

const INTRO_KEY = '4dtraveler:globe-intro-played';
const INTRO_DELAY_MS = 2200;

function hasPlayedIntro() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroPlayed() {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Storage may be unavailable (private browsing, sandboxed contexts); replaying the intro is harmless.
  }
}

/**
 * Landing page: an intro logo that morphs into an interactive 3D globe
 * (Workstream 2 — Andrew Liu). Clicking a country with an anchored
 * location on the globe dispatches straight into that fixed historical
 * world.
 *
 * The secondary "Explore any city" CTA switches into `globe` app-mode,
 * which mounts our R3F pin-globe (Workstream 1) and hands the picked
 * city off to the Grok + Tripo + procedural-fill pipeline — so users
 * can time-travel a city that isn't in our curated catalog yet.
 */
export function LocationSelector() {
  const { dispatch } = useApp();
  const [morphed, setMorphed] = useState(hasPlayedIntro);

  useEffect(() => {
    if (morphed) return;
    const timeout = setTimeout(() => {
      markIntroPlayed();
      setMorphed(true);
    }, INTRO_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [morphed]);

  return (
    <section
      className={`globe-stage${morphed ? ' is-globe' : ''}`}
      aria-labelledby="location-heading"
    >
      <h1 id="location-heading" className="visually-hidden">
        Choose a place to explore
      </h1>
      <div className="globe-canvas-layer" aria-hidden={!morphed}>
        <Suspense fallback={null}>
          <GlobeView interactive={morphed} />
        </Suspense>
      </div>
      <div className="globe-logo-layer" aria-hidden={morphed}>
        <GlobeLogo />
      </div>
      {morphed && (
        <div className="globe-cta">
          <nav
            className="curated-city-links"
            aria-label="Curated historical cities"
          >
            {locations.map((location) => (
              <button
                className="pill-button"
                key={location.id}
                onClick={() => dispatch({ type: 'location', id: location.id })}
              >
                {location.region} · {location.name}
              </button>
            ))}
          </nav>
          <button
            className="pill-button"
            onClick={() => dispatch({ type: 'mode', mode: 'globe' })}
          >
            Explore any city with the globe
            <span aria-hidden="true"> ✳</span>
          </button>
          <span className="muted">
            Not in the catalog? Pick any city and Grok will draft two historical
            eras for it in seconds.
          </span>
        </div>
      )}
    </section>
  );
}
