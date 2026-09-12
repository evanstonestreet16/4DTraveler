import { expect, test, type Locator, type Page } from '@playwright/test';
import { Euler, Quaternion } from 'three';
import { rome125 as world } from '../src/data/worlds/rome-125';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';
import type {
  HistoricalObject,
  PanoramaHotspot,
  PointOfInterest,
} from '../src/types/world';

const forum = world.pois.find((poi) => poi.id === 'forum-trajan')!;
const valley = world.pois.find((poi) => poi.id === 'colosseum-valley')!;
const view = (page: Page) => page.locator('[data-rendered-view]');
const overview = (page: Page) => page.locator('.rendered-overview-image');
const assetPath = (url: string) => new URL(url, 'http://localhost').pathname;

async function chooseRome(page: Page) {
  await page.goto('/?profile=1');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page.getByRole('button', { name: /125 CE/ }).click();
}

async function enterRome(page: Page) {
  await chooseRome(page);
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'overview');
}

async function enterPOI(page: Page, poi: PointOfInterest) {
  await page
    .getByRole('button', { name: `Visit ${poi.name}`, exact: true })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'panorama');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-fixed-look',
    'true',
  );
  await expect
    .poll(async () => (await snapshot(page)).camera.position)
    .toEqual(poi.camera.position);
}

async function returnToOverview(page: Page) {
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'overview');
  await expect(page.locator('.object-info')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
}

async function snapshot(page: Page) {
  return page.locator('canvas').evaluate((canvas: ProfileCanvas) => {
    if (!canvas.__worldRendererInfo)
      throw new Error('Renderer diagnostics unavailable');
    return canvas.__worldRendererInfo();
  });
}

async function assertStillLoaded(page: Page) {
  const still = view(page).locator('img');
  await expect(still).toBeVisible();
  await expect
    .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
}

/** Reach each real marker through the same keyboard look control visitors use. */
async function faceHotspot(page: Page, hotspot: PanoramaHotspot) {
  const camera = (await snapshot(page)).camera;
  const rotation = new Euler().setFromQuaternion(
    new Quaternion(...camera.quaternion),
    'YXZ',
  );
  const yaw = Math.atan2(
    Math.sin(hotspot.yaw - rotation.y),
    Math.cos(hotspot.yaw - rotation.y),
  );
  await page.locator('canvas').focus();
  for (const [delta, positive, negative] of [
    [yaw, 'ArrowLeft', 'ArrowRight'],
    [hotspot.pitch - rotation.x, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    for (let step = 0; step < Math.round(Math.abs(delta) / 0.096); step++)
      await page.keyboard.press(delta > 0 ? positive : negative);
  }
}

async function assertObjectContent(page: Page, object: HistoricalObject) {
  const panel = page.locator('.object-info');
  await expect(
    panel.getByRole('heading', { name: object.name, exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole('heading', { name: /Grok tour/ })).toBeVisible();
}

async function visibleAndInViewport(
  control: Locator,
  width: number,
  height: number,
) {
  await expect(control).toBeVisible();
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
  return box;
}

test('Rome opens a static overview and all three street views and nine objects preserve stories, transcripts, and return', async ({
  page,
}) => {
  test.setTimeout(90000);
  const modelRequests: string[] = [];
  const audioRequests: string[] = [];
  const imageRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/images/rome-125/'))
      imageRequests.push(request.url());
    if (request.url().includes('/models/rome-125/'))
      modelRequests.push(request.url());
    if (request.url().includes('/audio/rome-125/'))
      audioRequests.push(request.url());
  });
  await enterRome(page);
  const initialImage = await overview(page).getAttribute('data-asset-url');
  const initialBounds = await overview(page).boundingBox();
  expect(initialBounds).toMatchObject({
    x: 0,
    y: 0,
    width: 1440,
    height: 1000,
  });
  await page.mouse.move(750, 480);
  await page.mouse.down();
  await page.mouse.move(980, 570, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, 500);
  await page.keyboard.press('ArrowRight');
  expect(await overview(page).boundingBox()).toEqual(initialBounds);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(
    page.getByText(world.scene.narrationTranscript!, { exact: true }),
  ).toBeVisible();
  await page.getByText('Read narration transcript', { exact: true }).click();

  for (const poi of world.pois) {
    await enterPOI(page, poi);
    expect(
      imageRequests.some((url) =>
        url.endsWith(poi.immersive!.panorama!.desktop.url),
      ),
    ).toBe(true);
    const objects = world.objects.filter((object) => object.poiId === poi.id);
    expect(objects).toHaveLength(3);
    await expect(page.locator('[data-city-object]')).toHaveCount(3);
    expect(
      await page
        .locator('[data-city-object]')
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute('data-city-object')),
        ),
    ).toEqual(poi.objectIds);
    for (const object of objects) {
      const hotspot = poi.immersive!.panorama!.hotspots.find(
        (item) => item.objectId === object.id,
      );
      const listButton = page.locator(`[data-city-object="${object.id}"]`);
      if (hotspot) {
        await faceHotspot(page, hotspot);
        const direction = (await snapshot(page)).camera;
        const marker = page.getByRole('button', {
          name: `Inspect ${object.name}`,
          exact: true,
        });
        await marker.click();
        await expect(marker).toHaveAttribute('aria-pressed', 'true');
        await assertObjectContent(page, object);
        expect((await snapshot(page)).camera).toEqual(direction);
        await expect(listButton).toHaveAttribute('aria-pressed', 'true');
        await page
          .getByRole('button', { name: 'Close object information' })
          .click();
        await expect(listButton).toBeFocused();
        await expect(marker).toHaveAttribute('aria-pressed', 'false');
      }
      const direction = (await snapshot(page)).camera;
      await listButton.focus();
      await listButton.press('Enter');
      await assertObjectContent(page, object);
      expect((await snapshot(page)).camera).toEqual(direction);
      await page
        .getByRole('button', { name: 'Close object information' })
        .click();
    }
    await page.getByText('Read narration transcript', { exact: true }).click();
    await expect(
      page.getByText(poi.immersive!.narrationTranscript!, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play Narration', exact: true }),
    ).toHaveCount(0);
    await page.getByText('Read narration transcript', { exact: true }).click();
    await returnToOverview(page);
    expect(await overview(page).getAttribute('data-asset-url')).toBe(
      initialImage,
    );
    await expect(
      page.getByRole('heading', { name: 'Rome', exact: true }),
    ).toBeVisible();
    for (const item of world.pois)
      await expect(
        page.getByRole('button', { name: `Visit ${item.name}`, exact: true }),
      ).toBeVisible();
  }
  expect(modelRequests).toEqual([]);
  expect(audioRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('nearby arrows visit every supplied Rome view, clear selection, recover a failed image, and reset on re-entry', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await enterRome(page);
  for (const poi of world.pois) {
    await enterPOI(page, poi);
    const views = poi.immersive!.panorama!.viewpoints!;
    const navigation = page.getByRole('navigation', {
      name: 'Nearby street views',
    });
    await expect(navigation).toHaveAttribute('data-street-view', views[0].id);
    await page.locator('[data-city-object]').first().click();
    await expect(page.locator('.object-info')).toBeVisible();
    for (let index = 1; index < views.length; index++) {
      await navigation
        .getByRole('button', {
          name: `Move to ${views[index].label}`,
          exact: true,
        })
        .click();
      await expect(navigation).toHaveAttribute(
        'data-street-view',
        views[index].id,
      );
      await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
      expect(
        requested.some((url) => url.endsWith(views[index].desktop.url)),
      ).toBe(true);
      await expect(page.locator('.object-info')).toHaveCount(0);
      await expect(page.locator('[data-city-object]')).toHaveCount(3);
      // Source-specific entry hotspots cannot float over a different image.
      await expect(page.locator('[data-panorama-hotspot]')).toHaveCount(
        views[index].hotspots.length,
      );
    }
    await navigation
      .getByRole('button', { name: `Move to ${views[0].label}`, exact: true })
      .press('Enter');
    await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
    await expect(navigation).toHaveAttribute('data-street-view', views[0].id);
    // The left arrow wraps back to the last image as well.
    await navigation
      .getByRole('button', {
        name: `Move to ${views.at(-1)!.label}`,
        exact: true,
      })
      .click();
    await expect(navigation).toHaveAttribute(
      'data-street-view',
      views.at(-1)!.id,
    );
    await returnToOverview(page);
    await expect(navigation).toHaveCount(0);
    await enterPOI(page, poi);
    await expect(navigation).toHaveAttribute('data-street-view', views[0].id);
    await returnToOverview(page);
  }
  // An unavailable nearby view retains both directions and an actual retry.
  await enterPOI(page, forum);
  const target = forum.immersive!.panorama!.viewpoints![1];
  const failedUrl = `**${assetPath(target.desktop.url)}*`;
  await page.route(failedUrl, (route) => route.abort());
  await page
    .getByRole('button', { name: `Move to ${target.label}`, exact: true })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'fallback');
  await assertStillLoaded(page);
  await expect(
    page
      .getByRole('navigation', { name: 'Nearby street views' })
      .getByRole('button'),
  ).toHaveCount(2);
  await page.unroute(failedUrl);
  await page.getByRole('button', { name: 'Retry image', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await returnToOverview(page);
});

test('dragging a hotspot looks in place without selecting; keyboard pitch limits and selection preserve direction', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterRome(page);
  await enterPOI(page, forum);
  const hotspot = forum.immersive!.panorama!.hotspots[0];
  await faceHotspot(page, hotspot);
  const marker = page.locator(`[data-panorama-hotspot="${hotspot.objectId}"]`);
  await expect(marker).toBeVisible();
  const box = (await marker.boundingBox())!;
  const initial = (await snapshot(page)).camera;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 180,
    box.y + box.height / 2 + 40,
    { steps: 12 },
  );
  await page.mouse.up();
  const looked = (await snapshot(page)).camera;
  expect(looked.position).toEqual(initial.position);
  expect(looked.quaternion).not.toEqual(initial.quaternion);
  await expect(page.locator('.object-info')).toHaveCount(0);
  await page.mouse.wheel(0, 300);
  expect((await snapshot(page)).camera).toEqual(looked);
  await page.locator('[data-city-object]').first().click();
  expect((await snapshot(page)).camera).toEqual(looked);
  await page.keyboard.press('Escape');
  await expect(page.locator('.object-info')).toHaveCount(0);
  await page.locator('canvas').focus();
  for (let step = 0; step < 30; step++) await page.keyboard.press('ArrowUp');
  const up = (await snapshot(page)).camera;
  expect(
    new Euler().setFromQuaternion(new Quaternion(...up.quaternion), 'YXZ').x,
  ).toBeCloseTo(forum.immersive!.look.maxPitch);
  for (let step = 0; step < 30; step++) await page.keyboard.press('ArrowDown');
  const down = (await snapshot(page)).camera;
  expect(
    new Euler().setFromQuaternion(new Quaternion(...down.quaternion), 'YXZ').x,
  ).toBeCloseTo(forum.immersive!.look.minPitch);
  expect(down.position).toEqual(initial.position);
  await page.keyboard.press('Escape');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'overview');
});

test('portrait uses mobile images, touch look, separated markers, and reachable object and audio controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const imageRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/images/rome-125/'))
      imageRequests.push(url.pathname);
  });
  await enterRome(page);
  await expect(overview(page)).toHaveAttribute(
    'data-asset-url',
    world.scene.overviewImage!.mobile!.url,
  );
  const markers = [];
  for (const poi of world.pois)
    markers.push(
      await visibleAndInViewport(
        page.getByRole('button', { name: `Visit ${poi.name}`, exact: true }),
        390,
        844,
      ),
    );
  for (let left = 0; left < markers.length; left++)
    for (const right of markers.slice(left + 1)) {
      const a = markers[left];
      expect(
        a.x + a.width <= right.x ||
          right.x + right.width <= a.x ||
          a.y + a.height <= right.y ||
          right.y + right.height <= a.y,
      ).toBe(true);
    }
  await enterPOI(page, valley);
  expect(imageRequests).toContain(
    assetPath(valley.immersive!.panorama!.mobile!.url),
  );
  expect(imageRequests).not.toContain(
    assetPath(valley.immersive!.panorama!.desktop.url),
  );
  const initial = (await snapshot(page)).camera;
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
  const looked = (await snapshot(page)).camera;
  expect(looked.position).toEqual(initial.position);
  expect(looked.quaternion).not.toEqual(initial.quaternion);
  await expect(page.locator('.object-info')).toHaveCount(0);
  const nearby = valley.immersive!.panorama!.viewpoints!;
  const arrow = page.getByRole('button', {
    name: `Move to ${nearby[1].label}`,
    exact: true,
  });
  await visibleAndInViewport(arrow, 390, 844);
  await arrow.click();
  await expect(
    page.getByRole('navigation', { name: 'Nearby street views' }),
  ).toHaveAttribute('data-street-view', nearby[1].id);
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await page
    .getByRole('button', { name: `Move to ${nearby[0].label}`, exact: true })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-fixed-look',
    'true',
  );
  const returnedLook = (await snapshot(page)).camera;
  await page.locator('[data-city-object]').first().click();
  expect((await snapshot(page)).camera).toEqual(returnedLook);
  const information = (await page.locator('.city-information').boundingBox())!;
  const narration = (await page.locator('.city-narration').boundingBox())!;
  expect(information.y + information.height).toBeLessThanOrEqual(narration.y);
  await visibleAndInViewport(
    page.getByRole('button', { name: 'Close object information' }),
    390,
    844,
  );
  await visibleAndInViewport(
    page.getByRole('button', { name: 'Play ambience', exact: true }),
    390,
    844,
  );
  await visibleAndInViewport(
    page.getByRole('button', { name: 'Return to overview' }),
    390,
    844,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await visibleAndInViewport(
    page.getByRole('button', { name: 'Return to overview' }),
    844,
    390,
  );
  expect((await snapshot(page)).camera).toEqual(returnedLook);
  await returnToOverview(page);
});

test('missing overview and panorama images retain source content and recover through an actual retry', async ({
  page,
}) => {
  const overviewUrl = world.scene.overviewImage!.desktop.url;
  const panoramaUrls = [
    forum.immersive!.panorama!.desktop.url,
    forum.immersive!.panorama!.mobile!.url,
  ];
  await page.route(`**${overviewUrl}*`, (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  for (const url of panoramaUrls)
    await page.route(`**${url}*`, (route) =>
      route.fulfill({ status: 404, body: '' }),
    );
  await chooseRome(page);
  await expect(view(page)).toHaveAttribute('data-image-status', 'fallback');
  await assertStillLoaded(page);
  await page.unroute(`**${overviewUrl}*`);
  await page.getByRole('button', { name: 'Retry image', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await page
    .getByRole('button', { name: `Visit ${forum.name}`, exact: true })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'fallback');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'fallback');
  await assertStillLoaded(page);
  for (const object of world.objects.filter(
    (item) => item.poiId === forum.id,
  )) {
    await page.locator(`[data-city-object="${object.id}"]`).click();
    await assertObjectContent(page, object);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  for (const url of panoramaUrls) await page.unroute(`**${url}*`);
  await page.getByRole('button', { name: 'Retry image', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'panorama');
  await returnToOverview(page);
});

test('real WebGL context loss keeps a still, object list, and working reload and return', async ({
  page,
}) => {
  await enterRome(page);
  await enterPOI(page, forum);
  await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('webgl2');
    const extension = context?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss extension unavailable');
    extension.loseContext();
  });
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'fallback');
  await assertStillLoaded(page);
  const object = world.objects.find((item) => item.poiId === forum.id)!;
  await page.locator(`[data-city-object="${object.id}"]`).click();
  await assertObjectContent(page, object);
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page
    .getByRole('button', { name: 'Reload 360° view', exact: true })
    .click();
  await expect(view(page)).toHaveAttribute('data-rendered-view', 'panorama');
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await returnToOverview(page);
});

test('WebGL unavailable at entry still permits every POI and its object stories', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === 'webgl' ||
        type === 'webgl2' ||
        type === 'experimental-webgl'
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await enterRome(page);
  for (const poi of world.pois) {
    await page
      .getByRole('button', { name: `Visit ${poi.name}`, exact: true })
      .click();
    await expect(view(page)).toHaveAttribute('data-rendered-view', 'fallback');
    await assertStillLoaded(page);
    await expect(
      page.getByRole('button', { name: 'Reload 360° view', exact: true }),
    ).toBeVisible();
    const object = world.objects.find((item) => item.poiId === poi.id)!;
    await page.locator(`[data-city-object="${object.id}"]`).click();
    await assertObjectContent(page, object);
    await returnToOverview(page);
  }
});

test('repeated POI visits release each inactive panorama texture and keep GPU resources bounded', async ({
  page,
}) => {
  test.setTimeout(90000);
  await enterRome(page);
  const memory = new Map<string, { geometries: number; textures: number }>();
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const poi of world.pois) {
      await enterPOI(page, poi);
      await expect
        .poll(async () => (await snapshot(page)).memory.textures)
        .toBe(1);
      const current = (await snapshot(page)).memory;
      if (cycle === 0) memory.set(poi.id, current);
      else expect(current).toEqual(memory.get(poi.id));
      await expect(page.locator('canvas')).toHaveCount(1);
      // Retain only the read-only diagnostics closure so disposal is observable
      // after the canvas unmounts, then immediately release the test handle.
      const retired = await page
        .locator('canvas')
        .evaluateHandle((canvas: ProfileCanvas) => canvas.__worldRendererInfo!);
      await returnToOverview(page);
      await expect
        .poll(() => retired.evaluate((read) => read().memory.textures))
        .toBe(0);
      await retired.dispose();
    }
  }
});
