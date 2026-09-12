import { useEffect, useRef } from 'react';
import { useApp } from '../../app/AppContext';
import { worlds } from '../../data/locations';
import type { HistoricalWorld } from '../../types/world';
import './OverviewTimeSlider.css';

let nextRequestId = 0;
export function requestEraId() {
  return ++nextRequestId;
}

export function OverviewTimeSlider({ world }: { world: HistoricalWorld }) {
  const { state, dispatch } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(false);
  const busy = !!state.eraTransition;
  const endpoints = worlds
    .filter(
      (item) =>
        item.locationId === world.locationId &&
        item.scene.overviewImage &&
        item.scene.overviewTransition?.group ===
          world.scene.overviewTransition?.group,
    )
    .sort((a, b) => a.era.year - b.era.year);
  useEffect(() => {
    if (wasBusy.current && !busy) input.current?.focus({ preventScroll: true });
    wasBusy.current = busy;
  }, [busy]);
  if (!world.scene.overviewTransition || endpoints.length < 2) return null;
  const selected = endpoints.findIndex((item) => item.id === world.id);
  const select = (index: number) => {
    if (!busy && endpoints[index])
      dispatch({
        type: 'era-request',
        requestId: requestEraId(),
        world: endpoints[index],
      });
  };
  return (
    <section
      className="overview-time-slider"
      aria-label="Travel through time"
      aria-busy={busy}
    >
      <div className="time-slider-title">
        <span>TRAVEL THROUGH TIME</span>
        <span>{world.era.label}</span>
      </div>
      <input
        ref={input}
        type="range"
        min={0}
        max={endpoints.length - 1}
        step={1}
        aria-label="City era"
        aria-valuetext={`${world.locationName}, ${world.era.label}`}
        value={selected}
        disabled={busy}
        onChange={(event) => select(Number(event.target.value))}
      />
      <div className="time-slider-stops">
        {endpoints.map((item, index) => (
          <button
            key={item.id}
            disabled={busy}
            aria-pressed={selected === index}
            onClick={() => select(index)}
          >
            {item.era.label}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {busy
          ? `Traveling to ${state.eraTransition!.world.era.label}`
          : `Now viewing ${world.locationName}, ${world.era.label}`}
      </p>
    </section>
  );
}
