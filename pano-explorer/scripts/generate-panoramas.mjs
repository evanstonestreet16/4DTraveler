/**
 * Generates placeholder equirectangular panoramas for every node in the city manifest.
 *
 * Real street-level photography should replace these files; they exist so the app runs
 * out of the box and so the compass / arrow orientation can be verified: each image has
 * N / E / S / W painted at the correct columns (north at the horizontal centre).
 *
 *   npm run generate:panoramas            # only writes missing files
 *   npm run generate:panoramas -- --force # overwrite everything
 */
import { mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CITY_MANIFEST, formatCoord } from '../src/data/cityManifest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 4096;
const HEIGHT = 2048;
const FORCE = process.argv.includes('--force');

const PALETTES = [
  { skyTop: '#2c4f8a', skyBottom: '#f2c9a0', ground: '#6b5540', groundFar: '#a58a6c', stone: '#c9b48e', accent: '#e07a3f' },
  { skyTop: '#1f3c6e', skyBottom: '#c9dcf0', ground: '#55504a', groundFar: '#8f877c', stone: '#d8cbb2', accent: '#3f8fe0' },
  { skyTop: '#3b2f63', skyBottom: '#f5a56a', ground: '#4d4035', groundFar: '#907760', stone: '#bfa77f', accent: '#e0c03f' }
];

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function arcade(x, width, columns, palette, baseY, archHeight) {
  const colW = width / columns;
  let out = `<rect x="${x}" y="${baseY - archHeight * 1.35}" width="${width}" height="${archHeight * 1.35}" fill="${palette.stone}"/>`;
  for (let i = 0; i < columns; i++) {
    const cx = x + colW * i + colW / 2;
    const w = colW * 0.55;
    const h = archHeight;
    out += `<path d="M ${cx - w / 2} ${baseY} v ${-h * 0.6} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 v ${h * 0.6} z" fill="#1a1410" opacity="0.85"/>`;
  }
  out += `<rect x="${x}" y="${baseY - archHeight * 1.35}" width="${width}" height="${archHeight * 0.08}" fill="#00000033"/>`;
  return out;
}

function buildSvg(node, index) {
  const palette = PALETTES[index % PALETTES.length];
  const horizon = HEIGHT / 2;
  const cardinals = [
    { label: 'N', x: WIDTH * 0.5, color: '#ff5f4c' },
    { label: 'E', x: WIDTH * 0.75, color: '#ffffff' },
    { label: 'S', x: WIDTH * 0.0, color: '#ffffff' },
    { label: 'S', x: WIDTH * 1.0, color: '#ffffff' },
    { label: 'W', x: WIDTH * 0.25, color: '#ffffff' }
  ];

  const groundLines = Array.from({ length: 9 }, (_, i) => {
    const y = horizon + 40 + i * i * 22;
    return `<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke="#00000030" stroke-width="${3 + i}"/>`;
  }).join('');

  const rays = Array.from({ length: 24 }, (_, i) => {
    const x = (WIDTH / 24) * i;
    return `<line x1="${x}" y1="${horizon}" x2="${x}" y2="${HEIGHT}" stroke="#00000018" stroke-width="4"/>`;
  }).join('');

  const marks = cardinals
    .map(
      (c) => `
      <line x1="${c.x}" y1="${horizon - 420}" x2="${c.x}" y2="${horizon + 260}" stroke="${c.color}" stroke-width="6" stroke-dasharray="28 18" opacity="0.7"/>
      <circle cx="${c.x}" cy="${horizon - 470}" r="78" fill="#0c0e14cc" stroke="${c.color}" stroke-width="8"/>
      <text x="${c.x}" y="${horizon - 440}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="96" font-weight="700" fill="${c.color}" text-anchor="middle">${c.label}</text>`
    )
    .join('');

  const clouds = Array.from({ length: 7 }, (_, i) => {
    const cx = ((i * 613) % WIDTH) + 200;
    const cy = horizon - 520 - ((i * 137) % 300);
    const r = 90 + ((i * 53) % 80);
    return `<g fill="#ffffff" opacity="0.55"><circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx + r}" cy="${cy + 20}" r="${r * 0.8}"/><circle cx="${cx - r}" cy="${cy + 25}" r="${r * 0.7}"/></g>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.skyTop}"/>
      <stop offset="0.75" stop-color="${palette.skyBottom}"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.groundFar}"/>
      <stop offset="0.35" stop-color="${palette.ground}"/>
      <stop offset="1" stop-color="#1c1712"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${horizon}" fill="url(#sky)"/>
  <rect y="${horizon}" width="${WIDTH}" height="${horizon}" fill="url(#ground)"/>
  <circle cx="${WIDTH * (0.62 + index * 0.05)}" cy="${horizon - 640}" r="120" fill="#fff4d6" opacity="0.95"/>
  ${clouds}
  ${arcade(WIDTH * 0.33, WIDTH * 0.34, 14, palette, horizon + 30, 380 - index * 40)}
  ${arcade(WIDTH * 0.05, WIDTH * 0.18, 6, palette, horizon + 20, 220)}
  ${arcade(WIDTH * 0.78, WIDTH * 0.17, 5, palette, horizon + 20, 200 + index * 30)}
  ${groundLines}
  ${rays}
  <line x1="0" y1="${horizon}" x2="${WIDTH}" y2="${horizon}" stroke="#00000055" stroke-width="6"/>
  ${marks}
  <rect x="${WIDTH / 2 - 900}" y="${horizon + 420}" width="1800" height="200" rx="40" fill="#0c0e14b8"/>
  <text x="${WIDTH / 2}" y="${horizon + 505}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(node.title)}</text>
  <text x="${WIDTH / 2}" y="${horizon + 580}" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="44" fill="${palette.accent}" text-anchor="middle">${formatCoord(node.lat)}, ${formatCoord(node.lon)} · placeholder panorama</text>
</svg>`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

for (const [city, nodes] of Object.entries(CITY_MANIFEST)) {
  const dir = join(ROOT, 'public', 'images', 'citystreetviews', city);
  await mkdir(dir, { recursive: true });
  for (const [index, node] of nodes.entries()) {
    const file = join(dir, `${formatCoord(node.lat)},${formatCoord(node.lon)}.jpg`);
    if (!FORCE && (await exists(file))) {
      console.log(`skip   ${file}`);
      continue;
    }
    await sharp(Buffer.from(buildSvg(node, index))).jpeg({ quality: 82, mozjpeg: true }).toFile(file);
    console.log(`wrote  ${file}`);
  }
}
