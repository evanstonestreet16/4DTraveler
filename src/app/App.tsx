import { lazy, Suspense } from 'react';
import { useApp } from './AppContext';
import { locations } from '../data/locations';
import { LocationSelector } from '../components/location/LocationSelector';
import { EraSelector } from '../components/timeline/EraSelector';
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
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="wordmark"
          aria-label="4DTraveler home"
          onClick={() => dispatch({ type: 'mode', mode: 'catalog' })}
        >
          4D<span>Traveler</span>
          <span className="brand-dot" aria-hidden="true">
            ✳
          </span>
        </button>
        <span className="version-label">
          Historical world explorer <span className="badge">World preview</span>
        </span>
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
        ) : !state.selectedEraId && staticLocation ? (
          <EraSelector location={staticLocation} />
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
          <SceneErrorBoundary key={state.activeWorld.id}>
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
                        type: 'location',
                        id: state.activeWorld!.locationId,
                      })
                    }
                  >
                    Choose era
                  </button>
                </div>
              }
            >
              <WorldExperience world={state.activeWorld} />
            </Suspense>
          </SceneErrorBoundary>
        )}
      </main>
      <footer className="site-footer">
        <span>Explore where the world was.</span>
        <span>Illustrative historical demo · No account needed</span>
      </footer>
    </div>
  );
}
