/* global document, innerWidth, innerHeight, getComputedStyle */
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { format } from 'prettier';
import { Euler, Quaternion } from 'three';

// Normal visitor controls plus the existing read-only profile bridge produce a repeatable review.
// Usage: node scripts/review-rome.mjs http://127.0.0.1:4173 docs/evidence/rome-p0 forum-trajan
const [
  base = 'http://127.0.0.1:4173',
  output = 'docs/evidence/rome-p0',
  poiId = 'forum-trajan',
] = process.argv.slice(2);
const destination = path.resolve(output);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const evidence = {
  capturedAt: new Date().toISOString(),
  poiId,
  views: [],
  errors: [],
};
page.on('pageerror', (error) => evidence.errors.push(error.message));

async function capture(name) {
  await page.screenshot({ path: path.join(destination, `${name}.png`) });
  evidence.views.push(
    await page.evaluate((name) => {
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        name,
        viewport: { width: innerWidth, height: innerHeight },
        canvas: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        renderer: canvas.__worldRendererInfo?.(),
        markers: [...document.querySelectorAll('.poi-marker')].map((marker) => {
          const bounds = marker.getBoundingClientRect();
          return {
            label: marker.textContent,
            visible: getComputedStyle(marker).visibility === 'visible',
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          };
        }),
      };
    }, name),
  );
}

async function faceCardinal(targetYaw) {
  // Read camera orientation, then use the same arrow controls available to a visitor.
  // This handles south-facing and east-facing entry cameras without relabeling their views.
  for (let step = 0; step < 100; step++) {
    const quaternion = await page
      .locator('canvas')
      .evaluate((canvas) => canvas.__worldRendererInfo?.().camera.quaternion);
    if (!quaternion)
      throw new Error('The read-only camera profile is unavailable.');
    const yaw = new Euler().setFromQuaternion(
      new Quaternion(...quaternion),
      'YXZ',
    ).y;
    const delta = Math.atan2(
      Math.sin(targetYaw - yaw),
      Math.cos(targetYaw - yaw),
    );
    if (Math.abs(delta) < Math.PI / 60) return;
    await page.keyboard.press(delta > 0 ? 'ArrowLeft' : 'ArrowRight');
  }
  throw new Error(
    'Arrow-key looking did not reach the requested review direction.',
  );
}

try {
  const url = new URL(base);
  url.searchParams.set('profile', '1');
  await page.goto(url.href);
  await page.getByRole('button', { name: /Rome/ }).click();
  await page.getByRole('button', { name: /125/ }).click();
  await page.locator('[data-model-status="ready"]').waitFor();
  await capture('overview-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      document.querySelector('canvas')?.getBoundingClientRect().width === 390,
  );
  await capture('overview-portrait');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(
    () =>
      document.querySelector('canvas')?.getBoundingClientRect().width === 844,
  );
  await capture('overview-landscape');
  await page.setViewportSize({ width: 1440, height: 900 });
  const names = {
    'forum-trajan': /Forum of Trajan/,
    'pantheon-forecourt': /The New Pantheon/,
    'colosseum-valley': /Flavian Amphitheatre Valley/,
  };
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: names[poiId] })
    .click();
  await page.locator('[data-model-status="ready"]').waitFor();
  await page.locator('canvas').focus();
  await capture(`${poiId}-initial`);
  for (const [direction, yaw] of [
    ['north', 0],
    ['east', -Math.PI / 2],
    ['south', Math.PI],
    ['west', Math.PI / 2],
  ]) {
    await faceCardinal(yaw);
    await capture(`${poiId}-${direction}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-city-object]').first().click();
  await capture(`${poiId}-object-portrait`);
  await writeFile(
    path.join(destination, 'review.json'),
    await format(JSON.stringify(evidence), { parser: 'json' }),
  );
  console.log(
    `Saved ${evidence.views.length} browser review views to ${destination}`,
  );
  if (evidence.errors.length) throw new Error(evidence.errors.join('\n'));
} finally {
  await browser.close();
}
