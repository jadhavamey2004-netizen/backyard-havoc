import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function startGameplay(page) {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#title-screen')).toHaveClass(/\bhidden\b/);
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
}

async function resetScenario(page) {
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.resetEnvironment();
    engine.gameState = 'PLAYING';
    engine.pageVisible = true;
  });
}

async function captureGameplay(testInfo, page, name) {
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.render(performance.now()));
  await attachScreenshot(testInfo, page, name);
}

async function resolveDefense(page, distance, useExistingProjectile = false) {
  return page.evaluate(({ distance, useExistingProjectile }) => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.engine.gravity.scale = 0;
    const targetPoint = { x: engine.player.x, y: engine.player.y - 30 };
    if (!useExistingProjectile) {
      engine.kevinDirector.syncRage(35, 'PHASE7_E2E_SETUP');
      engine.npc.applyGameplayRage(35, { provoked: true });
    }
    let projectile = engine.thrownProjectiles.at(-1);
    engine.gameState = 'PLAYING';
    if (!useExistingProjectile) {
      engine.npc.onThrowCallback({
        x: targetPoint.x + distance,
        y: targetPoint.y,
        targetX: targetPoint.x
      });
      projectile = engine.thrownProjectiles.at(-1);
      projectile.position.x = targetPoint.x + distance;
      projectile.position.y = targetPoint.y;
      projectile.velocity.x = -3;
      projectile.velocity.y = 0;
    }

    const originalCallback = engine.onGameplayEvent;
    window.__phase7Events = [];
    engine.onGameplayEvent = event => {
      window.__phase7Events.push(event.type);
      originalCallback?.(event);
    };
    engine.handlePointerDown(targetPoint.x - engine.camera.x, targetPoint.y);
    engine.handlePointerUp(targetPoint.x - engine.camera.x, targetPoint.y);
    const result = {
      eventTypes: [...window.__phase7Events],
      isParried: projectile.isParried === true,
      score: engine.score,
      velocity: { ...projectile.velocity },
      camera: engine.camera.getTransform(0, () => 1),
      rings: engine.particles.impactRings.length,
      shockwaves: engine.particles.shockwaves.length,
      lightning: engine.particles.lightningArcs.length
    };
    engine.onGameplayEvent = originalCallback;
    return result;
  }, { distance, useExistingProjectile });
}

test('Phase 7 captures representative feedback and resolves Perfect Parry through gameplay', async ({ page }, testInfo) => {
  await startGameplay(page);

  await resetScenario(page);
  const normal = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.player.triggerKick();
    engine.player.kickProgress = 0.5;
    const foot = engine.player.getKickPosition();
    engine.ball.position.x = foot.x + 60;
    engine.ball.position.y = foot.y;
    return engine.executePlayerKick(foot.x + 260, foot.y - 120, 'KICK');
  });
  expect(normal).toBe(true);
  await captureGameplay(testInfo, page, 'phase7-normal-contact.png');

  await resetScenario(page);
  const perfectStrike = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.player.triggerKick();
    engine.player.kickProgress = 0.5;
    const foot = engine.player.getKickPosition();
    engine.ball.position.x = foot.x;
    engine.ball.position.y = foot.y;
    return engine.executePlayerKick(foot.x + 260, foot.y - 120, 'KICK');
  });
  expect(perfectStrike).toBe(true);
  await captureGameplay(testInfo, page, 'phase7-perfect-strike.png');

  await resetScenario(page);
  const powerShot = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.player.triggerKick();
    engine.player.kickProgress = 0.5;
    const foot = engine.player.getKickPosition();
    engine.ball.position.x = foot.x;
    engine.ball.position.y = foot.y;
    return engine.executePowerShot(0.82, foot.x + 340, foot.y - 170, 'KICK');
  });
  expect(powerShot).toBe(true);
  await captureGameplay(testInfo, page, 'phase7-charged-power-shot.png');

  await resetScenario(page);
  const block = await resolveDefense(page, 112);
  expect(block.eventTypes).toContain('BLOCK');
  expect(block.isParried).toBe(false);
  await captureGameplay(testInfo, page, 'phase7-block.png');

  await resetScenario(page);
  const parry = await resolveDefense(page, 76);
  expect(parry.eventTypes).toContain('PARRY');
  expect(parry.isParried).toBe(true);
  await captureGameplay(testInfo, page, 'phase7-parry.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.kevinDirector.syncRage(35, 'PHASE7_E2E_SETUP');
    engine.npc.applyGameplayRage(35, { provoked: true });
    const point = { x: engine.player.x, y: engine.player.y - 30 };
    engine.npc.onThrowCallback({ x: point.x + 50, y: point.y, targetX: point.x });
    const projectile = engine.thrownProjectiles.at(-1);
    projectile.position.x = point.x + 50;
    projectile.position.y = point.y;
    projectile.velocity.x = -3;
    projectile.velocity.y = 0;
    engine.engine.gravity.scale = 0;
    engine.render(performance.now());
    engine.gameState = 'IDLE';
  });
  await captureGameplay(testInfo, page, 'phase7-perfect-parry-incoming-projectile.png');
  const perfectParry = await resolveDefense(page, 50, true);
  expect(perfectParry.eventTypes).toContain('PERFECT_PARRY');
  expect(perfectParry.isParried).toBe(true);
  expect(perfectParry.rings).toBeGreaterThanOrEqual(6);
  expect(perfectParry.shockwaves).toBeGreaterThan(0);
  expect(perfectParry.lightning).toBeGreaterThan(0);
  expect(perfectParry.camera.zoom).toBeGreaterThan(1);
  await captureGameplay(testInfo, page, 'phase7-perfect-parry-signature-vfx.png');

  const returnTrail = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    for (let tick = 0; tick < 10; tick += 1) engine.update(1 / 60);
    return {
      isParried: engine.thrownProjectiles.some(projectile => projectile.isParried),
      returnTrailPoints: engine.particles.trailPoints.filter(point =>
        point.trailKey?.startsWith('projectile:')).length
    };
  });
  expect(returnTrail.isParried).toBe(true);
  expect(returnTrail.returnTrailPoints).toBeGreaterThan(0);
  await captureGameplay(testInfo, page, 'phase7-perfect-parry-return-trajectory.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const kevin = engine.proceduralWorld.getAllActiveProps().find(prop => prop.label === 'destructible_kevin');
    if (!kevin) throw new Error('Missing production Kevin collision body');
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: kevin }] });
  });
  await captureGameplay(testInfo, page, 'phase7-kevin-hit.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const chunk = engine.proceduralWorld.activeChunks.get(0);
    const crate = chunk.props.find(prop => prop.label === 'destructible_wood_crate' && !prop.isDestroyed);
    if (!crate) throw new Error('Missing production wood destruction target');
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: crate }] });
  });
  await captureGameplay(testInfo, page, 'phase7-material-destruction-accent.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.recordTrickEvent('KICK');
    engine.recordTrickEvent('PARRY');
    engine.recordTrickEvent('TRAMPOLINE_LAUNCH');
  });
  await captureGameplay(testInfo, page, 'phase7-trick-chain.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.havocSystem.meter = 96;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { score: 0, combo: 1, nearKevin: false });
  });
  await expect(page.locator('#havoc-mode-display')).toBeVisible();
  await captureGameplay(testInfo, page, 'phase7-havoc-activation.png');

  await resetScenario(page);
  const damage = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.kevinDirector.syncRage(35, 'PHASE7_E2E_SETUP');
    engine.npc.applyGameplayRage(35, { provoked: true });
    const point = { x: engine.player.x, y: engine.player.y - 30 };
    engine.npc.onThrowCallback({ x: point.x, y: point.y, targetX: point.x });
    const projectile = engine.thrownProjectiles.at(-1);
    projectile.position.x = point.x;
    projectile.position.y = point.y;
    engine.update(1 / 60);
    return engine.player.health;
  });
  expect(damage).toBeLessThan(3);
  await captureGameplay(testInfo, page, 'phase7-player-damage.png');

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.engine.gravity.scale = 0;
    engine.combo = 10;
    engine.player.keys.right = true;
    engine.ball.velocity.x = 5;
    engine.ball.velocity.y = -2;
    for (let tick = 0; tick < 10; tick += 1) engine.update(1 / 60);
    engine.player.keys.right = false;
  });
  const highComboTrail = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return engine.particles.trailPoints.length;
  });
  expect(highComboTrail).toBeGreaterThan(1);
  await captureGameplay(testInfo, page, 'phase7-high-combo-trail.png');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() =>
    window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier
  )).toBe(0.35);
  await resetScenario(page);
  const reducedParry = await resolveDefense(page, 50);
  expect(reducedParry.eventTypes).toContain('PERFECT_PARRY');
  expect(Math.abs(reducedParry.camera.x)).toBeLessThan(Math.abs(perfectParry.camera.x));
  await captureGameplay(testInfo, page, 'phase7-perfect-parry-reduced-motion.png');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() =>
    window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier
  )).toBe(1);

  await resetScenario(page);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.camera.x = 135;
    engine.gameState = 'IDLE';
    engine.vfxDirector.present('PERFECT_PARRY', { x: engine.player.x, y: engine.player.y - 30, direction: 1 });
    engine.resetTransientFeelState();
    engine.render(performance.now());
  });
  const cleared = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return {
      cameraX: engine.camera.x,
      trauma: engine.camera.trauma,
      zoom: engine.camera.zoomPunch,
      particles: engine.particles.particles.length,
      rings: engine.particles.impactRings.length,
      vignettes: engine.particles.vignettes.length,
      trails: engine.particles.trailPoints.length
    };
  });
  expect(cleared).toMatchObject({ cameraX: 135, trauma: 0, zoom: 0, particles: 0, rings: 0, vignettes: 0, trails: 0 });
  await captureGameplay(testInfo, page, 'phase7-effects-cleared-normal-gameplay.png');
});
