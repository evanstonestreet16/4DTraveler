import { describe, expect, it } from 'vitest';
import { locations } from '../locations';
import {
  citiesFor,
  countryHoverLabel,
  findCity,
  pinnedCountries,
} from './cities';
import { countries } from './countries';

/** Matches PIN_COUNTRIES in scripts/build-geo.mjs. */
const PINNED = ['USA', 'JPN', 'ITA'];

describe('baked country layer', () => {
  it('keeps every country a re-bake should produce', () => {
    expect(countries).toHaveLength(242);
  });

  it('assigns a unique, non-placeholder code to every country', () => {
    // Duplicate or -99 codes would collapse separate countries into one hover target,
    // and Natural Earth's ISO_A3 fields contain both.
    const codes = countries.map((country) => country.properties.isoA3);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter((code) => !code || code === '-99')).toEqual([]);
  });

  it('names every country', () => {
    for (const country of countries)
      expect(country.properties.name).not.toBe('');
  });
});

describe('baked city pins', () => {
  it('pins exactly the three chosen countries', () => {
    expect(new Set(pinnedCountries)).toEqual(new Set(PINNED));
  });

  it.each(PINNED)('%s carries a usable set of pins', (iso) => {
    const cities = citiesFor(iso);
    expect(cities.length).toBeGreaterThanOrEqual(10);
    for (const city of cities) {
      expect(city.name).not.toBe('');
      expect(city.isoA3).toBe(iso);
      expect(Math.abs(city.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(city.lng)).toBeLessThanOrEqual(180);
    }
    const names = cities.map((city) => city.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('sits every pinned country inside the country layer', () => {
    const codes = new Set(countries.map((country) => country.properties.isoA3));
    for (const iso of pinnedCountries) expect(codes).toContain(iso);
  });

  it('returns a stable empty list for unpinned countries', () => {
    expect(citiesFor('FRA')).toHaveLength(0);
    expect(citiesFor(null)).toBe(citiesFor('FRA'));
    expect(citiesFor('USA')).toBe(citiesFor('USA'));
  });

  it('names each pin as city, country', () => {
    expect(countryHoverLabel('ITA', 'Rome')).toBe('Rome, Italy');
    expect(countryHoverLabel('ITA', 'Milan')).toBe('Milan, Italy');
    expect(countryHoverLabel('JPN', 'Kyoto')).toBe('Kyoto, Japan');
    expect(countryHoverLabel('FRA')).toBe('France');
  });

  it('backs every curated location with a real pin', () => {
    // The globe can only be entered through a pin, so a Location whose city is missing
    // from the bake is unreachable. Guards CURATED_CITIES drift in scripts/build-geo.mjs.
    const anchored = locations.filter((location) => location.globe);
    expect(anchored.length).toBeGreaterThan(0);
    for (const location of anchored) {
      const { countryIsoA3, city } = location.globe!;
      expect(findCity(countryIsoA3, city)).toBeDefined();
    }
  });
});
