import React, { useState } from 'react';
import { Globe2 } from 'lucide-react';
import { StreetViewViewer } from './components/StreetViewViewer';
import { CITY_MANIFEST, CITY_LABELS } from './data/cityManifest';

const DEFAULT_CITY = 'rome';
const DEFAULT_LANDMARK = 'colosseum';

/**
 * Finds the default initial node for a city.
 * Defaults to the first node matching the selected landmark.
 */
function getDefaultNodeForCity(cityKey) {
  const nodes = CITY_MANIFEST[cityKey] || [];
  return nodes.find((node) => (node.landmark || node.imagePrefix) === DEFAULT_LANDMARK) || nodes[0] || null;
}

export function App() {
  const cities = Object.keys(CITY_MANIFEST);
  const [selectedCity, setSelectedCity] = useState(
    cities.includes(DEFAULT_CITY) ? DEFAULT_CITY : cities[0]
  );

  // Initialize coordinates to the city default (e.g. colosseum for Rome)
  const [currentCoords, setCurrentCoords] = useState(() => {
    const defaultNode = getDefaultNodeForCity(selectedCity);
    return defaultNode
      ? { lat: defaultNode.lat, lon: defaultNode.lon, landmark: defaultNode.landmark }
      : null;
  });

  const nodeCount = (CITY_MANIFEST[selectedCity] || []).length;

  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    const defaultNode = getDefaultNodeForCity(newCity);
    setCurrentCoords(
      defaultNode
        ? { lat: defaultNode.lat, lon: defaultNode.lon, landmark: defaultNode.landmark }
        : null
    );
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-brand">
          <Globe2 size={20} className="icon-blue" />
          <div>
            <h1>360° Street View Explorer</h1>
            <p className="app-subtitle">
              {nodeCount} panorama{nodeCount === 1 ? '' : 's'} in {CITY_LABELS[selectedCity] ?? selectedCity}
            </p>
          </div>
        </div>
        <label className="city-selector">
          <span>City</span>
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {CITY_LABELS[city] ?? city.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="viewer-frame">
        <StreetViewViewer
          key={selectedCity}
          city={selectedCity}
          initialLat={currentCoords?.lat ?? null}
          initialLon={currentCoords?.lon ?? null}
          initialLandmark={currentCoords?.landmark ?? null}
          onLocationChange={setCurrentCoords}
        />
      </main>
    </div>
  );
}

export default App;