export interface GlobeCity {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  /**
   * When set, clicking this city routes to the curated static world
   * instead of asking Grok to generate one. Preserves the Pittsburgh
   * hero experience while everything else uses the LLM path.
   */
  staticLocationId?: string;
  /**
   * When true, clicking this city uses the bundled fixture instead of a
   * live Grok call (safety net for the demo when no key is configured).
   */
  useFixture?: boolean;
}

export const globeCities: GlobeCity[] = [
  {
    id: 'seattle',
    name: 'Seattle',
    region: 'Washington, United States',
    latitude: 47.6062,
    longitude: -122.3321,
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    region: 'California, United States',
    latitude: 34.0492,
    longitude: -118.232,
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    region: 'California, United States',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    id: 'pittsburgh',
    name: 'Pittsburgh',
    region: 'Pennsylvania, United States',
    latitude: 40.4406,
    longitude: -79.9959,
    staticLocationId: 'pittsburgh',
  },
  {
    id: 'rome',
    name: 'Rome',
    region: 'Lazio, Italy',
    latitude: 41.9028,
    longitude: 12.4964,
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    region: 'Kansai, Japan',
    latitude: 35.0116,
    longitude: 135.7681,
  },
];
