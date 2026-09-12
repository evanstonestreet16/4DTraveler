import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { rome125 as world } from '../src/data/worlds/rome-125';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';

const valley = world.pois.find((poi) => poi.id === 'colosseum-valley')!;
const objects = world.objects.filter((object) => object.poiId === valley.id);

async function snapshot(page: Page) {
  return page
    .locator('canvas')
    .evaluate((canvas: ProfileCanvas) => canvas.__worldRendererInfo!());
}

async function enterRome(page: Page, status = 'ready') {
  await page.goto('/?profile=1');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page.getByRole('button', { name: /125 CE/ }).click();
  await expect(page.locator(`[data-model-status="${status}"]`)).toHaveCount(1);
}

async function enterValley(page: Page, status = 'ready') {
  await page
    .getByRole('button', { name: `Visit ${valley.name}`, exact: true })
    .click();
  await expect(page.locator(`[data-model-status="${status}"]`)).toHaveCount(1);
  await expect
    .poll(async () => (await snapshot(page)).camera.position)
    .toEqual(valley.camera.position);
}

async function project(page: Page, position: [number, number, number]) {
  const bounds = (await page.locator('canvas').boundingBox())!;
  const actual = (await snapshot(page)).camera;
  const camera = new PerspectiveCamera(
    48,
    bounds.width / bounds.height,
    0.1,
    1800,
  );
  camera.position.fromArray(actual.position);
  camera.quaternion.fromArray(actual.quaternion);
  camera.updateMatrixWorld();
  const point = new Vector3(...position).project(camera);
  return {
    x: bounds.x + ((point.x + 1) * bounds.width) / 2,
    y: bounds.y + ((1 - point.y) * bounds.height) / 2,
  };
}

test('the amphitheatre mesh opens its story and all three valley objects carry sources and a location transcript', async ({
  page,
}) => {
  await enterRome(page);
  await enterValley(page);
  const camera = (await snapshot(page)).camera;
  // The western cornice is solid masonry between the open arcaded storeys.
  const arcade = await project(page, [81, 22.1, 0]);
  await page.mouse.click(arcade.x, arcade.y);
  await expect(
    page.getByRole('heading', {
      name: 'Flavian Amphitheatre Arcade',
      exact: true,
    }),
  ).toBeVisible();
  expect(objects).toHaveLength(3);
  for (const object of objects) {
    await page.getByRole('button', { name: object.name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(object.confidence!, { exact: true }),
    ).toBeVisible();
    for (const source of object.sources ?? [])
      await expect(
        page
          .locator('.object-sources')
          .getByRole('link', { name: source.title }),
      ).toHaveAttribute('href', source.url);
    expect((await snapshot(page)).camera).toEqual(camera);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(
    page.getByText(valley.immersive!.narrationTranscript!, { exact: true }),
  ).toBeVisible();
});

test('all three viewpoints can repeatedly switch through the same city and canvas with isolated object state', async ({
  page,
}) => {
  test.setTimeout(90000);
  await enterRome(page);
  const originalCanvas = await page.locator('canvas').elementHandle();
  expect(world.pois).toHaveLength(3);
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const poi of world.pois) {
      await page
        .getByRole('button', { name: `Visit ${poi.name}`, exact: true })
        .click();
      await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
      await expect
        .poll(async () => (await snapshot(page)).camera.position)
        .toEqual(poi.camera.position);
      await expect(page.locator('.object-info')).toHaveCount(0);
      await expect(page.locator('[data-city-object]')).toHaveCount(3);
      await page.locator('canvas').focus();
      await page.keyboard.press('ArrowRight');
      const looked = (await snapshot(page)).camera;
      expect(looked.position).toEqual(poi.camera.position);
      await page.locator('[data-city-object]').first().click();
      expect((await snapshot(page)).camera).toEqual(looked);
      await page.getByRole('button', { name: 'Return to overview' }).click();
      await expect(page.locator('.city-experience')).toHaveAttribute(
        'data-city-mode',
        'overview',
      );
      await expect(page.locator('.object-info')).toHaveCount(0);
    }
  }
  expect(
    await page.evaluate(
      (original) => original === document.querySelector('canvas'),
      originalCanvas,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Rome', exact: true }),
  ).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('the valley remains inspectable when every Rome GLB is unavailable', async ({
  page,
}) => {
  await page.route('**/models/rome-125/*.glb*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await enterRome(page, 'fallback');
  await enterValley(page, 'fallback');
  await expect(
    page.getByText(valley.immersive!.model!.fallbackLabel!, { exact: false }),
  ).toBeVisible();
  const arcadeObject = objects.find(
    (object) => object.id === 'colosseum-outer-arcade',
  )!;
  const arcadePrimitive = valley.immersive!.primitives.find(
    (primitive) => primitive.id === arcadeObject.sceneObjectId,
  )!;
  const arcade = await project(page, arcadePrimitive.position);
  await page.mouse.click(arcade.x, arcade.y);
  await expect(
    page.getByRole('heading', { name: arcadeObject.name, exact: true }),
  ).toBeVisible();
  for (const object of objects) {
    await page.getByRole('button', { name: object.name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('[data-model-status="fallback"]')).toHaveCount(1);
  for (const poi of world.pois)
    await expect(
      page.getByRole('button', { name: `Visit ${poi.name}`, exact: true }),
    ).toBeVisible();
});

test('portrait object information leaves narration and manual ambience controls reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterRome(page);
  await enterValley(page);
  await page.locator('[data-city-object]').first().click();
  await expect(page.locator('.object-info')).toBeVisible();
  const information = (await page.locator('.city-information').boundingBox())!;
  const narration = (await page.locator('.city-narration').boundingBox())!;
  expect(information.y + information.height).toBeLessThanOrEqual(narration.y);
  await page
    .getByRole('button', { name: 'Play ambience', exact: true })
    .click();
  await expect(
    page.getByText('Quiet ambience playing', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Pause ambience', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('.ambient-controls')).toHaveCount(0);
});
