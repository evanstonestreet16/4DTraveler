import { lazy, Suspense } from 'react';
import { useApp } from './AppContext';
import { locations } from '../data/locations';
import { LocationSelector } from '../components/location/LocationSelector';
import { EraSelector } from '../components/timeline/EraSelector';
import { SceneErrorBoundary } from '../components/world/SceneErrorBoundary';

const WorldExperience = lazy(
  () => import('../components/world/WorldExperience'),
);

export function App() {
  const { state, dispatch } = useApp();
  const location = locations.find(
    (location) => location.id === state.selectedLocationId,
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="wordmark"
          aria-label="4DTraveler home"
          onClick={() => dispatch({ type: 'location', id: null })}
        >
          4D<span>Traveler</span>
          <span className="brand-dot" aria-hidden="true">
            ✳
          </span>
        </button>
        <span className="version-label">
          Historical world explorer <span className="badge">Dummy v0</span>
        </span>
      </header>
      <main>
        {!state.selectedLocationId ? (
          <LocationSelector />
        ) : !location ? (
          <div className="notice" role="alert">
            This location is unavailable.{' '}
            <button onClick={() => dispatch({ type: 'location', id: null })}>
              Choose a location
            </button>
          </div>
        ) : !state.selectedEraId ? (
          <EraSelector location={location} />
        ) : !state.activeWorld ? (
          <div className="notice" role="alert">
            This world is not available yet.{' '}
            <button
              onClick={() => dispatch({ type: 'location', id: location.id })}
            >
              Choose another era
            </button>
          </div>
        ) : (
          <SceneErrorBoundary key={state.activeWorld.id}>
            <Suspense
              fallback={
                <p className="notice" role="status">
                  Loading your historical world…
                </p>
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
