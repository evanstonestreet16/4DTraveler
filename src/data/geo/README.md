# Globe geo data

`countries-110m.json` is a slimmed copy of the public-domain Natural Earth 1:110m admin-0 countries dataset (only `name` and `isoA3` properties kept, to cut bundle size). It powers the landing globe's land/water fill and country hover outline in `src/components/location/globe/`.

`subregions.ts` fetches sub-region ("city view") boundaries live, per country, from the public [geoBoundaries](https://www.geoboundaries.org/) API on hover, and caches each country's result for the session. This is a live network dependency by design (there's no worldwide dataset small enough to bundle upfront) — a slow or failed fetch simply means no sub-region layer for that hover, not an error. It always requests admin level 1 (state/province), since that's the level with the most consistent worldwide coverage; for some countries this reads closer to "province" than "city," a known tradeoff (see `docs/workstream2.md`).
