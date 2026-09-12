# Rome 125 content and audio review

Source check: 12 September 2026. Owner: Workstream 4. This records an agent editorial check against institutional sources, not approval by an archaeological specialist. The runtime copy and transcripts live together in `src/data/worlds/rome-125.content.ts`; recordings must use that text or receive a new review.

## P0 evidence

| Content                                                           | Evidence checked                                                                                                                                 | Interpretation limits                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Forum opening; basilica, Column and equestrian statue arrangement | [Uffizi, Following in Trajan’s Footsteps](https://www.uffizi.it/en/online-exhibitions/following-in-trajan-s-footsteps-hypervision), sections 2–3 | Object pose, finish and upper architecture are reconstructed. No temple north of the Column is asserted.              |
| Dacian imagery and colored stone                                  | [Uffizi, restoration of the Dacian statues](https://www.uffizi.it/en/news/dacian-restoration-boboli)                                             | The museum describes the porphyry statues’ forum attribution as likely. Exact east-portico placement is illustrative. |
| Pantheon overview state                                           | [Italian Ministry of Culture, Pantheon](https://direzionemuseiroma.cultura.gov.it/en/pantheon/)                                                  | The official 118–125 range supports a newly rebuilt silhouette, not a precise completion date.                        |
| Temple under construction in the overview                         | [Parco archeologico del Colosseo, Temple of Venus and Roma](https://colosseo.it/en/marvels/temple-of-venus-and-roma/)                            | The park gives a 121 start and 136/137 inauguration; it does not establish a specific 125 worksite arrangement.       |

R1/R3 were read directly. The Ministry and archaeological park pages were verified through their indexed official text after direct fetch failures. The plan’s Museum of the Imperial Fora page (R2) could not be retrieved; it is not a production citation. All references are links only: no image, model, sound, or commercial reconstruction was copied.

The interpretation of imperial authority and representation of conquered people is editorial context, distinguished from measured reconstruction evidence. The Forum transcript is deliberately shorter than the draft timing: no audio duration is claimed.

## Narration delivery

P0 ships the reviewed overview and Forum transcripts without recorded or browser-synthesized narration, as permitted by the immersive plan’s scope gate. Text remains available with no network request. Recording and pronunciation approval remain future editorial work; no generated voice has been presented as approved narration. Use one agreed pronunciation style for Hadrian, Trajan, Ulpia and Dacian before recording.

The generic player only requests audio after Play or Replay. It supports pause, elapsed/total progress, retry after failure, and transcript access. Moving between points changes the displayed transcript but preserves audio already requested by the visitor. If a different recording is available, Play explicitly switches to it. Leaving the world stops playback and invalidates pending play promises.

Ambient audio has an independent manual play/pause control and a low volume ceiling. No ambient file is assigned at P0. Failed audio leaves the scene and written content usable.

## Verification scope

Focused browser tests cover narration no-autoplay, progress, pause, replay, recovery after a failed request, and cleanup on exit. Existing complete-path tests additionally cover narration alongside mesh selection and repeated camera transitions. Desktop/mobile visual and release evidence belongs in the milestone review; this source review does not claim measured graphics performance or specialist reconstruction approval.
