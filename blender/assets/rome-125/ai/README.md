# Rome AI atmosphere and material inputs

Generated with Codex's built-in image-generation tool on 2026-09-12. These are illustrative art inputs, not historical evidence. The sky is an LDR equirectangular background, not an HDR lighting capture. Travertine is a generic generated stone color texture, not a scan of a Roman monument. In the POI panoramas, architecture, camera positions and object anchors remain authored geometry. The renderer retains a physical sky for illumination and blends the generated atmosphere in shader space to avoid projection seams. The separate overview upgrade documents any additional enhancement in `manifest.overview.provenance`.

## Mediterranean sky

File: `mediterranean-sky.png` (1774 × 887).

Prompt:

Create a production environment texture, a photorealistic seamless 360-degree full-sphere equirectangular panorama, aspect ratio exactly 2:1, highest available resolution. SKY ONLY, absolutely no terrain, buildings, city, mountains, trees, people, lettering or watermark. This is a Mediterranean sky for physically rendered ancient Rome. Natural late-afternoon sun from one direction, warm cream-gold light on finely detailed scattered stratocumulus and delicate wispy cirrus, cool desaturated blue upper sky, pale warm atmospheric haze at the horizon. Rich photographic cloud microstructure and soft variations in density; restrained natural colors and wide tonal detail, no fantasy, no painterly look, no dramatic orange filter. The horizon runs exactly at image midheight. Top half is the entire sky hemisphere in proper lat-long projection; cloud formations increasingly stretch horizontally toward the top pole and the zenith is smooth. Bottom hemisphere is a smooth pale grey-blue warm atmospheric fill fading darker to the nadir, no clouds below the horizon. Match the left and right edges seamlessly in brightness and cloud shapes; no vertical seam. A soft bright sun glow centered about 68 percent from the left edge and 30 percent from top, elevation about 36 degrees, with no hard clipped solar disk. Single cohesive photographic environment map, not a collage, not a perspective panoramic strip.

## Travertine surface

File: `travertine-albedo.png` (1254 × 1254).

Prompt:

Create one high-resolution square seamless tileable PBR BASE COLOR / ALBEDO texture of natural pale warm ivory Roman travertine stone, viewed perfectly straight down at a flat stone surface. This is a generic material, no historical depiction. Photographic microscopic pores, subtle irregular cream and beige mineral sediment bands, small pinholes and natural fine warm-grey flecks. Restrained tonal variation, elegant intact honed limestone, not damaged ruins, not dirty, not heavily cracked. Uniform diffuse flat cross-polarized lighting, absolutely no baked directional shadows, no highlights, no vignette, no perspective, no bevelled edges, no tiles, no mortar, no grout, no geometry, no text. Frame filled edge to edge with one continuous stone surface. Left/right and top/bottom edges must tile seamlessly. Fine pore scale consistent everywhere; enough granular natural detail to use across 2 square metres of wall or paving in a realistic architectural render. Not an illustration or stylized procedural noise.
