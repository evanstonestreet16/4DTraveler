import { expect, test, type Page } from '@playwright/test';

// Allow software-rendered globe startup plus era reveals and POI exploration.
test.setTimeout(120000);

const city = (page: Page) => page.locator('.city-experience');
const view = (page: Page) => page.locator('[data-rendered-view="overview"]');
const slider = (page: Page) => page.getByRole('slider', { name: 'City era' });
const still = (page: Page) => page.locator('.overview-frame-host img');

async function enter(page: Page, present = false) {
  await page.goto('/');
  await page.getByRole('button', { name: /Kyoto/ }).click();
  await page
    .getByRole('button', { name: present ? /Present/ : /1700/ })
    .click();
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
}

async function landed(page: Page, present: boolean) {
  await expect(city(page)).toHaveAttribute(
    'data-world-id',
    present ? 'kyoto-present' : 'kyoto-1700',
  );
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'idle');
  await expect(view(page)).toHaveAttribute('data-image-status', 'ready');
  await expect(slider(page)).toHaveValue(present ? '1' : '0');
  await expect(slider(page)).toHaveAttribute(
    'aria-valuetext',
    present ? 'Kyoto, Present' : 'Kyoto, circa 1700',
  );
  await expect(still(page)).toHaveCount(1);
  expect(
    await still(page).evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
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

const VIEWPORT = { width: 1440, height: 1000 };

test('Kyoto time travel and historical exploration', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await landed(page, false);
  const originalY = (await slider(page).boundingBox())!.y;
  await slider(page).focus();
  await slider(page).press('ArrowRight');
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'playing');
  await expect(slider(page)).toBeDisabled();
  await expect(city(page)).toHaveAttribute('data-world-id', 'kyoto-1700');
  await expect(page.locator('[data-overview-poi]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('transition.png') });
  await landed(page, true);
  await expect(slider(page)).toBeFocused();
  await expect(still(page)).toHaveAttribute(
    'data-asset-url',
    /kyoto-present\/overview.webp/,
  );
  const bounds = (await slider(page).boundingBox())!;
  expect(bounds.y).toBeCloseTo(originalY, 0);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThan(VIEWPORT.height);
  await page.screenshot({ path: testInfo.outputPath('present.png') });
  await page.getByRole('button', { name: 'circa 1700', exact: true }).click();
  await expect(view(page)).toHaveAttribute('data-transition-phase', 'playing');
  await page.getByRole('button', { name: 'Skip transition' }).click();
  await landed(page, false);
  await page
    .getByRole('button', {
      name: 'Visit Nijō Castle: Ninomaru Approach',
      exact: true,
    })
    .click();
  await expect(page.locator('[data-rendered-view="panorama"]')).toHaveAttribute(
    'data-image-status',
    'ready',
  );
  await expect(slider(page)).toHaveCount(0);
  await page.locator('[data-city-object]').first().click();
  await expect(page.locator('.object-info')).toBeVisible();
  await page.getByRole('button', { name: 'Close object information' }).click();
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await landed(page, false);
  expect(errors).toEqual([]);
});

test('direct Present entry supports reduced motion and return travel', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, true);
  await landed(page, true);
  await page.getByRole('button', { name: 'circa 1700', exact: true }).click();
  await landed(page, false);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(still(page)).toHaveAttribute(
    'data-asset-url',
    /kyoto-1700\/overview.webp/,
  );
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await landed(page, true);
  await expect(still(page)).toHaveAttribute(
    'data-asset-url',
    /kyoto-present\/overview.webp/,
  );
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('failed modern Kyoto loading preserves the historical image and supports retry', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  const original = await still(page).getAttribute('src');
  await page.route(/\/images\/kyoto-present\//, (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByText(/Could not load Present/)).toBeVisible();
  await landed(page, false);
  await expect(still(page)).toHaveAttribute('src', original!);
  await page.unroute(/\/images\/kyoto-present\//);
  await page.getByRole('button', { name: 'Retry image' }).click();
  await landed(page, true);
});
