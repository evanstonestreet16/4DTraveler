import type { GeneratedHistoryProfile } from '../../types/world';

/**
 * Deterministic fallback profile used when the proxy is offline, the
 * API key is missing, or Grok output failed validation. Doubles as an
 * integration test fixture and as the demo safety net so the globe
 * path always leads somewhere.
 *
 * Two eras (matches the current app scope). The 2005 Space Needle
 * demonstrates the optional `parts[]` field for iconic silhouettes.
 */
export const seattleFixture: GeneratedHistoryProfile = {
  cityName: 'Seattle',
  region: 'Washington, United States',
  description:
    'A Salish Sea port that grew from cedar longhouses to a Pacific tech capital.',
  eras: [
    {
      id: 'seattle-1780',
      label: '1780',
      year: 1780,
      subtitle: 'Duwamish and Suquamish homelands',
      historicalContext:
        'Before European contact, Coast Salish peoples lived in cedar longhouses along Elliott Bay and the mouth of the Duwamish River, traveling in oceangoing canoes between fishing camps, clam beaches, and inland cedar groves.',
      background: '#c6d2c0',
      scenery: [
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
          id: 'cedar-far-1',
          shape: 'cylinder',
          position: [-15, 4, -1],
          scale: [1.6, 8, 1.6],
          color: '#516241',
        },
        {
          id: 'cedar-far-2',
          shape: 'cylinder',
          position: [13, 4, 1],
          scale: [1.4, 8, 1.4],
          color: '#5b6b46',
        },
      ],
      pois: [
        {
          id: 'village',
          name: 'Cedar Longhouse Village',
          markerPosition: [0, 4, 3.5],
          objects: [
            {
              id: 'longhouse',
              name: 'Cedar Longhouse',
              shape: 'box',
              position: [-6, 1.2, 3],
              scale: [8, 2.4, 4],
              color: '#7a5943',
              description:
                'A plank-and-beam house sheltering an extended family, oriented to the beach.',
              whyItMatters:
                'Longhouses were the political and ceremonial center of Coast Salish life for millennia.',
            },
            {
              id: 'cook-fire',
              name: 'Central Cook Fire',
              shape: 'cylinder',
              position: [0, 0.15, 5],
              scale: [0.9, 0.3, 0.9],
              color: '#3a3128',
              description:
                'A shared hearth for cooking salmon, tending elders, and telling winter stories.',
              whyItMatters:
                'Fire was communal infrastructure; villages were organized around it, not around private stoves.',
            },
          ],
        },
        {
          id: 'canoe-landing',
          name: 'Canoe Landing',
          markerPosition: [10, 3, 8],
          objects: [
            {
              id: 'ocean-canoe',
              name: 'Ocean-Going Canoe',
              shape: 'box',
              position: [10, 0.4, 8],
              scale: [4, 0.6, 1.2],
              color: '#4b3a2c',
              description:
                'A cedar dugout capable of open-water voyages to Vancouver Island and beyond.',
              whyItMatters:
                'Canoes were the highway system of the Salish Sea, moving people, goods, and diplomacy.',
            },
          ],
        },
        {
          id: 'grove',
          name: 'Cedar Grove',
          markerPosition: [-14, 8, 0],
          objects: [
            {
              id: 'old-growth-cedar',
              name: 'Old-Growth Western Red Cedar',
              shape: 'cylinder',
              position: [-13, 4, 2],
              scale: [1.4, 8, 1.4],
              color: '#5b6b46',
              description:
                'A centuries-old cedar, harvested selectively for planks, canoes, baskets, and clothing.',
              whyItMatters:
                'The cedar was the material foundation of coastal culture — nearly every daily object began as a piece of one.',
            },
          ],
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
      scenery: [
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
          id: 'stadium',
          shape: 'cylinder',
          position: [11, 2.4, 8],
          scale: [4, 4.8, 4],
          color: '#4a4e55',
        },
      ],
      pois: [
        {
          id: 'skyline',
          name: 'Downtown Skyline',
          markerPosition: [0, 14, 5],
          objects: [
            {
              id: 'glass-office-tower',
              name: 'Software Company Tower',
              shape: 'box',
              position: [4, 8, 5],
              scale: [5, 16, 5],
              color: '#7a8a94',
              description:
                'A glass-and-steel office building in a downtown packed with software firms.',
              whyItMatters:
                'The 2000s software boom recast Seattle from a resource port into a services-and-platforms economy.',
            },
            {
              id: 'condo-block',
              name: 'Waterfront Condo Tower',
              shape: 'box',
              position: [-10, 7, 4],
              scale: [4, 14, 4],
              color: '#c8cbcf',
              description:
                'A high-rise residential tower on land that once held cargo piers.',
              whyItMatters:
                'Rezoning the waterfront for housing traded working-class industry for tax base — and pushed prices upward.',
            },
          ],
        },
        {
          id: 'seattle-center',
          name: 'Seattle Center',
          markerPosition: [-2, 14, 10],
          objects: [
            {
              id: 'space-needle',
              name: 'Space Needle',
              // Primary is the central shaft — the clickable primitive.
              shape: 'cylinder',
              position: [-2, 5, 10],
              scale: [0.45, 10, 0.45],
              color: '#d0cfc9',
              parts: [
                // Three tripod legs, tilted outward from the shaft.
                {
                  shape: 'cylinder',
                  position: [-3.3, 3, 10],
                  scale: [0.28, 6, 0.28],
                  color: '#c9c4bb',
                  rotation: [0, 0, 15],
                },
                {
                  shape: 'cylinder',
                  position: [-0.7, 3, 10],
                  scale: [0.28, 6, 0.28],
                  color: '#c9c4bb',
                  rotation: [0, 0, -15],
                },
                {
                  shape: 'cylinder',
                  position: [-2, 3, 11.4],
                  scale: [0.28, 6, 0.28],
                  color: '#c9c4bb',
                  rotation: [15, 0, 0],
                },
                // Saucer main disc (golden) and the outer ring rim.
                {
                  shape: 'cylinder',
                  position: [-2, 10.4, 10],
                  scale: [2.2, 0.5, 2.2],
                  color: '#e4b26b',
                },
                {
                  shape: 'torus',
                  position: [-2, 10.6, 10],
                  scale: [2.5, 0.14, 2.5],
                  color: '#c8934a',
                },
                // Observation deck cabin above the saucer.
                {
                  shape: 'cylinder',
                  position: [-2, 11.2, 10],
                  scale: [1.2, 0.7, 1.2],
                  color: '#efc98a',
                },
                // Cone base + slim antenna tip.
                {
                  shape: 'cone',
                  position: [-2, 12.4, 10],
                  scale: [0.35, 1.4, 0.35],
                  color: '#d0cfc9',
                },
                {
                  shape: 'cylinder',
                  position: [-2, 13.8, 10],
                  scale: [0.07, 1.6, 0.07],
                  color: '#c9c4bb',
                },
              ],
              iconic: true,
              tripoPrompt:
                'low-poly miniature diorama model of the Space Needle in Seattle, 1962 futurism, thin white central shaft, three tripod legs, wide golden saucer at the top, thin antenna spire, clay-shaded, isometric, white background',
              description:
                "The 1962 World's Fair tower, now the city's unmistakable civic logo.",
              whyItMatters:
                "Built as a futurist advertisement, it outlasted the era it advertised and became Seattle's shorthand.",
            },
          ],
        },
        {
          id: 'waterfront-2005',
          name: 'Reclaimed Waterfront',
          markerPosition: [0, 3, -3],
          objects: [
            {
              id: 'espresso-cart',
              name: 'Espresso Cart',
              shape: 'box',
              position: [6, 0.8, -1],
              scale: [1.6, 1.6, 1.6],
              color: '#6f4a2b',
              description:
                'A sidewalk espresso stand serving a workforce that runs on caffeine.',
              whyItMatters:
                'Seattle exported espresso culture globally in the 90s and 2000s; the cart is a small piece of that export.',
            },
          ],
        },
      ],
    },
  ],
};
