import { lazy, Suspense, useEffect, useState } from 'react';
import { GlobeLogo } from './globe/GlobeLogo';

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

export function LocationSelector() {
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
<<<<<<< HEAD
      <p className="muted">
        An early exploration of how places change through time.
      </p>
=======
>>>>>>> b058d1a (glboe half done)
    </section>
  );
}
