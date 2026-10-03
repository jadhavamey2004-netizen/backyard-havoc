import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function beginPixiRun(page) {
  await page.goto('/?renderer=pixi');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_RENDERER__));
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getMode())).toBe('pixi');
  await page.locator('#btn-start-game').tap();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
  await page.locator('#game-canvas').tap({ position: { x: 180, y: 100 } });
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#mobile-game-controls')).toBeVisible();
}

async function touchSession(context, page) {
  const session = await context.newCDPSession(page);
  const point = async selector => {
    const box = await page.locator(selector).boundingBox();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      id: 51,
      radiusX: 2,
      radiusY: 2,
      force: 1,
      rotationAngle: 0,
    };
  };
  return {
    point,
    start: touches => session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches }),
    end: () => session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
    close: () => session.detach(),
  };
}

test('Pixi keeps real touch action and held movement on the original input surface', async ({ page, context }, testInfo) => {
  await beginPixiRun(page);
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  const session = await touchSession(context, page);

  const startX = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x);
  const rightPoint = await session.point('#mobile-move-right');
  await session.start([rightPoint]);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x)).toBeGreaterThan(startX);
  await session.end();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(false);
  await page.waitForTimeout(180);

  await session.start([{
    x: box.x + box.width * 0.61,
    y: box.y + box.height * 0.48,
    id: 51,
    radiusX: 2,
    radiusY: 2,
    force: 1,
    rotationAngle: 0,
  }]);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(true);
  const touchMapping = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.mouseScreenPos);
  expect(touchMapping.x).toBeCloseTo(960 * 0.61, 1);
  expect(touchMapping.y).toBeCloseTo(540 * 0.48, 1);
  await session.end();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.state)).toBe('KICKING');
  await session.close();

  const geometry = await page.evaluate(() => {
    const canvasRect = document.querySelector('#game-canvas').getBoundingClientRect();
    const pixiRect = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
    return {
      canvas: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
      pixi: { x: pixiRect.x, y: pixiRect.y, width: pixiRect.width, height: pixiRect.height },
      dpr: devicePixelRatio,
      playerX: window.__BACKYARD_TEST_ENGINE__.player.x,
    };
  });
  expect(geometry.pixi).toEqual(geometry.canvas);
  expect(geometry.dpr).toBe(2);
  expect(geometry.playerX).toBeGreaterThan(startX);
  await attachScreenshot(testInfo, page, 'phase13-mobile-touch-playing.png');
});

test('touch pointer mapping and renderer sizing remain aligned in portrait and landscape', async ({ page }, testInfo) => {
  await beginPixiRun(page);
  const results = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 844, height: 390 },
    { width: 915, height: 412 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
      const pixi = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
      return canvas.x === pixi.x && canvas.y === pixi.y
        && canvas.width === pixi.width && canvas.height === pixi.height;
    })).toBe(true);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
      const pixi = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
      const x = canvas.left + canvas.width * 0.37;
      const y = canvas.top + canvas.height * 0.68;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
        pixi: { x: pixi.x, y: pixi.y, width: pixi.width, height: pixi.height },
        mapped: window.__BACKYARD_TEST_RENDERER__.mapClientPoint(x, y),
        dpr: devicePixelRatio,
      };
    });
    expect(result.pixi).toEqual(result.canvas);
    expect(result.mapped.x).toBeCloseTo(960 * 0.37, 1);
    expect(result.mapped.y).toBeCloseTo(540 * 0.68, 1);
    results.push(result);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await attachScreenshot(testInfo, page, 'phase13-mobile-portrait.png');
  await page.setViewportSize({ width: 844, height: 390 });
  await attachScreenshot(testInfo, page, 'phase13-mobile-landscape.png');
});
