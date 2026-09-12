import { useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { countries, type CountryFeature } from '../../../data/geo/countries';
import { citiesFor, findCity, type City } from '../../../data/geo/cities';
import { findOpeningWorld, locations } from '../../../data/locations';
import { useApp } from '../../../app/AppContext';
import { useElementSize } from './useElementSize';

const WATER_COLOR = '#1d4e6b';
const LAND_COLOR = '#3a7d44';
const HOVER_LAND_COLOR = '#5fae70';
const HOVER_STROKE_COLOR = '#f2c14e';

const globeMaterial = new MeshPhongMaterial({ color: WATER_COLOR });

const locationByCity = new Map(
  locations
    .filter((location) => location.globe)
    .map((location) => [
      `${location.globe!.countryIsoA3}:${location.globe!.city}`,
      location,
    ]),
);

const heroGlobe = locations.find((location) => location.globe)?.globe;
const heroCity = heroGlobe && findCity(heroGlobe.countryIsoA3, heroGlobe.city);

export function GlobeView({ interactive }: { interactive: boolean }) {
  const { dispatch } = useApp();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [hovered, setHovered] = useState<CountryFeature | null>(null);
  // Tracked separately from `hovered`, and never cleared on hover-out: moving the pointer
  // onto a pin clears the polygon hover that produced it, which would otherwise unmount
  // the pin from under the cursor. Pins persist until a different country is hovered.
  const [pinnedIso, setPinnedIso] = useState<string | null>(null);

  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const hoveredIso = hovered?.properties.isoA3 ?? null;

  const makePin = (city: City) => {
    const location = locationByCity.get(`${city.isoA3}:${city.name}`);
    const pin = document.createElement('button');
    pin.className = 'globe-pin';
    pin.type = 'button';
    pin.title = city.name;
    pin.setAttribute(
      'aria-label',
      location ? `Explore ${city.name}` : city.name,
    );
    // Every pin looks and behaves the same; one without a world is simply inert.
    if (location) {
      pin.addEventListener('click', () => {
        const world = findOpeningWorld(location.id);
        if (world) dispatch({ type: 'enterWorld', world });
        else dispatch({ type: 'location', id: location.id });
      });
    }
    return pin;
  };
  const cities = citiesFor(interactive ? pinnedIso : null);

  return (
    <div
      className="globe-viewport"
      ref={containerRef}
      role="group"
      aria-label="Interactive globe. Hover a country to see its name, and its cities where available."
    >
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#89b7a0"
          atmosphereAltitude={0.14}
          showGraticules={false}
          polygonsData={countries}
          // Do not raise. Coarser subdivision makes a large polygon's flat interior chord
          // through the sphere: measured, 10 pits Canada and Nevada, 180 sinks the whole
          // continental US below the water surface.
          polygonCapCurvatureResolution={5}
          polygonAltitude={0.006}
          polygonCapColor={(feature) =>
            (feature as CountryFeature).properties.isoA3 === hoveredIso
              ? HOVER_LAND_COLOR
              : LAND_COLOR
          }
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={(feature) =>
            (feature as CountryFeature).properties.isoA3 === hoveredIso
              ? HOVER_STROKE_COLOR
              : false
          }
          polygonLabel={(feature) =>
            (feature as CountryFeature).properties.name
          }
          polygonsTransitionDuration={0}
          onPolygonHover={(polygon) => {
            if (!interactive) return;
            const country = polygon as CountryFeature | null;
            setHovered(country);
            if (country) setPinnedIso(country.properties.isoA3);
          }}
          // Pins are DOM elements rather than `pointsData` so the dot can stay small
          // while the button around it keeps a finger-sized hit area — a degrees-based
          // pointRadius has to grow the visible dot to stay clickable. They are real
          // buttons, so they are also keyboard reachable.
          htmlElementsData={cities}
          htmlLat={(city) => (city as City).lat}
          htmlLng={(city) => (city as City).lng}
          htmlAltitude={0.012}
          htmlTransitionDuration={0}
          htmlElement={(data) => makePin(data as City)}
          htmlElementVisibilityModifier={(element, isVisible) => {
            element.style.opacity = isVisible ? '1' : '0';
            element.style.pointerEvents = isVisible ? 'auto' : 'none';
          }}
          enablePointerInteraction={interactive}
          onGlobeReady={() => {
            if (!heroCity) return;
            globeRef.current?.pointOfView(
              { lat: heroCity.lat, lng: heroCity.lng, altitude: 1.8 },
              0,
            );
          }}
        />
      )}
    </div>
  );
}
