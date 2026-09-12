import raw from './countries.json';

export interface CountryFeature {
  type: 'Feature';
  properties: { name: string; isoA3: string };
  geometry: { type: string; coordinates: unknown };
}

/** Natural Earth 1:50m admin-0 outlines, baked by `npm run geo:build`. */
export const countries = raw as CountryFeature[];
