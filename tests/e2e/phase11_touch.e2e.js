import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const MOBILE_VIEWPORTS = [
  { name: '390x844-portrait', width: 390, height: 844 },
  { name: '412x915-portrait', width: 412, height: 915 },
  { name: '844x390-landscape', width: 844, height: 390 },
  { name: '915x412-landscape', width: 915, height: 412 },
  { name: '768x1024-tablet-portrait', width: 768, height: 1024 },
  { name: '1024x768-tablet-landscape', width: 1024, height: 768 },
  { name: '1280x720-touchscreen-laptop', width: 1280, height: 720 },
  { name: '1366x768-touchscreen-laptop', width: 1366, height: 768 },
];

const beginRun = async page => {
  await page.goto('/');
  await page.locator('#btn-start-game').tap();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
  await page.locator('#game-canvas').tap({ position: { x: 180, y: 100 } });
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
};

const createTouchController = async context => {
  const session = await context.newCDPSession(await context.pages()[0]);
  const point = async (selector, id) => {
    const box = await context.pages()[0].locator(selector).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, id, radiusX: 2, radiusY: 2, force: 1, rotationAngle: 0 };
  };
  const send = (type, touchPoints = []) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
  return { point, send, close: () => session.detach() };
};

test.describe('Phase 11 touch gameplay', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test.beforeEach(async ({ page }) => {
    page.__browserHealth = monitorBrowserHealth(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await attachBrowserHealth(testInfo, page.__browserHealth);
  });

  test('touch Play, intro tap, and movement controls follow the production run lifecycle', async ({ page }, testInfo) => {
    await page.goto('/');
    const controls = page.locator('#mobile-game-controls');
    await expect(controls).toBeHidden();
    await page.locator('#btn-start-game').tap();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
    await expect(controls).toBeHidden();

    await page.locator('#game-canvas').tap({ position: { x: 180, y: 100 } });
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
    await expect(controls).toBeVisible();
    await expect(page.locator('#mobile-move-left')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#mobile-move-right')).toHaveAttribute('aria-pressed', 'false');
    await attachScreenshot(testInfo, page, 'phase11-touch-controls-playing.png');
  });

  test('touch movement control targets are reachable at mobile and tablet sizes', async ({ page }, testInfo) => {
    await beginRun(page);
    await expect(page.locator('#mobile-game-controls')).toBeVisible();

    for (const viewport of MOBILE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const id of ['mobile-move-left', 'mobile-move-right']) {
        const control = page.locator(`#${id}`);
        const box = await control.boundingBox();
        expect(box, `${viewport.name} ${id} bounds`).not.toBeNull();
        expect(box.width, `${viewport.name} ${id} width`).toBeGreaterThanOrEqual(48);
        expect(box.height, `${viewport.name} ${id} height`).toBeGreaterThanOrEqual(48);
        const centerHit = await page.evaluate(({ x, y, id: controlId }) => {
          const hit = document.elementFromPoint(x, y);
          return hit?.closest(`#${controlId}`)?.id === controlId;
        }, { x: box.x + box.width / 2, y: box.y + box.height / 2, id });
        expect(centerHit, `${viewport.name} ${id} center hit-test`).toBe(true);
      }
      const overlapsCriticalUi = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const critical = [rect('.hud-topline'), rect('.hud-bottomline'), rect('#btn-pause-game')];
        return ['#mobile-move-left', '#mobile-move-right'].some(selector => critical.some(target => intersects(rect(selector), target)));
      });
      expect(overlapsCriticalUi, `${viewport.name} touch controls do not cover critical HUD or Pause`).toBe(false);
      await expect(page.locator('body')).toHaveJSProperty('scrollWidth', viewport.width);
      await attachScreenshot(testInfo, page, `phase11-touch-${viewport.name}.png`);
    }
  });

  test('mobile runtime resource and frame interval snapshot stays observable', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const trackedTypes = new Set(['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'keydown', 'keyup', 'blur', 'visibilitychange']);
      const trackedTargets = new Set(['window', 'document', 'game-canvas', 'mobile-move-left', 'mobile-move-right']);
      window.__PHASE11_INPUT_LISTENERS__ = [];
      const addEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, ...args) {
        const target = this === window ? 'window' : this === document ? 'document' : this.id;
        if (trackedTypes.has(type) && trackedTargets.has(target)) window.__PHASE11_INPUT_LISTENERS__.push({ target, type });
        return addEventListener.call(this, type, ...args);
      };
    });
    await beginRun(page);
    const snapshot = await page.evaluate(async () => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      const intervals = [];
      let previous = performance.now();
      await new Promise(resolve => {
        let frame = 0;
        const sample = now => {
          intervals.push(now - previous);
          previous = now;
          frame += 1;
          if (frame >= 60) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const sorted = [...intervals].sort((a, b) => a - b);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        dpr: devicePixelRatio,
        canvasBacking: { width: document.querySelector('#game-canvas').width, height: document.querySelector('#game-canvas').height },
        activeMatterWorldBodies: engine.world.bodies.length,
        particles: engine.particles.particles.length,
        particleCap: engine.particles.maxParticles,
        activeShards: engine.activeShards.length,
        activeProjectiles: engine.thrownProjectiles.length,
        mobileControlDomNodes: document.querySelectorAll('#mobile-game-controls, #mobile-game-controls button').length,
        gameplayPointerKeyAndLifecycleListeners: window.__PHASE11_INPUT_LISTENERS__.length,
        gameplayListenerDetails: window.__PHASE11_INPUT_LISTENERS__,
        frameIntervalsMs: {
          samples: intervals.length,
          median: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          max: Math.max(...intervals),
        },
      };
    });
    expect(snapshot.canvasBacking.width).toBe(1920);
    expect(snapshot.canvasBacking.height).toBe(1080);
    expect(snapshot.particles).toBeLessThanOrEqual(snapshot.particleCap);
    expect(snapshot.mobileControlDomNodes).toBe(3);
    expect(snapshot.gameplayPointerKeyAndLifecycleListeners).toBe(17);
    console.info(`[phase11-mobile-runtime] ${JSON.stringify(snapshot)}`);
    await testInfo.attach('phase11-mobile-runtime.json', {
      body: Buffer.from(JSON.stringify(snapshot, null, 2)),
      contentType: 'application/json',
    });
  });

  test('touch aim uses 960x540 logical coordinates after resize at DPR 2', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.locator('#game-canvas').evaluate(canvas => canvas.width)).toBe(1920);
      const box = await page.locator('#game-canvas').boundingBox();
      const first = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.65, id: 24, radiusX: 2, radiusY: 2, force: 1, rotationAngle: 0 };
      const moved = { ...first, x: box.x + box.width * 0.7, y: box.y + box.height * 0.35 };
      await touch.send('touchStart', [first]);
      await touch.send('touchMove', [moved]);
      const mapped = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.mouseScreenPos);
      expect(mapped.x).toBeCloseTo(960 * 0.7, 1);
      expect(mapped.y).toBeCloseTo(540 * 0.35, 1);
      await touch.send('touchCancel');
      await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(false);
    }
    await touch.close();
  });

  test('left and right touch holds use existing movement and release cleanly', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);

    for (const [selector, action, id, direction] of [
      ['#mobile-move-left', 'left', 31, -1],
      ['#mobile-move-right', 'right', 32, 1],
    ]) {
      const beforeX = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x);
      await touch.send('touchStart', [await touch.point(selector, id)]);
      await expect(page.locator(selector)).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => page.evaluate(actionName => window.__BACKYARD_TEST_ENGINE__.player.keys[actionName], action)).toBe(true);
      await page.waitForTimeout(450);
      const afterX = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x);
      expect(Math.sign(afterX - beforeX)).toBe(direction);

      await touch.send('touchEnd');
      await expect(page.locator(selector)).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => page.evaluate(actionName => window.__BACKYARD_TEST_ENGINE__.player.keys[actionName], action)).toBe(false);
      await expect.poll(() => page.evaluate(() => Math.abs(window.__BACKYARD_TEST_ENGINE__.player.vx))).toBeLessThan(1.1);
    }
    await touch.close();
  });

  test('touch movement buttons remain keyboard reachable and activatable', async ({ page }) => {
    await beginRun(page);
    const left = page.locator('#mobile-move-left');
    await left.focus();
    await expect(left).toBeFocused();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left), { timeout: 1000 }).toBe(false);
    await expect(left).toHaveAttribute('aria-pressed', 'false');
  });

  test('one movement finger and a Canvas action finger operate independently', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    const movePoint = await touch.point('#mobile-move-right', 41);
    const canvasPoint = await touch.point('#game-canvas', 42);

    await touch.send('touchStart', [movePoint]);
    await touch.send('touchStart', [movePoint, canvasPoint]);
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return engine.player.keys.right && engine.isPointerDown;
    })).toBe(true);
    await page.waitForTimeout(650);
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.powerCharge)).toBeGreaterThan(0);

    await touch.send('touchEnd');
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return !engine.isPointerDown && !engine.player.keys.right && engine.player.state === 'KICKING' && Boolean(engine.pendingPrimaryAction);
    })).toBe(true);
    await touch.close();
  });

  test('Canvas touch cancellation clears charge without resolving a kick', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    await touch.send('touchStart', [await touch.point('#game-canvas', 51)]);
    await page.waitForTimeout(650);
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.powerCharge)).toBeGreaterThan(0);

    await touch.send('touchCancel');
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return !engine.isPointerDown && !engine.player.powerCharging && engine.player.powerCharge === 0 &&
        !engine.pendingPrimaryAction && engine.player.state !== 'KICKING';
    })).toBe(true);
    await touch.close();
  });

  test('visibility loss cancels a held action and hides touch movement controls', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    await touch.send('touchStart', [await touch.point('#game-canvas', 61)]);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return !engine.pageVisible && !engine.isPointerDown && !engine.player.powerCharging && !engine.pendingPrimaryAction;
    })).toBe(true);
    await expect(page.locator('#mobile-game-controls')).toBeHidden();

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('#mobile-game-controls')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.pageVisible)).toBe(true);
    await touch.send('touchEnd');
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.state)).not.toBe('KICKING');
    await touch.close();
  });

  test('pause and restart release movement pointer ownership without stale input', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    await touch.send('touchStart', [await touch.point('#mobile-move-left', 71)]);
    await expect(page.locator('#mobile-move-left')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#btn-pause-game').tap();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_UI__.getState().screen)).toBe('PAUSED');
    await expect(page.locator('#mobile-move-left')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left)).toBe(false);
    await touch.send('touchEnd');

    await page.locator('#btn-restart-paused').tap();
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return engine.gameState === 'PLAYING' && !engine.isPaused;
    })).toBe(true);
    await expect(page.locator('#mobile-game-controls')).toBeVisible();
    const freshPoint = await touch.point('#mobile-move-right', 72);
    await touch.send('touchStart', [freshPoint]);
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(true);
    await touch.send('touchEnd');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(false);
    await touch.close();
  });

  test('Main Menu and Game Over release held movement and action input', async ({ page, context }) => {
    await beginRun(page);
    const touch = await createTouchController(context);
    await touch.send('touchStart', [await touch.point('#mobile-move-left', 81)]);
    await page.locator('#btn-pause-game').tap();
    await page.locator('#btn-main-menu').tap();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('IDLE');
    await expect(page.locator('#mobile-game-controls')).toBeHidden();
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left)).toBe(false);
    await touch.send('touchEnd');

    await page.locator('#btn-start-game').tap();
    await page.locator('#game-canvas').tap({ position: { x: 180, y: 100 } });
    await expect(page.locator('#mobile-game-controls')).toBeVisible();
    await touch.send('touchStart', [await touch.point('#game-canvas', 82)]);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
    await expect(page.locator('#gameover-modal')).toBeVisible();
    await expect(page.locator('#mobile-game-controls')).toBeHidden();
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return !engine.isPointerDown && !engine.player.powerCharging && !engine.pendingPrimaryAction && !engine.player.keys.left;
    })).toBe(true);
    await touch.send('touchEnd');
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.state)).not.toBe('KICKING');
    await touch.close();
  });
});
