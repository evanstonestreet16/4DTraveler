# Rome / circa 500 BCE overview

Desktop, separately composed portrait and fallback BEV assets are delivered in
`public/images/rome-500bce/`. The app's timeline now offers Circa 500 BCE,
125 CE and Present with bidirectional reveals. The older era has three
display-only Preview markers: Capitoline Temple, Roman Forum and Circus Valley.
Image marker coordinates live in `src/data/worlds/rome-500bce.scene.ts` and are
authored separately for desktop and portrait; clicking a preview does nothing.
Desktop and mobile browser checks cover both travel directions, disabled marker
clicks and the 125 CE POI → object → overview path. Direct entry and failed-image
retry are also covered in `tests/rome-time-transition.spec.ts`.

The workflow follows Rome Present: constrained built-in image-generation edits
of the project-owned 125 CE overviews, visual review, a targeted temple-placement
correction, then Pillow WebP packaging. No new Blender geometry was authored.
Selected PNGs, initial generation inputs and exact prompts are retained here;
`prompts.json` records the reference roles and historical sources. The manifest
records source/output hashes, dimensions and byte counts.

```sh
python3 blender/scripts/package_rome_500bce.py
```

Final desktop: 1584 × 993, 522,742 bytes. Portrait: 954 × 1649, 514,002 bytes.
Fallback: 218,280 bytes. Each full image is under 1.5 MB; fallback is under 0.5 MB.
Native generated dimensions are retained. Desktop differs slightly from the
125 CE reference's 1586 × 992; portrait dimensions match exactly.

Review confirmed the removal of the Pantheon, Colosseum, Imperial Fora, palaces,
stone circus seating and later stone bridges, and the presence of open terrain,
low archaic houses, an earthen racing ground and a terracotta-roofed main temple.
The Tiber and Circus valley broadly register with the source frames. The main
temple was moved toward the Capitoline region in both images; its portrait
position still drifts from the reference hilltop. Transition alignment is
approximate; the runtime uses the same image reveal as the Present transition.

This is an interpretive reconstruction, not independent historical evidence.
Settlement density, individual streets/houses, hill profiles, temple details and
vegetation are inferred. The three linked institutional sources establish a few
period constraints, not a complete map of Rome in 500 BCE. No third-party imagery
is redistributed. Image decode, manifest hashes and encoded budgets were checked;
the timeline integration consumes these assets without re-encoding them.
