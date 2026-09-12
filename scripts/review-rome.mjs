/* global document, innerWidth, innerHeight, getComputedStyle */
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { format } from 'prettier';

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
  await capture(`${poiId}-north`);
  for (const [direction, steps] of [
    ['east', 16],
    ['south', 17],
    ['west', 16],
  ]) {
    for (let step = 0; step < steps; step++)
      await page.keyboard.press('ArrowRight');
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
