#!/usr/bin/env node
/**
 * Bakes the globe's country outlines and city pins into committed static files.
 *
 * Run with `npm run geo:build`. Output is imported directly by src/data/geo/, so the app
 * makes no network calls for geo data and this script is the only place the upstream
 * dataset is ever contacted. See docs/workstream2.md §4.
 */
import { simplify } from '@turf/simplify';
import console from 'node:console';
import { writeFileSync } from 'node:fs';
import { URL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** Pinned upstream revision, so re-bakes are reproducible. */
const NATURAL_EARTH_REF = 'v5.1.2';

const source = (layer) =>
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_REF}/geojson/${layer}.geojson`;

/**
 * Degrees of allowed deviation. This sets the crispness ceiling when the globe is zoomed
 * in: one pixel is ~0.6deg on a 600px whole-globe view, but ~0.06deg zoomed to a
 * continent. 1:110m outlines looked visibly blocky past the first zoom step.
 */
const COUNTRY_TOLERANCE = 0.05;
/** ~110m, comfortably finer than the tolerance. */
const COORD_PRECISION = 3;

/** Countries that get city pins. */
const PIN_COUNTRIES = ['USA', 'JPN', 'ITA'];
const PINS_PER_COUNTRY = 10;
/**
 * Always pinned regardless of population rank, because a curated Location points at
 * them. Keep in sync with `src/data/locations.ts`; src/data/geo/geo.test.ts enforces it.
 */
const CURATED_CITIES = ['Pittsburgh', 'Rome', 'Kyoto'];

const GEO_DIR = new URL('../src/data/geo/', import.meta.url);

async function fetchFeatures(layer) {
  const response = await globalThis.fetch(source(layer));
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${layer}`);
  const { features } = await response.json();
  return features;
}

function write(filename, value, label, extra) {
  const json = `${JSON.stringify(value)}\n`;
  writeFileSync(new URL(filename, GEO_DIR), json);
  const gzip = gzipSync(json).length;
  console.log(
    `${label}: ${value.length} features${extra ? `, ${extra}` : ''}, ` +
      `${(json.length / 1024).toFixed(0)} KB (${(gzip / 1024).toFixed(0)} KB gzip)`,
  );
}

// ---------------------------------------------------------------- countries

function maxSpan(ring) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return Math.max(maxLng - minLng, maxLat - minLat);
}

/**
 * Drops polygon parts smaller than the tolerance we simplify at — they cannot be
 * represented faithfully at that tolerance and are sub-pixel on the globe. This is what
 * keeps Alaska from contributing hundreds of meshes for the Aleutians.
 */
function prunePartsBelowTolerance(geometry) {
  if (geometry.type !== 'MultiPolygon') return geometry;
  const kept = geometry.coordinates.filter(
    (part) => maxSpan(part[0]) >= COUNTRY_TOLERANCE,
  );
  if (kept.length > 0) return { type: 'MultiPolygon', coordinates: kept };
  const largest = geometry.coordinates.reduce((a, b) =>
    maxSpan(b[0]) > maxSpan(a[0]) ? b : a,
  );
  return { type: 'MultiPolygon', coordinates: [largest] };
}

const roundRing = (ring) =>
  ring.map(([lng, lat]) => [
    Number(lng.toFixed(COORD_PRECISION)),
    Number(lat.toFixed(COORD_PRECISION)),
  ]);

const roundGeometry = (geometry) => ({
  type: geometry.type,
  coordinates:
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.map((part) => part.map(roundRing))
      : geometry.coordinates.map(roundRing),
});

/**
 * three-globe triangulates polygon caps assuming clockwise outer rings. Counter-clockwise
 * (RFC 7946) winding inverts every cap so it fills the whole sphere *except* the country.
 */
function signedArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

const orient = (ring, wantClockwise) =>
  signedArea(ring) < 0 === wantClockwise ? ring : [...ring].reverse();

const withRendererWinding = (geometry) => {
  const orientPart = (part) =>
    part.map((ring, index) => orient(ring, index === 0));
  return {
    type: geometry.type,
    coordinates:
      geometry.type === 'MultiPolygon'
        ? geometry.coordinates.map(orientPart)
        : orientPart(geometry.coordinates),
  };
};

const countryFeatures = await fetchFeatures('ne_50m_admin_0_countries');
const countries = countryFeatures
  .map((feature) => ({
    type: 'Feature',
    properties: {
      // ADM0_A3 is the only code field with no -99 placeholders and no duplicates, both
      // of which would collapse separate countries into one hover target. ADMIN avoids
      // NAME's 22 abbreviated labels ("Bosnia and Herz.", "Marshall Is.").
      name: feature.properties.ADMIN,
      isoA3: feature.properties.ADM0_A3,
    },
    geometry: withRendererWinding(
      roundGeometry(
        simplify(prunePartsBelowTolerance(feature.geometry), {
          tolerance: COUNTRY_TOLERANCE,
          highQuality: false,
          mutate: true,
        }),
      ),
    ),
  }))
  // Sorted so a re-bake is byte-identical regardless of source ordering.
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name));

const parts = countries.reduce(
  (sum, f) =>
    sum +
    (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.length : 1),
  0,
);
write(
  'countries.json',
  countries,
  `countries (ne_50m @ ${COUNTRY_TOLERANCE})`,
  `${parts} parts`,
);

// -------------------------------------------------------------------- cities

const placeFeatures = await fetchFeatures('ne_50m_populated_places');
const cities = PIN_COUNTRIES.flatMap((isoA3) => {
  const inCountry = placeFeatures
    .filter((f) => f.properties.ADM0_A3 === isoA3)
    .map((f) => ({
      // Natural Earth has stray double spaces in a few names ("Washington,  D.C.").
      name: f.properties.NAME.replace(/\s+/g, ' ').trim(),
      isoA3,
      lat: Number(f.geometry.coordinates[1].toFixed(4)),
      lng: Number(f.geometry.coordinates[0].toFixed(4)),
      pop: f.properties.POP_MAX ?? 0,
    }))
    .sort((a, b) => b.pop - a.pop);

  const chosen = inCountry.slice(0, PINS_PER_COUNTRY);
  for (const curated of inCountry) {
    if (CURATED_CITIES.includes(curated.name) && !chosen.includes(curated)) {
      chosen.push(curated);
    }
  }
  return chosen
    .map(({ name, isoA3, lat, lng }) => ({ name, isoA3, lat, lng }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const missing = CURATED_CITIES.filter(
  (name) => !cities.some((city) => city.name === name),
);
if (missing.length > 0) {
  throw new Error(
    `curated cities absent from Natural Earth: ${missing.join(', ')}`,
  );
}

write('cities.json', cities, 'cities');
for (const isoA3 of PIN_COUNTRIES) {
  const names = cities.filter((c) => c.isoA3 === isoA3).map((c) => c.name);
  console.log(`  ${isoA3} (${names.length}): ${names.join(', ')}`);
}
