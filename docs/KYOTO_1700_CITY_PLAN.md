# Kyoto / circa 1700 — immersive city generation plan

**Status:** P0, P1 and P2 implemented

**Consumes:** [`IMMERSIVE_CITY_PLAN.md`](./IMMERSIVE_CITY_PLAN.md)

**World ID:** `kyoto-1700`

**Historical frame:** Kyoto around 1700, within the Genroku era (1688–1704)

**Delivery:** Overview, Nijō Castle, Kiyomizu-dera and Nishiki Market are available; recorded audio remains deferred

**Visual delivery:** High-quality rendered overview plus equirectangular 360° POI panoramas with hotspots

**Primary milestone:** ship the rendered Kyoto overview and Nijō panorama first. Preserve the stable city, POI, and object IDs below; add Kiyomizu-dera and Nishiki only after that path works.

Implementation notes: [asset delivery](visual/KYOTO_1700_ASSETS.md) and [content review](visual/KYOTO_1700_CONTENT_REVIEW.md). The original milestone order was followed: Nijō four-direction browser review, then Kiyomizu hotspot integration, then Nishiki. Runtime panorama assets are 4K. The overview illustration uses built-in ImageGen from the authored Blender layout, with reviewed image-space markers; the POI panoramas are original Cycles renders. The overview camera was refined to `[-2800, 2200, 3800]`. The production record above supersedes proposed blockout values and draft wording below; the historical exclusions and stable IDs remain binding.

## 1. Experience thesis

Kyoto around 1700 should feel like an imperial capital, a center of religion and craft, and a city governed within the Tokugawa political order. Its identity comes from the contrast between the rectilinear urban grid, the Kamo River, the enclosing mountains, fortified authority at Nijō Castle, hillside pilgrimage at Kiyomizu-dera, and dense merchant life at Nishiki.

The experience should emphasize three simultaneous conditions:

- Nijō Castle is nearly a century old and is no longer a frequently occupied shogunal residence, but it is still guarded and retains structures later lost to fire.
- Most of Kiyomizu-dera's current major ensemble has recently been reconstructed in 1633 and is active as a place of worship and visitation.
- Nishiki has operated as an officially recognized fish-wholesaling district since 1615, decades before its modern covered-arcade appearance.

This is a selective, source-aware interpretation of Kyoto around 1700. The exact year is a visual target within a short evidence window, not permission to mix all Edo-period features. Architecture and practices documented only after 1704 must be excluded or clearly labeled as comparative evidence.

Kyoto should use offline Blender rendering from the start. Detailed roofs, carved gates, foliage, clothing, market goods, lighting, and atmosphere may be expensive in the editable source because the browser receives compressed images rather than the complete scene. This is the preferred route to convincing realism within the deadline.

## 2. Scope and cut line

### P0 — required Kyoto vertical slice

- One realistic rendered overview of central Kyoto, simplified outside the three POI silhouettes.
- One polished immersive POV between the Kara-mon Gate and Ninomaru-goten Palace at Nijō Castle.
- Three inspectable hero objects in that POV.
- Overview and Nijō narration transcripts, with audio added only after historical and pronunciation review.
- Compressed fallback images plus the accessible object list.
- Image-loading, audio-failure, viewer-failure, and return-to-overview recovery.

### P1 — first stretch

- Kiyomizu-dera hillside immersive POV.
- Three inspectable objects and location narration.
- Prefetch the panorama only after the overview becomes interactive.

### P2 — second stretch

- A short section of Nishiki's fish market street.
- Three inspectable objects and location narration.
- A source-labeled reconstruction that avoids the modern arcade and storefronts.

Do not begin P1 until the Nijō panorama passes four-direction review in the browser. Do not begin P2 until Kiyomizu has a working hotspot-to-content path. The P0 path ships independently. If a stretch asset is incomplete, its overview marker may be shown as a labeled preview only when the UI cannot lead visitors into an empty or broken POV.

## 3. Historical snapshot and exclusions

The scene must represent circa 1700 rather than present-day Kyoto dressed with older materials.

| Include around 1700                                                                                                                      | Exclude or alter                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Nijō Castle's Ninomaru Palace, Kara-mon, 1662 East Gate, guardhouses, moats, walls, original Honmaru Palace, and five-story keep         | The current Honmaru Palace, moved to the site in 1893–1894                                                   |
| The five-story Nijō keep that survived until a lightning fire in 1750                                                                    | The present empty stone base as the 1700 state                                                               |
| The original Nijō Honmaru Palace that survived until the 1788 fire                                                                       | Modern Honmaru gardens and later palace arrangement                                                          |
| Kiyomizu Main Hall and stage reconstructed in 1633                                                                                       | Zuigu-do Hall, built in 1735, and later restorations presented as original 1700 fabric                       |
| Nishiki as a narrow fish-wholesaling street recognized in 1615                                                                           | Modern colored roof canopy, electric lighting, refrigeration, signs, packaging, and present storefronts      |
| Dense machiya shop-houses, earthen storehouses, tiled and shingled roofs, temples, and open drainage appropriate to the adopted evidence | Railways, rickshaws, bicycles, automobiles, utility poles, concrete riverbanks, neon, and modern road widths |
| Kamo River, Higashiyama, Kitayama, and Nishiyama as city-defining geography                                                              | A flat city plane with generic mountains pasted behind it                                                    |

The present Kyoto Imperial Palace buildings largely reflect later rebuilding and must not be copied directly into the 1700 overview. Represent the palace enclosure and roof massing conservatively from period plans or pictorial evidence, keep it non-inspectable, and label it inferred until a dedicated court-architecture review is complete.

Do not use modern geiko/maiko tourism imagery as shorthand for all urban life. Gion, modern festival infrastructure, cherry-blossom illumination, and contemporary temple customs are outside the required POIs. Clothing and merchant activity should be grounded in late-seventeenth-century sources and remain sparse, static scale cues rather than an NPC system.

## 4. Overview composition

### Geographic frame

Use a local metric coordinate system centered on Nijō Castle: `[0, 0, 0]`, with `+X` east, `+Y` up, and `+Z` south. Geographic north is `-Z`. Preserve the convention in Blender source, rendered viewpoints, data, and documentation.

The overview covers an approximately 5 km by 4.5 km central-city crop:

- Nijō Castle and western urban fabric in the west/center.
- Imperial Palace enclosure north of the commercial center.
- Nishiki and the denser lower-city grid southeast of Nijō.
- Kamo River as the strong north–south division near the eastern third.
- Kiyomizu-dera rising on the Higashiyama foothills in the southeast.
- Eastern, northern, and western mountain silhouettes closing the horizon.

The city remains at 1:1 scale. Simplify buildings and crop the city rather than moving POIs closer together.

### Camera and marker blockout

These values are proposed for blockout. Freeze them only after Blender renders and browser markers pass desktop review.

| Element                      | Proposed position     | Target / purpose                                                                   |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| Overview camera              | `[-3600, 3000, 4700]` | Target `[1400, 100, 700]`; view northeast across the grid toward the eastern hills |
| `nijo-ninomaru` marker       | `[0, 55, 0]`          | Hero marker over the Ninomaru enclosure                                            |
| `kiyomizu-hillside` marker   | `[3350, 210, 2150]`   | Elevated southeast marker separated from the market                                |
| `nishiki-fish-market` marker | `[1500, 28, 1000]`    | Dense central merchant-quarter marker                                              |

Validate the POI anchors against an approved geospatial reference before freezing world data. The values above are layout targets, not survey claims.

### Composition rules

- Make the street grid readable through roof and lane rhythm without tracing every parcel.
- Use the Kamo River as a wide compositional separator rather than a narrow blue strip.
- Keep Nijō's rectangular moats, the Imperial Palace enclosure, Kiyomizu's elevated stage, and the Higashiyama ridge legible before labels appear.
- Include Nijō's five-story keep in 1700 overview massing; the empty modern base is anachronistic for this date.
- Use atmospheric perspective to simplify eastern foothill temples and distant urban fabric.
- Keep all three marker stems clear of roofs at 1440 × 900 desktop.
- No camera angle may expose the cropped terrain edge, an empty mountain back, or the underside of the Kamo surface.

### Overview layers

1. Geography: mountain rings, foothills, Kamo River, smaller watercourses only where verified, and gentle city-basin relief.
2. Landmark silhouettes: Nijō, Imperial Palace enclosure, Kiyomizu, major temple roofs, and selected pagodas needed for orientation.
3. Urban fabric: eight to twelve instanced machiya, storehouse, temple, and courtyard families with varied footprints and rooflines.
4. Routes and open spaces: grid streets, bridge lines, castle approaches, temple approaches, and fields/gardens at the crop edge.
5. Atmosphere: clear early-autumn morning, green foliage with restrained seasonal variation, light mountain haze, and soft directional shadows.

Early autumn is an illustrative production choice. Do not add peak red foliage, cherry blossom, snow, or festival decorations unless the experience is deliberately re-scoped to a documented event and date.

## 5. POI plan and stable IDs

| Priority | POI ID                | Visitor-facing name            | Why it belongs around 1700                                                                                                                                                 | 360-degree production value                                                                                                          |
| -------- | --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P0 hero  | `nijo-ninomaru`       | Nijō Castle: Ninomaru Approach | The castle was built in 1603 and enlarged for the 1626 imperial visit. The Ninomaru complex survives, while the keep and original Honmaru Palace also still stood in 1700. | Palace, gate, walls, rooflines, and controlled approaches intentionally close every direction without requiring an interior.         |
| P1       | `kiyomizu-hillside`   | Kiyomizu-dera Hillside         | The Main Hall and stage were reconstructed in 1633 and were long associated with broad public visitation and the Otowa waterfall.                                          | Timber structure, steep terrain, water, forest, and a city vista create a visually distinct 360-degree set.                          |
| P2       | `nishiki-fish-market` | Nishiki Fish Market            | The shogunate officially recognized Nishiki among Kyoto's privileged fresh-fish wholesalers in 1615.                                                                       | A short, narrow market street is economical to close in every direction and adds daily work, food, water, and merchant architecture. |

Use macrons in editorial prose and visitor-facing names where the font supports them: `Nijō`, `Kiyomizu-dera`, and `Kara-mon`. Stable IDs remain ASCII and must never change to encode display typography.

## 6. Hero POV — Nijō Castle, Ninomaru approach

### Historical condition

Around 1700 the castle should feel maintained and guarded but quieter than during the 1626 imperial visit. The official history records that 1634 was the last shogunal stay until 1863 and describes a long period of decline. Do not stage the imperial visit, a mass daimyo procession, or the 1867 restoration-of-rule announcement.

The five-story keep and original Honmaru Palace remain present beyond the hero set because they were not lost until 1750 and 1788. The current Honmaru Palace is a later relocation and must not appear.

### Set and camera

Place the visitor in the controlled exterior space between the Kara-mon Gate and the Ninomaru-goten Palace. The camera looks north toward the palace entrance while a turn south reveals the gate.

- Local camera: `[0, 1.65, 0]`.
- Initial target: `[0, 6, -24]`.
- Pitch range: `-35°` to `+60°`.
- North (`-Z`): Ninomaru Palace roof sequence and Kurumayose entrance porch.
- South (`+Z`): Kara-mon Gate and enclosing plaster walls.
- East/west: guarded approach, walls, trees, storehouse/roof silhouettes, and controlled glimpses deeper into the castle.
- Distant west: keep silhouette only if verified sightline and roof occlusion permit it.

The current Kara-mon form may include later remodeling. Start from its securely documented 1625/1626 core and surviving early-Edo material, then flag roof silhouette and decorative layout for specialist review instead of assuming every modern detail is unchanged.

### Inspectable objects

Hotspots must be visually distinct. The Ninomaru Palace hotspot must not overlap the Kurumayose hotspot so the porch can be selected independently.

| Object ID              | Hotspot anchor ID                | Name                      | Description                                                                                                                                                      | `whyItMatters`                                                                                                                                       | Confidence                                                                                                           |
| ---------------------- | -------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `nijo-karamon`         | `kyoto1700_nijo_karamon`         | Kara-mon Gate             | An ornate gate controlled the ceremonial approach to the Ninomaru Palace; an inscription dated 1625 connects it to work for the following year's imperial visit. | Its carving, lacquer, metal fittings, and cypress-bark roof transform a defensive threshold into a display of Tokugawa authority.                    | Core date and materials documented; exact 1700 decorative arrangement and later remodeling require review.           |
| `nijo-ninomaru-palace` | `kyoto1700_nijo_ninomaru_palace` | Ninomaru Palace           | Six connected buildings form a fortified palace complex in the shoin-zukuri style, built for shogunal residence, reception, and government ritual.               | The palace makes visible how military government operated beside the emperor's capital through architecture, controlled access, and ceremonial rank. | Surviving complex and functions documented; exterior finish must distinguish original evidence from restoration.     |
| `nijo-kurumayose`      | `kyoto1700_nijo_kurumayose`      | Kurumayose Carriage Porch | The richly ornamented carriage porch marked the formal arrival point at the Ninomaru Palace.                                                                     | Arrival architecture directed elite visitors into a carefully ordered sequence before they reached reception and audience spaces.                    | Component and placement documented; fine color and carving reconstruction require close reference and rights review. |

Optional accessible-only detail after the three required objects pass testing:

- `nijo-tokugawa-crest-fittings` / `kyoto1700_nijo_tokugawa_crest_fittings`: restoration revealed Tokugawa hollyhock crests beneath later imperial chrysanthemum fittings. The physical highlight target must be large enough to select without competing with the gate.

### Visual direction

- Use dark tile and cypress-bark roofs, white earthen plaster, warm unfinished wood, black lacquer, restrained gold, and oxidized metal fittings.
- Do not turn the entire castle into glossy black-and-gold spectacle. Reserve saturated ornament for Kara-mon and Kurumayose focal areas.
- Treat exact pigments, gold coverage, vegetation, and surface wear as interpretive unless supported by conservation evidence.
- Use dry packed earth and gravel underfoot; confirm drainage channels and stone edges before modeling them as exact.
- Add only a few static guard and attendant silhouettes. They provide scale, not character interaction.

### Four-direction acceptance

- North: the palace roof sequence and Kurumayose read separately, with no overlap between hotspots.
- South: Kara-mon closes the view; the approach beyond it contains complete scenery rather than a flat backdrop.
- East/west: walls and roof massing hide the set boundary without obvious repetition.
- Up: roof backs and ridges remain complete through maximum pitch.
- Down: ground and drainage fill the view; large hotspot regions do not capture ordinary drag gestures.
- No modern Honmaru Palace, tourist path, barrier, sign, electric fixture, or reconstructed-empty keep base appears as the 1700 state.

## 7. Stretch POV — Kiyomizu-dera hillside

### Set and camera

Place the visitor on a lower hillside landing where the Main Hall and stage rise across the slope and the Otowa waterfall remains discoverable by turning and looking slightly down. This gives the famous timber structure visual scale without requiring free movement.

- Local camera: `[18, 1.65, 24]`.
- Initial target: `[0, 10, 0]`.
- Pitch range: `-45°` to `+65°`.
- North/northwest: Main Hall and projecting stage.
- East: Otowa waterfall, shrine approach, and forested slope.
- South/west: layered temple roofs, approach paths, trees, and a controlled view across Kyoto.

Exclude Zuigu-do Hall because the present building dates to 1735. Use period screens as evidence that people visited and experienced the grounds, but do not copy their stylized perspective as measured geometry.

### Inspectable objects

| Object ID            | Hotspot anchor ID              | Name               | Description                                                                                                                                    | `whyItMatters`                                                                                                           | Confidence                                                                                            |
| -------------------- | ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `kiyomizu-main-hall` | `kyoto1700_kiyomizu_main_hall` | Kiyomizu Main Hall | The Main Hall, reconstructed in 1633, contains the temple's principal Kannon image within a large timber structure on Mt. Otowa.               | It joins worship, pilgrimage, and difficult hillside engineering in a building used by visitors from many social groups. | Date, role, and surviving structure documented; restored surface condition requires review.           |
| `kiyomizu-stage`     | `kyoto1700_kiyomizu_stage`     | Kiyomizu Stage     | A broad veranda projects from the Main Hall almost 13 meters above the slope, supported by an interlocking timber frame reconstructed in 1633. | The stage turns a steep site into a shared place for viewing, gathering, and approaching the sacred hall.                | Dimensions, structure, and date documented by the temple; individual timber wear is interpretive.     |
| `otowa-waterfall`    | `kyoto1700_otowa_waterfall`    | Otowa Waterfall    | The temple takes its name from the clear water of Otowa, long used in purification and prayer.                                                 | The waterfall shows how sacred meaning, water, terrain, and the temple's identity are inseparable.                       | Place and religious role documented; exact 1700 channels, ladles, and shelter details require review. |

## 8. Stretch POV — Nishiki fish market

### Set and camera

Build a representative 45–60 m segment of Nishiki-kōji rather than the full market. The narrow street is open to the sky and lined by late-seventeenth-century machiya shop-houses. Bend the far street or use layered awnings, carts, and rooflines to hide both set ends.

- Local camera: `[0, 1.65, 0]`.
- Initial target: `[0, 1.8, -18]`.
- Pitch range: `-35°` to `+50°`.
- North/south: opposing shop fronts, storage, work surfaces, and narrow side passages.
- East/west along the lane: fish wholesaling activity, porters, barrels, baskets, and closed distant turns.

Choose early morning rather than a festival day. Fish, baskets, cutting tools, garments, shop signs, and weights must be sourced or labeled illustrative. Avoid sushi-tour imagery, electric lighting, plastic, glass display cases, modern refrigeration, or the current colored canopy.

### Inspectable objects

| Object ID                   | Hotspot anchor ID                     | Name                     | Description                                                                                                       | `whyItMatters`                                                                                                          | Confidence                                                                                                                    |
| --------------------------- | ------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `nishiki-fish-stall`        | `kyoto1700_nishiki_fish_stall`        | Licensed Fish Wholesaler | Nishiki was one of three Kyoto markets officially recognized by the shogunate for fresh-fish wholesaling in 1615. | The stall connects regulation, food supply, transport, and merchant work in a city far beyond its palaces and temples.  | Market function documented; this stall, proprietor, stock, and layout are illustrative composites.                            |
| `nishiki-groundwater`       | `kyoto1700_nishiki_groundwater`       | Market Groundwater       | Cool groundwater supported the storage and handling of perishable fish in the Nishiki district.                   | Local water conditions helped determine where a specialized urban market could operate before mechanical refrigeration. | Importance of groundwater documented; the visible well/cistern mechanism must be labeled inferred.                            |
| `nishiki-machiya-shopfront` | `kyoto1700_nishiki_machiya_shopfront` | Machiya Shop-house       | A street-facing shop area opened from a merchant townhouse, with family and storage spaces extending behind it.   | The building type joined commerce and domestic life, giving Kyoto's dense streets their characteristic working rhythm.  | Late-seventeenth-century Kyoto shop-house pattern documented; this façade is illustrative rather than an identified survivor. |

## 9. Narration plan

These scripts are editorial drafts, not recording-ready copy. Workstream 4 must verify claims, settle Japanese pronunciation and transliteration, and check in the final transcript beside each audio asset.

### Overview draft — 65–80 seconds

> Welcome to Kyoto around 1700, during the Genroku era. The emperor's capital remains a center of religion, craft, scholarship, and commerce, while political authority rests with the Tokugawa shogunate. The city's grid spreads across a mountain basin beside the Kamo River. To the west stands Nijō Castle, the shogun's Kyoto residence. Merchants work from narrow shop-houses in districts such as Nishiki, and pilgrims climb the eastern hills to Kiyomizu-dera. This view brings those different Kyotos together: court and castle, sacred landscape and market street. Choose a point of interest to descend from the city view.

### Nijō Castle draft — 55–70 seconds

> You stand between the Kara-mon Gate and the Ninomaru Palace at Nijō Castle. The complex was enlarged for an imperial visit in 1626, but by 1700 the great ceremonies are a memory and the castle is more quietly guarded. The Ninomaru buildings still order arrival, reception, and audience through architecture. Beyond this courtyard, a five-story keep and the original Honmaru Palace still rise inside the walls; both will be lost to later fires. Turn between gate and palace, then inspect the Kara-mon, the Ninomaru complex, and its carriage porch.

### Kiyomizu-dera draft — 45–60 seconds

> Kiyomizu-dera spreads across the steep slope of Mt. Otowa. Most of this ensemble was reconstructed in 1633 after repeated fires. The Main Hall projects outward on a timber stage supported by interlocking pillars and rails, while the clear water below gives the temple its name. People from many levels of society have long come here to worship Kannon and visit the hillside. Look up at the hall and stage, then turn toward the Otowa waterfall and the city beyond.

### Nishiki draft — 45–60 seconds

> This narrow street is part of Nishiki's fish market. In 1615 the shogunate recognized Nishiki as one of Kyoto's privileged fresh-fish wholesaling districts. Work begins early: fish arrives in baskets and tubs, merchants open the street-facing rooms of their shop-houses, and cool local groundwater helps with perishable goods. The exact stall before you is a source-based composite, not a surviving shop copied backward in time. Inspect the wholesaler's stall, the water point, and the machiya façade to see how commerce and household life shared the same street.

### Pronunciation and language review

Agree on one visitor-facing romanization standard and one narration style. At minimum review: `Kyoto/Kyōto`, `Genroku`, `Nijō`, `Tokugawa`, `shogun`, `Kara-mon`, `Ninomaru-goten`, `Kurumayose`, `Kiyomizu-dera`, `Kannon`, `Otowa`, `Nishiki-kōji`, and `machiya`.

Japanese names should not be translated into invented English labels. Provide concise glosses in the information panel where they help comprehension.

## 10. Audio and environmental direction

Narration never autoplays with sound. Ambient loops remain subtle and must not depend on visible animated crowds.

| Scene    | Ambient bed                                        | Optional positional cues                              | Avoid                                                              |
| -------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Overview | light wind, distant city, river, restrained birds  | stronger Kamo water toward the east                   | cinematic “samurai” music, temple bells everywhere                 |
| Nijō     | wind in pines, gravel footsteps, quiet guards      | gate wood/metal movement only when visually justified | battle sounds, nightingale-floor audio from an exterior courtyard  |
| Kiyomizu | forest, water, subdued visitors, wood creaks       | Otowa water below the camera                          | modern crowds, loud amplified announcements, constant bell ringing |
| Nishiki  | early market voices, baskets, wood, water, porters | fish stall and water point                            | modern cash registers, refrigeration hum, restaurant ambience      |

No generic shakuhachi or koto track should be used merely to signal “Japan.” Music requires its own historical and licensing review.

## 11. Blender rendering strategy

### Shared Kyoto kit

- Modular machiya frame with adjustable frontage, depth, lattice density, shop opening, plaster, and storage wing.
- Hip-and-gable, gabled, tiled, shingled, and cypress-bark roof generators with low/medium/high silhouette tiers.
- Earthen wall, stone base, timber gate, bridge, moat, drainage, and packed-earth path modules.
- Temple post-and-beam and bracket-complexity tiers; use high detail only near the fixed Kiyomizu camera.
- Castle plaster-wall, tile, turret, storehouse, Kara-mon ornament, and palace-roof modules.
- Instanced pine, cedar, bamboo, and broadleaf kits with season controls and conservative species placement.
- Detailed wood, plaster, tile, earth, ornament, crest, foliage, and market materials tuned for offline rendering.

### Overview build

1. Establish the metric world frame and three POI anchor empties.
2. Block mountain basin, Kamo River, Nijō moats, the palace enclosure, and Kiyomizu elevation.
3. Add Nijō's 1700 keep and original Honmaru massing from reviewed historical evidence.
4. Render the production camera at the desktop aspect ratio before filling the grid.
5. Fill visible gaps with instanced urban families and selected temple/pagoda silhouettes.
6. Test POI marker occlusion in the actual browser overlay.
7. Render and compress the final overview image after marker placement is approved.

### POV build and final render

1. Start every POV in its own `.blend` file with the runtime camera at 1.65 m.
2. Build a 40–100 m high-detail ring and a 100–220 m closure ring, adjusted for the Kiyomizu slope.
3. Keep named object anchors matching the stable object IDs.
4. Render geographic or local north, east, south, and west from the exact camera and pitch limits.
5. Check roof backs, eaves, terrain undersides, drainage gaps, repeated façades, and vegetation from every direction.
6. Render one equirectangular 360° panorama per POI, then compress it for the desktop viewer.
7. Record each object anchor as yaw/pitch hotspot data and verify alignment in the browser viewer.

### Proposed source and runtime paths

```text
blender/references/kyoto-1700/
blender/source/kyoto-1700/overview.blend
blender/source/kyoto-1700/nijo-ninomaru.blend
blender/source/kyoto-1700/kiyomizu-hillside.blend
blender/source/kyoto-1700/nishiki-fish-market.blend

public/images/kyoto-1700/overview.webp
public/images/kyoto-1700/nijo-ninomaru-360.webp
public/images/kyoto-1700/kiyomizu-hillside-360.webp
public/images/kyoto-1700/nishiki-fish-market-360.webp

public/audio/kyoto-1700/overview.wav
public/audio/kyoto-1700/nijo-ninomaru.wav
public/audio/kyoto-1700/kiyomizu-hillside.wav
public/audio/kyoto-1700/nishiki-fish-market.wav
```

Proposed data modules, after the shared overview/POV contract lands:

```text
src/data/worlds/kyoto-1700.scene.ts
src/data/worlds/kyoto-1700.content.ts
src/data/worlds/kyoto-1700.ts
```

Reuse the smallest shared panorama/hotspot contract established for Rome and keep city coordinates in Kyoto world data. Do not migrate or test Pittsburgh while adding Kyoto.

## 12. Runtime image budgets

| Asset                    | Target                                                   |
| ------------------------ | -------------------------------------------------------- |
| Overview                 | WebP/AVIF, 1.5 MB or less                                |
| POI panorama             | 4K–8K equirectangular, 6 MB or less after visual testing |
| Decoded detailed visuals | Overview plus one active panorama                        |

Spend offline render complexity where it improves the image. At runtime keep only the overview and active panorama decoded by default. If a deadline cut is needed, reduce panorama resolution or omit a stretch POV before cutting Nijō's hero composition, its three objects, or complete 360° closure.

## 13. Evidence, confidence, and reuse

“Documented” means the source supports the limited claim in this plan. “Inferred” means a reconstruction derived from surviving evidence or comparison. “Illustrative” means an art or staging choice that must not be presented as established fact.

All links below were checked on 12 September 2026. They are research links only. No image, scan, reconstruction, or model is approved for copying into project assets merely because it is linked here.

| Ref | Source                                                                                                                                                             | Supported use                                                                                                | Limits / reuse note                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| K1  | [Nijō Castle official history](https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/history/?lang=en)                                                    | 1603 construction, 1626 enlargement and imperial visit, post-1634 quiet period, lost keep/Honmaru context    | Visitor-facing institutional synthesis; detailed 1700 reconstruction still needs plan and conservation references.         |
| K2  | [Nijō Castle official summary](https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/overview/?lang=en)                                                   | Site size, surviving early-Edo Ninomaru Palace, Kara-mon, and garden                                         | Present survival does not prove every visible finish is unchanged. Link only.                                              |
| K3  | [Nijō Castle cultural assets](https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/teien/?lang=en)                                                       | 1662 East Gate, 1663 guardhouse, circa-1626 towers/gates, five-story keep lost in 1750                       | Explicitly distinguishes surviving, lost, and later fabric; exact lost-building reconstruction requires further sources.   |
| K4  | [Nijō Castle restoration record](https://nijo-jocastle.city.kyoto.lg.jp/donation/info/?lang=en)                                                                    | Kara-mon 1625 inscription, cypress-bark roof and fittings, hidden Tokugawa crests, later Honmaru replacement | Conservation photos and drawings have their own rights. Use as research; do not copy without permission.                   |
| K5  | [Ninomaru Palace and Garden](https://nijo-jocastle.city.kyoto.lg.jp/introduction/highlights/ninomaru/?lang=en)                                                     | Six-building shoin-zukuri complex, reception/audience functions, Kano program, 1626 garden work              | Interior evidence informs meaning but does not authorize an interior POV in this scope.                                    |
| K6  | [Kiyomizu-dera official history](https://www.kiyomizudera.or.jp/en/learn/)                                                                                         | 1633 ensemble, public visitation, Main Hall, stage structure, Otowa origin, seventeenth-century site screens | Temple descriptions are authoritative for the site; exact circa-1700 finishes still require conservation review.           |
| K7  | [Kiyomizu-dera official grounds guide](https://www.kiyomizudera.or.jp/en/visit/)                                                                                   | Main Hall and water context; Nio-mon and West Gate dates; Zuigu-do's 1735 exclusion                          | Current visitor plan contains structures from multiple dates. Filter every structure against 1700.                         |
| K8  | [Nishiki Market official history](https://www.kyoto-nishiki.or.jp/en/about/)                                                                                       | Official recognition of three fish wholesalers in 1615 and importance of groundwater                         | Commercial heritage source; exact 1700 stall form and stock are not documented by this page.                               |
| K9  | [Kyoto City market history](https://www.city.kyoto.lg.jp/sankan/page/0000000030.html)                                                                              | Municipal corroboration of early-Edo fish-market authorization                                               | Japanese-language summary; translation and detailed terminology need review.                                               |
| K10 | [The Met, late-seventeenth-century Kyoto street scenes](https://www.metmuseum.org/art/collection/search/45753)                                                     | Machiya shop-front pattern, merchant life, and late-seventeenth-century street activity                      | A handscroll is pictorial evidence, not a measured elevation. Check image license before use.                              |
| K11 | [Japan e-Museum, Funaki-version city screens](https://emuseum.nich.go.jp/detail?content_base_id=100318&content_part_id=001&content_pict_id=045&langId=en&webView=) | Seventeenth-century Kyoto city imagery and continuous urban composition                                      | Date is broad; stylized scale/perspective and gold-cloud conventions are not geometry. Observe IIIF and collection rights. |
| K12 | [Kyoto National Museum, “Scenes in and around the Capital”](https://www.kyohaku.go.jp/eng/exhibitions/collection/2023/02/?date=13)                                 | Explains that the genre uses real street/building locations but also creative composition and past events    | Use as a warning against treating screens as photographs or exact synchronized records.                                    |
| K13 | [Kyoto National Museum, Yūzen Dyeing](https://www.kyohaku.go.jp/old/eng/theme/floor1_4/past/sensyoku_20170201.html)                                                | Genroku date range and period textile context                                                                | Do not dress every social class in luxury textiles; object-specific costume review is still required.                      |

Before modeling fine architecture, add dimensioned plan/elevation references for Nijō and Kiyomizu and record rights in an asset manifest. Before dressing Nishiki, create a prop-and-clothing evidence sheet that labels each item documented, inferred, or illustrative.

## 14. Lean delivery sequence

### Milestone A — shared panorama path

- Add only the shared overview-image, panorama, and hotspot fields needed by Rome and Kyoto.
- Build the lightweight panorama viewer by reusing the existing fixed-look input and overlay state where practical.
- Preserve the current GLB path during migration. Do not edit or test Pittsburgh.
- Validate with typecheck and one focused hotspot/viewer test.

### Milestone B — required Kyoto path

- Add Kyoto content, the rendered overview, Nijō panorama, three hotspots, transcript, and fallback image/object list.
- Wire city selection, loading, POI entry, object panels, and return to overview in the same milestone when that avoids coordination overhead.
- Review the overview at the desktop viewport; review all four Nijō directions in the actual panorama viewer.
- Run the production build and one browser smoke path: Kyoto → overview → Nijō → one object → transcript/audio → overview.

### Milestone C — stretch only if time remains

- Add Kiyomizu first, then Nishiki.
- For each, verify historical exclusions, four directions, three hotspots, and one focused browser path.
- Skip additional evidence packages, repeated transition loops, broad performance reports, and full regression runs unless a shared-runtime failure requires them.

Create PRs only when requested or when review coordination needs them. Keep each PR description brief: result, material contract or ID changes, dependency if any, and checks actually run. Do not require a separate contract PR, release PR, screenshot bundle, or PR template.

## 15. Kyoto-specific acceptance criteria

- The overview reads as the Kyoto basin through its grid, Kamo River, mountain enclosure, and landmark silhouettes before labels appear.
- All geography and camera values live in Kyoto world data, not generic components.
- Nijō's 1700 overview includes the five-story keep and original Honmaru massing; it does not show the present relocated Honmaru Palace.
- The hero panorama contains hotspots for the three exact object IDs in section 6, and the palace and Kurumayose hotspots do not overlap.
- No viewing direction exposes a set edge, roof back, terrain underside, modern skyline, panorama seam, or unfinished façade.
- Kiyomizu excludes the 1735 Zuigu-do and distinguishes restored surfaces from known 1633 structure.
- Nishiki is an open-sky early-Edo fish market, not the modern covered food arcade.
- Uncertain architecture, clothing, market props, colors, and activities are labeled inferred or illustrative.
- Narration is silent until explicitly started and every track has a usable transcript.
- Overview → Nijō → object inspection → narration/transcript → overview works once without resetting Kyoto or retaining an inactive panorama texture.
- Run `npm run typecheck`, `npm run build`, the focused hotspot test, and one Kyoto browser smoke path. Run broader tests only after a shared-runtime change, before release, or to diagnose a failure.

## 16. Definition of done

Kyoto is ready for the required hackathon demo when a visitor can select **Kyoto — circa 1700**, recognize the mountain basin and city grid from a realistic full-screen rendered overview, enter the Ninomaru panorama at Nijō Castle, look through a complete fixed-position 360° view, inspect the Kara-mon, Ninomaru Palace, and Kurumayose through hotspots, hear or read a reviewed narration, and return to the unchanged overview.

Kiyomizu-dera and Nishiki broaden the city from government to pilgrimage and commerce, but they do not block the required Nijō path. Prioritize one convincing, reliable Kyoto experience over additional unfinished POVs.
