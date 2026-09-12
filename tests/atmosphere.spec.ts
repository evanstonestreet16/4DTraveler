import { expect, test } from '@playwright/test';

test('environmental motion follows reduced-motion changes and pauses offscreen', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  const scene = page.locator('.world-canvas');
  await page
    .getByRole('combobox', { name: 'Scene quality' })
    .selectOption('high');
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await expect(scene).toHaveAttribute('data-environment-motion', 'active');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene).toHaveAttribute('data-environment-motion', 'paused');
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Steel Mill/ })
    .click();
  await page
    .getByRole('button', { name: 'Blast Furnace', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Blast Furnace', exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-environment-motion', 'active');
  await page.setViewportSize({ width: 390, height: 400 });
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-environment-motion', 'paused');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-environment-motion', 'active');
});
