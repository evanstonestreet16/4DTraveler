import { expect, test, type Page } from '@playwright/test';
import { kyoto1700 as world } from '../src/data/worlds/kyoto-1700';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';
import type { PointOfInterest } from '../src/types/world';

const hero = world.pois.find((poi) => poi.id === 'nijo-ninomaru')!;

async function enterKyoto(page: Page, status = 'ready') {
  await page.goto('/?profile=1');
  await page.getByRole('button', { name: /Kyoto/ }).click();
  await page.getByRole('button', { name: /1700/ }).click();
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'overview',
  );
  await expect(page.locator('[data-rendered-view="overview"]')).toHaveAttribute(
    'data-image-status',
    status,
  );
}

async function enterPOI(page: Page, poi: PointOfInterest, status = 'ready') {
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: poi.name, exact: false })
    .click();
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'pov',
  );
  await expect(page.locator('[data-rendered-view]')).toHaveAttribute(
    'data-image-status',
    status,
  );
  if (status === 'ready') {
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-fixed-look',
      'true',
    );
    await expect
      .poll(async () => (await camera(page))?.position)
      .toEqual(poi.camera.position);
  }
}

async function camera(page: Page) {
  return page
    .locator('canvas')
    .evaluate(
      (canvas: ProfileCanvas) => canvas.__worldRendererInfo?.().camera ?? null,
    );
}

async function inspectObjects(page: Page, poi: PointOfInterest) {
  const list = page.getByRole('region', { name: `Objects at ${poi.name}` });
  await expect(list.getByRole('button')).toHaveCount(3);
  for (const objectId of poi.objectIds) {
    const object = world.objects.find((item) => item.id === objectId)!;
    const button = list.getByRole('button', { name: object.name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('heading', { name: object.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(object.confidence!, { exact: true }),
    ).toBeVisible();
    for (const source of object.sources!)
      await expect(
        page
          .locator('.object-sources')
          .getByRole('link', { name: source.title }),
      ).toHaveAttribute('href', source.url);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  await expect(
    list.locator(`[data-city-object="${poi.objectIds.at(-1)}"]`),
  ).toBeFocused();
}

async function returnToOverview(page: Page) {
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('[data-rendered-view="overview"]')).toHaveAttribute(
    'data-image-status',
    'ready',
  );
  await expect(
    page.getByRole('heading', { name: 'Kyoto', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.object-info')).toHaveCount(0);
  await expect(page.locator('[data-panorama-hotspot], canvas')).toHaveCount(0);
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Kyoto → Nijō → objects → transcript → overview at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await enterKyoto(page);
    const overview = page.locator('.rendered-overview-image');
    const initialSource = await overview.getAttribute('src');
    const expectedOverview =
      viewport.width < viewport.height
        ? world.scene.overviewImage!.mobile!
        : world.scene.overviewImage!.desktop;
    await expect(overview).toHaveAttribute('src', expectedOverview.url);
    await expect
      .poll(() =>
        overview.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(expectedOverview.width);
    await expect(page.locator('audio[autoplay]')).toHaveCount(0);
    await enterPOI(page, hero);
    expect(
      await page
        .locator('audio')
        .evaluateAll((tracks: HTMLAudioElement[]) =>
          tracks.every((track) => track.paused && track.currentTime === 0),
        ),
    ).toBe(true);
    if (viewport.width === 390) {
      const initial = (await camera(page))!;
      const touch = await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 310, y: 440 }],
      });
      for (let step = 1; step <= 5; step++)
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: 310 - step * 15, y: 440 }],
        });
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await touch.detach();
      const looked = (await camera(page))!;
      expect(looked.position).toEqual(initial.position);
      expect(looked.quaternion).not.toEqual(initial.quaternion);
      await expect(page.locator('.object-info')).toHaveCount(0);
    }
    await inspectObjects(page, hero);
    await page.getByText('Read narration transcript', { exact: true }).click();
    await expect(
      page.getByText(hero.immersive!.narrationTranscript!, { exact: true }),
    ).toBeVisible();
    const viewportWidth = page.viewportSize()!.width;
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewportWidth);
    await returnToOverview(page);
    await expect(overview).toHaveAttribute('src', initialSource!);
  });
}

test('Kiyomizu and Nishiki keep their hotspots, stories, and selection isolated', async ({
  page,
}) => {
  await enterKyoto(page);
  for (const poi of world.pois.filter((item) => item.id !== hero.id)) {
    await enterPOI(page, poi);
    await expect(page.locator('[data-panorama-hotspot]')).toHaveCount(3);
    await expect(page.locator('.object-info')).toHaveCount(0);
    await inspectObjects(page, poi);
    // Expanded transcripts persist across views; do not toggle an open story shut.
    if ((await page.locator('.transcript').getAttribute('open')) === null)
      await page
        .getByText('Read narration transcript', { exact: true })
        .click();
    await expect(
      page.getByText(poi.immersive!.narrationTranscript!, { exact: true }),
    ).toBeVisible();
    await returnToOverview(page);
  }
});

test('a Nijō hotspot supports mouse and keyboard inspection while dragging keeps the eye fixed', async ({
  page,
}) => {
  await enterKyoto(page);
  await enterPOI(page, hero);
  const hotspot = page
    .locator('[data-panorama-hotspot][aria-hidden="false"]')
    .first();
  await expect(hotspot).toBeVisible();
  const objectId = await hotspot.getAttribute('data-panorama-hotspot');
  const object = world.objects.find((item) => item.id === objectId)!;
  const initial = (await camera(page))!;
  await hotspot.click();
  await expect(
    page.getByRole('heading', { name: object.name, exact: true }),
  ).toBeVisible();
  await expect(hotspot).toHaveAttribute('aria-pressed', 'true');
  expect(await camera(page)).toEqual(initial);
  await page.getByRole('button', { name: 'Close object information' }).click();

  const bounds = (await hotspot.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 90,
    bounds.y + bounds.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  const looked = (await camera(page))!;
  expect(looked.position).toEqual(initial.position);
  expect(looked.quaternion).not.toEqual(initial.quaternion);
  await expect(page.locator('.object-info')).toHaveCount(0);

  const visible = page
    .locator('[data-panorama-hotspot][aria-hidden="false"]')
    .first();
  await expect(visible).toBeVisible();
  const keyboardId = await visible.getAttribute('data-panorama-hotspot');
  await visible.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator(`[data-city-object="${keyboardId}"]`),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await camera(page)).toEqual(looked);
});

test('failed overview and panorama images retain usable places, object stories, and retry', async ({
  page,
}) => {
  const overview = world.scene.overviewImage!;
  const panorama = hero.immersive!.panorama!;
  const failedPaths = new Set(
    [
      overview.desktop,
      overview.mobile!,
      panorama.desktop,
      panorama.mobile!,
    ].map((asset) => new URL(asset.url, 'http://local').pathname),
  );
  let unavailable = true;
  await page.route(
    (url) => failedPaths.has(url.pathname),
    (route) =>
      unavailable ? route.fulfill({ status: 404, body: '' }) : route.continue(),
  );
  await enterKyoto(page, 'fallback');
  await expect(
    page.getByText(
      'The detailed overview could not load. You can still choose a place.',
    ),
  ).toBeVisible();
  await enterPOI(page, hero, 'fallback');
  await expect(
    page.getByText(
      'The panorama could not load. Explore the still and object list.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: `Still reconstruction of ${hero.name}.` }),
  ).toBeVisible();
  await inspectObjects(page, hero);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry image', exact: true }).click();
  await expect(page.locator('[data-rendered-view="panorama"]')).toHaveAttribute(
    'data-image-status',
    'ready',
  );
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-fixed-look',
    'true',
  );
  await returnToOverview(page);
});

test('lost WebGL retains the still and object list, then reloads the same Kyoto view', async ({
  page,
}) => {
  await enterKyoto(page);
  await enterPOI(page, hero);
  await page.locator('canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(
    page.getByText(
      'The 360° view is unavailable. Explore the still and object list.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: `Still reconstruction of ${hero.name}.` }),
  ).toBeVisible();
  await inspectObjects(page, hero);
  await page.getByRole('button', { name: 'Reload 360° view' }).click();
  await expect(page.locator('[data-rendered-view="panorama"]')).toHaveAttribute(
    'data-image-status',
    'ready',
  );
  await expect
    .poll(async () => (await camera(page))?.position)
    .toEqual(hero.camera.position);
  await returnToOverview(page);
});
