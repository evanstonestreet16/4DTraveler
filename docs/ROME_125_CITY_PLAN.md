# Rome / 125 CE — immersive city generation plan

**Status:** P0–P2 implemented; rendered overview/panorama milestone implemented\
**Consumes:** [`IMMERSIVE_CITY_PLAN.md`](./IMMERSIVE_CITY_PLAN.md)  
**World ID:** `rome-125`  
**Historical frame:** Rome during the reign of Hadrian, in 125 CE  
**Delivery priority:** Overview and Forum first, followed by Pantheon and Colosseum; all three are implemented

**Rendered delivery:** Rome now uses desktop/portrait overview stills and three 6K equirectangular panoramas, with 4K mobile variants, nine camera-authored hotspots and compressed still fallbacks. Navigation, content, IDs, fixed viewpoints, written narration and object lists are preserved. See [asset delivery](./visual/ROME_125_ASSETS.md) for rebuilding and budgets. These are detailed stylized interpretations; photorealism and specialist reconstruction certification are not claimed.

## 1. Experience thesis

**Owner's clarified quality target (2026-09-12):** the supplied photographic Roman architectural reference sets the realism bar. Current stylized renders do not meet it. Establish one photorealistic Forum view before expanding the art pass to 360° and the remaining locations. Match the reference's physical detail, material variation, atmospheric depth and lighting; its ruined state and later surroundings are not evidence for the 125 CE reconstruction.

**Authorized atmosphere pass:** use AI-assisted imagery for nonhistorical skies/background appearance and increase detail across the current overview and three POIs. Generated sky and generic stone inputs stay in the offline authoring pipeline with documented prompts/provenance; architecture, camera positions and hotspot anchors remain authored and stable. This pass advances the current assets without closing the photographic quality target.

Rome in 125 CE should feel like a living capital layered across time, not a collection of isolated ruins. The visitor enters an oblique bird's-eye view of the monumental center, then descends into bounded public spaces that work naturally as fixed-position 360-degree sets.

The experience should emphasize three simultaneous conditions:

- Trajan's monumental program is complete and still visually dominant.
- Hadrian's rebuilding of the Pantheon is new or nearing completion.
- The Temple of Venus and Roma has been under construction since 121 CE and is not yet the completed temple known from later reconstructions.

This is a selective, source-aware interpretation of central Rome. It is not a surveyed reconstruction of every street or a claim that uncertain colors, crowds, temporary structures, and minor buildings are known exactly.

The retained GLBs establish composition, scale, camera positions, objects, and the complete interaction path. The rendered delivery adds materials, lighting, people, plants and architectural detail in Blender, so that work does not become browser geometry. Runtime imagery and hotspots use the additive shared contract documented in the general plan.

## 2. Scope and cut line

### P0 — required Rome vertical slice

- One full-viewport overview of central Rome at real-world scale, simplified outside the three POI silhouettes.
- One polished immersive POV in the main piazza of the Forum of Trajan.
- Three inspectable hero objects in that POV.
- Overview and Forum narration transcripts, with audio added only after editorial review.
- Primitive or low-detail fallback geometry for the overview and hero POV.
- Model-loading, audio-failure, WebGL-failure, and return-to-overview recovery.

### P1 — first stretch

- Pantheon forecourt immersive POV.
- Three inspectable objects and a location narration.
- Prefetch after the overview becomes interactive.

### P2 — second stretch

- Colosseum valley immersive POV.
- Three inspectable objects, including the incomplete Temple of Venus and Roma works.
- Location narration and restrained construction ambience.

Do not begin P1 until the Forum scene passes four-direction review in the browser. Do not begin P2 until P1 has a working selectable-object path. If time is short, ship all three overview markers but label unavailable stretch POVs as previews rather than loading unfinished scenes.

## 3. Historical snapshot and exclusions

The date is a production constraint, not merely a label. The scene must exclude later landmarks and later states that are easy to introduce accidentally.

| Include in 125 CE                                                                                       | Exclude or alter                                                                        |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Forum of Trajan, Basilica Ulpia, equestrian statue, Column of Trajan, and associated decorative program | Arch of Constantine, dedicated in 315 CE                                                |
| Hadrianic Pantheon as a newly rebuilt or recently completed monument                                    | Modern Piazza della Rotonda fountain and obelisk; Christian fittings; later bell towers |
| Flavian Amphitheatre in active use, with an intact exterior                                             | The familiar damaged ruin silhouette and exposed post-antique masonry                   |
| Meta Sudans fountain near the amphitheatre                                                              | Fascist-era roads and demolished fountain state                                         |
| Temple of Venus and Roma as work begun in 121 CE                                                        | The completed temple inaugurated in 136/137 and completed under Antoninus Pius          |
| Domitianic/Trajanic Palatine and Forum silhouettes                                                      | Aurelian Walls, begun in the late third century                                         |
| Dense tile-roofed urban fabric, streets, porticoes, and public monuments                                | Modern churches, roads, railings, signs, excavation cuts, and present ground level      |

The temple north of Trajan's Column has debated reconstruction and chronology. It should be outside the hero sightline or represented only as low-detail, non-inspectable massing until its 125 CE state receives specialist review. Hadrian's Mausoleum is also outside the required crop and should not consume production time.

## 4. Overview composition

### Geographic frame

Use a local metric coordinate system with the center of the Forum of Trajan as `[0, 0, 0]`, `+X` east, `+Y` up, and `+Z` south. Geographic north is therefore `-Z`. Preserve this convention in Blender, exported GLBs, data, and documentation.

The overview covers an approximately 2.2 km by 1.8 km central-city crop:

- Tiber and Campus Martius to the west/northwest.
- Pantheon in the northwest quadrant.
- Capitoline, Roman Forum, and Imperial Fora near the center.
- Palatine and Flavian Amphitheatre to the east/southeast.
- The northern edge of the Circus Maximus as a southern framing shape.

The city remains at 1:1 scale. Compression happens through reduced architectural detail and a controlled crop, not by moving monuments closer together.

### Camera and marker blockout

These are the retained GLB blockout values. Desktop and portrait source-camera poses are recorded in `public/images/rome-125/manifest.json`; `sourceProjectedMarkers` retains their projections and `markers` records reviewed positions on the enhanced overview images. The portrait image uses a separate composition to keep all three markers visible after phone cropping. Ground-level eye anchors remain in Rome world data.

| Element                     | Proposed position     | Target / purpose                                                                 |
| --------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| Overview camera             | `[-1450, 1250, 1650]` | Target `[50, 40, 180]`; oblique view from southwest toward the monumental center |
| `forum-trajan` marker       | `[0, 42, 0]`          | Hero marker at the origin                                                        |
| `pantheon-forecourt` marker | `[-590, 52, -300]`    | Separate northwest silhouette from the forum marker                              |
| `colosseum-valley` marker   | `[680, 68, 630]`      | East/southeast anchor over the amphitheatre                                      |

Composition rules:

- Keep the Tiber as a broad left/foreground curve rather than a narrow blue stripe.
- Make the Capitoline a central elevation break, with the Imperial Fora reading as a pale ordered axis.
- Preserve the Pantheon dome, Colosseum ellipse, Circus Maximus trough, and Palatine ridge as the four fastest orientation silhouettes.
- Use haze and progressively simpler massing beyond the POIs; do not model thousands of unique buildings.
- Keep POI markers clear of roofs and one another at 390 px portrait, 844 px portrait, and 1440 × 900 desktop.
- Do not let the static camera see the rectangular terrain edge, a void behind the skyline, or the underside of the Tiber plane.

### Overview layers

1. Terrain: simplified hills, valley floors, Tiber channel, and riverbanks.
2. Landmark silhouettes: POIs plus Capitoline, Palatine, Roman Forum, Circus Maximus, aqueduct fragments only where compositionally useful.
3. Urban fabric: six to ten instanced insula/domus/warehouse roof families, varied by footprint and height.
4. Streets and open spaces: broad route ribbons and plaza surfaces; no attempt at street-by-street completeness.
5. Atmosphere: warm late-morning sun, pale Mediterranean haze, soft river reflection, and minimal distant smoke.

## 5. POI plan and stable IDs

| Priority | POI ID               | Visitor-facing name         | Why it belongs in 125 CE                                                                                                                                                 | 360-degree production value                                                                                                 |
| -------- | -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| P0 hero  | `forum-trajan`       | Forum of Trajan             | The forum was inaugurated in 112 and completed with the Column in 113; it remains the monumental expression of Trajan's rule under Hadrian.                              | A bounded piazza provides intentional architecture in every direction, with a strong central statue and flanking porticoes. |
| P1       | `pantheon-forecourt` | The New Pantheon            | The present building is conventionally dated to Hadrian's rebuilding around 118–125, while current scholarship keeps aspects of its patronage and exact completion open. | A colonnaded forecourt controls sightlines and creates a dramatic approach to the porch without requiring an interior.      |
| P2       | `colosseum-valley`   | Flavian Amphitheatre Valley | The amphitheatre and Meta Sudans are established features; Hadrian's Temple of Venus and Roma has been under construction since 121.                                     | Turning in place reveals spectacle architecture, flowing water, the Palatine edge, and an active imperial building site.    |

The UI may include the familiar term “Colosseum” in a subtitle or search label, but primary narration should introduce it as the Flavian Amphitheatre before using the later familiar name.

## 6. Hero POV — Forum of Trajan

### Set and camera

Build only the main piazza and the architecture required to close its sightlines. Use the documented approximate piazza footprint of 110 × 86 m as the starting envelope.

- Local camera: `[0, 1.65, 30]`.
- Initial target: `[0, 12, -40]`, toward the Basilica Ulpia.
- Pitch range: `-35°` to `+55°`.
- North (`-Z`): Basilica Ulpia façade dominates the view.
- East/west: double-height porticoes, exedra thresholds, statues, and controlled glimpses of adjacent masonry.
- South (`+Z`): segmented entrance colonnade and a compressed glimpse toward the older imperial fora.
- Center: gilt-bronze equestrian statue of Trajan, offset only when supported by the adopted forum plan.

Trajan's Column is behind the Basilica Ulpia and must not be made visible through the basilica merely because it is iconic. It can appear in the aerial overview and later receive its own viewpoint if scope expands.

### Inspectable objects

| Object ID                  | Exact `sceneObjectId`              | Name                        | Description                                                                                                                                                 | `whyItMatters`                                                                                                                                | Confidence                                                                                                               |
| -------------------------- | ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `trajan-equestrian-statue` | `rome125_trajan_equestrian_statue` | Equestrian Statue of Trajan | A monumental gilt-bronze image of Trajan stood as the visual focus of the forum's main square.                                                              | The emperor's image turned an administrative public space into a lasting statement of military victory and imperial authority.                | Documented object and role; exact surface color, pose detail, and centimeters are inferred from evidence and comparison. |
| `basilica-ulpia-facade`    | `rome125_basilica_ulpia_facade`    | Basilica Ulpia              | The vast basilica closed the north side of the square and contained a five-aisled civic hall behind its monumental façade.                                  | Basilicas supported law, administration, and public business, showing that imperial monumentality framed the daily work of government.        | Plan, scale, and role are documented; upper façade reconstruction and paint are inferred.                                |
| `dacian-prisoner-statue`   | `rome125_dacian_prisoner_statue`   | Dacian Prisoner Statue      | Monumental figures of Dacians formed part of the forum's triumphal decorative program; surviving examples combine colored stone and carefully carved dress. | The figures make visible how conquest, extraction, and representations of defeated peoples were built into the forum's celebration of empire. | Decorative type documented; selected east-portico placement is provisional and must be reviewed.                         |

### Visual direction

- Use clean pale stone masses, darker red/purple stone accents, bronze at the central statue, and terracotta only in surrounding glimpses.
- Avoid the “all white ruin” look, but label exact wall paint, gilding, banners, and paving saturation as interpretive.
- Use shallow relief or normal detail for repeated ornament. Reserve modeled geometry for column silhouettes, statue profiles, stairs, cornices, and selectable nodes.
- Populate with sparse, non-interactive silhouette cards only if they improve scale. No animated NPC system is required.
- Choose an ordinary civic morning rather than a triumph or festival; this avoids unsupported spectacle dressing and keeps narration audible.

### Four-direction acceptance

- North: Basilica façade is uninterrupted and does not expose the Column through the roof.
- East and west: porticoes close the frame; repeated modules have enough variation to avoid obvious tiling.
- South: entrance architecture and background massing hide the set boundary.
- Up: roofs, cornices, and sky remain complete through maximum pitch.
- Down: paving fills the frame without holes; the statue selection collider does not capture ground clicks.

## 7. Stretch POV — Pantheon forecourt

### Set and camera

The visitor stands in the north forecourt and looks south toward the Pantheon. The forecourt's long colonnades deliberately hide much of the rotunda until the visitor turns toward the portico, reflecting the historically controlled approach.

- Local camera: `[0, 1.65, -42]` (moved 10 m north after browser composition review to include the complete pediment in the initial view).
- Initial target: `[0, 13, 0]`.
- Pitch range: `-35°` to `+65°`.
- South: Pantheon porch, pediment, Agrippa inscription, and portal.
- East/west: forecourt colonnades and dense adjoining façades.
- North: entrance threshold, street movement, and closed urban background.

Do not add the modern fountain or obelisk. Do not use the present raised street grade; the ancient visitor should step up toward the porch.

### Inspectable objects

| Object ID                      | Exact `sceneObjectId`                  | Name                     | Description                                                                                                            | `whyItMatters`                                                                                                                        | Confidence                                                                                  |
| ------------------------------ | -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pantheon-agrippa-inscription` | `rome125_pantheon_agrippa_inscription` | Agrippa Inscription      | Hadrian's rebuilt monument retained a prominent inscription naming Marcus Agrippa, the patron of the earlier Pantheon. | The inscription shows how Roman emperors could create something radically new while presenting it as continuity with an honored past. | Text and placement documented; ancient letter finish is inferred.                           |
| `pantheon-granite-columns`     | `rome125_pantheon_granite_columns`     | Egyptian Granite Columns | Monolithic granite columns carried the porch's Corinthian order and had been transported from Egypt to Rome.           | Their scale and travel distance made the empire's reach tangible in the material of the capital itself.                               | Material and monolithic form documented; individual color variation is interpretive.        |
| `pantheon-forecourt-colonnade` | `rome125_pantheon_forecourt_colonnade` | Pantheon Forecourt       | Long colonnades framed the approach, limiting the view so the traditional temple front dominated before entry.         | The approach demonstrates that Roman architecture shaped movement and surprise, not only monumental façades.                          | Forecourt framing documented; bay count and minor decoration require reconstruction review. |

The rotunda and dome remain essential scenery but are not a required selectable object from this exterior-only POV. A future interior scene would require a separate scope decision.

## 8. Stretch POV — Colosseum valley

### Set and camera

Place the fixed viewpoint in the open valley west of the amphitheatre, between the amphitheatre approach and the Temple of Venus and Roma platform. Use an ordinary non-event day with modest pedestrian silhouettes.

- Local camera: `[0, 1.65, 0]`.
- Initial target: `[80, 18, 0]`, toward the amphitheatre.
- Pitch range: `-35°` to `+60°`.
- East: intact exterior arcades of the Flavian Amphitheatre.
- Southeast: Meta Sudans and converging routes.
- West: the active Temple of Venus and Roma construction zone.
- South: Palatine slope and imperial architecture as low-detail closure.
- North: Via Sacra approach and the Arch of Titus silhouette, without the later Arch of Constantine.

The construction stage of the Temple of Venus and Roma in the exact year 125 is not known closely enough for a confident frame-by-frame reconstruction. Show a plausible, restrained worksite—podium, stacked material, partial columns, timber lifting gear—but label its arrangement illustrative.

### Inspectable objects

| Object ID                | Exact `sceneObjectId`            | Name                           | Description                                                                                                                               | `whyItMatters`                                                                                                                         | Confidence                                                                                           |
| ------------------------ | -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `colosseum-outer-arcade` | `rome125_colosseum_outer_arcade` | Flavian Amphitheatre Arcade    | Stacked arcades formed the monumental exterior of the first-century amphitheatre and organized entry into its vaulted circulation system. | The façade joined engineering, crowd control, and imperial display at an unprecedented scale.                                          | Building and general system documented; banners, crowd density, and surface color are inferred.      |
| `meta-sudans`            | `rome125_meta_sudans`            | Meta Sudans                    | This Flavian fountain used a tall conical form near important roads and the amphitheatre valley.                                          | Its flowing water marked a major urban junction and reminds visitors that monumental Rome was also structured by water infrastructure. | Location and overall form documented through archaeology and depictions; fine ornament is uncertain. |
| `venus-roma-worksite`    | `rome125_venus_roma_worksite`    | Temple of Venus and Roma Works | Hadrian's enormous temple project began here in 121 CE; in 125 it was still years from inauguration.                                      | The worksite pins the experience to a particular year and shows the capital as continuously rebuilt rather than timeless and complete. | Project start and later inauguration documented; exact 125 construction state is illustrative.       |

## 9. Narration plan

Scripts are editorial drafts, not recording-ready copy. Workstream 4 must check every factual statement, agree on pronunciations, and preserve the final transcript beside the audio asset.

### Overview draft — 65–80 seconds

> Welcome to Rome in 125 CE, during the reign of Hadrian. This city is not a single finished vision. Temples, forums, arenas, homes, streets, and waterworks from many generations crowd the hills and valleys beside the Tiber. Trajan's forum is complete, its marble spaces still proclaiming conquest and imperial rule. In the Campus Martius, the Pantheon has been rebuilt on a daring scale. Near the Flavian Amphitheatre, work continues on Hadrian's vast Temple of Venus and Roma. Choose a point of interest to leave this aerial view and look around from street level.

### Forum of Trajan draft — 55–70 seconds

> You are standing in the main square of the Forum of Trajan, inaugurated little more than a decade ago. Ahead, the Basilica Ulpia frames a vast hall used for public business. In the square, a gilded equestrian statue makes Trajan the permanent focus of the space. Along the architecture, images of Dacian captives and captured arms turn military conquest into decoration. The forum is beautiful, but its materials and messages came from imperial power, war, and extraction. Look around the piazza, then inspect the statue, basilica, and Dacian figure.

### Pantheon draft — 45–60 seconds

> You approach the Pantheon through a long colonnaded forecourt. The porch appears traditional, but behind it stands an immense circular building and concrete dome. Monolithic granite columns arrived from Egypt, while the inscription names Agrippa, builder of an earlier Pantheon on this site. Hadrian's rebuilding uses old memory to frame a startling new work. The exact purpose and patronage of the building remain subjects of debate, so this scene presents the well-supported architecture without claiming certainty where the evidence is incomplete.

### Colosseum valley draft — 45–60 seconds

> The Flavian Amphitheatre has stood here for more than forty years, its arcades guiding large crowds into a complex structure of stairs, corridors, and seating. Nearby, water moves over the conical Meta Sudans fountain. Turn west and Rome's date becomes visible: Hadrian's Temple of Venus and Roma is still a construction site. Work began in 121, but the completed sanctuary lies years in the future. This view combines an established center of spectacle with a capital still remaking itself.

### Pronunciation review

Review and record one approved style—Anglicized or reconstructed/classical—without switching styles mid-track. At minimum check: `Hadrian`, `Trajan`, `Ulpia`, `Dacia/Dacian`, `Agrippa`, `Meta Sudans`, `Venus`, and `Roma`.

## 10. Audio and environmental direction

All audio waits for an explicit visitor action. Ambience should loop quietly under narration and must remain useful when crowds are represented only by silhouettes.

| Scene            | Ambient bed                                               | Optional positional cues                              | Avoid                                             |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Overview         | wind, distant city murmur, faint birds                    | Tiber water at west edge                              | cinematic battle music, roaring crowds everywhere |
| Forum            | footsteps, low conversation, sandals/carts on paving      | fountain or metal/stone work only if visually present | triumphal ceremony, military chanting             |
| Pantheon         | subdued forecourt voices, footsteps, distant street carts | light reverberation near porch                        | Christian bells, modern piazza sounds             |
| Colosseum valley | diffuse crowd and traffic, flowing fountain               | restrained timber/stone work near temple site         | constant arena combat, lions, modern traffic      |

## 11. Blender construction strategy

### Shared Rome kit

- Column generator with Doric, Ionic, and Corinthian silhouette tiers.
- Arch and vault modules for the amphitheatre and substructures.
- Portico/exedra modules with controllable bay counts.
- Roof kit with terracotta pitches, parapets, clerestories, and flat service roofs.
- Insula/domus massing kit with 6–10 footprint variants and shared window/awning modules.
- Stone trim sheet, roof atlas, plaster/brick atlas, and a small decal atlas for inscriptions and relief hints.
- Terrain/hill mesh, road ribbon helper, Tiber bank helper, and instanced cypress/umbrella-pine silhouettes used sparingly.

### Overview build

1. Establish metric coordinates and POI anchor empties.
2. Block terrain, river, hills, and the four orientation silhouettes.
3. Render the production overview camera at all target aspect ratios.
4. Fill only visible urban gaps with instanced massing.
5. Add POI proxy bounds and verify marker occlusion in the browser.
6. Merge background geometry by material while preserving landmark groups.

### POV build and final render

1. Start each POV in its own `.blend` file with camera at 1.65 m.
2. Build a 60–120 m detail ring around the camera and a cheaper 120–250 m closure ring.
3. Keep named object anchors matching the stable object IDs.
4. Render north, east, south, and west from the exact runtime camera and pitch limits.
5. Correct exposed backs, intersections, scale cues, and repetitive modules.
6. Render one equirectangular 360° panorama per POI, then compress it for desktop and mobile.
7. Record each object anchor as yaw/pitch hotspot data and verify it in the browser viewer.

### Proposed source and runtime paths

```text
blender/source/rome-125/overview.blend
blender/source/rome-125/forum-trajan.blend
blender/source/rome-125/pantheon-forecourt.blend
blender/source/rome-125/colosseum-valley.blend

public/models/rome-125/overview.glb
public/models/rome-125/forum-trajan.glb
public/models/rome-125/pantheon-forecourt.glb
public/models/rome-125/colosseum-valley.glb

# Preferred final runtime visuals
public/images/rome-125/overview.webp
public/images/rome-125/forum-trajan-360.webp
public/images/rome-125/pantheon-forecourt-360.webp
public/images/rome-125/colosseum-valley-360.webp

public/audio/rome-125/overview.wav
public/audio/rome-125/forum-trajan.wav
public/audio/rome-125/pantheon-forecourt.wav
public/audio/rome-125/colosseum-valley.wav
```

Proposed data modules, after the shared overview/POV contract lands:

```text
src/data/worlds/rome-125.scene.ts
src/data/worlds/rome-125.content.ts
src/data/worlds/rome-125.ts
```

Add the smallest shared panorama/hotspot fields needed by Rome and Kyoto. Keep the current GLB fields temporarily for migration and remove them only after the panorama path works.

## 12. Runtime image budgets

| Asset                    | Target                                                   |
| ------------------------ | -------------------------------------------------------- |
| Overview                 | WebP/AVIF, 1.5 MB or less                                |
| Desktop POI panorama     | 4K–8K equirectangular, 6 MB or less after visual testing |
| Mobile POI panorama      | 2K–4K equirectangular, 3 MB or less                      |
| Decoded detailed visuals | Overview plus one active panorama                        |

Spend offline render complexity where it improves the image. At runtime keep only the overview and active panorama decoded by default. If a deadline cut is needed, reduce panorama resolution or number of POVs before cutting the hero composition, historical objects, or complete 360° closure.

## 13. Evidence, confidence, and reuse

“Documented” means the source supports the limited claim in this plan. “Inferred” means a reconstruction derived from surviving evidence or comparison. “Illustrative” means an art or staging choice that must not be presented as established fact.

All links below were checked on 12 September 2026. They are research links only. No source image, commercial model, scan, or copyrighted reconstruction is approved for copying into project assets by its inclusion here.

| Ref | Source                                                                                                                                                         | Supported use                                                                                                          | Limits / reuse note                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | [Uffizi Galleries, “Following in Trajan's Footsteps”](https://www.uffizi.it/en/online-exhibitions/following-in-trajan-s-footsteps-hypervision)                 | Forum dates and dimensions, Basilica Ulpia plan, equestrian statue, Column position/date, Dacian decorative program    | Strong institutional synthesis. Reconstruction details still require checking; link only.                                                              |
| R2  | [Museum of the Imperial Fora, introduction to Trajan's Forum](https://www.mercatiditraiano.it/en/collezioni/percorsi_per_sale/introduzione_al_foro_di_traiano) | Surviving Trajanic statuary and materials from the forum                                                               | Findspot and object evidence do not establish every original placement; link only.                                                                     |
| R3  | [Uffizi Galleries, restoration of the Dacian statues](https://www.uffizi.it/en/news/dacian-restoration-boboli)                                                 | Porphyry/white-marble material treatment and attribution to Forum decoration                                           | Attribution is expressed as likely; do not present exact placement as certain. Link only.                                                              |
| R4  | [Italian Ministry of Culture, Pantheon](https://direzionemuseiroma.cultura.gov.it/en/pantheon/)                                                                | Hadrianic reconstruction dated 118–125                                                                                 | Brief official summary; it does not settle all scholarly dating/patronage questions.                                                                   |
| R5  | [Turismo Roma, Pantheon](https://www.turismoroma.it/en/places/pantheon)                                                                                        | Reversed orientation, porticoed square, major dimensions                                                               | Municipal visitor summary; use with R4/R6 rather than as sole reconstruction evidence.                                                                 |
| R6  | [Smarthistory, Pantheon](https://smarthistory.org/the-pantheon/)                                                                                               | Forecourt experience, Egyptian granite columns, inscription problem, concrete structure, current scholarly uncertainty | Educational scholarly synthesis; verify any production measurement against specialist plans. Images have their own licenses.                           |
| R7  | [Parco archeologico del Colosseo, the Colosseum](https://colosseo.it/en/area/the-colosseum/)                                                                   | Flavian construction, ancient spectacle use, circulation/engineering framing                                           | Official overview, not a complete architectural survey.                                                                                                |
| R8  | [Parco archeologico del Colosseo, Meta Sudans](https://colosseo.it/en/area/arch-of-constantine-and-meta-sudans/)                                               | Fountain form, urban-junction role, archaeological and representational basis for reconstruction                       | Fine ornament remains uncertain; exclude the later Arch of Constantine from 125.                                                                       |
| R9  | [Parco archeologico del Colosseo, Temple of Venus and Roma](https://colosseo.it/en/marvels/temple-of-venus-and-roma/)                                          | Work begun in 121, inauguration in 136/137, completion in 141, dimensions and overall design                           | Surviving fabric includes later restoration; exact 125 work stage is not supplied.                                                                     |
| R10 | [Stanford Digital Forma Urbis Romae Project](https://formaurbis.stanford.edu/docs/FURproject.html)                                                             | Urban footprints and topographic comparison                                                                            | The marble plan is Severan, about 80 years later, and only 10–15% survives. It cannot be copied uncritically into 125. Observe site image/data rights. |
| R11 | [Pleiades](https://pleiades.stoa.org/)                                                                                                                         | Scholarly place identifiers and broad geospatial cross-checking                                                        | Place records do not by themselves prove a building's exact 125 state. Check each record's license.                                                    |
| R12 | [University of Virginia IATH, Rome Reborn 1.0](https://www.iath.virginia.edu/news/iath_romereborn_news.html)                                                   | Method precedent for simplifying a large ancient city into a digital model                                             | The model depicts 320 CE, not 125, and is not an asset source. Do not copy geometry, textures, or distinctive reconstruction choices.                  |

Before modeling fine architectural details, add plan/elevation references for each built POV and record their license or link-only status in the asset manifest. Modern photographs may document surviving geometry but must not be treated as direct evidence for ancient color, grade, repairs, or surrounding buildings.

## 14. Delivery sequence and ownership

### Contract/integration gate

- Confirm the shared city/overview/immersive-POI contract described by `IMMERSIVE_CITY_PLAN.md`.
- Freeze world, POI, object, and `sceneObjectId` values from this plan.
- Add one focused validation test for panorama paths and hotspot IDs.

### Workstream 1 — visual pipeline

- Upgrade the Rome overview and Forum composition for offline rendering first.
- Render and compress the overview and Forum panorama, then add Pantheon and the valley only if time permits.
- Record final image dimensions/file sizes and hotspot yaw/pitch values.

#### Next milestone — dedicated Rome bird's-eye detail agent

**Status (2026-09-12): completed and integrated by the dedicated overview agent and integration owner.** The new desktop/portrait images were reviewed against Kyoto's delivered overview and add denser architecture, surface detail, vegetation and riverfront life. Editable Blender layout and exact image-enhancement prompts are retained. All overview variants meet image budgets; build, focused asset validation and desktop/mobile smoke tests passed. See [delivery and regeneration](./visual/ROME_125_ASSETS.md).

- **Independent assignment:** a dedicated overview agent within Workstream 1 runs alongside the Forum/POI realism pass, Kyoto work, and runtime work; it does not depend on completing the Forum reference frame.
- **Visual scope:** compare both overviews at matching desktop and portrait sizes, then improve Rome's urban density, varied roofs and blocks, street/courtyard definition, landmark detail, terrain and riverbanks, vegetation, material variation, lighting, and atmospheric depth. Preserve geographic scale and the historical exclusions in section 3. Kyoto sets the detail benchmark, not Rome's architectural style.
- **Exclusive ownership:** `blender/source/rome-125/overview.blend`, overview-only render outputs, and `public/images/rome-125/overview*` assets. Use overview-specific helper files if needed; leave shared renderer/packager scripts, shared texture inputs, POI scenes/panoramas, Kyoto assets, viewer code, prose, and audio to their existing owners.
- **Integration boundary:** preserve current overview camera framing, stable IDs, asset paths, and marker positions where practical. Hand any necessary camera/marker or image-metadata changes to the integration owner as exact values; that owner alone updates `src/data/worlds/rome-125.scene.ts` and the shared image manifest. No shared contract changes are expected. Stage overview outputs separately so a POI render/package run cannot overwrite them.
- **Deliverable and acceptance:** editable overview source plus compressed desktop, portrait, and fallback images within existing budgets. Review Rome and Kyoto side by side for comparable visible detail and finish; all three Rome landmarks and markers must remain clear, with no exposed scene edges. On integration, verify asset loading at desktop and mobile sizes and one Rome path: city selection → overview → POI → object → return. The integration owner runs the production build and smoke test if runtime/data integration changes are required.

### Workstream 2 — navigation

- Use the data-owned overview and POV cameras; do not duplicate Rome coordinates in components.
- Confirm static overview input lock, fixed-position look, reduced motion, mobile marker separation, and return behavior.
- Ensure unavailable stretch POIs are communicated without a dead-end transition.

### Workstream 3 — objects

- Validate each exact hotspot-to-content mapping.
- Ensure drag-look does not activate a hotspot.
- Provide accessible object lists in the same order as this plan's object tables.

### Workstream 4 — content/audio/reliability

- Review claim wording and confidence labels before audio recording.
- Add source references to visitor-facing content and checked-in transcripts.
- Verify pronunciation, audio failure, mobile layout, and the offline demo path.

## 15. Rome-specific acceptance criteria

- The overview is recognizably central Rome from silhouette and topography before labels appear.
- All overview geography and camera values live in Rome world data, not generic UI components.
- The Forum POV contains hotspots for the three exact object IDs in this plan.
- No direction from any POV exposes a set boundary, missing back face, modern skyline, or unfinished façade.
- Trajan's Column is not incorrectly visible through the Basilica Ulpia from the main piazza.
- The Pantheon scene contains no modern fountain/obelisk and preserves the ancient stepped approach.
- The Colosseum is intact, the Arch of Constantine is absent, and the Temple of Venus and Roma is visibly incomplete.
- Uncertain reconstructions are labeled inferred or illustrative in content and review materials.
- Narration remains silent until explicitly started, and transcripts work without audio.
- Overview → Forum → object inspection → narration/transcript → overview works once without resetting city selection or retaining the inactive panorama.
- Run `npm run typecheck`, `npm run build`, the focused hotspot test, and one browser smoke path. Run broader tests only for shared runtime changes or release diagnosis.

## 16. Definition of done

Rome is ready for the hackathon demo when a visitor can select **Rome — 125 CE**, recognize the monumental center from a realistic full-screen rendered overview, enter the Forum of Trajan panorama, look through a complete fixed-position 360° view, inspect the equestrian statue, Basilica Ulpia, and Dacian figure through hotspots, hear or read a reviewed narration, and return to the unchanged overview.

Pantheon and Colosseum strengthen the date-specific story, but they do not block the Rome vertical slice. A polished, accurate Forum experience is preferable to three partially finished reconstructions.
