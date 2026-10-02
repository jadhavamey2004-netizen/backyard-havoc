import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

async function expectTitleOverlayDismissed(page) {
  const title = page.locator('#title-screen');
  await expect(title).toHaveClass(/\bhidden\b/);
  await expect(title).toBeHidden();
  await expect(page.locator('#screen-overlay')).toBeHidden();
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
  await expect(page.locator('#game-hud')).toBeHidden();
  await expect(page.locator('#go-time')).toHaveText('0s');

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
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#game-hud')).toBeVisible();
  await expect(page.locator('#player-health-display')).toBeVisible();
  await expect(page.locator('#score-display')).toBeVisible();
});

test('title screen shows authoritative gameplay controls', async ({ page }) => {
  await page.goto('/');
  const instructions = page.locator('.title-controls-card');
  await expect(instructions).toContainText('Move footballer');
  await expect(instructions).toContainText('Aim');
  await expect(instructions).toContainText('Defend or kick/header on contact');
  await expect(instructions).toContainText('Charge a power shot; contact required');
  await expect(instructions).not.toContainText(/\b(space|w\/up|bullet.time)\b/i);
});

test('title run state stays inert until Start is selected', async ({ page }, testInfo) => {
  await page.goto('/');
  const score = page.locator('#score-display');
  const combo = page.locator('#combo-display');
  const initial = { score: await score.textContent(), combo: await combo.textContent() };
  await page.waitForTimeout(1200);
  expect({ score: await score.textContent(), combo: await combo.textContent() }).toEqual(initial);
  await attachScreenshot(testInfo, page, 'idle-title-stability.png');
  await page.locator('#btn-start-game').click();
  await expectTitleOverlayDismissed(page);
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
  await page.keyboard.press('Space'); // Space explicitly skips the intro.

  await page.keyboard.down('d');
  await page.waitForTimeout(150);
  await page.keyboard.up('d');

  await expect(page.locator('#game-canvas')).toBeVisible();
  await expectTitleOverlayDismissed(page);
});

test('pointer aim and click leave the game session alive', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space'); // Leave the intro before the pointer smoke action.

  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.35);
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.75);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.up();

  await expect(canvas).toBeVisible();
  await expectTitleOverlayDismissed(page);
});

test('core gameplay feel smoke keeps movement, short action, and charged action healthy', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expectTitleOverlayDismissed(page);

  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.keyboard.down('d');
  await page.waitForTimeout(160);
  await page.keyboard.up('d');

  await page.mouse.move(bounds.x + bounds.width * 0.58, bounds.y + bounds.height * 0.58);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
  await page.waitForTimeout(450);

  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  await page.waitForTimeout(450);

  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveJSProperty('isConnected', true);
  await expectTitleOverlayDismissed(page);
  await attachScreenshot(testInfo, page, 'core-gameplay-feel-smoke.png');
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
