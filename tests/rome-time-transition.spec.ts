import { expect, test, type Page } from '@playwright/test';

const city = (page: Page) => page.locator('.city-experience');
const view = (page: Page) => page.locator('[data-rendered-view="overview"]');
const slider = (page: Page) => page.getByRole('slider', { name: 'City era' });
const still = (page: Page) => page.locator('.overview-frame-host img');

async function enter(page: Page, present = false) {
  await page.goto('/');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page
    .getByRole('button', { name: present ? /Present/ : /125 CE/ })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
}
async function landed(page: Page, present: boolean) {
  await expect(city(page)).toHaveAttribute(
    'data-world-id',
    present ? 'rome-present' : 'rome-125',
  );
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'idle');
  await expect(slider(page)).toHaveValue(present ? '1' : '0');
  await expect(still(page)).toHaveCount(1);
  expect(
    await still(page).evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
    ),
  ).toBe(true);
  await expect(page.locator('[data-overview-poi]')).toHaveCount(
    present ? 0 : 3,
  );
  if (present)
    await expect(
      page.getByRole('navigation', { name: 'Points of interest' }),
    ).toHaveCount(0);
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Rome time travel and exploration at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await enter(page);
    const timelineBefore = (await slider(page).boundingBox())!;
    await page.screenshot({ path: testInfo.outputPath('historical.png') });
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect(view(page)).toHaveAttribute(
      'data-transition-phase',
      'playing',
    );
    await expect(slider(page)).toBeDisabled();
    expect((await slider(page).boundingBox())!.y).toBeCloseTo(
      timelineBefore.y,
      0,
    );
    await expect(city(page)).toHaveAttribute('data-world-id', 'rome-125');
    await page.waitForTimeout(800);
    await page.screenshot({ path: testInfo.outputPath('transition.png') });
    await landed(page, true);
    await expect(slider(page)).toBeFocused();
    await expect(still(page)).toHaveAttribute(
      'data-asset-url',
      viewport.width < viewport.height ? /overview-mobile/ : /overview.webp/,
    );
    await page.screenshot({ path: testInfo.outputPath('present.png') });
    const bounds = (await slider(page).boundingBox())!;
    expect(bounds.y).toBeCloseTo(timelineBefore.y, 0);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThan(viewport.height);
    await slider(page).press('ArrowLeft');
    await expect(
      page.getByRole('button', { name: 'Skip transition' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Skip transition' }).click();
    await landed(page, false);
    await page
      .getByRole('button', { name: 'Visit Forum of Trajan', exact: true })
      .click();
    await expect(
      page.locator('[data-rendered-view="panorama"]'),
    ).toHaveAttribute('data-image-status', 'ready');
    await expect(slider(page)).toHaveCount(0);
    await page.locator('[data-city-object]').first().click();
    await expect(page.locator('.object-info')).toBeVisible();
    await page
      .getByRole('button', { name: 'Close object information' })
      .click();
    await page.getByRole('button', { name: 'Return to overview' }).click();
    await landed(page, false);
    expect(errors).toEqual([]);
  });
}

test('a delayed destination preserves the source; cancellation and retry remain usable', async ({
  page,
}) => {
  await enter(page);
  let release!: () => void;
  let mode: 'hold' | 'fail' | 'pass' = 'hold';
  let intercepted = 0;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/images\/rome-present\//, async (route) => {
    intercepted++;
    if (mode === 'hold') {
      await hold;
      await route.abort().catch(() => undefined);
    } else if (mode === 'fail') await route.fulfill({ status: 404, body: '' });
    else await route.continue();
  });
  const original = await still(page).getAttribute('src');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(view(page)).toHaveAttribute(
    'data-transition-phase',
    'preparing',
  );
  await expect.poll(() => intercepted).toBeGreaterThan(0);
  await expect(still(page)).toHaveAttribute('src', original!);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await landed(page, false);
  release();
  mode = 'fail';
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByText(/Could not load Present/)).toBeVisible();
  await landed(page, false);
  mode = 'pass';
  await page.getByRole('button', { name: 'Retry image' }).click();
  await landed(page, true);
});

test('reduced motion, direct Present entry and repeated visits release decoded images', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const active = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = create(object);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
    Object.defineProperty(window, '__activeImageUrls', {
      get: () => active.size,
    });
  });
  await enter(page, true);
  await landed(page, true);
  for (let index = 0; index < 4; index++) {
    const present = index % 2 !== 0;
    await page
      .getByRole('button', {
        name: present ? 'Present' : '125 CE',
        exact: true,
      })
      .click();
    await landed(page, present);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(
      await page.evaluate(() => Reflect.get(window, '__activeImageUrls')),
    ).toBe(1);
  }
  await page.getByRole('button', { name: 'Choose era', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__activeImageUrls')))
    .toBe(0);
});

test('Escape and orientation change land on a ready endpoint', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'playing');
  await page.keyboard.press('Escape');
  await landed(page, true);
  await page.getByRole('button', { name: '125 CE', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'playing');
  await page.setViewportSize({ width: 390, height: 844 });
  await landed(page, false);
  await expect(still(page)).toHaveAttribute(
    'data-asset-url',
    /overview-mobile/,
  );
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'playing');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await landed(page, true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    Element.prototype.animate = () => {
      throw new Error('Animation unavailable');
    };
  });
  await page.getByRole('button', { name: '125 CE', exact: true }).click();
  await landed(page, false);
});
