import { useCallback, useEffect, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { countries, type CountryFeature } from '../../../data/geo/countries';
import {
  citiesFor,
  countryHoverLabel,
  findCity,
  type City,
} from '../../../data/geo/cities';
import { findOpeningWorld, locations } from '../../../data/locations';
import { globeCities } from '../../globe/cities';
import { useApp } from '../../../app/AppContext';
import { useElementSize } from './useElementSize';
import {
  clampAltitude,
  followAltitude,
  MAX_ALTITUDE,
  MIN_ALTITUDE,
  START_ALTITUDE,
  wheelZoomFactor,
} from './globeZoom';

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

function configureGlobeControls(globe: GlobeMethods) {
  const controls = globe.controls();
  const radius = globe.getGlobeRadius();
  // globe.gl zooms toward the cursor, then snaps the orbit target back to the
  // origin on every change. That fight is what made wheel zoom stutter.
  controls.enableZoom = false;
  controls.zoomToCursor = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.enablePan = false;
  controls.minDistance = radius * (1 + MIN_ALTITUDE);
  controls.maxDistance = radius * (1 + MAX_ALTITUDE);
}

function setGlobeAltitude(globe: GlobeMethods, altitude: number) {
  const camera = globe.camera();
  const desired = globe.getGlobeRadius() * (1 + altitude);
  const current = camera.position.length();
  if (current > 1e-6) camera.position.setLength(desired);
}

export function GlobeView({ interactive }: { interactive: boolean }) {
  const { dispatch } = useApp();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [hovered, setHovered] = useState<CountryFeature | null>(null);
  // Tracked separately from `hovered`, and never cleared on hover-out: moving the pointer
  // onto a pin clears the polygon hover that produced it, which would otherwise unmount
  // the pin from under the cursor. Pins persist until a different country is hovered.
  const [pinnedIso, setPinnedIso] = useState<string | null>(null);

  const viewportNode = useRef<HTMLDivElement | null>(null);
  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportNode.current = node;
      return sizeRef(node);
    },
    [sizeRef],
  );
  const hoveredIso = hovered?.properties.isoA3 ?? null;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const zoomTarget = useRef(START_ALTITUDE);

  useEffect(() => {
    const node = viewportNode.current;
    if (!node) return;

    let frame = 0;
    let lastTime = 0;
    const reducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const step = (time: number) => {
      const globe = globeRef.current;
      if (!globe) {
        frame = 0;
        return;
      }
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const current = globe.pointOfView().altitude;
      const next = reducedMotion()
        ? zoomTarget.current
        : followAltitude(current, zoomTarget.current, dt);
      const arrived = Math.abs(zoomTarget.current - next) < 0.001;
      const altitude = arrived ? zoomTarget.current : next;
      setGlobeAltitude(globe, altitude);
      viewportNode.current?.setAttribute('data-altitude', altitude.toFixed(2));
      if (arrived) {
        frame = 0;
        lastTime = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!interactiveRef.current || !globeRef.current) return;
      zoomTarget.current = clampAltitude(
        zoomTarget.current * wheelZoomFactor(event.deltaY, event.deltaMode),
      );
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(step);
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frame);
    };
  }, []);

  const makePin = (city: City) => {
    const location = locationByCity.get(`${city.isoA3}:${city.name}`);
    const generated = globeCities.find(
      (entry) => entry.name === city.name && !entry.staticLocationId,
    );
    const label = countryHoverLabel(city.isoA3, city.name);
    const pin = document.createElement('button');
    pin.className = 'globe-pin';
    pin.type = 'button';
    pin.dataset.label = label;
    pin.setAttribute(
      'aria-label',
      location || generated ? `Explore ${label}` : label,
    );
    const markPinHover = (hovering: boolean) => {
      viewportNode.current?.classList.toggle('is-pin-hover', hovering);
    };
    pin.addEventListener('pointerenter', () => markPinHover(true));
    pin.addEventListener('pointerleave', () => markPinHover(false));
    // Catalog cities enter their present-day world. Generated cities open the
    // Grok pipeline. Pins without either stay inert.
    if (location) {
      pin.addEventListener('click', () => {
        const world = findOpeningWorld(location.id);
        if (world) dispatch({ type: 'enterWorld', world });
        else dispatch({ type: 'location', id: location.id });
      });
    } else if (generated) {
      pin.addEventListener('click', () =>
        dispatch({
          type: 'mode',
          mode: 'globe',
          generateCityId: generated.id,
        }),
      );
    }
    return pin;
  };
  const cities = citiesFor(interactive ? pinnedIso : null);

  return (
    <div
      className="globe-viewport"
      ref={containerRef}
      role="group"
      aria-label="Interactive globe. Hover a country to see its name, and its cities where available. Scroll to zoom."
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
            if (country) {
              setPinnedIso(country.properties.isoA3);
              viewportNode.current?.classList.remove('is-pin-hover');
            }
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
          onZoom={(pov) => {
            viewportNode.current?.setAttribute(
              'data-altitude',
              pov.altitude.toFixed(2),
            );
          }}
          onGlobeReady={() => {
            const globe = globeRef.current;
            if (!globe) return;
            configureGlobeControls(globe);
            zoomTarget.current = START_ALTITUDE;
            if (!heroCity) return;
            globe.pointOfView(
              {
                lat: heroCity.lat,
                lng: heroCity.lng,
                altitude: START_ALTITUDE,
              },
              0,
            );
            viewportNode.current?.setAttribute(
              'data-altitude',
              String(START_ALTITUDE),
            );
          }}
        />
      )}
    </div>
  );
}
