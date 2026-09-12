import { expect, test, type Page } from '@playwright/test';
import { Euler, Quaternion } from 'three';
import type { ProfileCanvas } from '../src/components/world/SceneDiagnostics';

async function enterRome(page: Page) {
  await page.goto('/?profile=1');
  await page.getByRole('button', { name: /Rome/ }).click();
  await page.getByRole('button', { name: /125/ }).click();
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'overview',
  );
  await expect.poll(() => snapshot(page)).not.toBeNull();
}

async function snapshot(page: Page) {
  return page
    .locator('canvas')
    .evaluate(
      (canvas: ProfileCanvas) => canvas.__worldRendererInfo?.().camera ?? null,
    );
}

async function enterForum(page: Page) {
  await page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Forum of Trajan/ })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-fixed-look',
    'true',
  );
}

async function drag(page: Page, dx = 240, dy = 80) {
  const size = page.viewportSize()!;
  await page.mouse.move(size.width * 0.52, size.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(size.width * 0.52 + dx, size.height * 0.55 + dy, {
    steps: 12,
  });
  await page.mouse.up();
}

test('city canvas is full viewport; overview stays static and preview places cannot open', async ({
  page,
}) => {
  await enterRome(page);
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas).toMatchObject({ x: 0, y: 0, width: 1440, height: 1000 });
  const overview = await snapshot(page);
  await drag(page);
  await page.mouse.wheel(0, 500);
  await page.keyboard.press('ArrowRight');
  expect(await snapshot(page)).toEqual(overview);
  const previews = page
    .getByRole('navigation', { name: 'Points of interest' })
    .getByRole('button', { name: /Preview/ });
  for (const preview of await previews.all())
    await expect(preview).toBeDisabled();
  await enterForum(page);
  await page.getByRole('button', { name: 'Return to overview' }).click();
  expect(await snapshot(page)).toEqual(overview);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const marker of await page.locator('.poi-marker').all())
    await expect(marker).toBeVisible();
});

test('fixed eye supports mouse, keyboard, pitch clamps and object overlays without resetting direction', async ({
  page,
}) => {
  await enterRome(page);
  await enterForum(page);
  const initial = (await snapshot(page))!;
  await drag(page);
  const looked = (await snapshot(page))!;
  expect(looked.position).toEqual(initial.position);
  expect(looked.quaternion).not.toEqual(initial.quaternion);
  await expect(page.locator('.object-info')).toHaveCount(0);
  const objectButtons = page.locator('[data-city-object]');
  for (let index = 0; index < 3; index++) {
    await objectButtons.nth(index).click();
    await expect(page.locator('.object-info')).toBeVisible();
    expect(await snapshot(page)).toEqual(looked);
  }
  await page.getByRole('button', { name: 'Close object information' }).click();
  await expect(objectButtons.nth(2)).toBeFocused();
  expect(await snapshot(page)).toEqual(looked);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await snapshot(page))?.position)
    .toEqual(initial.position);
  expect((await snapshot(page))?.quaternion).toEqual(looked.quaternion);
  await page.locator('canvas').focus();
  for (let step = 0; step < 30; step++) await page.keyboard.press('ArrowUp');
  const up = (await snapshot(page))!;
  expect(
    new Euler().setFromQuaternion(new Quaternion(...up.quaternion), 'YXZ').x,
  ).toBeCloseTo((55 * Math.PI) / 180);
  for (let step = 0; step < 30; step++) await page.keyboard.press('ArrowDown');
  const down = (await snapshot(page))!;
  expect(
    new Euler().setFromQuaternion(new Quaternion(...down.quaternion), 'YXZ').x,
  ).toBeCloseTo((-35 * Math.PI) / 180);
  expect(down.position).toEqual(initial.position);
  await page.keyboard.press('Escape');
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'overview',
  );
});

test('touch gestures turn in place and interrupted graphics retain overview recovery', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterRome(page);
  await enterForum(page);
  const initial = (await snapshot(page))!;
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 310, y: 440 }],
  });
  for (let step = 1; step <= 5; step++)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 310 - step * 15, y: 440 }],
    });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await touch.detach();
  const looked = (await snapshot(page))!;
  expect(looked.position).toEqual(initial.position);
  expect(looked.quaternion).not.toEqual(initial.quaternion);
  await expect(page.locator('.object-info')).toHaveCount(0);
  await page.locator('canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(page.getByText('The 3D scene was interrupted.')).toBeVisible();
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('.city-experience')).toHaveAttribute(
    'data-city-mode',
    'overview',
  );
  await page.getByRole('button', { name: 'Reload scene' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Visit Forum of Trajan', exact: true }),
  ).toBeVisible();
});
