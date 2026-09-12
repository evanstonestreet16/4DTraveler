import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { rome125 as world } from '../src/data/worlds/rome-125';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';

const pantheon = world.pois.find((poi) => poi.id === 'pantheon-forecourt')!;
const forum = world.pois.find((poi) => poi.id === 'forum-trajan')!;
const objects = world.objects.filter((object) => object.poiId === pantheon.id);

async function snapshot(page: Page) {
  return page
    .locator('canvas')
    .evaluate((canvas: ProfileCanvas) => canvas.__worldRendererInfo!());
}

async function chooseRome(page: Page) {
  await page.goto('/?profile=1');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page.getByRole('button', { name: /125 CE/ }).click();
}

async function enterPantheon(page: Page, status = 'ready') {
  await page
    .getByRole('button', { name: 'Visit The New Pantheon', exact: true })
    .click();
  await expect(page.locator(`[data-model-status="${status}"]`)).toHaveCount(1);
  await expect
    .poll(async () => (await snapshot(page)).camera.position)
    .toEqual(pantheon.camera.position);
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

test('the overview becomes usable before sequential Forum and Pantheon prefetch', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/models/rome-125/') && pathname.endsWith('.glb'))
      requests.push(pathname);
  });
  let releaseOverview = () => {};
  const overviewGate = new Promise<void>((resolve) => {
    releaseOverview = resolve;
  });
  await page.route('**/models/rome-125/overview.glb*', async (route) => {
    await overviewGate;
    await route.continue();
  });
  try {
    await chooseRome(page);
    await expect(page.locator('[data-model-status="loading"]')).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: 'Visit The New Pantheon', exact: true }),
    ).toBeVisible();
    expect(requests).toEqual(['/models/rome-125/overview.glb']);
    releaseOverview();
    await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
    await expect
      .poll(() => requests)
      .toContain('/models/rome-125/pantheon-forecourt.glb');
    expect(requests.indexOf('/models/rome-125/overview.glb')).toBeLessThan(
      requests.indexOf('/models/rome-125/forum-trajan.glb'),
    );
    expect(requests.indexOf('/models/rome-125/forum-trajan.glb')).toBeLessThan(
      requests.indexOf('/models/rome-125/pantheon-forecourt.glb'),
    );
    expect(requests).not.toContain('/models/rome-125/colosseum-valley.glb');
  } finally {
    releaseOverview();
  }
});

test('Pantheon mesh picking, all three object stories and the location transcript remain available', async ({
  page,
}) => {
  await chooseRome(page);
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await enterPantheon(page);
  const camera = (await snapshot(page)).camera;
  // The authored inscription face is above the porch and clear of the foreground columns.
  const inscription = await project(page, [0, 16.6, -11.05]);
  await page.mouse.click(inscription.x, inscription.y);
  await expect(
    page.getByRole('heading', { name: 'Agrippa Inscription', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close object information' }).click();
  const granite = await project(page, [6.3, 8, -7]);
  await page.mouse.click(granite.x, granite.y);
  await expect(
    page.getByRole('heading', {
      name: 'Egyptian Granite Columns',
      exact: true,
    }),
  ).toBeVisible();
  expect(objects).toHaveLength(3);
  for (const object of objects) {
    await page.getByRole('button', { name: object.name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.object-sources a')).toHaveCount(
      object.sources!.length,
    );
    expect((await snapshot(page)).camera).toEqual(camera);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(
    page.getByText(pantheon.immersive!.narrationTranscript!, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Play Narration', exact: true }),
  ).toBeDisabled();
});

test('Forum and Pantheon switches keep one world mounted and restore authored fixed viewpoints', async ({
  page,
}) => {
  await chooseRome(page);
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  const originalCanvas = await page.locator('canvas').elementHandle();
  for (let cycle = 0; cycle < 3; cycle++) {
    await enterPantheon(page);
    await page.locator('canvas').focus();
    await page.keyboard.press('ArrowRight');
    expect((await snapshot(page)).camera.position).toEqual(
      pantheon.camera.position,
    );
    await page.getByRole('button', { name: 'Return to overview' }).click();
    await page
      .getByRole('button', { name: 'Visit Forum of Trajan', exact: true })
      .click();
    await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
    await expect
      .poll(async () => (await snapshot(page)).camera.position)
      .toEqual(forum.camera.position);
    await page.getByRole('button', { name: 'Return to overview' }).click();
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

test('a missing Pantheon model retains its three stories and a working return to the detailed overview', async ({
  page,
}) => {
  await page.route('**/models/rome-125/pantheon-forecourt.glb*', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await chooseRome(page);
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await enterPantheon(page, 'fallback');
  await expect(
    page.getByText(pantheon.immersive!.model!.fallbackLabel!, { exact: true }),
  ).toBeVisible();
  for (const object of objects) {
    await page.getByRole('button', { name: object.name, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Visit The New Pantheon', exact: true }),
  ).toBeVisible();
});
