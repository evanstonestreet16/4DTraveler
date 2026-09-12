import { expect, test } from '@playwright/test';
import { kyoto1700 as world } from '../src/data/worlds/kyoto-1700';
import { overviewMarkerPosition } from '../src/components/world/renderedImageAsset';

test('overview labels fit desktop and mobile while stems retain the authored anchors', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Kyoto/ }).click();
  await page.getByRole('button', { name: /circa 1700/ }).click();
  const overview = world.scene.overviewImage!;
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      page.locator('[data-rendered-view="overview"]'),
    ).toHaveAttribute('data-image-status', 'ready');
    const portrait = viewport.height > viewport.width;
    const asset = portrait ? overview.mobile! : overview.desktop;
    await expect(page.locator('.rendered-overview-image')).toHaveAttribute(
      'src',
      asset.url,
    );
    for (const poi of world.pois) {
      const button = page.locator(`[data-overview-poi="${poi.id}"]`);
      await expect(button).toBeVisible();
      await expect
        .poll(async () => {
          const box = (await button.boundingBox())!;
          return Math.min(
            box.x,
            box.y,
            viewport.width - box.x - box.width,
            viewport.height - box.y - box.height,
          );
        })
        .toBeGreaterThanOrEqual(7.99);
      const marker = overview.markers[poi.id];
      const point = portrait
        ? (marker.mobile ?? marker.desktop)
        : marker.desktop;
      const anchor = overviewMarkerPosition(point, asset, viewport);
      if (
        anchor.left >= 0 &&
        anchor.left <= viewport.width &&
        anchor.top >= 0 &&
        anchor.top <= viewport.height
      ) {
        const tip = page.locator(`[data-overview-anchor="${poi.id}"]`);
        await expect(tip).toHaveCount(1);
        await expect
          .poll(async () => Number(await tip.getAttribute('cx')))
          .toBeCloseTo(anchor.left, 4);
        await expect
          .poll(async () => Number(await tip.getAttribute('cy')))
          .toBeCloseTo(anchor.top, 4);
      }
    }
  }
});
