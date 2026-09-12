import { expect, test, type Route } from '@playwright/test';

test('stalled Kyoto overview images recover after a late fallback and retry', async ({
  page,
}) => {
  await page.clock.install();
  const stalled: Route[] = [];
  const overviewImages = '**/images/kyoto-1700/overview*';
  await page.route(overviewImages, (route) => {
    stalled.push(route);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Kyoto/ }).click();
  await page.getByRole('button', { name: /circa 1700/ }).click();
  const view = page.locator('[data-rendered-view="overview"]');
  const image = view.locator('img');
  await expect.poll(() => stalled.length).toBe(1);
  const preferredUrl = await image.getAttribute('data-asset-url');
  await page.clock.fastForward(25001);
  await expect(view).toHaveAttribute('data-image-status', 'fallback');
  await expect(image).not.toHaveAttribute('data-asset-url', preferredUrl!);
  await expect.poll(() => stalled.length).toBe(2);
  await page.clock.fastForward(25001);
  await expect(image).toBeHidden();
  await expect(
    page
      .getByRole('navigation', { name: 'Points of interest' })
      .getByRole('button', { name: /Nijō Castle/ }),
  ).toBeEnabled();

  // A request can complete after its recovery deadline; its pixels must become visible again.
  await stalled[1].continue();
  await expect(image).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Visit Nijō Castle/ }),
  ).toBeVisible();

  await page.unroute(overviewImages);
  await page.getByRole('button', { name: 'Retry image' }).click();
  await expect(view).toHaveAttribute('data-image-status', 'ready');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('data-asset-url', preferredUrl!);
  await expect(
    page.getByRole('button', { name: /Visit Nijō Castle/ }),
  ).toBeVisible();
});
