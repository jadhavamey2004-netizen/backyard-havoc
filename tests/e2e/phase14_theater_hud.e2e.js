import { expect, test } from '@playwright/test';
import path from 'node:path';
import {
  attachBrowserHealth,
  attachJsonEvidence,
  attachScreenshot,
  monitorBrowserHealth,
} from './browser-health.js';

const VIEWPORTS = [
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'desktop-2560x1440', width: 2560, height: 1440 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-412x915', width: 412, height: 915 },
  { name: 'mobile-landscape-844x390', width: 844, height: 390 },
  { name: 'mobile-landscape-915x412', width: 915, height: 412 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
];

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function beginActiveRun(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
  await page.locator('#btn-start-game').click();
  await page.locator('#game-canvas').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.update = () => {};
    engine.camera.reset();
    engine.camera.x = 0;
    engine.letterboxProgress = 0;
    engine.kickoffBannerTimer = 0;
    engine.render(performance.now());
  });
}

async function waitForLayout(page) {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function readTheaterEvidence(page) {
  return page.evaluate(() => {
    const rect = element => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        right: value.right,
        bottom: value.bottom,
      };
    };
    const canvas = document.querySelector('#game-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const logicalToClient = logicalRect => ({
      x: canvasRect.x + logicalRect.x * canvasRect.width / 960,
      y: canvasRect.y + logicalRect.y * canvasRect.height / 540,
      width: logicalRect.width * canvasRect.width / 960,
      height: logicalRect.height * canvasRect.height / 540,
    });
    const worldRectToClient = (name, x, y, width, height) => ({
      name,
      ...logicalToClient({ x: x - engine.camera.x, y, width, height }),
    });
    const windowRect = {
      x: engine.npc.x - 46,
      y: engine.npc.y - 30,
      width: 92,
      height: 60,
    };
    const windowBody = engine.world.bodies
      .filter(body => body.label === 'destructible_window' && body.position.x >= engine.camera.x && body.position.x <= engine.camera.x + engine.width)
      .sort((a, b) => Math.abs(a.position.x - engine.npc.x) - Math.abs(b.position.x - engine.npc.x))[0];
    const upperTarget = windowBody
      ? {
          x: windowBody.bounds.min.x,
          y: windowBody.bounds.min.y,
          width: windowBody.bounds.max.x - windowBody.bounds.min.x,
          height: windowBody.bounds.max.y - windowBody.bounds.min.y,
        }
      : windowRect;
    const projectile = engine.thrownProjectiles.at(-1);
    const projectileBounds = projectile?.bounds || {
      min: { x: projectile?.position.x - 16, y: projectile?.position.y - 16 },
      max: { x: projectile?.position.x + 16, y: projectile?.position.y + 16 },
    };
    const playerLeft = Math.min(engine.player.x - 46, engine.ball.position.x - 18);
    const playerTop = Math.min(engine.player.y - 108, engine.ball.position.y - 18);
    const playerRight = Math.max(engine.player.x + 46, engine.ball.position.x + 18);
    const playerBottom = Math.max(engine.player.y + 8, engine.ball.position.y + 18);
    const critical = [
      worldRectToClient('kevin-and-window', windowRect.x, windowRect.y, windowRect.width, windowRect.height),
      worldRectToClient('kevin-head', engine.npc.x - 55, engine.npc.y - 52, 110, 64),
      worldRectToClient(
        'representative-projectile',
        projectileBounds.min.x,
        projectileBounds.min.y,
        projectileBounds.max.x - projectileBounds.min.x,
        projectileBounds.max.y - projectileBounds.min.y,
      ),
      worldRectToClient('player-ball-action', playerLeft, playerTop, playerRight - playerLeft, playerBottom - playerTop),
      worldRectToClient('important-upper-target', upperTarget.x, upperTarget.y, upperTarget.width, upperTarget.height),
    ];
    const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
      a.y < b.y + b.height && a.y + a.height > b.y;
    const surfaceSelectors = [
      '#game-header', '#game-hud', '.score-stat', '.health-stat', '#havoc-card',
      '#kevin-card', '.combo-card', '.controls-hint',
    ];
    const hudSurfaces = surfaceSelectors
      .map(selector => ({ selector, bounds: rect(document.querySelector(selector)) }))
      .filter(surface => surface.bounds && surface.bounds.width > 0 && surface.bounds.height > 0);
    const overlaps = critical.flatMap(target => hudSurfaces
      .filter(surface => intersects(target, surface.bounds))
      .map(surface => ({ target: target.name, surface: surface.selector })));
    const container = rect(document.querySelector('.canvas-container'));
    const clientCanvas = rect(canvas);
    const hud = document.querySelector('#game-hud');
    const controls = rect(document.querySelector('#mobile-game-controls'));
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      container,
      canvas: clientCanvas,
      canvasCss: { width: getComputedStyle(canvas).width, height: getComputedStyle(canvas).height },
      canvasBacking: { width: canvas.width, height: canvas.height },
      canvasAspect: clientCanvas.width / clientCanvas.height,
      unused: {
        left: clientCanvas.x,
        right: innerWidth - clientCanvas.right,
        top: clientCanvas.y,
        bottom: innerHeight - clientCanvas.bottom,
      },
      worldTargets: {
        kevin: { x: engine.npc.x, y: engine.npc.y },
        kevinWindow: windowRect,
        projectile: projectile ? { x: projectile.position.x, y: projectile.position.y, type: projectile.projectileName } : null,
        upperTarget: windowBody ? { x: windowBody.position.x, y: windowBody.position.y, label: windowBody.label } : null,
        player: { x: engine.player.x, y: engine.player.y },
        ball: { x: engine.ball.position.x, y: engine.ball.position.y },
        cameraX: engine.camera.x,
      },
      header: rect(document.querySelector('#game-header')),
      hud: rect(hud),
      hudHidden: hud.hidden,
      hudAriaHidden: hud.getAttribute('aria-hidden'),
      hudTopline: rect(document.querySelector('.hud-topline')),
      hudBottomline: rect(document.querySelector('.hud-bottomline')),
      hudSurfaces,
      critical,
      overlaps,
      pause: rect(document.querySelector('#btn-pause-game')),
      mobileControls: controls,
      state: window.__BACKYARD_TEST_ENGINE__.gameState,
      uiState: window.__BACKYARD_TEST_UI__.getState().screen,
    };
  });
}

test('theater sizing, safe-area geometry and pointer mapping hold across the viewport matrix', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop theater matrix runs once in normal Chromium.');
  await beginActiveRun(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.kevinDirector.nextProjectileType = () => 'Clay Pot';
    engine.npc.onThrowCallback({ x: 470, y: 40, targetX: engine.player.x });
    engine.render(performance.now());
  });
  const measurements = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForLayout(page);
    const evidence = await readTheaterEvidence(page);
    measurements.push({ name: viewport.name, ...evidence });
    expect(evidence.worldTargets.projectile, `${viewport.name} includes the live representative projectile`).not.toBeNull();

    expect(evidence.canvasAspect, `${viewport.name} preserves 16:9 canvas presentation`)
      .toBeCloseTo(16 / 9, 2);
    expect(evidence.viewport.scrollWidth, `${viewport.name} has no horizontal overflow`).toBe(viewport.width);
    expect(evidence.viewport.scrollHeight, `${viewport.name} has no vertical overflow`).toBe(viewport.height);
    expect(evidence.overlaps, `${viewport.name} keeps critical world targets clear of the HUD`).toEqual([]);

    if (viewport.width === 1920 && viewport.height === 1080) {
      expect(evidence.container.width, 'large desktop exceeds the legacy 1280px ceiling').toBeGreaterThan(1280);
    }

    const canvasRect = evidence.canvas;
    const pointer = { x: canvasRect.x + canvasRect.width * 0.73, y: canvasRect.y + canvasRect.height * 0.43 };
    await page.mouse.move(pointer.x, pointer.y);
    const mapped = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.mouseScreenPos);
    expect(mapped.x, `${viewport.name} pointer X remains in logical coordinates`).toBeCloseTo(960 * 0.73, 1);
    expect(mapped.y, `${viewport.name} pointer Y remains in logical coordinates`).toBeCloseTo(540 * 0.43, 1);

    const screenshots = {
      'desktop-1280x720': ['phase14-desktop-1280x720.png'],
      'desktop-1920x1080': [
        'phase14-desktop-1920x1080.png',
        'phase14-active-hud.png',
        'phase14-kevin-safe-area.png',
      ],
      'desktop-2560x1440': ['phase14-desktop-2560x1440.png'],
    }[viewport.name] || [];
    for (const name of screenshots) await attachScreenshot(testInfo, page, name);

    const baselineFixtures = {
      'desktop-1920x1080': [
        'desktop-1920x1080.png', 'defeat-1920x1080.png', 'restart-kickoff-1920x1080.png',
      ],
      'desktop-2560x1440': ['desktop-2560x1440.png'],
    }[viewport.name] || [];
    for (const file of baselineFixtures) {
      await testInfo.attach(`phase14-before-${file}`, {
        path: path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'phase14-baseline', file),
        contentType: 'image/png',
      });
    }
  }

  await attachJsonEvidence(testInfo, 'phase14-theater-geometry.json', measurements);
});

test('HUD visibility follows title, intro, active, pause, defeat and Results states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Cinematic presentation contract runs once in normal Chromium.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.locator('#game-hud')).toBeHidden();

  await page.locator('#btn-start-game').click();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
  await expect.poll(() => page.locator('#game-hud').getAttribute('aria-hidden')).toBe('true');

  await page.locator('#game-canvas').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#game-hud')).toBeVisible();
  await expect(page.locator('#game-hud')).toHaveAttribute('aria-hidden', 'false');

  await page.locator('#btn-pause-game').click();
  await expect(page.locator('#pause-screen')).toBeVisible();
  await expect(page.locator('#game-hud')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#btn-resume').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#game-hud')).toHaveAttribute('aria-hidden', 'false');

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.update = () => {};
    engine.gameState = 'ENDING_CUTSCENE';
    engine.letterboxProgress = 1;
    engine.render(performance.now());
  });
  await expect.poll(() => page.locator('#game-hud').getAttribute('aria-hidden')).toBe('true');
  await expect.poll(() => page.locator('#game-hud').evaluate(element => Number(getComputedStyle(element).opacity))).toBe(0);
  await attachScreenshot(testInfo, page, 'phase14-defeat-clean.png');

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await expect(page.locator('#game-hud')).toBeHidden();
  await attachScreenshot(testInfo, page, 'phase14-results.png');
});

test('fast restart returns to active play with a compact kickoff and Canvas focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Restart presentation runs once in normal Chromium.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await beginActiveRun(page);
  const firstRunBanner = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.kickoffBannerDuration);
  expect(firstRunBanner).toBe(1.5);

  await page.locator('#btn-pause-game').click();
  await page.locator('#btn-restart-paused').click();
  await expect.poll(() => page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return engine.gameState === 'PLAYING' && !engine.isPaused;
  })).toBe(true);
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeFocused();

  const restart = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.update = () => {};
    engine.letterboxProgress = 0;
    engine.kickoffBannerTimer = engine.kickoffBannerDuration;
    engine.render(performance.now());
    return {
      runCount: engine.runCount,
      duration: engine.kickoffBannerDuration,
      paused: engine.isPaused,
      gameState: engine.gameState,
      score: engine.score,
      health: engine.player.health,
    };
  });
  expect(restart.runCount).toBe(2);
  expect(restart.duration).toBeLessThan(firstRunBanner);
  expect(restart.duration).toBe(0.55);
  expect(restart.gameState).toBe('PLAYING');
  expect(restart.paused).toBe(false);
  expect(restart.score).toBe(0);
  expect(restart.health).toBe(3);
  await expect(page.locator('#game-hud')).toHaveAttribute('aria-hidden', 'false');
  await attachScreenshot(testInfo, page, 'phase14-fast-restart.png');
});

test('DPR remains capped, CSS presentation stays logical and runtime cost stays observable', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'High-DPR sanity runs once in normal Chromium.');
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const health = monitorBrowserHealth(page);
  try {
    await beginActiveRun(page);
    const runtime = await page.evaluate(async () => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      const intervals = [];
      let previous = performance.now();
      await new Promise(resolve => {
        let frame = 0;
        const sample = now => {
          intervals.push(now - previous);
          previous = now;
          frame += 1;
          if (frame >= 30) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const sorted = [...intervals].sort((a, b) => a - b);
      const canvas = document.querySelector('#game-canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        canvasCss: { width: rect.width, height: rect.height, aspect: rect.width / rect.height },
        canvasBacking: { width: canvas.width, height: canvas.height },
        cappedDpr: canvas.width / 960,
        frameIntervalsMs: {
          samples: intervals.length,
          median: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          max: Math.max(...intervals),
        },
        particles: engine.particles.particles.length,
        particleCap: engine.particles.maxParticles,
        matterBodies: engine.world.bodies.length,
        shards: engine.activeShards.length,
        projectiles: engine.thrownProjectiles.length,
      };
    });
    expect(runtime.viewport.dpr).toBe(3);
    expect(runtime.cappedDpr).toBe(2.5);
    expect(runtime.canvasBacking).toEqual({ width: 2400, height: 1350 });
    expect(runtime.canvasCss.aspect).toBeCloseTo(16 / 9, 2);
    expect(runtime.particles).toBeLessThanOrEqual(runtime.particleCap);
    await attachJsonEvidence(testInfo, 'phase14-runtime-sanity.json', runtime);
  } finally {
    await attachBrowserHealth(testInfo, health);
    await context.close();
  }
});

test('mobile and tablet touch controls stay reachable in safe viewport bounds', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-touch', 'Touch geometry runs in the dedicated Chromium touch project.');
  await beginActiveRun(page);
  const viewports = VIEWPORTS.filter(viewport => viewport.width <= 1024 && viewport.name !== 'desktop-1024x768');
  const evidence = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForLayout(page);
    await expect(page.locator('#mobile-game-controls')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const bounds = element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
      };
      const safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;visibility:hidden;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
      document.body.append(safeProbe);
      const safe = getComputedStyle(safeProbe);
      const safeInsets = {
        left: parseFloat(safe.paddingLeft),
        right: parseFloat(safe.paddingRight),
        top: parseFloat(safe.paddingTop),
        bottom: parseFloat(safe.paddingBottom),
      };
      safeProbe.remove();
      const controls = bounds(document.querySelector('#mobile-game-controls'));
      const buttons = ['#mobile-move-left', '#mobile-move-right'].map(selector => ({ selector, ...bounds(document.querySelector(selector)) }));
      const container = bounds(document.querySelector('.canvas-container'));
      const canvas = bounds(document.querySelector('#game-canvas'));
      const canvasElement = document.querySelector('#game-canvas');
      const hud = bounds(document.querySelector('#game-hud'));
      const header = bounds(document.querySelector('#game-header'));
      return {
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, dpr: devicePixelRatio },
        safeInsets, controls, buttons, container, canvas,
        canvasCss: { width: getComputedStyle(canvasElement).width, height: getComputedStyle(canvasElement).height },
        canvasBacking: { width: canvasElement.width, height: canvasElement.height },
        canvasAspect: canvas.width / canvas.height,
        unused: { left: canvas.x, right: innerWidth - canvas.right, top: canvas.y, bottom: innerHeight - canvas.bottom },
        header, hud,
      };
    });
    expect(geometry.viewport.scrollWidth).toBe(viewport.width);
    expect(geometry.viewport.scrollHeight).toBe(viewport.height);
    expect(geometry.controls.x).toBeGreaterThanOrEqual(geometry.safeInsets.left);
    expect(geometry.controls.y).toBeGreaterThanOrEqual(geometry.safeInsets.top);
    expect(geometry.controls.right).toBeLessThanOrEqual(viewport.width - geometry.safeInsets.right);
    expect(geometry.controls.bottom).toBeLessThanOrEqual(viewport.height - geometry.safeInsets.bottom);
    for (const button of geometry.buttons) {
      expect(button.width, `${viewport.name} ${button.selector} width`).toBeGreaterThanOrEqual(48);
      expect(button.height, `${viewport.name} ${button.selector} height`).toBeGreaterThanOrEqual(48);
      expect(button.x).toBeGreaterThanOrEqual(geometry.safeInsets.left);
      expect(button.right).toBeLessThanOrEqual(viewport.width - geometry.safeInsets.right);
    }
    expect(geometry.canvas.width / geometry.canvas.height).toBeCloseTo(16 / 9, 2);
    evidence.push({ name: viewport.name, ...geometry });

    const screenshotNames = {
      'mobile-390x844': 'phase14-mobile-portrait.png',
      'mobile-landscape-844x390': 'phase14-mobile-landscape.png',
      'tablet-768x1024': 'phase14-tablet.png',
    };
    if (screenshotNames[viewport.name]) {
      await attachScreenshot(testInfo, page, screenshotNames[viewport.name]);
      const baselineFile = {
        'mobile-390x844': 'mobile-390x844.png',
        'mobile-landscape-844x390': 'tablet-844x390.png',
      }[viewport.name];
      if (baselineFile) {
        await testInfo.attach(`phase14-before-${baselineFile}`, {
          path: path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'phase14-baseline', baselineFile),
          contentType: 'image/png',
        });
      }
    }
  }

  await attachJsonEvidence(testInfo, 'phase14-touch-geometry.json', evidence);
});
