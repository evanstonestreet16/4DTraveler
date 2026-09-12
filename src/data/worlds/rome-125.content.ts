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
  ] satisfies HistoricalObject[],
};
