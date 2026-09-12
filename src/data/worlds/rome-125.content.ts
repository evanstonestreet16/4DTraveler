import type { HistoricalObject } from '../../types/world';

const forumSource = {
  id: 'rome-r1',
  title: 'Uffizi Galleries — Following in Trajan’s Footsteps',
  url: 'https://www.uffizi.it/en/online-exhibitions/following-in-trajan-s-footsteps-hypervision',
};
const dacianSource = {
  id: 'rome-r3',
  title: 'Uffizi Galleries — The restoration of the Dacian statues',
  url: 'https://www.uffizi.it/en/news/dacian-restoration-boboli',
};
const pantheonSource = {
  id: 'rome-r5',
  title: 'Turismo Roma — The Pantheon',
  url: 'https://www.turismoroma.it/en/places/pantheon',
};
const pantheonColumnsSource = {
  id: 'rome-r13',
  title: 'Graßhoff and Berndt — Decoding the Pantheon Columns',
  url: 'https://www.cambridge.org/core/books/abs/proportional-systems-in-the-history-of-architecture/decoding-the-pantheon-columns/40FD18BB4FDF2D96E47ADF7EC5E58F48',
};
const pantheonResearchSource = {
  id: 'rome-r14',
  title: 'The Open University — Introducing the Pantheon',
  url: 'https://www.open.edu/openlearn/history-the-arts/hadrians-rome/content-section-2.1',
};

/** Workstream 4. Source-reviewed text; see ROME_125_CONTENT_REVIEW.md for limits. */
export const rome125Content = {
  overview: {
    narrationTranscript:
      'Rome, 125 CE, under Hadrian. Read the city as layers: Trajan’s forum is established, the Pantheon is shown newly rebuilt, and the Temple of Venus and Roma is still underway. The Pantheon’s precise completion remains debated; the temple project began in 121 and opened years after this view. This is an interpretation of the monumental center, with simplified surroundings. Choose a place to look around at street level.',
  },
  pois: {
    'forum-trajan': {
      narrationTranscript:
        'The Forum of Trajan opened in 112 CE. The Basilica Ulpia closes the square to the north. A gilded mounted emperor commands the piazza, while Dacian figures turn defeated people into imperial decoration. Look around, then inspect the statue, basilica, and Dacian figure. Their modeled details are interpretations, not surviving eyewitness views.',
    },
    'pantheon-forecourt': {
      narrationTranscript:
        'The Pantheon stands ahead, its porch approached through a framed forecourt. Granite column shafts traveled from Egypt; above them, the inscription names Agrippa, who commissioned an earlier building here. Behind the temple-like front lies a great circular hall and concrete dome. We show the monument newly rebuilt in 125, while its precise completion and the roles of Trajan and Hadrian remain debated. Inspect the inscription, columns, and forecourt. The colonnade arrangement and ancient finishes are interpretations; this visit stays outside the building.',
    },
  },
  objects: [
    {
      id: 'trajan-equestrian-statue',
      name: 'Equestrian Statue of Trajan',
      poiId: 'forum-trajan',
      sceneObjectId: 'rome125_trajan_equestrian_statue',
      description:
        'A gilt-bronze figure of Trajan on horseback formed the square’s central focus.',
      whyItMatters:
        'The emperor’s image made imperial authority part of everyday public space.',
      confidence:
        'Documented monument and material. This model’s pose, finish, and dimensions are interpretive.',
      sources: [forumSource],
    },
    {
      id: 'basilica-ulpia-facade',
      name: 'Basilica Ulpia',
      poiId: 'forum-trajan',
      sceneObjectId: 'rome125_basilica_ulpia_facade',
      description:
        'A civic hall with five aisles stood across the piazza’s north side. Trajan’s Column stood behind it.',
      whyItMatters:
        'Monumental architecture framed public business within the imperial forum.',
      confidence:
        'Documented plan and position. The upper façade and color scheme are inferred.',
      sources: [forumSource],
    },
    {
      id: 'dacian-prisoner-statue',
      name: 'Dacian Prisoner Statue',
      poiId: 'forum-trajan',
      sceneObjectId: 'rome125_dacian_prisoner_statue',
      description:
        'Dacian captives belonged to the forum’s victory imagery. Surviving statues associated with it combine red porphyry bodies with white marble extremities.',
      whyItMatters:
        'These figures invite us to examine how conquered peoples were represented by those who ruled them.',
      confidence:
        'The decorative type is documented. The Uffizi calls the surviving porphyry statues’ attribution likely; this figure’s east-portico placement is illustrative.',
      sources: [dacianSource, forumSource],
    },
    {
      id: 'pantheon-agrippa-inscription',
      name: 'Agrippa Inscription',
      poiId: 'pantheon-forecourt',
      sceneObjectId: 'rome125_pantheon_agrippa_inscription',
      description:
        'The rebuilt Pantheon names Marcus Agrippa, patron of an earlier building here, across the porch’s frieze.',
      whyItMatters:
        'The dedication connects a renewed monument to Rome’s earlier imperial history. A name on a building does not always identify its latest builder.',
      confidence:
        'The text and position are documented; the ancient letter finish is reconstructed. The inscription does not settle this rebuilding’s date or sole patron.',
      sources: [pantheonSource, pantheonResearchSource],
    },
    {
      id: 'pantheon-granite-columns',
      name: 'Egyptian Granite Columns',
      poiId: 'pantheon-forecourt',
      sceneObjectId: 'rome125_pantheon_granite_columns',
      description:
        'The porch’s granite shafts were cut as single pieces in Egyptian quarries and shipped to Rome, then raised beneath Corinthian capitals.',
      whyItMatters:
        'Their journey reveals the quarrying, transport, and skilled labor behind an imposing imperial façade.',
      confidence:
        'Monolithic shafts and Egyptian origins are documented. The modeled surface colors and carved details are interpretive; later replacement columns are not the 125 CE state.',
      sources: [pantheonColumnsSource, pantheonResearchSource],
    },
    {
      id: 'pantheon-forecourt-colonnade',
      name: 'Pantheon Forecourt',
      poiId: 'pantheon-forecourt',
      sceneObjectId: 'rome125_pantheon_forecourt_colonnade',
      description:
        'A porticoed square stood before the Pantheon. Here, long colonnades frame the approach to the porch above the ancient street level.',
      whyItMatters:
        'The approach helps us consider architecture as a sequence of views and movement, beyond the building’s familiar façade.',
      confidence:
        'The porticoed forecourt is documented. Bay count, decoration, surrounding façades, and this precise reconstructed ground level require specialist review.',
      sources: [pantheonSource],
    },
  ] satisfies HistoricalObject[],
};
