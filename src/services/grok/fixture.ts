import type { GeneratedHistoryProfile } from '../../types/world';

/**
 * Deterministic fallback profile used when the proxy is offline or no key
 * is configured. Doubles as an integration test fixture and as a demo
 * safety net so the globe path always leads somewhere.
 */
export const seattleFixture: GeneratedHistoryProfile = {
  cityName: 'Seattle',
  region: 'Washington, United States',
  description:
    'A Salish Sea port that grew from cedar longhouses to a Klondike-era boomtown to a Pacific tech capital.',
  eras: [
    {
      id: 'seattle-1780',
      label: '1780',
      year: 1780,
      subtitle: 'Duwamish and Suquamish homelands',
      historicalContext:
        'Before European contact, Coast Salish peoples lived in cedar longhouses along Elliott Bay and the mouth of the Duwamish River, traveling in oceangoing canoes between fishing camps, clam beaches, and inland cedar groves.',
      background: '#c6d2c0',
      primitives: [
        {
          id: 'shore',
          shape: 'box',
          position: [0, 0.05, 5],
          scale: [30, 0.1, 12],
          color: '#8a9376',
        },
        {
          id: 'tideflat',
          shape: 'box',
          position: [0, 0.04, 12],
          scale: [30, 0.08, 6],
          color: '#8fa192',
        },
        {
          id: 'bay',
          shape: 'box',
          position: [0, -0.05, -8],
          scale: [30, 0.1, 20],
          color: '#5f7a86',
        },
        {
          id: 'longhouse-1',
          shape: 'box',
          position: [-6, 1.2, 3],
          scale: [8, 2.4, 4],
          color: '#7a5943',
        },
        {
          id: 'longhouse-2',
          shape: 'box',
          position: [4, 1.2, 4],
          scale: [7, 2.2, 3.6],
          color: '#8b6a52',
        },
        {
          id: 'canoe',
          shape: 'box',
          position: [10, 0.4, 8],
          scale: [4, 0.6, 1.2],
          color: '#4b3a2c',
        },
        {
          id: 'cedar-1',
          shape: 'cylinder',
          position: [-13, 4, 2],
          scale: [1.4, 8, 1.4],
          color: '#5b6b46',
        },
        {
          id: 'cedar-2',
          shape: 'cylinder',
          position: [-15, 4, -1],
          scale: [1.6, 8, 1.6],
          color: '#516241',
        },
        {
          id: 'cedar-3',
          shape: 'cylinder',
          position: [13, 4, 1],
          scale: [1.4, 8, 1.4],
          color: '#5b6b46',
        },
        {
          id: 'fire-pit',
          shape: 'cylinder',
          position: [0, 0.15, 5],
          scale: [0.9, 0.3, 0.9],
          color: '#3a3128',
        },
      ],
      pois: [
        {
          id: 'village',
          name: 'Cedar Longhouse Village',
          markerPosition: [0, 4, 3.5],
          objectIds: ['longhouse-village', 'cook-fire'],
        },
        {
          id: 'canoe-landing',
          name: 'Canoe Landing',
          markerPosition: [10, 3, 8],
          objectIds: ['ocean-canoe'],
        },
        {
          id: 'grove',
          name: 'Cedar Grove',
          markerPosition: [-14, 8, 0],
          objectIds: ['old-growth-cedar'],
        },
      ],
      objects: [
        {
          id: 'longhouse-village',
          name: 'Cedar Longhouse',
          poiId: 'village',
          sceneObjectId: 'longhouse-1',
          description:
            'A plank-and-beam house sheltering an extended family, oriented to the beach.',
          whyItMatters:
            'Longhouses were the political and ceremonial center of Coast Salish life for millennia.',
        },
        {
          id: 'cook-fire',
          name: 'Central Cook Fire',
          poiId: 'village',
          sceneObjectId: 'fire-pit',
          description:
            'A shared hearth for cooking salmon, tending elders, and telling winter stories.',
          whyItMatters:
            'Fire was communal infrastructure; villages were organized around it, not around private stoves.',
        },
        {
          id: 'ocean-canoe',
          name: 'Ocean-Going Canoe',
          poiId: 'canoe-landing',
          sceneObjectId: 'canoe',
          description:
            'A cedar dugout capable of open-water voyages to Vancouver Island and beyond.',
          whyItMatters:
            'Canoes were the highway system of the Salish Sea, moving people, goods, and diplomacy.',
        },
        {
          id: 'old-growth-cedar',
          name: 'Old-Growth Western Red Cedar',
          poiId: 'grove',
          sceneObjectId: 'cedar-2',
          description:
            'A centuries-old cedar, harvested selectively for planks, canoes, baskets, and clothing.',
          whyItMatters:
            'The cedar was the material foundation of coastal culture — nearly every daily object began as a piece of one.',
        },
      ],
    },
    {
      id: 'seattle-1897',
      label: '1897',
      year: 1897,
      subtitle: 'Gold Rush gateway',
      historicalContext:
        "News of the Klondike strike arrived on the SS Portland in July 1897 with 'a ton of gold' aboard. Seattle reinvented itself overnight as the outfitter of the North, its waterfront lined with steamships and its streets packed with prospectors.",
      background: '#d7c9a7',
      primitives: [
        {
          id: 'harbor-water',
          shape: 'box',
          position: [0, -0.05, -10],
          scale: [32, 0.1, 18],
          color: '#4d5e6a',
        },
        {
          id: 'pier',
          shape: 'box',
          position: [0, 0.4, -2],
          scale: [12, 0.6, 6],
          color: '#5b4a34',
        },
        {
          id: 'steamship',
          shape: 'box',
          position: [-2, 1.8, -8],
          scale: [10, 3.2, 3],
          color: '#3d3a34',
        },
        {
          id: 'steamship-stack',
          shape: 'cylinder',
          position: [-2, 5, -8],
          scale: [0.7, 3, 0.7],
          color: '#2b2825',
        },
        {
          id: 'outfitter-store',
          shape: 'box',
          position: [-8, 3, 6],
          scale: [6, 6, 5],
          color: '#a86a45',
        },
        {
          id: 'brick-hotel',
          shape: 'box',
          position: [0, 4, 8],
          scale: [7, 8, 6],
          color: '#8f5a3d',
        },
        {
          id: 'saloon',
          shape: 'box',
          position: [7, 2.5, 6],
          scale: [5, 5, 4],
          color: '#b58c5c',
        },
        {
          id: 'plank-street',
          shape: 'box',
          position: [0, 0.1, 3],
          scale: [22, 0.2, 3],
          color: '#7a6a52',
        },
        {
          id: 'wagon',
          shape: 'box',
          position: [-5, 0.7, 3],
          scale: [2, 1.4, 1],
          color: '#4b3a2c',
        },
        {
          id: 'lamppost',
          shape: 'cylinder',
          position: [3, 1.5, 3.5],
          scale: [0.2, 3, 0.2],
          color: '#1f1c19',
        },
        {
          id: 'coal-heap',
          shape: 'cylinder',
          position: [-11, 0.9, -2],
          scale: [1.8, 1.8, 1.8],
          color: '#1e1c1a',
        },
      ],
      pois: [
        {
          id: 'waterfront',
          name: 'Steamship Waterfront',
          markerPosition: [-2, 6, -6],
          objectIds: ['klondike-steamer', 'pier-planks'],
        },
        {
          id: 'outfitter-row',
          name: 'Outfitter Row',
          markerPosition: [-8, 7, 6],
          objectIds: ['ton-of-goods-store'],
        },
        {
          id: 'boomtown-blocks',
          name: 'Boomtown Blocks',
          markerPosition: [0, 9, 8],
          objectIds: ['brick-boom-hotel', 'gaslit-street'],
        },
      ],
      objects: [
        {
          id: 'klondike-steamer',
          name: 'Klondike-Bound Steamer',
          poiId: 'waterfront',
          sceneObjectId: 'steamship',
          description:
            'A coal-fired coastal steamer loading prospectors and cargo bound for Skagway.',
          whyItMatters:
            'Steamships turned Seattle into the mandatory pit-stop for the Yukon, funneling wealth back through its merchants.',
        },
        {
          id: 'pier-planks',
          name: 'Working Pier',
          poiId: 'waterfront',
          sceneObjectId: 'pier',
          description:
            "A timber pier stacked with barrels, crates, and outfitters' bundles.",
          whyItMatters:
            'The waterfront was the interface between the wilderness economy and industrial capital.',
        },
        {
          id: 'ton-of-goods-store',
          name: 'Klondike Outfitter',
          poiId: 'outfitter-row',
          sceneObjectId: 'outfitter-store',
          description:
            "A general store selling the Canadian-mandated 'ton of goods' required to cross into the Yukon.",
          whyItMatters:
            'Selling the ton was more reliably profitable than digging for it; local merchants engineered the rule together with promoters.',
        },
        {
          id: 'brick-boom-hotel',
          name: 'Boomtown Hotel',
          poiId: 'boomtown-blocks',
          sceneObjectId: 'brick-hotel',
          description:
            'A brick hotel built after the 1889 fire, rented by the day to transient miners.',
          whyItMatters:
            'The Great Fire and the Rush together funded the shift from wood shanties to a fireproof brick downtown.',
        },
        {
          id: 'gaslit-street',
          name: 'Gaslit Plank Street',
          poiId: 'boomtown-blocks',
          sceneObjectId: 'lamppost',
          description: 'A gas street lamp lighting a plank-laid main street.',
          whyItMatters:
            "Public utilities followed capital: gas mains and later electric grids trailed the Rush's spending.",
        },
      ],
    },
    {
      id: 'seattle-2005',
      label: '2005',
      year: 2005,
      subtitle: 'Pacific tech capital',
      historicalContext:
        "By the early 2000s, Boeing was joined by Microsoft, Amazon, and a wave of dot-com survivors. The waterfront's timber piers gave way to condo towers, the Space Needle stood in a densifying skyline, and coffee-fueled software campuses spread across South Lake Union.",
      background: '#b8c4d0',
      primitives: [
        {
          id: 'water-plate',
          shape: 'box',
          position: [0, -0.05, -12],
          scale: [34, 0.1, 14],
          color: '#3d5464',
        },
        {
          id: 'waterfront-park',
          shape: 'box',
          position: [0, 0.1, -3],
          scale: [22, 0.2, 4],
          color: '#5c7a54',
        },
        {
          id: 'condo-1',
          shape: 'box',
          position: [-10, 7, 4],
          scale: [4, 14, 4],
          color: '#c8cbcf',
        },
        {
          id: 'condo-2',
          shape: 'box',
          position: [-5, 6, 6],
          scale: [4, 12, 4],
          color: '#a9b1b7',
        },
        {
          id: 'office-tower',
          shape: 'box',
          position: [4, 8, 5],
          scale: [5, 16, 5],
          color: '#7a8a94',
        },
        {
          id: 'stadium',
          shape: 'cylinder',
          position: [11, 2.4, 8],
          scale: [4, 4.8, 4],
          color: '#4a4e55',
        },
        {
          id: 'space-needle-shaft',
          shape: 'cylinder',
          position: [-2, 6, 10],
          scale: [0.7, 12, 0.7],
          color: '#d0cfc9',
        },
        {
          id: 'space-needle-disk',
          shape: 'cylinder',
          position: [-2, 12, 10],
          scale: [2.4, 0.9, 2.4],
          color: '#e4b26b',
        },
        {
          id: 'freeway',
          shape: 'box',
          position: [0, 0.8, 0],
          scale: [24, 0.4, 2],
          color: '#4c5057',
        },
        {
          id: 'monorail',
          shape: 'box',
          position: [-2, 4, 6],
          scale: [12, 0.6, 1],
          color: '#c9c4bb',
        },
        {
          id: 'coffee-cart',
          shape: 'box',
          position: [6, 0.8, -1],
          scale: [1.6, 1.6, 1.6],
          color: '#6f4a2b',
        },
      ],
      pois: [
        {
          id: 'skyline',
          name: 'Downtown Skyline',
          markerPosition: [0, 14, 5],
          objectIds: ['glass-office-tower', 'condo-block'],
        },
        {
          id: 'seattle-center',
          name: 'Seattle Center',
          markerPosition: [-2, 14, 10],
          objectIds: ['space-needle'],
        },
        {
          id: 'waterfront-2005',
          name: 'Reclaimed Waterfront',
          markerPosition: [0, 3, -3],
          objectIds: ['espresso-cart'],
        },
      ],
      objects: [
        {
          id: 'glass-office-tower',
          name: 'Software Company Tower',
          poiId: 'skyline',
          sceneObjectId: 'office-tower',
          description:
            'A glass-and-steel office building in a downtown packed with software firms.',
          whyItMatters:
            'The 2000s software boom recast Seattle from a resource port into a services-and-platforms economy.',
        },
        {
          id: 'condo-block',
          name: 'Waterfront Condo Tower',
          poiId: 'skyline',
          sceneObjectId: 'condo-1',
          description:
            'A high-rise residential tower on land that once held cargo piers.',
          whyItMatters:
            'Rezoning the waterfront for housing traded working-class industry for tax base — and pushed prices upward.',
        },
        {
          id: 'space-needle',
          name: 'Space Needle',
          poiId: 'seattle-center',
          sceneObjectId: 'space-needle-shaft',
          description:
            "The 1962 World's Fair tower, now the city's unmistakable civic logo.",
          whyItMatters:
            "Built as a futurist advertisement, it outlasted the era it advertised and became Seattle's shorthand.",
        },
        {
          id: 'espresso-cart',
          name: 'Espresso Cart',
          poiId: 'waterfront-2005',
          sceneObjectId: 'coffee-cart',
          description:
            'A sidewalk espresso stand serving a workforce that runs on caffeine.',
          whyItMatters:
            'Seattle exported espresso culture globally in the 90s and 2000s; the cart is a small piece of that export.',
        },
      ],
    },
  ],
};
