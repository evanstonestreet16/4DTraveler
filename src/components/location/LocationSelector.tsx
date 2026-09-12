import { locations } from '../../data/locations';
import { useApp } from '../../app/AppContext';

export function LocationSelector() {
  const { dispatch } = useApp();
  return (
    <section className="selection-page" aria-labelledby="location-heading">
      <p className="eyebrow">01 / Choose a place</p>
      <h1 id="location-heading">
        Every place has a past.
        <br />
        Step into one.
      </h1>
      <p className="intro">
        Explore the places, objects, and stories that shaped a city.
      </p>
      <div className="selection-grid">
        {locations.map((location) => (
          <button
            className="location-card"
            key={location.id}
            onClick={() => dispatch({ type: 'location', id: location.id })}
          >
            <span className="card-art" aria-hidden="true">
              1892<span className="city-line">▥ ▥ ▥</span>
            </span>
            <span className="card-body">
              <span className="eyebrow">{location.region}</span>
              <span className="card-title">
                {location.name} <span aria-hidden="true">↗</span>
              </span>
              <span>{location.description}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="globe-cta">
        <button
          className="pill-button"
          onClick={() => dispatch({ type: 'mode', mode: 'globe' })}
        >
          Explore any city with the globe
          <span aria-hidden="true"> ✳</span>
        </button>
        <span className="muted">
          Pick a pin on a spinning globe and Grok drafts three historical eras.
        </span>
      </div>
      <p className="muted">
        An early exploration of how places change through time.
      </p>
    </section>
  );
}
