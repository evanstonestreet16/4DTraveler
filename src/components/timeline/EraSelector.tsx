import { useApp } from '../../app/AppContext';
import { findWorld } from '../../data/locations';
import type { Location } from '../../types/world';

export function EraSelector({ location }: { location: Location }) {
  const { dispatch } = useApp();
  return (
    <section className="selection-page" aria-labelledby="era-heading">
      <button
        className="text-button"
        onClick={() => dispatch({ type: 'location', id: null })}
      >
        ← All locations
      </button>
      <p className="eyebrow">02 / Choose a moment</p>
      <h1 id="era-heading">
        {location.name},<br />
        through time.
      </h1>
      <p className="intro">Choose a year to enter its world.</p>
      <div className="selection-grid">
        {location.eras.map((era) => (
          <button
            className="era-card"
            key={era.id}
            onClick={() =>
              dispatch({
                type: 'era',
                id: era.id,
                world: findWorld(location.id, era.id),
              })
            }
          >
            <span className="era-year">{era.label}</span>
            <span>{era.subtitle}</span>
            <span className="enter-label">
              Enter world <span aria-hidden="true">→</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
