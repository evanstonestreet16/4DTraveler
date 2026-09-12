import { useCallback, useEffect, useRef, useState } from 'react';
import { GlobeCanvas } from './GlobeCanvas';
import { globeCities, type GlobeCity } from './cities';
import { useApp } from '../../app/AppContext';
import {
  deriveWorldsFromProfile,
  generateHistory,
  HistoryGenerationError,
} from '../../services/grok';
import { locations, findOpeningWorld } from '../../data/locations';
import type {
  GeneratedHistoryProfile,
  HistoricalWorld,
} from '../../types/world';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; city: GlobeCity; useFixture: boolean }
  | {
      kind: 'ready';
      city: GlobeCity;
      profile: GeneratedHistoryProfile;
      worlds: HistoricalWorld[];
      source: 'live' | 'fixture' | 'fallback';
      fallbackReason?: string;
    }
  | { kind: 'error'; city: GlobeCity; message: string };

/**
 * Full globe-mode flow: rotating globe -> click city -> Grok generates
 * profile -> pick era -> hand the derived HistoricalWorld to the shared
 * app renderer via `enterWorld`. Curated cities skip generation and open
 * their present-day world when one exists.
 */
export function GlobeExperience() {
  const { state, dispatch } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const startGeneration = useCallback(
    async (city: GlobeCity, useFixture: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase({ kind: 'loading', city, useFixture });
      try {
        const result = await generateHistory({
          cityName: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          useFixture,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const worlds = deriveWorldsFromProfile(result.profile, {
          locationId: `generated:${city.id}`,
        });
        setPhase({
          kind: 'ready',
          city,
          profile: result.profile,
          worlds,
          source: result.source,
          fallbackReason: result.fallbackReason,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof HistoryGenerationError
            ? error.message
            : 'Something went wrong generating history for this city.';
        setPhase({ kind: 'error', city, message });
      }
    },
    [],
  );

  const handleCityClick = useCallback(
    (city: GlobeCity) => {
      // Route curated cities into the existing static catalog so the hero
      // demo path (Pittsburgh 1892) remains untouched.
      if (city.staticLocationId) {
        const location = locations.find(
          (entry) => entry.id === city.staticLocationId,
        );
        if (location) {
          const world = findOpeningWorld(location.id);
          if (world) {
            dispatch({ type: 'enterWorld', world });
            return;
          }
          dispatch({ type: 'location', id: location.id });
          return;
        }
      }
      void startGeneration(city, city.useFixture ?? false);
    },
    [dispatch, startGeneration],
  );

  useEffect(() => {
    if (!state.generateCityId) return;
    const city = globeCities.find((entry) => entry.id === state.generateCityId);
    if (city && !city.staticLocationId)
      void startGeneration(city, city.useFixture ?? false);
  }, [state.generateCityId, startGeneration]);

  const handleEnterEra = useCallback(
    (world: HistoricalWorld) => {
      dispatch({ type: 'enterWorld', world });
    },
    [dispatch],
  );

  return (
    <section className="globe-page" aria-labelledby="globe-heading">
      <button
        className="text-button"
        onClick={() => dispatch({ type: 'mode', mode: 'catalog' })}
      >
        ← Back to featured places
      </button>
      <p className="eyebrow">01 / Choose anywhere</p>
      <h1 id="globe-heading">
        Point at a place.
        <br />
        Watch its past load.
      </h1>
      <p className="intro">
        Click a pin to generate a miniature diorama of that city at three
        moments in its history.
      </p>
      <div className="globe-stage">
        <div className="globe-viewport" aria-hidden={phase.kind === 'loading'}>
          <GlobeCanvas
            onSelectCity={handleCityClick}
            disabled={phase.kind === 'loading'}
          />
        </div>
        <aside className="globe-panel">
          {phase.kind === 'idle' && <IdlePanel />}
          {phase.kind === 'loading' && (
            <LoadingPanel city={phase.city} useFixture={phase.useFixture} />
          )}
          {phase.kind === 'ready' && (
            <ReadyPanel
              city={phase.city}
              profile={phase.profile}
              worlds={phase.worlds}
              source={phase.source}
              fallbackReason={phase.fallbackReason}
              onSelectEra={handleEnterEra}
            />
          )}
          {phase.kind === 'error' && (
            <ErrorPanel
              city={phase.city}
              message={phase.message}
              onRetry={() => startGeneration(phase.city, false)}
              onUseFixture={() => startGeneration(phase.city, true)}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function IdlePanel() {
  return (
    <div className="globe-info">
      <p className="eyebrow">Pick a pin</p>
      <p>
        Drag to rotate. Each glowing pin is a supported city. Click one and Grok
        will draft three eras of history — architecture, objects, stories — for
        the built-in explorer.
      </p>
      <ul className="globe-tip-list">
        <li>Pittsburgh is a curated hero world (loads instantly).</li>
        <li>Everywhere else is generated on the fly.</li>
      </ul>
    </div>
  );
}

function LoadingPanel({
  city,
  useFixture,
}: {
  city: GlobeCity;
  useFixture: boolean;
}) {
  return (
    <div className="globe-info" role="status" aria-live="polite">
      <p className="eyebrow">Generating</p>
      <h2>{city.name}</h2>
      <p>
        {useFixture
          ? 'Loading the bundled demo profile…'
          : 'Grok is drafting three historical eras. This usually takes a few seconds.'}
      </p>
      <div className="globe-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ErrorPanel({
  city,
  message,
  onRetry,
  onUseFixture,
}: {
  city: GlobeCity;
  message: string;
  onRetry: () => void;
  onUseFixture: () => void;
}) {
  return (
    <div className="globe-info" role="alert">
      <p className="eyebrow">Could not generate</p>
      <h2>{city.name}</h2>
      <p>{message}</p>
      <div className="globe-actions">
        <button className="pill-button" onClick={onRetry}>
          Try again
        </button>
        {city.id === 'seattle' && (
          <button className="pill-button ghost" onClick={onUseFixture}>
            Use bundled demo
          </button>
        )}
      </div>
    </div>
  );
}

function ReadyPanel({
  city,
  profile,
  worlds,
  source,
  fallbackReason,
  onSelectEra,
}: {
  city: GlobeCity;
  profile: GeneratedHistoryProfile;
  worlds: HistoricalWorld[];
  source: 'live' | 'fixture' | 'fallback';
  fallbackReason?: string;
  onSelectEra: (world: HistoricalWorld) => void;
}) {
  return (
    <div className="globe-info">
      <p className="eyebrow">{profile.region}</p>
      <h2>{profile.cityName}</h2>
      <p>{profile.description}</p>
      {source === 'fixture' && (
        <p className="muted">
          Using the bundled {profile.cityName} fixture (no API key configured).
        </p>
      )}
      {source === 'fallback' && (
        <p className="muted" title={fallbackReason}>
          Live generation failed — showing the bundled {profile.cityName}{' '}
          fixture instead. Check the console for details.
        </p>
      )}
      <p className="eyebrow" style={{ marginTop: 18 }}>
        Choose an era
      </p>
      <ul className="generated-era-list">
        {worlds.map((world, index) => {
          const era = profile.eras[index];
          return (
            <li key={world.id}>
              <button
                className="generated-era-card"
                onClick={() => onSelectEra(world)}
              >
                <span className="generated-era-year">{era.label}</span>
                <span className="generated-era-subtitle">{era.subtitle}</span>
                <span className="generated-era-body">
                  {era.historicalContext}
                </span>
                <span className="enter-label">
                  Enter world <span aria-hidden="true">→</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="muted" style={{ marginTop: 16 }}>
        Not the {city.name} you had in mind? Rotate the globe and pick a
        different pin, or refresh to re-roll this one.
      </p>
    </div>
  );
}
