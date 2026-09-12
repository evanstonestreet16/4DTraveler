import { useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { countries, type CountryFeature } from '../../../data/geo/countries';
import type { SubregionFeature } from '../../../data/geo/subregions';
import { locations } from '../../../data/locations';
import { useApp } from '../../../app/AppContext';
import { useElementSize } from './useElementSize';
import { useHoveredSubregions } from './useHoveredSubregions';

type GlobeFeature = CountryFeature | SubregionFeature;

function isSubregion(feature: GlobeFeature): feature is SubregionFeature {
  return 'parentIso3' in feature.properties;
}

function countryIsoOf(feature: GlobeFeature): string {
  return isSubregion(feature)
    ? feature.properties.parentIso3
    : feature.properties.isoA3;
}

const WATER_COLOR = '#1d4e6b';
const LAND_COLOR = '#3a7d44';
const HOVER_LAND_COLOR = '#5fae70';
const HOVER_STROKE_COLOR = '#f2c14e';
const SUBREGION_FILL_COLOR = 'rgba(0,0,0,0)';
const SUBREGION_HOVER_COLOR = '#e0a743';
const SUBREGION_STROKE_COLOR = '#fff3d6';

const globeMaterial = new MeshPhongMaterial({ color: WATER_COLOR });

const countryNameByIso = new Map(
  countries.map((country) => [
    country.properties.isoA3,
    country.properties.name,
  ]),
);

const supportedByIso = new Map(
  locations
    .filter((location) => location.globe)
    .map((location) => [location.globe!.countryIsoA3, location]),
);

const heroLocation = locations.find((location) => location.globe);

export function GlobeView({ interactive }: { interactive: boolean }) {
  const { dispatch } = useApp();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [hovered, setHovered] = useState<GlobeFeature | null>(null);
  const [containerRef, size] = useElementSize<HTMLDivElement>();

  const hoveredIso = hovered ? countryIsoOf(hovered) : null;
  const subregions = useHoveredSubregions(interactive ? hoveredIso : null);

  const polygonsData = useMemo<GlobeFeature[]>(
    () => [...countries, ...subregions],
    [subregions],
  );

  const isSupported = useMemo(
    () => (feature: GlobeFeature) => supportedByIso.has(countryIsoOf(feature)),
    [],
  );

  return (
    <div
      className="globe-viewport"
      ref={containerRef}
      role="group"
      aria-label="Interactive globe. Hover a country to see its name and sub-regions, click a highlighted place to enter its world."
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
          polygonsData={polygonsData}
          // Above three-globe's default resolution (5deg), large polygons get extra
          // "inner" fill points via a global-grid + point-in-polygon filter that can
          // misfire for irregular real-world coastlines, filling the wrong region
          // entirely. A high value skips that path for plain, reliable triangulation.
          polygonCapCurvatureResolution={180}
          polygonAltitude={(feature) =>
            isSubregion(feature as GlobeFeature) ? 0.009 : 0.006
          }
          polygonCapColor={(feature) => {
            const f = feature as GlobeFeature;
            if (isSubregion(f))
              return f === hovered
                ? SUBREGION_HOVER_COLOR
                : SUBREGION_FILL_COLOR;
            return f === hovered || countryIsoOf(f) === hoveredIso
              ? HOVER_LAND_COLOR
              : LAND_COLOR;
          }}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={(feature) => {
            const f = feature as GlobeFeature;
            if (isSubregion(f))
              return f === hovered ? SUBREGION_STROKE_COLOR : false;
            return countryIsoOf(f) === hoveredIso ? HOVER_STROKE_COLOR : false;
          }}
          polygonLabel={(feature) => {
            const f = feature as GlobeFeature;
            const countryName = countryNameByIso.get(countryIsoOf(f)) ?? '';
            return isSubregion(f)
              ? `${countryName}, ${f.properties.name}`
              : countryName;
          }}
          polygonsTransitionDuration={0}
          onPolygonHover={(polygon) =>
            setHovered(interactive ? (polygon as GlobeFeature | null) : null)
          }
          onPolygonClick={(polygon) => {
            if (!interactive) return;
            const location = supportedByIso.get(
              countryIsoOf(polygon as GlobeFeature),
            );
            if (location) dispatch({ type: 'location', id: location.id });
          }}
          showPointerCursor={(objType, objData) =>
            interactive &&
            objType === 'polygon' &&
            isSupported(objData as GlobeFeature)
          }
          enablePointerInteraction={interactive}
          onGlobeReady={() => {
            if (!heroLocation?.globe) return;
            globeRef.current?.pointOfView(
              { ...heroLocation.globe.coordinates, altitude: 1.8 },
              0,
            );
          }}
        />
      )}
    </div>
  );
}
