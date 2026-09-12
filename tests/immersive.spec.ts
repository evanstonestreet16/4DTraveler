import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { pittsburgh1892 as world } from '../src/data/worlds/pittsburgh-1892';

async function enterWorld(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(
    page.getByRole('button', { name: 'Visit Steel Mill', exact: true }),
  ).toBeVisible();
}

async function selectFurnace(page: Page) {
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Steel Mill/ })
    .click();
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
}

async function expectAnchoredCamera(page: Page) {
  // Marker projection verifies both the preserved POI target and the resized camera aspect.
  await expect
    .poll(async () => {
      const canvas = await page.locator('canvas').boundingBox();
      // A short landscape canvas can intentionally hide a clipped marker.
      // Its DOM projection still lets us verify the preserved camera target.
      const marker = await page
        .locator('.poi-marker.active')
        .evaluate((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        });
      if (!canvas || !marker) return Infinity;
      const camera = new PerspectiveCamera(
        48,
        canvas.width / canvas.height,
        0.1,
        400,
      );
      camera.position.set(...world.pois[0].camera.position);
      camera.lookAt(...world.pois[0].camera.target);
      camera.updateMatrixWorld();
      const point = new Vector3(...world.pois[0].markerPosition).project(
        camera,
      );
      return Math.hypot(
        canvas.x +
          ((point.x + 1) * canvas.width) / 2 -
          (marker.x + marker.width / 2),
        canvas.y +
          ((1 - point.y) * canvas.height) / 2 -
          (marker.y + marker.height / 2),
      );
    })
    .toBeLessThan(3);
}

async function expectReservedCanvas(page: Page) {
  const canvas = (await page.locator('canvas').boundingBox())!;
  const panel = (await page
    .getByRole('complementary', { name: 'Explore this world' })
    .boundingBox())!;
  expect(canvas.width).toBeGreaterThan(200);
  expect(canvas.height).toBeGreaterThan(90);
  expect(canvas.x >= 0 && canvas.y >= 0).toBe(true);
  expect(canvas.x + canvas.width <= page.viewportSize()!.width + 1).toBe(true);
  expect(canvas.y + canvas.height <= page.viewportSize()!.height + 1).toBe(
    true,
  );
  expect(
    panel.x >= canvas.x + canvas.width - 1 ||
      panel.y >= canvas.y + canvas.height - 1,
  ).toBe(true);
  const ratio = await page
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      return Math.abs(canvas.width / canvas.height - rect.width / rect.height);
    });
  expect(ratio).toBeLessThan(0.02);
}

test('CSS immersive transitions preserve the live world, audio, selection, camera, and keyboard focus', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });
  });
  await enterWorld(page);
  await selectFurnace(page);
  const canvas = await page.locator('canvas').elementHandle();
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.getByRole('button', { name: 'Enter immersive view' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Pittsburgh / 1892' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Exit immersive view' }),
    ).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'Blast Furnace', exact: true }),
    ).toBeVisible();
    await expectReservedCanvas(page);
    await expectAnchoredCamera(page);
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Enter immersive view' }),
    ).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Blast Furnace', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expectAnchoredCamera(page);
  }
  expect(
    await page.evaluate(
      (canvas) => canvas === document.querySelector('canvas'),
      canvas,
    ),
  ).toBe(true);
  expect(
    await page
      .locator('.site-header')
      .evaluate((element: HTMLElement) => element.inert),
  ).toBe(false);
});

test('native fullscreen browser exit and rejected fullscreen requests are graceful', async ({
  page,
}) => {
  await enterWorld(page);
  await page.getByRole('button', { name: 'Enter immersive view' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains('world-experience'),
      ),
    )
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    page.getByRole('button', { name: 'Enter immersive view' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Enter immersive view' }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Enter immersive view' }),
  ).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull();
  await page.evaluate(() => {
    HTMLElement.prototype.requestFullscreen = () =>
      Promise.reject(new DOMException('Unavailable', 'NotAllowedError'));
  });
  await page.getByRole('button', { name: 'Enter immersive view' }).click();
  await expect(
    page.getByText(
      'Immersive view enabled using the page layout. Press Escape to exit.',
    ),
  ).toHaveCount(1);
  await selectFurnace(page);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Enter immersive view' }),
  ).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Blast Furnace', exact: true }),
  ).toBeVisible();
});
test('immersive graphics recovery and navigation clean up the presentation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });
  });
  await enterWorld(page);
  await page.getByRole('button', { name: 'Enter immersive view' }).click();
  await page
    .locator('canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(
    page.getByRole('heading', { name: 'The 3D scene was interrupted.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reload scene' }).click();
  await expect(
    page.getByRole('button', { name: 'Visit Steel Mill', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Choose era' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page
      .locator('.site-header')
      .evaluate((element: HTMLElement) => element.inert),
  ).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    'hidden',
  );
});
