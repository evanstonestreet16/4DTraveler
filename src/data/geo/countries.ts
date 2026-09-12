import raw from './countries-110m.json';

export interface CountryFeature {
  type: 'Feature';
  properties: { name: string; isoA3: string };
  geometry: { type: string; coordinates: unknown };
}

interface CountryCollection {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

/** Low-resolution world country outlines (Natural Earth 1:110m, public domain). */
export const countries: CountryFeature[] = (raw as CountryCollection).features;
