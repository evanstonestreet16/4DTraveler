import { simplify } from '@turf/simplify';
import type { MultiPolygon, Polygon } from 'geojson';

export interface SubregionFeature {
  type: 'Feature';
  properties: { name: string; parentIso3: string };
  geometry: { type: string; coordinates: unknown };
}

interface GeoBoundariesMeta {
  simplifiedGeometryGeoJSON?: string;
  gjDownloadURL?: string;
}

interface RawGeoJsonFeature {
  properties?: { shapeName?: string };
  geometry: { type: string; coordinates: unknown };
}

const cache = new Map<string, Promise<SubregionFeature[]>>();

// geoBoundaries' large release files are Git LFS objects served from `github.com/.../raw/...`,
// which redirects through a GitHub response carrying an empty (invalid) CORS header that
// browsers reject outright. The LFS media host itself has correct CORS, so fetch it directly.
function toDirectDownloadUrl(url: string): string {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/,
  );
  if (!match) return url;
  const [, owner, repo, ref, path] = match;
  return `https://media.githubusercontent.com/media/${owner}/${repo}/${ref}/${path}`;
}

type Ring = [number, number][];
type PolygonCoords = Ring[];
type LooseGeometry = { type: string; coordinates: unknown };

// Some countries' provinces are archipelagos with thousands of separate island parts as
// one MultiPolygon (e.g. Canada's Nunavut alone has ~18,800) — three-globe builds one
// mesh per part, so rendering them all can create tens of thousands of objects and hang
// the tab. Keep only the parts with the largest bounding-box footprint (the mainland and
// major islands); the rest are imperceptible specks at globe scale anyway.
const MAX_POLYGON_PARTS = 25;

// geoBoundaries' "simplified" release files are still far too detailed to triangulate in
// real time on hover. Naively dropping points (rather than a real simplification
// algorithm) can turn a jagged coastline into a self-intersecting ring, which makes the
// triangulator fill the wrong — often much larger — region. Douglas-Peucker via turf
// preserves the ring's topology, in degrees of allowed deviation.
const SIMPLIFY_TOLERANCE_DEGREES = 0.05;

function boundingBoxArea(ring: Ring): number {
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
  return (maxLng - minLng) * (maxLat - minLat);
}

function largestParts(parts: PolygonCoords[]): PolygonCoords[] {
  if (parts.length <= MAX_POLYGON_PARTS) return parts;
  return [...parts]
    .sort((a, b) => boundingBoxArea(b[0]) - boundingBoxArea(a[0]))
    .slice(0, MAX_POLYGON_PARTS);
}

function simplifyGeometry(geometry: LooseGeometry): LooseGeometry {
  const capped: LooseGeometry =
    geometry.type === 'MultiPolygon'
      ? {
          type: 'MultiPolygon',
          coordinates: largestParts(geometry.coordinates as PolygonCoords[]),
        }
      : geometry;
  return simplify(capped as Polygon | MultiPolygon, {
    tolerance: SIMPLIFY_TOLERANCE_DEGREES,
    highQuality: false,
    mutate: false,
  });
}

/**
 * First-level administrative sub-divisions (state/province/county, depending on the
 * country) for the given country, fetched from the public geoBoundaries dataset and
 * cached per session. Resolves to [] if the country has no published data or the
 * request fails — callers should treat that as "no sub-region layer", not an error.
 */
export function loadSubregions(isoA3: string): Promise<SubregionFeature[]> {
  let pending = cache.get(isoA3);
  if (!pending) {
    pending = fetchSubregions(isoA3);
    cache.set(isoA3, pending);
  }
  return pending;
}

async function fetchSubregions(isoA3: string): Promise<SubregionFeature[]> {
  try {
    const metaResponse = await fetch(
      `https://www.geoboundaries.org/api/current/gbOpen/${isoA3}/ADM1/`,
    );
    if (!metaResponse.ok) return [];
    const meta = (await metaResponse.json()) as GeoBoundariesMeta;
    const geoJsonUrl = meta.simplifiedGeometryGeoJSON ?? meta.gjDownloadURL;
    if (!geoJsonUrl) return [];

    const geoResponse = await fetch(toDirectDownloadUrl(geoJsonUrl));
    if (!geoResponse.ok) return [];
    const geoJson = (await geoResponse.json()) as {
      features?: RawGeoJsonFeature[];
    };
    return (geoJson.features ?? []).map((feature) => ({
      type: 'Feature' as const,
      properties: {
        name: feature.properties?.shapeName ?? 'Unnamed region',
        parentIso3: isoA3,
      },
      geometry: simplifyGeometry(feature.geometry),
    }));
  } catch {
    return [];
  }
}
