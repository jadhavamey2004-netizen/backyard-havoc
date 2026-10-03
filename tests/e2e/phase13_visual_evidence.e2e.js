import { expect, test } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { attachBrowserHealth, attachJsonEvidence, monitorBrowserHealth } from './browser-health.js';

const BASELINE_BUNDLE = Object.freeze({ javascriptBytes: 335855, javascriptGzipBytes: 99985 });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 0x13BADC0D;
    window.__PHASE13_RESEED__ = value => { seed = value | 0; };
    Math.random = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    Date.now = () => 1790856000000;
  });
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function startGame(page, pixi = false) {
  await page.goto(pixi ? '/?renderer=pixi' : '/');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
  if (pixi) {
    await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_RENDERER__));
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.getMode())).toBe('pixi');
  }
  await page.locator('#btn-start-game').click();
  await page.locator('#game-canvas').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    window.__PHASE13_RESEED__(0x13BADC0D);
    engine.resetEnvironment();
    engine.update = () => {};
    const renderFrame = engine.render.bind(engine);
    engine.render = () => renderFrame(1234);
    engine.gameState = 'PLAYING';
    engine.camera.reset();
    engine.camera.x = 0;
    engine.ball.position.x = 490;
    engine.ball.position.y = 280;
    engine.ball.velocity.x = 0;
    engine.ball.velocity.y = 0;
    engine.kickoffBannerTimer = 0;
    engine.render(1234);
  });
  await page.evaluate(() => document.fonts.ready);
}

async function capture(testInfo, page, name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const options = { animations: 'disabled', caret: 'hide', scale: 'css' };
  const first = await page.screenshot(options);
  const second = await page.screenshot(options);
  expect(first.equals(second), `${name} deterministic captures have identical pixels`).toBe(true);
  await expect(first).toMatchSnapshot(`${name}.png`);
  await testInfo.attach(`${name}.png`, { body: first, contentType: 'image/png' });
}

test('Phase 13 deterministic Canvas title and baseline screenshots', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    window.__PHASE13_RESEED__(0x13BADC0D);
    engine.resetEnvironment();
    engine.update = () => {};
    const renderFrame = engine.render.bind(engine);
    engine.render = () => renderFrame(1234);
    engine.camera.reset();
    engine.kickoffBannerTimer = 0;
    engine.render(1234);
  });
  await page.evaluate(() => document.fonts.ready);
  await capture(testInfo, page, 'phase13-title');

  await startGame(page, false);
  await capture(testInfo, page, 'phase13-canvas-baseline');
});

test('Phase 13 deterministic Pixi visual states establish the remaster baseline suite', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startGame(page, true);
  const prepare = async scenario => page.evaluate(name => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const bridge = window.__BACKYARD_TEST_RENDERER__;
    window.__PHASE13_RESEED__(0x13BADC0D);
    engine.resetEnvironment();
    engine.gameState = 'PLAYING';
    engine.isGameOver = false;
    engine.camera.reset();
    engine.camera.x = 0;
    engine.ball.position.x = 490;
    engine.ball.position.y = 280;
    engine.ball.velocity.x = 0;
    engine.ball.velocity.y = 0;
    engine.kickoffBannerTimer = 0;
    bridge.setCollisionOverlay(false);

    if (name === 'run') {
      engine.player.state = 'RUNNING';
      engine.player.animation.runBlend = 1;
      engine.player.animation.runPhase = 1.35;
      engine.player.vx = 3.8;
      engine.player.facing = 1;
    } else if (name === 'kick') {
      engine.player.state = 'KICKING';
      engine.player.kickProgress = 0.56;
      engine.player.kickTimer = 0.12;
      engine.player.animation.triggerActionAccent('PERFECT_STRIKE');
    } else if (name === 'kevin-throw') {
      engine.npc.state = 'THROWING_PROJECTILE';
      engine.npc.animation.beginThrow();
      engine.npc.animation.throwJustStarted = false;
      engine.npc.animation.throwElapsed = 0.31;
      engine.thrownProjectiles.push({
        id: 13013,
        position: { x: 690, y: 188 },
        velocity: { x: -2, y: 4 },
        angle: 0.3,
        projectileType: 'flowerpot',
        isParried: false,
      });
    } else if (name === 'collision-overlay') {
      bridge.setCollisionOverlay(true);
    } else if (name === 'havoc') {
      engine.havocSystem.active = true;
      engine.havocSystem.meter = 100;
      engine.camera.addImpulse(1.2, -0.6);
      engine.camera.zoomPunch = 0.055;
      engine.particles.spawnImpactRings(490, 280, 3, '#facc15');
      engine.particles.spawnPopText(490, 238, 'HAVOC! +500', '#facc15', 24);
      engine.particles.spawnFire(535, 414, 11);
    }
    engine.render(1234);
  }, scenario);

  await prepare('idle');
  await capture(testInfo, page, 'phase13-pixi-scene');
  await prepare('idle');
  await capture(testInfo, page, 'phase13-player-idle');
  await prepare('run');
  await capture(testInfo, page, 'phase13-player-run');
  await prepare('kick');
  await capture(testInfo, page, 'phase13-player-kick');
  await prepare('idle');
  await capture(testInfo, page, 'phase13-kevin-calm');
  await prepare('kevin-throw');
  await capture(testInfo, page, 'phase13-kevin-throw');
  await prepare('idle');
  await capture(testInfo, page, 'phase13-prop');
  await prepare('collision-overlay');
  await capture(testInfo, page, 'phase13-prop-collision-overlay');

  await prepare('idle');
  const destruction = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const target = engine.proceduralWorld.activeChunks.get(0).props.find(body => body.label === 'destructible_flowerpot');
    if (!target) throw new Error('The deterministic phase 13 chunk must include its flowerpot fixture.');
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
    engine.gameState = 'IDLE';
    engine.camera.reset();
    engine.render(1234);
    return {
      destroyed: engine.proceduralWorld.destroyedPropKeys.has(target.propKey),
      fragments: engine.activeShards.length,
      residue: engine.proceduralWorld.getActiveResidues().length,
    };
  });
  expect(destruction).toMatchObject({ destroyed: true });
  expect(destruction.fragments).toBeGreaterThan(0);
  await capture(testInfo, page, 'phase13-destruction');

  await prepare('havoc');
  await capture(testInfo, page, 'phase13-havoc');
  await page.evaluate(() => window.__BACKYARD_TEST_RENDERER__.setCollisionOverlay(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.isReducedMotion = true;
    engine.thrownProjectiles.push({
      id: 13014,
      position: { x: 500, y: 248 },
      velocity: { x: -3, y: 0 },
      angle: 0,
      projectileType: 'boot',
      isParried: true,
    });
    engine.render(1234);
  });
  await capture(testInfo, page, 'phase13-reduced-motion');

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#screen-overlay')).toBeVisible();
  await capture(testInfo, page, 'phase13-results');
});

test('Phase 13 Canvas and Pixi controlled performance and bundle comparison', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await startGame(page, true);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.thrownProjectiles.push({
      id: 13015,
      position: { x: 620, y: 248 },
      velocity: { x: -2, y: 3 },
      angle: 0.3,
      projectileType: 'flowerpot',
      isParried: false,
    });
    engine.particles.spawnImpactRings(490, 280, 3, '#facc15');
    engine.particles.spawnFire(520, 420, 18);
  });

  const samples = await page.evaluate(async () => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const bridge = window.__BACKYARD_TEST_RENDERER__;
    const sample = async mode => {
      bridge.setMode(mode);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      bridge.resetPerformance();
      bridge.resetPixiPerformance();
      await new Promise(resolve => {
        let frame = 0;
        const next = () => {
          frame += 1;
          if (frame >= 120) resolve();
          else requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      });
      const diagnostics = bridge.getDiagnostics();
      const metrics = bridge.getPerformance();
      const canvas = document.querySelector(mode === 'pixi' ? '.phase13-pixi-canvas' : '#game-canvas');
      return {
        renderer: mode,
        backend: mode === 'pixi' ? diagnostics.backend : 'Canvas2D',
        sampleDurationMs: metrics.sampleDurationMs,
        frameCount: metrics.frameCount,
        medianFrameIntervalMs: metrics.medianFrameIntervalMs,
        p95FrameIntervalMs: metrics.p95FrameIntervalMs,
        p99FrameIntervalMs: metrics.p99FrameIntervalMs,
        maxFrameIntervalMs: metrics.maxFrameIntervalMs,
        medianRenderCostMs: metrics.medianRenderCostMs,
        viewport: { width: innerWidth, height: innerHeight },
        dpr: devicePixelRatio,
        backingSize: { width: canvas.width, height: canvas.height },
        matterBodyCount: diagnostics?.matterBodyCount || engine.world.bodies.length,
        particleCount: engine.particles.particles.length,
        projectileCount: engine.thrownProjectiles.length,
        textureCount: mode === 'pixi' ? diagnostics.textureCount : null,
        renderableCountProxy: mode === 'pixi' ? diagnostics.sceneRenderableCountProxy : null,
        drawCallCountProxy: mode === 'pixi' ? diagnostics.drawCallCountProxy : null,
      };
    };
    return { canvas: await sample('canvas'), pixi: await sample('pixi') };
  });
  expect(samples.canvas.frameCount).toBeGreaterThan(60);
  expect(samples.pixi.frameCount).toBeGreaterThan(60);
  expect(samples.pixi.backend).toMatch(/webgl/i);

  const files = await readdir('dist/assets');
  const bundleMetrics = async directory => {
    const files = await readdir(`${directory}/assets`);
    const javascript = await Promise.all(files.filter(file => file.endsWith('.js')).map(file => readFile(join(directory, 'assets', file))));
    const bundle = Buffer.concat(javascript);
    return { javascriptBytes: bundle.byteLength, javascriptGzipBytes: gzipSync(bundle).byteLength };
  };
  const productionBundle = await bundleMetrics('dist');
  const pixiSpikeBundle = await bundleMetrics('dist-pixi-spike');
  const evidence = {
    note: 'Browser frame timings are headless gross-regression evidence, not a low-end-device benchmark. Pixi draw calls are a scene-node proxy, not a GPU capture.',
    canvas: samples.canvas,
    pixi: samples.pixi,
    bundle: {
      baselineSha: '802654e517ad28ef5f49d014786f26e5ef50edf0',
      baselineJavaScriptBytes: BASELINE_BUNDLE.javascriptBytes,
      baselineJavaScriptGzipBytes: BASELINE_BUNDLE.javascriptGzipBytes,
      productionJavaScriptBytes: productionBundle.javascriptBytes,
      productionJavaScriptGzipBytes: productionBundle.javascriptGzipBytes,
      productionJavaScriptBytesDelta: productionBundle.javascriptBytes - BASELINE_BUNDLE.javascriptBytes,
      productionJavaScriptGzipBytesDelta: productionBundle.javascriptGzipBytes - BASELINE_BUNDLE.javascriptGzipBytes,
      pixiSpikeJavaScriptBytes: pixiSpikeBundle.javascriptBytes,
      pixiSpikeJavaScriptGzipBytes: pixiSpikeBundle.javascriptGzipBytes,
      pixiSpikeBytesDelta: pixiSpikeBundle.javascriptBytes - BASELINE_BUNDLE.javascriptBytes,
      pixiSpikeGzipBytesDelta: pixiSpikeBundle.javascriptGzipBytes - BASELINE_BUNDLE.javascriptGzipBytes,
      note: 'Production metrics come from dist/assets; the optional isolated mode build includes the development/E2E-only Pixi renderer for migration-cost estimation. Baseline was measured from the clean v1 baseline build.',
    },
  };
  await attachJsonEvidence(testInfo, 'phase13-renderer-comparison.json', evidence);
  console.info(`[phase13-renderer-comparison] ${JSON.stringify(evidence)}`);
});
