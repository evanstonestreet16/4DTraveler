import { expect, test, type Page } from '@playwright/test';

const cities = [
  {
    name: 'Rome',
    era: /125 CE/,
    image: '/images/rome-125/overview.webp',
    mobileImage: '/images/rome-125/overview-mobile.webp',
    pois: [
      'Forum of Trajan',
      'The New Pantheon',
      'Flavian Amphitheatre Valley',
    ],
  },
  {
    name: 'Kyoto',
    era: /circa 1700/,
    image: '/images/kyoto-1700/overview.webp',
    mobileImage: '/images/kyoto-1700/overview-mobile.webp',
    pois: [
      'Nijō Castle: Ninomaru Approach',
      'Kiyomizu-dera Hillside',
      'Nishiki Fish Market',
    ],
  },
];

async function enterCity(page: Page, city: (typeof cities)[number]) {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(city.name) }).click();
  await page.getByRole('button', { name: city.era }).click();
  await expect(page.getByRole('heading', { name: city.name })).toBeVisible();
  await expect(page.locator('[data-rendered-view="overview"]')).toHaveAttribute(
    'data-image-status',
    'ready',
  );
}

for (const city of cities) {
  test(`${city.name} keeps all POI choices on the bird's-eye view`, async ({
    page,
  }) => {
    await enterCity(page, city);
    await expect(page.locator('.rendered-overview-image')).toHaveAttribute(
      'src',
      new RegExp(city.image),
    );

    for (const poi of city.pois) {
      const marker = page.getByRole('button', { name: `Select ${poi}` });
      await expect(marker).toBeVisible();
      await marker.click();
      await expect(marker).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByText('Detailed POI view will be added'),
      ).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.rendered-overview-image')).toHaveAttribute(
      'src',
      new RegExp(city.mobileImage),
    );
    await expect(page.locator('[data-overview-poi]')).toHaveCount(3);
  });
}
