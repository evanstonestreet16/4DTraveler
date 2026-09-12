import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { pittsburgh1892 as world } from '../src/data/worlds/pittsburgh-1892';
import { fitCameraPosition } from '../src/utils/camera';

async function enterWorld(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Pittsburgh / 1892' }),
  ).toBeVisible();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  for (const poi of world.pois)
    await expect(
      page.getByRole('button', { name: `Visit ${poi.name}`, exact: true }),
    ).toBeVisible();
}

async function settleCamera(page: Page) {
  // Wait for the documented 950ms transition, including software-rendering overhead.
  await page.waitForTimeout(1600);
}

test('complete demo: scene markers, real mesh clicks, metadata, audio, and reset', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enterWorld(page);
  await settleCamera(page);
  const marker = page.getByRole('button', {
    name: 'Visit Steel Mill',
    exact: true,
  });
  const before = await marker.boundingBox();
  await page.screenshot({
    path: testInfo.outputPath('overview.png'),
    fullPage: true,
  });
  await marker.click();
  await expect(
    page.getByText('Exploring Steel Mill', { exact: true }),
  ).toBeVisible();
  await settleCamera(page);
  const after = await marker.boundingBox();
  expect(
    Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y),
  ).toBeGreaterThan(10);

  // Project known world geometry to the final camera, then click the actual canvas.
  // This exercises Three.js raycasting instead of only the accessible object buttons.
  const canvas = page.locator('canvas');
  const bounds = (await canvas.boundingBox())!;
  const view = world.pois[0].camera;
  const camera = new PerspectiveCamera(
    48,
    bounds.width / bounds.height,
    0.1,
    400,
  );
  camera.position.set(...fitCameraPosition(view, camera.aspect));
  camera.lookAt(...view.target);
  camera.updateMatrixWorld();
  for (const id of world.pois[0].objectIds) {
    const object = world.objects.find((object) => object.id === id)!;
    const primitive = world.scene.primitives.find(
      (primitive) => primitive.id === object.sceneObjectId,
    )!;
    const point = new Vector3(...primitive.position).project(camera);
    await canvas.click({
      position: {
        x: ((point.x + 1) * bounds.width) / 2,
        y: ((1 - point.y) * bounds.height) / 2,
      },
    });
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(object.description, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(object.whyItMatters, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: object.name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  await page.screenshot({
    path: testInfo.outputPath('selected-object.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close object information' }).click();
  await expect(
    page.getByRole('heading', { name: 'Rail Car', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('audio')
        .evaluate((element: HTMLAudioElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Pause Narration', exact: true })
    .click();
  await expect(
    page.getByText('Narration paused', { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator('audio')
      .evaluate((element: HTMLAudioElement) => element.paused),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Pause Narration', exact: true })
    .click();
  for (const poi of world.pois.slice(1)) {
    await page
      .getByRole('navigation', { name: 'Points of interest' })
      .getByRole('button', { name: new RegExp(poi.name.replace('/', '\\/')) })
      .click();
    const object = world.objects.find(
      (object) => object.id === poi.objectIds[0],
    )!;
    await settleCamera(page);
    const poiCamera = new PerspectiveCamera(
      48,
      bounds.width / bounds.height,
      0.1,
      400,
    );
    poiCamera.position.set(...fitCameraPosition(poi.camera, poiCamera.aspect));
    poiCamera.lookAt(...poi.camera.target);
    poiCamera.updateMatrixWorld();
    const primitive = world.scene.primitives.find(
      (item) => item.id === object.sceneObjectId,
    )!;
    const point = new Vector3(...primitive.position).project(poiCamera);
    await canvas.click({
      position: {
        x: ((point.x + 1) * bounds.width) / 2,
        y: ((1 - point.y) * bounds.height) / 2,
      },
    });
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${object.id}-selected.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(
    page.getByText('Bird’s-eye overview', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close object information' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await page.getByRole('button', { name: 'Choose era' }).click();
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.getByText('Ready to play', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Bird’s-eye overview', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile layout, keyboard selection, rapid navigation, and reduced motion', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterWorld(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const sceneBox = (await page.locator('.world-canvas').boundingBox())!;
  for (const poi of world.pois) {
    const markerBox = (await page
      .getByRole('button', { name: `Visit ${poi.name}`, exact: true })
      .boundingBox())!;
    expect(markerBox.x).toBeGreaterThanOrEqual(sceneBox.x);
    expect(markerBox.x + markerBox.width).toBeLessThanOrEqual(
      sceneBox.x + sceneBox.width,
    );
  }
  const steel = page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Steel Mill/ });
  await steel.focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Blast Furnace' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
  });
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Downtown/ })
    .click();
  await steel.click();
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(
    page.getByText('Bird’s-eye overview', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Blast Furnace' }),
  ).toHaveCount(0);
});

test('missing narration is recoverable and does not break exploration', async ({
  page,
}) => {
  await page.route('**/audio/*.wav', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await enterWorld(page);
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Narration unavailable.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Steel Mill/ })
    .click();
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Blast Furnace' }),
  ).toBeVisible();
  await page.unroute('**/audio/*.wav');
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
});

test('a lost WebGL context presents a recoverable scene error', async ({
  page,
}) => {
  await enterWorld(page);
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
});
