import { lazy, Suspense } from 'react';
import { useApp } from './AppContext';
import { locations } from '../data/locations';
import { LocationSelector } from '../components/location/LocationSelector';
<<<<<<< HEAD
=======
import { GlobeLogo } from '../components/location/globe/GlobeLogo';
import { EraSelector } from '../components/timeline/EraSelector';
>>>>>>> 83f3c2b (pins update)
import { SceneErrorBoundary } from '../components/world/SceneErrorBoundary';

const WorldExperience = lazy(
  () => import('../components/world/WorldExperience'),
);
const GlobeExperience = lazy(() =>
  import('../components/globe/GlobeExperience').then((module) => ({
    default: module.GlobeExperience,
  })),
);

export function App() {
  const { state, dispatch } = useApp();
  const staticLocation = locations.find(
    (location) => location.id === state.selectedLocationId,
  );
  const showGlobe = state.mode === 'globe' && !state.activeWorld;
  const isGeneratedWorld =
    state.selectedLocationId?.startsWith('generated:') ?? false;
  // The landing globe is presented bare: just the globe and the wordmark.
  const isLandingGlobe = !showGlobe && !state.selectedLocationId;
  return (
    <div className={`app-shell${isLandingGlobe ? ' is-landing' : ''}`}>
      <header className={`site-header${isLandingGlobe ? ' is-overlay' : ''}`}>
        <button
          className={`wordmark${isLandingGlobe ? ' wordmark-logo' : ''}`}
          aria-label="4D Traveler home"
          onClick={() => dispatch({ type: 'mode', mode: 'catalog' })}
        >
          {isLandingGlobe ? (
            <GlobeLogo compact />
          ) : (
            <>
              4D<span>Traveler</span>
              <span className="brand-dot" aria-hidden="true">
                ✳
              </span>
            </>
          )}
        </button>
        {!isLandingGlobe && (
          <span className="version-label">
            Historical world explorer{' '}
            <span className="badge">World preview</span>
          </span>
        )}
      </header>
      <main>
        {showGlobe ? (
          <Suspense
            fallback={
              <p className="notice" role="status">
                Spinning up the globe…
              </p>
            }
          >
            <GlobeExperience />
          </Suspense>
        ) : !state.selectedLocationId ? (
          <LocationSelector />
        ) : !staticLocation && !isGeneratedWorld ? (
          <div className="notice" role="alert">
            This location is unavailable.{' '}
            <button onClick={() => dispatch({ type: 'mode', mode: 'catalog' })}>
              Choose a location
            </button>
          </div>
        ) : !state.activeWorld ? (
          <div className="notice" role="alert">
            This world is not available yet.{' '}
            <button
              onClick={() =>
                state.mode === 'globe'
                  ? dispatch({ type: 'mode', mode: 'globe' })
                  : dispatch({ type: 'location', id: null })
              }
            >
              Choose another world
            </button>
          </div>
        ) : (
          <SceneErrorBoundary
            key={
              state.activeWorld.scene.overviewTransition
                ? `${state.activeWorld.locationId}:${state.activeWorld.scene.overviewTransition.group}`
                : state.activeWorld.id
            }
          >
            <Suspense
              fallback={
                <div
                  className={
                    state.activeWorld.scene.presentation === 'immersive-city'
                      ? 'city-loading'
                      : 'notice'
                  }
                  role="status"
                >
                  <h2>
                    Entering {state.activeWorld.locationName} ·{' '}
                    {state.activeWorld.era.label}
                  </h2>
                  <p>Preparing the historical world…</p>
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
                </div>
              }
            >
              <WorldExperience world={state.activeWorld} />
            </Suspense>
          </SceneErrorBoundary>
        )}
      </main>
      {!isLandingGlobe && (
        <footer className="site-footer">
          <span>Explore where the world was.</span>
          <span>Illustrative historical demo · No account needed</span>
        </footer>
      )}
    </div>
  );
}
