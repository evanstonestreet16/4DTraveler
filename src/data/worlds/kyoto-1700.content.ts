import type { HistoricalObject } from '../../types/world';

const nijoRestorationSource = {
  id: 'kyoto-k4',
  title: 'Nijō Castle — Conservation and restoration',
  url: 'https://nijo-jocastle.city.kyoto.lg.jp/donation/info/?lang=en',
};
const ninomaruSource = {
  id: 'kyoto-k5',
  title: 'Nijō Castle — Ninomaru Palace and Garden',
  url: 'https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/ninomaru/?lang=en',
};
const kurumayoseSource = {
  id: 'kyoto-k14',
  title: 'Agency for Cultural Affairs — Ninomaru Tozamurai and Kurumayose',
  url: 'https://online.bunka.go.jp/heritages/detail/194360/1',
};
const kiyomizuHistorySource = {
  id: 'kyoto-k6',
  title: 'Kiyomizu-dera — History, Main Hall and stage',
  url: 'https://www.kiyomizudera.or.jp/en/learn/',
};
const kiyomizuGroundsSource = {
  id: 'kyoto-k7',
  title: 'Kiyomizu-dera — Temple grounds',
  url: 'https://www.kiyomizudera.or.jp/en/visit/',
};
const nishikiSource = {
  id: 'kyoto-k8',
  title: 'Nishiki Market Association — Market history',
  url: 'https://www.kyoto-nishiki.or.jp/en/about/',
};
const kyotoMarketSource = {
  id: 'kyoto-k9',
  title: 'Kyoto City — History of the wholesale market',
  url: 'https://www.city.kyoto.lg.jp/sankan/page/0000000030.html',
};
const machiyaSource = {
  id: 'kyoto-k10',
  title: 'The Metropolitan Museum of Art — Street Scenes in Kyoto',
  url: 'https://www.metmuseum.org/art/collection/search/45753',
};

/** Workstream 4. Written source review: docs/visual/KYOTO_1700_CONTENT_REVIEW.md. */
export const kyoto1700Content = {
  overview: {
    narrationTranscript:
      'Kyoto, around 1700, during the Genroku era. The imperial capital is also a city of merchants and temples under Tokugawa rule. Follow its streets across the basin toward the Kamo River and eastern hills. Nijō Castle represents shogunal authority; Kiyomizu-dera joins worship with its mountain setting; Nishiki reveals the work of supplying a city. This selective reconstruction combines documented landmarks with inferred roofs, streets, and everyday details. Choose a place to explore at ground level.',
  },
  pois: {
    'nijo-ninomaru': {
      narrationTranscript:
        'You stand between the Kara-mon Gate and Ninomaru Palace. Nijō Castle was expanded for the emperor’s visit in 1626, but no shogun has stayed here since 1634. This quieter courtyard is an interpretation of that interval. Elsewhere inside the castle, the five-story keep and original Honmaru Palace still stand; fires will destroy them in 1750 and 1788. Inspect the gate, palace, and Kurumayose carriage porch. Their fine decoration and surface condition are reconstructed, not an exact record of 1700.',
    },
    'kiyomizu-hillside': {
      narrationTranscript:
        'Kiyomizu-dera rises on Mount Otowa. The Main Hall and its timber stage were rebuilt in 1633. Kannon, the bodhisattva of compassion, is the focus of worship inside. The projecting stage serves devotion and sacred performance as well as offering a view across Kyoto. Below, Otowa’s clear water gives the temple its name. Inspect the hall, supporting frame, and waterfall. The setting is interpreted for around 1700; restored surfaces and the exact water fittings cannot simply be copied from today.',
    },
    'nishiki-fish-market': {
      narrationTranscript:
        'Nishiki is a working fish market in early Edo Kyoto. The market’s own history traces its official recognition to 1615; municipal records describe regulation developing across the seventeenth century. Cool groundwater helped preserve perishable goods. Street-facing shops shared their buildings with family rooms behind. The stalls, water point, and goods here are illustrative composites. Inspect the wholesaler, groundwater, and machiya shop-house to discover how food supply connected the city’s households and merchants.',
    },
  },
  objects: [
    {
      id: 'nijo-karamon',
      name: 'Kara-mon Gate',
      poiId: 'nijo-ninomaru',
      sceneObjectId: 'kyoto1700_nijo_karamon',
      description:
        'An inscription inside the gate’s roof frame dates to 1625, linking it to preparations for the emperor’s 1626 visit. Cypress bark, lacquer, carving, and metal fittings enrich the palace approach.',
      whyItMatters:
        'The threshold presents Tokugawa authority through ceremony and ornament as well as enclosure.',
      confidence:
        'The inscription and materials are documented. The exact 1700 roof silhouette, decorative arrangement, colors, and wear are inferred; surviving surfaces include later restoration.',
      sources: [nijoRestorationSource],
    },
    {
      id: 'nijo-ninomaru-palace',
      name: 'Ninomaru Palace',
      poiId: 'nijo-ninomaru',
      sceneObjectId: 'kyoto1700_nijo_ninomaru_palace',
      description:
        'Six connected buildings form this shoin-zukuri palace, with spaces for waiting, presenting gifts, official audiences, and the shogun’s private use.',
      whyItMatters:
        'The sequence of rooms gave architectural form to rank and access within the shogun’s Kyoto residence.',
      confidence:
        'The complex and room functions are documented. Exterior finishes, minor roof details, and the quiet courtyard staging are interpretive.',
      sources: [ninomaruSource, nijoRestorationSource],
    },
    {
      id: 'nijo-kurumayose',
      name: 'Kurumayose Carriage Porch',
      poiId: 'nijo-ninomaru',
      sceneObjectId: 'kyoto1700_nijo_kurumayose',
      description:
        'The carriage porch marks the formal entrance beside the Tozamurai waiting rooms. Its designated early-Edo structure has a cypress-bark roof, distinct from the tiled roof of the adjoining hall.',
      whyItMatters:
        'Arrival was the first step in a carefully ordered progression toward the palace’s reception and audience rooms.',
      confidence:
        'The component, roof materials, and 1625–1626 date are documented. Fine carving, color, and this scene’s proportions remain reconstructed.',
      sources: [kurumayoseSource, ninomaruSource],
    },
    {
      id: 'kiyomizu-main-hall',
      name: 'Kiyomizu Main Hall',
      poiId: 'kiyomizu-hillside',
      sceneObjectId: 'kyoto1700_kiyomizu_main_hall',
      description:
        'Rebuilt in 1633 on Mount Otowa’s steep slope, the timber Main Hall shelters the temple’s principal Kannon image in its innermost sanctuary.',
      whyItMatters:
        'Its hillside architecture serves a place of worship long visited by people from across society.',
      confidence:
        'Date, religious role, and surviving structure are documented. The 1700 surface condition and surrounding vegetation are inferred; later Zuigu-do Hall is excluded.',
      sources: [kiyomizuGroundsSource, kiyomizuHistorySource],
    },
    {
      id: 'kiyomizu-stage',
      name: 'Kiyomizu Stage',
      poiId: 'kiyomizu-hillside',
      sceneObjectId: 'kyoto1700_kiyomizu_stage',
      description:
        'The veranda projects nearly 13 meters above the slope on pillars joined by penetrating timber rails. The stage was reconstructed in 1633.',
      whyItMatters:
        'This engineering creates a place for worship and performances dedicated to Kannon, with the city spread out behind the worshiper.',
      confidence:
        'Broad dimensions, construction method, and date are documented by the temple. Individual timbers, weathering, and this view’s exact geometry are interpretive.',
      sources: [kiyomizuHistorySource],
    },
    {
      id: 'otowa-waterfall',
      name: 'Otowa Waterfall',
      poiId: 'kiyomizu-hillside',
      sceneObjectId: 'kyoto1700_otowa_waterfall',
      description:
        'Otowa’s clear water gives Kiyomizu-dera its name and belongs to the temple’s founding tradition. The water is associated with purification and prayer.',
      whyItMatters:
        'The waterfall connects this sacred place with the water and terrain of Mount Otowa.',
      confidence:
        'The place and religious association are documented. The exact 1700 channels, shelter, and utensils are uncertain; these visible details are illustrative.',
      sources: [kiyomizuGroundsSource],
    },
    {
      id: 'nishiki-fish-stall',
      name: 'Licensed Fish Wholesaler',
      poiId: 'nishiki-fish-market',
      sceneObjectId: 'kyoto1700_nishiki_fish_stall',
      description:
        'Nishiki belonged to Kyoto’s officially recognized fish-wholesaling markets by 1700. The market association dates its first recognition to 1615.',
      whyItMatters:
        'Food supply depended on regulated trade, transport, and the daily work of merchants beyond the city’s palaces and temples.',
      confidence:
        'The market function is documented; official summaries differ on the stages of authorization. This stall, proprietor, stock, tools, and layout are illustrative composites.',
      sources: [nishikiSource, kyotoMarketSource],
    },
    {
      id: 'nishiki-groundwater',
      name: 'Market Groundwater',
      poiId: 'nishiki-fish-market',
      sceneObjectId: 'kyoto1700_nishiki_groundwater',
      description:
        'The district’s cool groundwater helped preserve fish and other perishables, supporting Nishiki’s development as a market.',
      whyItMatters:
        'Water beneath the streets helped make food commerce possible before mechanical refrigeration.',
      confidence:
        'Groundwater’s importance is documented. This visible water point is inferred; the source does not establish its mechanism or a particular well in 1700.',
      sources: [nishikiSource],
    },
    {
      id: 'nishiki-machiya-shopfront',
      name: 'Machiya Shop-house',
      poiId: 'nishiki-fish-market',
      sceneObjectId: 'kyoto1700_nishiki_machiya_shopfront',
      description:
        'Kyoto merchants worked in street-facing shops while families lived in rooms behind. A late-seventeenth-century handscroll records this combination of trade and domestic life.',
      whyItMatters:
        'The shop-house helps explain the close relationship between household life and work along Kyoto’s streets.',
      confidence:
        'The period building pattern is documented. This façade, sign, furnishings, and clothing are illustrative; the handscroll is pictorial evidence, not a measured Nishiki street survey.',
      sources: [machiyaSource],
    },
  ] satisfies HistoricalObject[],
};
