import type { Era, HistoricalObject } from '../../types/world';

/** Provisional editorial data, kept separate from scene authoring. No 1892 equipment continuity. */
export const pittsburgh1850Content = {
  id: 'pittsburgh-1850',
  locationId: 'pittsburgh',
  locationName: 'Pittsburgh',
  era: {
    id: '1850',
    label: '1850 · Blockout',
    year: 1850,
    subtitle: 'Market and riverfront study · historical review pending',
  },
  poiNames: {
    '1850-market': 'Market / Blockout',
    '1850-wharf': 'Wharf / Blockout',
  },
  objects: [
    {
      id: '1850-market-stall',
      name: 'Market Stall',
      poiId: '1850-market',
      sceneObjectId: '1850-market-stall',
      description:
        'A provisional market stall represented with simple timber-colored forms. Its appearance and location have not yet been verified.',
      whyItMatters:
        'This scene explores trading places beside a riverfront. This particular stall is illustrative and has not been historically identified.',
    },
    {
      id: '1850-street-frontage',
      name: 'Street Frontage',
      poiId: '1850-market',
      sceneObjectId: '1850-street-frontage',
      description:
        'A low building volume framing the market study. Its height, materials, footprint, and placement are illustrative.',
      whyItMatters:
        'Street frontage gives the trading space a readable boundary. Identifying actual buildings for 1850 requires further historical review.',
    },
    {
      id: '1850-wharf-landing',
      name: 'Wharf Landing',
      poiId: '1850-wharf',
      sceneObjectId: '1850-wharf-landing',
      description:
        'A provisional landing beside the shared river strip. Its construction and location are illustrative, rather than a surveyed 1850 wharf.',
      whyItMatters:
        'The landing lets you explore the meeting of land and water transport. The specific site and its historical use still need verification.',
    },
    {
      id: '1850-cargo-stack',
      name: 'Cargo Stack',
      poiId: '1850-wharf',
      sceneObjectId: '1850-cargo-stack',
      description:
        'Simple crates mark a possible cargo-handling area in the blockout. No commodity, operator, or recorded shipment is being claimed.',
      whyItMatters:
        'The crates make the landing’s proposed activity visible. Evidence for an actual 1850 cargo area remains part of the historical review.',
    },
  ],
} satisfies {
  id: string;
  locationId: string;
  locationName: string;
  era: Era;
  poiNames: Record<string, string>;
  objects: HistoricalObject[];
};

/** Reference leads, not evidence for these invented footprints; no map imagery is shipped. */
export const pittsburgh1850Editorial = {
  status: 'blockout — Content signoff pending',
  references: [
    {
      title: 'Map of the County of Allegheny, Pennsylvania',
      year: 1850,
      url: 'https://historicpittsburgh.org/islandora/object/pitt%3ADARMAP0090',
      scope:
        'Catalog confirms an inset of parts of Pittsburgh and Allegheny. Context for future review; not traced geometry.',
      rights: 'Copyright Not Evaluated. Link only; no image copied.',
    },
    {
      title:
        'Pittsburgh and Allegheny map in the American Geographical Society Library',
      year: 1852,
      url: 'https://collections.lib.uwm.edu/digital/collection/agdm/id/32267/',
      scope:
        'Adjacent-era reference lead supplied for Content review; does not establish exact 1850 buildings or equipment.',
      rights: 'Link only; no image copied.',
    },
  ],
};
