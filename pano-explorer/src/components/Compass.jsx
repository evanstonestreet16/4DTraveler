import React from 'react';
import { bearingToCardinal } from '../utils/geoUtils';

export function Compass({ heading, onReset }) {
  const rounded = Math.round(heading);
  return (
    <button
      type="button"
      className="compass-container"
      onClick={onReset}
      title={`Heading ${rounded}° ${bearingToCardinal(rounded)} — click to face north`}
      aria-label={`Compass heading ${rounded} degrees. Click to face north.`}
    >
      <div className="compass-dial" style={{ transform: `rotate(${-heading}deg)` }}>
        <span className="cardinal north">N</span>
        <span className="cardinal east">E</span>
        <span className="cardinal south">S</span>
        <span className="cardinal west">W</span>
      </div>
      <div className="compass-needle" />
      <span className="compass-readout">{rounded}°</span>
    </button>
  );
}
