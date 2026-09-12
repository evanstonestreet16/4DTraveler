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

const narration = (page: Page) => page.locator('audio[data-narration-audio]');

test('narration requires consent, reports progress, replays, and stops on exit', async ({
  page,
}) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/')) audioRequests.push(request.url());
  });
  await enterPittsburgh(page);
  await expect(narration(page)).not.toHaveAttribute('src');
  expect(audioRequests).toEqual([]);
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(page.locator('.transcript')).toContainText(
    'Welcome to Pittsburgh',
  );
  expect(audioRequests).toEqual([]);

  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Narration progress' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      narration(page).evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Pause Narration', exact: true })
    .click();
  await expect(
    page.getByText('Narration paused', { exact: true }),
  ).toBeVisible();
  expect(
    await narration(page).evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);

  await narration(page).evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = Math.min(3, audio.duration / 2);
    audio.dispatchEvent(new Event('timeupdate'));
  });
  await page
    .getByRole('button', { name: 'Replay Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
  expect(
    await narration(page).evaluate(
      (audio: HTMLAudioElement) => audio.currentTime,
    ),
  ).toBeLessThan(1.5);
  const retained = await narration(page).elementHandle();
  await page.getByRole('button', { name: 'Choose era' }).click();
  expect(
    await retained!.evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);
  await expect(narration(page)).toHaveCount(0);
});

test('audio failure keeps the transcript and permits a successful retry', async ({
  page,
}) => {
  await page.route('**/audio/*.wav', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await enterPittsburgh(page);
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Narration unavailable.', { exact: false }),
  ).toBeVisible();
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(page.locator('.transcript')).toContainText(
    'Welcome to Pittsburgh',
  );
  await page.unroute('**/audio/*.wav');
  await page
    .getByRole('button', { name: 'Play Narration', exact: true })
    .click();
  await expect(
    page.getByText('Playing narration', { exact: true }),
  ).toBeVisible();
});
