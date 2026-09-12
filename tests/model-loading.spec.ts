import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function enterWorld(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Pennsylvania, United States Pittsburgh/ })
    .click();
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
}

for (const failure of ['missing', 'corrupt', 'missing-node'] as const) {
  test(`${failure} model visibly falls back and preserves object exploration`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/models/*.glb', async (route) => {
      if (failure === 'missing')
        return route.fulfill({ status: 404, body: '' });
      if (failure === 'corrupt')
        return route.fulfill({ status: 200, body: 'broken model' });
      const bytes = await readFile(
        new URL('../public/models/pipeline-fixture.glb', import.meta.url),
      );
      // Equal-length replacement preserves every GLB chunk boundary.
      const changed = Buffer.from(bytes);
      const offset = changed.indexOf(Buffer.from('"name":"furnace"'));
      expect(offset).toBeGreaterThan(0);
      changed.write('"name":"missing"', offset);
      return route.fulfill({
        status: 200,
        body: changed,
        contentType: 'model/gltf-binary',
      });
    });
    await enterWorld(page);
    await expect(page.locator('[data-model-status="fallback"]')).toBeVisible();
    await expect(page.getByText(/Showing the simplified world/)).toBeVisible();
    await page
      .getByRole('button', { name: 'Visit Steel Mill', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Blast Furnace', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Blast Furnace', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Return to overview' }).click();
    await expect(
      page.getByText('Bird’s-eye overview', { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('loading keeps the primitive world usable and leaving cancels without stale errors', async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/models/*.glb', async (route) => {
    await pending;
    await route.continue().catch(() => undefined);
  });
  await enterWorld(page);
  await expect(page.locator('[data-model-status="loading"]')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Visit Steel Mill', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Choose era' }).click();
  release!();
  await page.unroute('**/models/*.glb');
  await page.getByRole('button', { name: /1892 An industrial city/ }).click();
  await expect(page.locator('[data-model-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-model-status="fallback"]')).toHaveCount(0);
});
