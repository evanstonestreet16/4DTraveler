import raw from './cities.json';
import { countryName } from './countries';

export interface City {
  name: string;
  isoA3: string;
  lat: number;
  lng: number;
}

/** Baked by `npm run geo:build`. Only the pinned countries appear here. */
const byCountry = new Map<string, City[]>();
for (const city of raw as City[]) {
  const existing = byCountry.get(city.isoA3);
  if (existing) existing.push(city);
  else byCountry.set(city.isoA3, [city]);
}

// Stable identity, so callers memoising on the result don't rebuild every render.
const NONE: City[] = [];

export function citiesFor(isoA3: string | null): City[] {
  if (!isoA3) return NONE;
  return byCountry.get(isoA3) ?? NONE;
}

export function findCity(isoA3: string, name: string): City | undefined {
  return byCountry.get(isoA3)?.find((city) => city.name === name);
}

/** Pin hover: "Rome, Italy". Country hover uses the country name alone. */
export function countryHoverLabel(isoA3: string, city?: string): string {
  const country = countryName(isoA3) ?? isoA3;
  return city ? `${city}, ${country}` : country;
}

export const pinnedCountries = [...byCountry.keys()];
