import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachJsonEvidence, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('Phase 13 Pixi WebGL smoke keeps authoritative scene and DOM controls available', async ({ page }, testInfo) => {
  await page.goto('/?renderer=pixi');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_RENDERER__));
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getMode())).toBe('pixi');
  await expect(page.locator('.phase13-pixi-canvas')).toBeVisible();

  await page.locator('#btn-start-game').click();
  await page.locator('#game-canvas').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#btn-pause-game')).toBeVisible();

  const evidence = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.update = () => {};
    engine.camera.reset();
    engine.render(1234);
    const diagnostics = window.__BACKYARD_TEST_RENDERER__.getDiagnostics();
    const canvasRect = document.querySelector('#game-canvas').getBoundingClientRect();
    const pixiRect = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
    const rectDeltaPx = Math.max(
      Math.abs(canvasRect.x - pixiRect.x),
      Math.abs(canvasRect.y - pixiRect.y),
      Math.abs(canvasRect.width - pixiRect.width),
      Math.abs(canvasRect.height - pixiRect.height),
    );
    return {
        state: engine.gameState,
        score: engine.score,
        player: { x: engine.player.x, y: engine.player.y, state: engine.player.state },
        ball: { x: engine.ball.position.x, y: engine.ball.position.y },
        renderer: diagnostics,
        pointerTransparent: getComputedStyle(document.querySelector('.phase13-pixi-canvas')).pointerEvents === 'none',
        canvasRect: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
        pixiRect: { x: pixiRect.x, y: pixiRect.y, width: pixiRect.width, height: pixiRect.height },
        rectDeltaPx,
    };
  });
  await attachJsonEvidence(testInfo, 'phase13-cross-browser-renderer.json', evidence);
  expect(evidence.state).toBe('PLAYING');
  expect(evidence.renderer.backend).toMatch(/webgl/i);
  expect(evidence.renderer.screen).toEqual({ width: 960, height: 540 });
  expect(evidence.rectDeltaPx).toBeLessThanOrEqual(1);
  expect(evidence.pointerTransparent).toBe(true);
  await attachScreenshot(testInfo, page, 'phase13-cross-browser-scene.png');
});
