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
    id: 'pittsburgh',
    name: 'Pittsburgh',
    region: 'Pennsylvania, United States',
    latitude: 40.4406,
    longitude: -79.9959,
    staticLocationId: 'pittsburgh',
  },
];
