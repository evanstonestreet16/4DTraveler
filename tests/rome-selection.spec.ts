import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { rome125 as world } from '../src/data/worlds/rome-125';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';

const forum = world.pois.find((poi) => poi.id === 'forum-trajan')!;
const forumObjects = world.objects.filter(
  (object) => object.poiId === forum.id,
);

async function snapshot(page: Page) {
  return page
    .locator('canvas')
    .evaluate((canvas: ProfileCanvas) => canvas.__worldRendererInfo!());
}

async function enterRome(page: Page, status = 'ready') {
  await page.goto('/?profile');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page.getByRole('button', { name: /125 CE/ }).click();
  await expect(page.locator(`[data-model-status="${status}"]`)).toHaveCount(1);
}

async function enterForum(page: Page, status = 'ready') {
  await page
    .getByRole('button', { name: 'Visit Forum of Trajan', exact: true })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-fixed-look',
    'true',
  );
  await expect(page.locator(`[data-model-status="${status}"]`)).toHaveCount(1);
  await expect
    .poll(async () => (await snapshot(page)).camera.position)
    .toEqual(forum.camera.position);
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

async function changedPixels(page: Page, before: Buffer, after: Buffer) {
  return page.evaluate(
    async ({ before, after }) => {
      const pixels = async (encoded: string) => {
        const bytes = Uint8Array.from(atob(encoded), (value) =>
          value.charCodeAt(0),
        );
        const bitmap = await createImageBitmap(
          new Blob([bytes], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [first, second] = await Promise.all([
        pixels(before),
        pixels(after),
      ]);
      let changed = 0;
      for (let index = 0; index < first.length; index += 4)
        if (
          Math.abs(first[index] - second[index]) +
            Math.abs(first[index + 1] - second[index + 1]) +
            Math.abs(first[index + 2] - second[index + 2]) >
          30
        )
          changed++;
      return changed;
    },
    { before: before.toString('base64'), after: after.toString('base64') },
  );
}

test('a real Forum mesh opens its sources and visibly highlights without moving the camera', async ({
  page,
}, testInfo) => {
  await enterRome(page);
  await enterForum(page);
  const camera = (await snapshot(page)).camera;
  // The modeled horse body is visible above its plinth at the center of the piazza.
  const point = await project(page, [0, 5.25, 0]);
  const clip = { x: point.x - 70, y: point.y - 70, width: 140, height: 140 };
  await page.mouse.move(point.x, point.y);
  const before = await page.screenshot({ clip });
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole('heading', {
      name: 'Equestrian Statue of Trajan',
      exact: true,
    }),
  ).toBeVisible();
  const highlighted = await page.screenshot({
    clip,
    path: testInfo.outputPath('forum-mesh-highlight.png'),
  });
  // Verify changed rendered pixels on the actual mesh, away from the information overlay.
  expect(await changedPixels(page, before, highlighted)).toBeGreaterThan(100);
  expect((await snapshot(page)).camera).toEqual(camera);

  for (const object of forumObjects) {
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
          .getByRole('link', { name: source.title, exact: false }),
      ).toHaveAttribute('href', source.url);
    expect((await snapshot(page)).camera).toEqual(camera);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  await expect(page.locator('.object-info')).toHaveCount(0);
  expect((await snapshot(page)).camera).toEqual(camera);
});

test('repeated overview and Forum loads retain bounded GPU resources and a single canvas', async ({
  page,
}) => {
  await enterRome(page);
  const canvas = await page.locator('canvas').elementHandle();
  await expect
    .poll(async () => (await snapshot(page)).render.triangles)
    .toBeGreaterThan(1000);
  const overviewMemory = (await snapshot(page)).memory;
  await enterForum(page);
  await expect
    .poll(async () => (await snapshot(page)).render.triangles)
    .toBeGreaterThan(1000);
  const forumMemory = (await snapshot(page)).memory;
  for (let repeat = 0; repeat < 3; repeat++) {
    await page.getByRole('button', { name: 'Return to overview' }).click();
    await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
    await expect
      .poll(async () => (await snapshot(page)).memory)
      .toEqual(overviewMemory);
    await enterForum(page);
    await expect
      .poll(async () => (await snapshot(page)).memory)
      .toEqual(forumMemory);
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(
    await page.evaluate(
      (original) => original === document.querySelector('canvas'),
      canvas,
    ),
  ).toBe(true);
});

test('missing Rome models preserve fallback mesh picking, source notes, and overview recovery', async ({
  page,
}) => {
  await page.route('**/models/rome-125/*.glb*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await enterRome(page, 'fallback');
  await expect(
    page.getByText('Rome’s detailed overview could not load.', {
      exact: false,
    }),
  ).toBeVisible();
  await enterForum(page, 'fallback');
  await expect(
    page.getByText('The detailed Forum could not load.', { exact: false }),
  ).toBeVisible();
  const statue = await project(page, [0, 3.5, 0]);
  await page.mouse.click(statue.x, statue.y);
  await expect(
    page.getByRole('heading', {
      name: 'Equestrian Statue of Trajan',
      exact: true,
    }),
  ).toBeVisible();
  for (const object of forumObjects) {
    await page.getByRole('button', { name: object.name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.object-sources a')).toHaveCount(
      object.sources!.length,
    );
  }
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'overview',
  );
  await expect(page.locator('.object-info')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Visit Forum of Trajan', exact: true }),
  ).toBeVisible();
});
