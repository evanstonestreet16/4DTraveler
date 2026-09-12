# Globe geo data

All geo data here is **baked into the build** by `npm run geo:build`. The globe makes no
network calls at runtime, so it renders identically offline and on every load. See
`docs/workstream2.md` §4.

Both files come from [Natural Earth](https://www.naturalearthdata.com/) (public domain)
at pinned revision `v5.1.2`.

## `countries.json`

The 1:50m admin-0 countries layer, 242 features, simplified to 0.05° with
Douglas-Peucker and rounded to 3 decimals. Powers the land/water fill and the country
hover outline. 1608 polygon parts, 189 KB gzipped.

1:110m was tried first and is about 4× lighter, but its outlines are visibly blocky one
zoom step in — it is built for whole-globe views only.

Two details the bake depends on:

- **`ADM0_A3` for the code, not `ISO_A3`.** It is the only code field with no `-99`
  placeholders and no duplicates. Either would collapse separate countries into a single
  hover target.
- **`ADMIN` for the name, not `NAME`.** `NAME` abbreviates 22 of them ("Bosnia and
  Herz.", "Marshall Is.").

## `cities.json`

City pins for the United States, Japan and Italy, from the 1:50m populated-places layer:
the ten largest by `POP_MAX` per country, plus any city a curated `Location` points at
regardless of rank. 31 pins, ~1 KB gzipped.

The curated carve-out exists because Pittsburgh ranks well outside the US top ten. The
list lives in `CURATED_CITIES` in `scripts/build-geo.mjs`, and
`src/data/geo/geo.test.ts` fails if a curated `Location` has no matching pin — a
`Location` whose city is missing from the bake is unreachable, since the globe can only
be entered through a pin.

## Ring winding

The bake normalises outer rings to **clockwise**, holes counter-clockwise. three-globe
triangulates polygon caps on that assumption; RFC 7946 winding (counter-clockwise outer
rings) inverts every cap so it fills the whole sphere _except_ the country. This is easy
to reintroduce and hard to diagnose — the symptom is the globe washing over in a single
region's fill colour.
