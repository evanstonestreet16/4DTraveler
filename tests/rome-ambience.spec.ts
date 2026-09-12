import { expect, test, type Page } from '@playwright/test';
import { rome125 as world } from '../src/data/worlds/rome-125';

const valley = world.pois.find((poi) => poi.id === 'colosseum-valley')!;
const ambient = (page: Page) => page.locator('audio[data-ambient-audio]');

async function enterRome(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Italy.*Rome/ }).click();
  await page.getByRole('button', { name: /125 CE/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
}

async function enterValley(page: Page) {
  await page
    .getByRole('button', { name: `Visit ${valley.name}`, exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Play ambience', exact: true }),
  ).toBeVisible();
}

test('valley ambience starts only on request, pauses, and stops on every scene exit', async ({
  page,
}) => {
  test.setTimeout(60000);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/rome-125/'))
      requests.push(request.url());
  });
  await enterRome(page);
  await enterValley(page);
  await expect(ambient(page)).not.toHaveAttribute('src');
  expect(requests).toEqual([]);
  for (let visit = 0; visit < 2; visit++) {
    await page
      .getByRole('button', { name: 'Play ambience', exact: true })
      .click();
    await expect(
      page.getByText('Quiet ambience playing', { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        ambient(page).evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeGreaterThan(0);
    const properties = await ambient(page).evaluate(
      (audio: HTMLAudioElement) => ({
        loop: audio.loop,
        duration: audio.duration,
        volume: audio.volume,
      }),
    );
    expect(properties.loop).toBe(true);
    expect(properties.duration).toBeCloseTo(24, 1);
    expect(properties.volume).toBeGreaterThan(0);
    expect(properties.volume).toBeLessThanOrEqual(0.18);
    await page
      .getByRole('button', { name: 'Pause ambience', exact: true })
      .click();
    expect(
      await ambient(page).evaluate((audio: HTMLAudioElement) => audio.paused),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Play ambience', exact: true })
      .click();
    await expect(
      page.getByText('Quiet ambience playing', { exact: true }),
    ).toBeVisible();
    const retained = await ambient(page).elementHandle();
    await page.getByRole('button', { name: /Return to overview/ }).click();
    expect(
      await retained!.evaluate((audio: HTMLAudioElement) => audio.paused),
    ).toBe(true);
    await expect(ambient(page)).toHaveCount(0);
    await enterValley(page);
    await expect(ambient(page)).not.toHaveAttribute('src');
  }
  await page
    .getByRole('button', { name: 'Play ambience', exact: true })
    .click();
  await expect(
    page.getByText('Quiet ambience playing', { exact: true }),
  ).toBeVisible();
  const retained = await ambient(page).elementHandle();
  await page.getByRole('button', { name: 'Choose era', exact: true }).click();
  expect(
    await retained!.evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);
  await expect(ambient(page)).toHaveCount(0);
});

test('missing ambience leaves the valley transcript and stories usable and allows retry', async ({
  page,
}) => {
  await page.route('**/audio/rome-125/*.wav', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await enterRome(page);
  await enterValley(page);
  await page
    .getByRole('button', { name: 'Play ambience', exact: true })
    .click();
  await expect(
    page.getByText('Ambience unavailable. Try Play again.', { exact: true }),
  ).toBeVisible();
  const object = world.objects.find(
    (item) => item.id === 'venus-roma-worksite',
  )!;
  await page.getByRole('button', { name: object.name, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: object.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(object.confidence!, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Close object information', exact: true })
    .click();
  await page.getByText('Read narration transcript', { exact: true }).click();
  await expect(
    page.getByText(valley.immersive!.narrationTranscript!, { exact: true }),
  ).toBeVisible();
  await page.unroute('**/audio/rome-125/*.wav');
  await page
    .getByRole('button', { name: 'Play ambience', exact: true })
    .click();
  await expect(
    page.getByText('Quiet ambience playing', { exact: true }),
  ).toBeVisible();
});
