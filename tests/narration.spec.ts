import { expect, test, type Page } from '@playwright/test';

async function enterPittsburgh(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Pittsburgh / 1892' }),
  ).toBeVisible();
}

test('world-level play/pause narration is gone; voice lives on the object tour', async ({
  page,
}) => {
  await enterPittsburgh(page);
  await expect(
    page.getByRole('button', { name: 'Play Narration', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Pause Narration', exact: true }),
  ).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: /Grok tour/ })).toBeVisible();
});
