import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachJsonEvidence, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function startPixiGame(page) {
  await page.goto('/?renderer=pixi');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_RENDERER__));
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getMode())).toBe('pixi');
  await page.locator('#btn-start-game').click();
  await page.locator('#game-canvas').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#screen-overlay')).toBeHidden();
}

async function freezeScene(page) {
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.gameState = 'IDLE';
    engine.isPaused = false;
    engine.camera.reset();
    engine.camera.x = 0;
    engine.player.resetRunState(340, 485);
    engine.player.facing = 1;
    engine.npc.resetRunState();
    engine.render(1234);
  });
}

test('Phase 13 Pixi smoke preserves the shared input surface, DOM HUD and authoritative camera', async ({ page }, testInfo) => {
  await startPixiGame(page);
  const canvas = page.locator('#game-canvas');
  const pixi = page.locator('.phase13-pixi-canvas');
  await expect(pixi).toBeVisible();
  await expect(page.locator('#game-hud')).toBeVisible();

  const bounds = await page.evaluate(() => {
    const canvasRect = document.querySelector('#game-canvas').getBoundingClientRect();
    const pixiRect = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
    return {
      canvas: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
      pixi: { x: pixiRect.x, y: pixiRect.y, width: pixiRect.width, height: pixiRect.height },
      pixiPointerEvents: getComputedStyle(document.querySelector('.phase13-pixi-canvas')).pointerEvents
    };
  });
  expect(bounds.pixi).toEqual(bounds.canvas);
  expect(bounds.pixiPointerEvents).toBe('none');

  const box = await canvas.boundingBox();
  const point = { x: box.x + box.width * 0.73, y: box.y + box.height * 0.43 };
  await page.mouse.move(point.x, point.y);
  const mapped = await page.evaluate(({ x, y }) => ({
    engine: window.__BACKYARD_TEST_ENGINE__.mouseScreenPos,
    mapped: window.__BACKYARD_TEST_RENDERER__.mapClientPoint(x, y)
  }), point);
  expect(mapped.engine.x).toBeCloseTo(mapped.mapped.x, 4);
  expect(mapped.engine.y).toBeCloseTo(mapped.mapped.y, 4);

  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(true);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(false);

  await freezeScene(page);
  const before = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.camera.x = 155;
    engine.camera.zoomPunch = 0.05;
    engine.camera.addImpulse(1.5, -0.75);
    const ballPosition = { ...engine.ball.position };
    const playerPosition = { x: engine.player.x, y: engine.player.y };
    const score = engine.score;
    engine.render(2345);
    return { ballPosition, playerPosition, score };
  });
  const diagnostics = await page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getDiagnostics());
  const unchanged = await page.evaluate(() => ({
    ballPosition: { ...window.__BACKYARD_TEST_ENGINE__.ball.position },
    playerPosition: { x: window.__BACKYARD_TEST_ENGINE__.player.x, y: window.__BACKYARD_TEST_ENGINE__.player.y },
    score: window.__BACKYARD_TEST_ENGINE__.score
  }));
  expect(diagnostics.backend).toMatch(/webgl/i);
  expect(diagnostics.assetTextureNames).toEqual(['house', 'fence', 'hedge', 'foreground', 'planter']);
  expect(diagnostics.sceneRenderableCountProxy).toBeGreaterThan(20);
  expect(diagnostics.cameraWorldX).toBe(155);
  expect(diagnostics.cameraTransform.zoom).toBeGreaterThan(1);
  expect(diagnostics.cameraTransform.x).toBeCloseTo(1.5, 4);
  expect(unchanged).toEqual(before);

  const rendererVisibility = await page.evaluate(() => {
    const bridge = window.__BACKYARD_TEST_RENDERER__;
    bridge.setMode('canvas');
    const canvasMode = {
      mode: bridge.getMode(),
      nativeCanvasOpacity: getComputedStyle(document.querySelector('#game-canvas')).opacity,
      pixiVisibility: getComputedStyle(document.querySelector('.phase13-pixi-canvas')).visibility
    };
    bridge.setMode('pixi');
    return {
      canvasMode,
      pixiMode: bridge.getMode(),
      nativeCanvasOpacity: getComputedStyle(document.querySelector('#game-canvas')).opacity,
      pixiVisibility: getComputedStyle(document.querySelector('.phase13-pixi-canvas')).visibility
    };
  });
  expect(rendererVisibility.canvasMode).toEqual({ mode: 'canvas', nativeCanvasOpacity: '1', pixiVisibility: 'hidden' });
  expect(rendererVisibility).toMatchObject({ pixiMode: 'pixi', nativeCanvasOpacity: '0', pixiVisibility: 'visible' });

  const bodiesBeforeOverlay = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.world.bodies.map(body => ({
    id: body.id, x: body.position.x, y: body.position.y, angle: body.angle
  })));
  await page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.setCollisionOverlay(true));
  const overlayOn = await page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getDiagnostics().collisionOverlayVisible);
  const bodiesAfterOverlay = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.world.bodies.map(body => ({
    id: body.id, x: body.position.x, y: body.position.y, angle: body.angle
  })));
  expect(overlayOn).toBe(true);
  expect(bodiesAfterOverlay).toEqual(bodiesBeforeOverlay);
  await page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.setCollisionOverlay(false));
  await attachJsonEvidence(testInfo, 'phase13-pixi-renderer-diagnostics.json', diagnostics);
  await attachScreenshot(testInfo, page, 'phase13-pixi-scene.png');
});

test('Phase 13 renderer input and scaling stay aligned across the viewport matrix', async ({ page }, testInfo) => {
  await startPixiGame(page);
  const sizes = [
    [390, 844], [412, 915], [844, 390], [915, 412],
    [768, 1024], [1024, 768], [1280, 720], [1920, 1080]
  ];
  const evidence = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
      const renderer = document.querySelector('.phase13-pixi-canvas').getBoundingClientRect();
      const center = { x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 };
      const mapped = window.__BACKYARD_TEST_RENDERER__.mapClientPoint(center.x, center.y);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
        pixi: { x: renderer.x, y: renderer.y, width: renderer.width, height: renderer.height },
        mapped,
        dpr: devicePixelRatio
      };
    });
    expect(geometry.pixi).toEqual(geometry.canvas);
    expect(geometry.mapped.x).toBeCloseTo(480, 2);
    expect(geometry.mapped.y).toBeCloseTo(270, 2);
    expect(Math.abs(geometry.canvas.width / geometry.canvas.height - (16 / 9))).toBeLessThan(0.02);
    evidence.push(geometry);
  }
  await attachJsonEvidence(testInfo, 'phase13-viewport-coordinate-parity.json', evidence);
  await page.setViewportSize({ width: 390, height: 844 });
  await attachScreenshot(testInfo, page, 'phase13-mobile-portrait.png');
  await page.setViewportSize({ width: 844, height: 390 });
  await attachScreenshot(testInfo, page, 'phase13-mobile-landscape.png');
});

test('Phase 13 Pixi reduced-motion state keeps the projectile hazard visible', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startPixiGame(page);
  const result = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.thrownProjectiles.push({
      id: 99113,
      position: { x: 500, y: 260 },
      velocity: { x: -3, y: 0 },
      angle: 0,
      projectileType: 'boot',
      isParried: false
    });
    engine.render(3456);
    return {
      reducedMotion: engine.isReducedMotion,
      renderer: window.__BACKYARD_TEST_RENDERER__.getDiagnostics(),
      projectileCount: engine.thrownProjectiles.length
    };
  });
  expect(result.reducedMotion).toBe(true);
  expect(result.renderer.reducedMotion).toBe(true);
  expect(result.projectileCount).toBeGreaterThan(0);
  expect(result.renderer.projectileCount).toBeGreaterThan(0);
  await attachScreenshot(testInfo, page, 'phase13-reduced-motion.png');
});

test('Phase 13 Pixi displays the production planter destruction event and fragments', async ({ page }, testInfo) => {
  await startPixiGame(page);
  const result = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const events = [];
    const original = engine.onGameplayEvent;
    engine.onGameplayEvent = event => { events.push(event.type); original?.(event); };
    const target = engine.proceduralWorld.activeChunks.get(0).props.find(body => body.label === 'destructible_flowerpot');
    const scoreBefore = engine.score;
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
    engine.gameState = 'IDLE';
    engine.camera.reset();
    engine.render(4567);
    engine.onGameplayEvent = original;
    return {
      targetKey: target.propKey,
      destroyed: engine.proceduralWorld.destroyedPropKeys.has(target.propKey),
      eventTypes: events,
      scoreDelta: engine.score - scoreBefore,
      shardCount: engine.activeShards.length,
      residueCount: engine.proceduralWorld.getActiveResidues().length
    };
  });
  expect(result.destroyed).toBe(true);
  expect(result.eventTypes.filter(type => type === 'OBJECT_DESTROYED')).toHaveLength(1);
  expect(result.scoreDelta).toBeGreaterThan(0);
  expect(result.shardCount).toBeGreaterThan(0);
  expect(result.residueCount).toBeGreaterThan(0);
  await attachJsonEvidence(testInfo, 'phase13-destruction-event.json', result);
  await attachScreenshot(testInfo, page, 'phase13-destruction.png');
});
