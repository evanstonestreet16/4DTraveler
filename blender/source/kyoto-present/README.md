# Modern-day Kyoto bird's-eye overview

Generated on 2026-09-12 with the built-in image-generation tool, following Rome
Present: constrained edits of the project-owned historical desktop and portrait
images, visual review, then WebP packaging. Rome Present supplied the desktop
finish reference; the approved Kyoto desktop supplied the portrait finish.
Exact prompts, input roles and institutional references are in `prompts.json`.

Delivery: `public/images/kyoto-present/` contains desktop, phone and fallback
images plus a manifest with dimensions, byte counts and source/output hashes.
Kyoto's era picker and overview slider now offer circa 1700 and Present. Both
directions reuse Rome's 2.2-second reveal, destination decoding, Skip, reduced
motion and image recovery. Present is overview-only; returning to circa 1700
restores the three historical POIs and their objects. The runtime entry point
is `src/data/worlds/kyoto-present.ts`; no shared world type changes were needed.

Integration validation: production build, TypeScript, focused lint and 11 unit
checks passed. Five browser checks covered desktop/phone slider and reveal,
historical POI/object/return navigation, marker layout, direct Present entry,
reduced motion, responsive images, and failed-image retry.

```sh
python3 blender/scripts/package_kyoto_present.py
```

Desktop is 1584 × 993 (631,228 bytes), phone is 853 × 1844 (527,836 bytes),
and fallback is 1584 × 993 (288,644 bytes). Generated dimensions are retained;
the desktop differs slightly from the historical 1586 × 992 reference.

Visual review confirmed modern low/mid-rise urban fabric, paved roads and
crosswalks, contemporary river bridges, preserved temple enclaves, and removal
of Nijō's five-story keep. The river, moats, palace enclosure, Kiyomizu hillside
and mountain silhouettes broadly align with the corresponding historical frame.
Both encoded full images and the fallback were decoded and checked against
manifest dimensions, hashes and the existing Rome image budgets.

These are illustrative reconstructions, not surveyed aerial photographs.
They inherit the historical images' approximate geography and compressed
landmark relationships. Individual buildings, arcade placement, street widths
and castle details are inferred; the keep foundation is not separately legible
at overview scale. No third-party reference imagery is redistributed.
