import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const startGame = async page => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
};

test.describe('Phase 11 desktop input and reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    page.__browserHealth = monitorBrowserHealth(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await attachBrowserHealth(testInfo, page.__browserHealth);
  });

  test('mouse aim and click continue through the canonical pointer path', async ({ page }, testInfo) => {
    await startGame(page);
    await expect(page.locator('#mobile-game-controls')).toBeHidden();
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    const x = box.x + box.width * 0.72;
    const y = box.y + box.height * 0.36;
    await page.mouse.move(x, y);
    const mappedPoint = await page.evaluate(({ x: clientX, y: clientY }) => {
      const rect = document.querySelector('#game-canvas').getBoundingClientRect();
      return { x: (clientX - rect.left) * 960 / rect.width, y: (clientY - rect.top) * 540 / rect.height };
    }, { x, y });
    const aim = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.mouseScreenPos);
    expect(aim.x).toBeCloseTo(mappedPoint.x, 4);
    expect(aim.y).toBeCloseTo(mappedPoint.y, 4);

    await page.mouse.click(x, y);
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return engine.player.state === 'KICKING' && Boolean(engine.pendingPrimaryAction);
    })).toBe(true);
    await attachScreenshot(testInfo, page, 'phase11-desktop-mouse-action.png');
  });

  test('mouse hold preserves the existing charge and Power Shot release path', async ({ page }) => {
    await startGame(page);
    const box = await page.locator('#game-canvas').boundingBox();
    const x = box.x + box.width * 0.72;
    const y = box.y + box.height * 0.36;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.powerCharge)).toBeGreaterThan(0);
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.pendingPrimaryAction?.powerShot)).toBe(true);
  });

  test('A/D, arrows, Shift, and Escape Pause/Resume stay available', async ({ page }) => {
    await startGame(page);
    for (const [key, action] of [['a', 'left'], ['ArrowLeft', 'left'], ['d', 'right'], ['ArrowRight', 'right'], ['Shift', 'sprint']]) {
      await page.keyboard.down(key);
      await expect.poll(() => page.evaluate(actionName => window.__BACKYARD_TEST_ENGINE__.player.keys[actionName], action)).toBe(true);
      await page.keyboard.up(key);
      await expect.poll(() => page.evaluate(actionName => window.__BACKYARD_TEST_ENGINE__.player.keys[actionName], action)).toBe(false);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await expect(page.locator('#btn-resume')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeFocused();
    await expect.poll(() => page.evaluate(() => !window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(true);
  });

  test('reduced motion makes Canvas prompts static while keeping danger markers present', async ({ page }) => {
    await page.goto('/');
    const pulseData = await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      const ctx = engine.ctx;
      const originalFillText = ctx.fillText.bind(ctx);
      const recorded = [];
      ctx.fillText = function (value, ...args) {
        if (value === 'PRESS SPACE OR CLICK TO SKIP ▶▶') recorded.push({ prompt: value, color: this.fillStyle });
        return originalFillText(value, ...args);
      };
      const originalNow = Date.now;
      Date.now = () => 0;
      engine.startIntroCutscene();
      engine.setReducedMotion(false);
      engine.render(1);
      const regular = recorded.at(-1)?.color;
      engine.setReducedMotion(true);
      engine.render(2);
      const reduced = recorded.at(-1)?.color;
      const originalFill = ctx.fill.bind(ctx);
      const dangerAlphas = [];
      ctx.fill = function (...args) {
        if (this.fillStyle === '#ef4444') dangerAlphas.push(this.globalAlpha);
        return originalFill(...args);
      };
      engine.thrownProjectiles.push({ position: { x: 110, y: 110 }, angle: 0, projectileType: 'ball', isParried: false });
      engine.drawThrownProjectiles(ctx);
      Date.now = originalNow;
      ctx.fill = originalFill;
      ctx.fillText = originalFillText;
      return { regular, reduced, promptRetained: recorded.length >= 2, dangerAlpha: dangerAlphas.at(-1) };
    });
    expect(pulseData.regular).toContain('0.75');
    expect(pulseData.reduced).toBe('#ffffff');
    expect(pulseData.promptRetained).toBe(true);
    expect(pulseData.dangerAlpha).toBeCloseTo(0.82, 4);
  });
});
