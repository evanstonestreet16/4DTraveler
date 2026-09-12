import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { pittsburgh1850 } from '../src/data/worlds/pittsburgh-1850';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';
import { fitCameraPosition } from '../src/utils/camera';

async function chooseLocation(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?profile=1');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
}

async function chooseEra(page: Page, year: '1850' | '1892') {
  await page
    .getByRole('button', {
      name: year === '1850' ? /1850 · Blockout/ : /1892 An industrial city/,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name:
        year === '1850' ? /Pittsburgh.*1850.*Blockout/ : 'Pittsburgh / 1892',
    }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
}

async function selectPlace(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: new RegExp(name) })
    .click();
}

async function expectBlockoutOverview(page: Page) {
  await expect(
    page.getByText('Bird’s-eye overview', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close object information' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Play Narration', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('[data-model-status]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Visit Market / Blockout', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Visit Wharf / Blockout', exact: true }),
  ).toBeVisible();
}

test('1850 loads from the existing era picker and real mesh selection uses its own camera and objects', async ({
  page,
}, testInfo) => {
  const models: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/models/')) models.push(request.url());
  });
  await chooseLocation(page);
  await expect(
    page.getByRole('button', { name: /1850 · Blockout/ }),
  ).toBeVisible();
  await chooseEra(page, '1850');
  await expectBlockoutOverview(page);
  await page.screenshot({
    path: testInfo.outputPath('1850-overview.png'),
    fullPage: true,
  });
  await selectPlace(page, 'Market / Blockout');
  const canvas = page.locator('canvas');
  const poi = pittsburgh1850.pois[0];
  await expect
    .poll(async () => {
      const bounds = (await canvas.boundingBox())!;
      const camera = new PerspectiveCamera(
        48,
        bounds.width / bounds.height,
        0.1,
        400,
      );
      camera.position.set(...fitCameraPosition(poi.camera, camera.aspect));
      camera.lookAt(...poi.camera.target);
      camera.updateMatrixWorld();
      const point = new Vector3(...poi.markerPosition).project(camera);
      const marker = await page
        .locator('.poi-marker.active')
        .evaluate((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        });
      return Math.hypot(
        bounds.x +
          ((point.x + 1) * bounds.width) / 2 -
          marker.x -
          marker.width / 2,
        bounds.y +
          ((1 - point.y) * bounds.height) / 2 -
          marker.y -
          marker.height / 2,
      );
    })
    .toBeLessThan(3);
  const bounds = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(
    48,
    bounds.width / bounds.height,
    0.1,
    400,
  );
  camera.position.set(...fitCameraPosition(poi.camera, camera.aspect));
  camera.lookAt(...poi.camera.target);
  camera.updateMatrixWorld();
  const stall = pittsburgh1850.scene.primitives.find(
    (primitive) => primitive.id === '1850-market-stall',
  )!;
  const point = new Vector3(...stall.position).project(camera);
  await canvas.click({
    position: {
      x: ((point.x + 1) * bounds.width) / 2,
      y: ((1 - point.y) * bounds.height) / 2,
    },
  });
  await expect(
    page.getByRole('heading', { name: 'Market Stall', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Market Stall', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({
    path: testInfo.outputPath('1850-market-selected.png'),
    fullPage: true,
  });
  await selectPlace(page, 'Wharf / Blockout');
  await page.getByRole('button', { name: 'Cargo Stack', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cargo Stack', exact: true }),
  ).toBeVisible();
  expect(models).toEqual([]);
});

test('repeated 1892 and 1850 transitions reset selections/audio and release the previous canvas', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await chooseLocation(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await chooseEra(page, '1892');
    await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
    await expect(
      page.getByText('Bird’s-eye overview', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Close object information' }),
    ).toHaveCount(0);
    await selectPlace(page, 'Steel Mill');
    await page
      .getByRole('button', { name: 'Blast Furnace', exact: true })
      .click();
    const oldCanvas = await page.locator('canvas').elementHandle();
    await page.getByRole('button', { name: 'Choose era' }).click();
    await chooseEra(page, '1850');
    await expectBlockoutOverview(page);
    await expect
      .poll(() =>
        oldCanvas!.evaluate(
          (canvas: ProfileCanvas) =>
            !canvas.isConnected &&
            !canvas.__worldRendererInfo &&
            canvas.getContext('webgl2')?.isContextLost(),
        ),
      )
      .toBe(true);
    await oldCanvas!.dispose();
    await selectPlace(page, 'Wharf / Blockout');
    await page
      .getByRole('button', { name: 'Wharf Landing', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Wharf Landing', exact: true }),
    ).toBeVisible();
    const blockoutCanvas = await page.locator('canvas').elementHandle();
    await page.getByRole('button', { name: 'Choose era' }).click();
    await expect
      .poll(() =>
        blockoutCanvas!.evaluate(
          (canvas: ProfileCanvas) =>
            !canvas.isConnected &&
            !canvas.__worldRendererInfo &&
            canvas.getContext('webgl2')?.isContextLost(),
        ),
      )
      .toBe(true);
    await blockoutCanvas!.dispose();
  }
  expect(errors).toEqual([]);
});

test('leaving a slow 1892 model for 1850 aborts the request without stale model state', async ({
  page,
}) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().includes('/models/'))
      failures.push(request.failure()?.errorText ?? 'failed');
  });
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/models/*.glb*', async (route) => {
    await pending;
    await route.continue().catch(() => undefined);
  });
  await chooseLocation(page);
  await chooseEra(page, '1892');
  await expect(page.locator('[data-model-status="loading"]')).toBeVisible();
  await page.getByRole('button', { name: 'Choose era' }).click();
  await chooseEra(page, '1850');
  await expectBlockoutOverview(page);
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await expect.poll(() => failures.length).toBeGreaterThan(0);
  await selectPlace(page, 'Market / Blockout');
  await page.getByRole('button', { name: 'Market Stall', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Market Stall', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-model-status]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose era' }).click();
  await chooseEra(page, '1892');
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('missing 1892 assets do not affect the blockout and a later 1892 visit recovers', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/models/')) requests++;
  });
  await page.route('**/models/*.glb*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await chooseLocation(page);
  await chooseEra(page, '1892');
  await expect(page.locator('[data-model-status="fallback"]')).toBeVisible();
  await selectPlace(page, 'Steel Mill');
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
  const failedRequests = requests;
  await page.getByRole('button', { name: 'Choose era' }).click();
  await chooseEra(page, '1850');
  await expectBlockoutOverview(page);
  expect(requests).toBe(failedRequests);
  await selectPlace(page, 'Wharf / Blockout');
  await page.getByRole('button', { name: 'Cargo Stack', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cargo Stack', exact: true }),
  ).toBeVisible();
  await page.unroute('**/models/*.glb*');
  await page.getByRole('button', { name: 'Choose era' }).click();
  await chooseEra(page, '1892');
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-model-status="fallback"]')).toHaveCount(0);
  await expect(
    page.getByText('Bird’s-eye overview', { exact: true }),
  ).toBeVisible();
});

test.describe('mobile second era', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test('blockout labeling and object controls survive immersive and orientation changes', async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        value: undefined,
      });
    });
    await chooseLocation(page);
    await expect(
      page.getByRole('button', { name: /1850 · Blockout/ }),
    ).toBeInViewport();
    await chooseEra(page, '1850');
    await expectBlockoutOverview(page);
    await page.getByRole('button', { name: 'Enter immersive view' }).tap();
    await expect(
      page.getByRole('heading', { name: /Pittsburgh.*1850.*Blockout/ }),
    ).toBeInViewport();
    await selectPlace(page, 'Wharf / Blockout');
    await page.getByRole('button', { name: 'Cargo Stack', exact: true }).tap();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const heading = page.getByRole('heading', {
        name: /Pittsburgh.*1850.*Blockout/,
      });
      await expect(heading).toBeInViewport();
      await expect(
        page.getByRole('button', { name: 'Exit immersive view' }),
      ).toBeInViewport();
      const close = page.getByRole('button', {
        name: 'Close object information',
      });
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`1850-immersive-${viewport.width}.png`),
      });
    }
    await page.getByRole('button', { name: 'Return to overview' }).tap();
    await page.getByRole('button', { name: 'Exit immersive view' }).tap();
    await page.getByRole('button', { name: 'Choose era' }).tap();
    await chooseEra(page, '1892');
    await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: 'Pittsburgh / 1892' }),
    ).toBeVisible();
  });
});
