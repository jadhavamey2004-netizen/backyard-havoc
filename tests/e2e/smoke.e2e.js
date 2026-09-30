import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

async function expectTitleOverlayDismissed(page) {
  const title = page.locator('#title-screen');
  await expect(title).toHaveClass(/\bhidden\b/);
  await expect(title).toHaveCSS('pointer-events', 'none');
}

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('page boot renders the title screen and canvas', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Backyard Havoc/i);
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#btn-start-game')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#player-health-display')).toBeVisible();
  await expect(page.locator('#score-display')).toBeVisible();

  const dimensions = await page.locator('#game-canvas').evaluate((canvas) => ({
    backingWidth: canvas.width,
    backingHeight: canvas.height,
    displayWidth: canvas.getBoundingClientRect().width,
    displayHeight: canvas.getBoundingClientRect().height,
  }));
  expect(dimensions.backingWidth).toBeGreaterThan(0);
  expect(dimensions.backingHeight).toBeGreaterThan(0);
  expect(dimensions.displayWidth).toBeGreaterThan(0);
  expect(dimensions.displayHeight).toBeGreaterThan(0);

  await attachScreenshot(testInfo, page, 'title-screen.png');
});

test('start control leaves the title overlay and keeps the game rendered', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();

  await expectTitleOverlayDismissed(page);
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#game-canvas')).toHaveJSProperty('isConnected', true);

  await attachScreenshot(testInfo, page, 'post-start.png');
});

test('keyboard input does not interrupt the active browser session', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('a'); // The existing handler skips the intro.

  await page.keyboard.down('d');
  await page.waitForTimeout(150);
  await page.keyboard.up('d');

  await expect(page.locator('#game-canvas')).toBeVisible();
  await expectTitleOverlayDismissed(page);
});

test('pointer aim and click leave the game session alive', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('a'); // Leave the intro before the pointer smoke action.

  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.35);
  await page.mouse.click(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.75);

  await expect(canvas).toBeVisible();
  await expectTitleOverlayDismissed(page);
});

test('reload returns to a clean title/bootstrap path', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await expectTitleOverlayDismissed(page);

  await page.reload();

  await expect(page).toHaveTitle(/Backyard Havoc/i);
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.locator('#btn-start-game').click();
  await expectTitleOverlayDismissed(page);
});
