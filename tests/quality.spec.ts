import { expect, test } from '@playwright/test';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';

test('quality tiers change render budgets while preserving the mounted model and selection', async ({
  page,
}) => {
  const models: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/models/')) models.push(request.url());
  });
  await page.goto('/?profile=1');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Steel Mill/ })
    .click();
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
  const originalCanvas = await page.locator('canvas').elementHandle();
  for (const [quality, cap] of [
    ['low', 1],
    ['medium', 1.25],
    ['high', 1.75],
    ['low', 1],
  ] as const) {
    await page
      .getByRole('combobox', { name: 'Scene quality' })
      .selectOption(quality);
    await expect(page.locator('.world-canvas')).toHaveAttribute(
      'data-scene-quality',
      quality,
    );
    await expect(
      page.getByRole('heading', { name: 'Blast Furnace', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Blast Furnace', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() =>
        page
          .locator('canvas')
          .evaluate(
            (canvas: ProfileCanvas) =>
              canvas.__worldRendererInfo?.().pixelRatio ?? Infinity,
          ),
      )
      .toBeLessThanOrEqual(cap);
    if (quality === 'low')
      await expect(page.locator('.world-canvas')).toHaveAttribute(
        'data-environment-motion',
        'paused',
      );
  }
  expect(
    await page.evaluate(
      (canvas) => canvas === document.querySelector('canvas'),
      originalCanvas,
    ),
  ).toBe(true);
  expect(models).toHaveLength(1);
  await page.getByRole('button', { name: 'Smokestack', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Smokestack', exact: true }),
  ).toBeVisible();
});

test('landing does not request world renderer or model assets until an era is chosen', async ({
  page,
}) => {
  const assets: string[] = [];
  page.on('request', (request) => assets.push(request.url()));
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  expect(
    assets.some((url) =>
      /three-core|three-renderer|WorldExperience|\/models\//.test(url),
    ),
  ).toBe(false);
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  expect(assets.some((url) => url.includes('/models/'))).toBe(true);
});

test('a missing compressed transport retries the plain GLB and native decompression is optional', async ({
  page,
}) => {
  await page.route('**/*.glb.gz*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Choose era' }).click();
  await page.evaluate(() => {
    Object.defineProperty(window, 'DecompressionStream', {
      configurable: true,
      value: undefined,
    });
  });
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-model-status="fallback"]')).toHaveCount(0);
});
