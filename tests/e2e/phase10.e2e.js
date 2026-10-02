import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const viewports = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 }
];

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function expectExclusivePanel(page, expectedId) {
  const visibleIds = await page.evaluate(() => [...document.querySelectorAll('#screen-overlay > section')]
    .filter(panel => !panel.hidden)
    .map(panel => panel.id));
  expect(visibleIds).toEqual(expectedId ? [expectedId] : []);
}

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

test('Phase 10 Garage and Challenges are exclusive, keyboard reachable, and responsive', async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('#btn-start-game')).toBeVisible();
    await expect(page.locator('#btn-start-game')).toHaveClass(/primary-button/);
    await expect(page.locator('#btn-title-garage')).toBeVisible();
    await expect(page.locator('#btn-title-challenges')).toBeVisible();

    await page.locator('#btn-title-garage').click();
    await expect(page.locator('#garage-screen')).toBeVisible();
    await expect(page.locator('#btn-garage-back')).toBeFocused();
    const classicBall = page.locator('#garage-ball-list button[data-cosmetic-id="CLASSIC"]');
    const lockedBall = page.locator('#garage-ball-list button[data-cosmetic-id="NEON"]');
    await page.keyboard.press('Tab');
    await expect(classicBall).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#btn-garage-back')).toBeFocused();
    await expectExclusivePanel(page, 'garage-screen');
    await expect(page.locator('#game-stage')).toHaveJSProperty('inert', true);
    await expect(classicBall).toHaveAttribute('aria-pressed', 'true');
    await expect(classicBall).toContainText('EQUIPPED');
    await expect(lockedBall).toBeDisabled();
    await expect(lockedBall).toContainText('LOCKED');
    await expect(lockedBall).toContainText('First Run');
    await expectNoHorizontalOverflow(page);
    await attachScreenshot(testInfo, page, `phase10-${viewport.name}-garage.png`);

    await page.keyboard.press('Escape');
    await expect(page.locator('#title-screen')).toBeVisible();
    await expect(page.locator('#btn-title-garage')).toBeFocused();
    await expectExclusivePanel(page, 'title-screen');

    await page.locator('#btn-title-challenges').click();
    await expect(page.locator('#challenges-screen')).toBeVisible();
    await expect(page.locator('#btn-challenges-back')).toBeFocused();
    await expectExclusivePanel(page, 'challenges-screen');
    const firstRun = page.locator('#challenge-list [data-challenge-id="first-run"]');
    await expect(firstRun).toContainText('First Run');
    await expect(firstRun).toContainText('0 / 1');
    await expect(firstRun).toContainText('Night League');
    await expectNoHorizontalOverflow(page);
    await attachScreenshot(testInfo, page, `phase10-${viewport.name}-challenges.png`);

    await page.keyboard.press('Escape');
    await expect(page.locator('#btn-title-challenges')).toBeFocused();
    await expectExclusivePanel(page, 'title-screen');
  }
});

test('Phase 10 canonical progress unlocks local cosmetics, survives reload/restart, and leaves results affiliate isolated', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    for (let index = 0; index < 13; index++) {
      engine.emitGameplayEvent('OBJECT_DESTROYED', { score: 0, combo: 1, material: 'WOOD', propKey: `e2e-${index}` });
    }
    engine.setCombo(10, 'E2E_PROGRESSION');
    const originalGravityScale = engine.engine.gravity.scale;
    engine.engine.gravity.scale = 0;
    const contactPoint = { x: engine.player.x, y: engine.player.y - 30 };
    engine.npc.onThrowCallback({
      x: contactPoint.x + 50,
      y: contactPoint.y,
      targetX: contactPoint.x
    });
    const projectile = engine.thrownProjectiles.at(-1);
    engine.handlePointerDown(contactPoint.x - engine.camera.x, contactPoint.y);
    engine.handlePointerUp(contactPoint.x - engine.camera.x, contactPoint.y);
    engine.engine.gravity.scale = originalGravityScale;
    engine.triggerGameOver();
    window.__phase10PerfectParry = Boolean(projectile?.isParried);
  });
  expect(await page.evaluate(() => window.__phase10PerfectParry)).toBe(true);
  expect(await page.evaluate(() => window.__BACKYARD_TEST_META__.getProfile().lifetimeStats.perfectParries)).toBe(1);

  await expect(page.locator('#gameover-modal')).toBeVisible();
  await expect(page.locator('#progression-summary')).toBeVisible();
  await expect(page.locator('#progression-updates')).toContainText('First Run');
  await expect(page.locator('#progression-updates')).toContainText('BALL SKIN: Night League');
  await expect(page.locator('#progression-updates')).toContainText('TRAIL: Night League');
  await expect(page.locator('#btn-restart-run')).toBeVisible();
  await expect(page.locator('#affiliate-placement')).toBeVisible();
  const affiliate = page.locator('#affiliate-placement a');
  await expect(affiliate).toHaveAttribute('href', 'https://videogen.io/ai-video-generator?fp_ref=amey-ff39df');
  await expect(affiliate).toHaveAttribute('target', '_blank');
  await expect(affiliate).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  const profileBeforeAffiliateClick = await page.evaluate(() => localStorage.getItem('backyard_meta_profile'));
  const popupPromise = page.waitForEvent('popup');
  await affiliate.click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toBe('https://videogen.io/ai-video-generator?fp_ref=amey-ff39df');
  expect(await page.evaluate(() => localStorage.getItem('backyard_meta_profile'))).toBe(profileBeforeAffiliateClick);
  await popup.close();

  await page.locator('#btn-restart-run').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);

  await page.locator('#btn-pause-game').click();
  await page.locator('#btn-main-menu').click();
  await page.locator('#btn-title-challenges').click();
  const yardChallenge = page.locator('#challenge-list [data-challenge-id="yard-wrecker"]');
  await expect(yardChallenge).toContainText('COMPLETE');
  await expect(yardChallenge).toContainText('5 / 5');
  await expect(yardChallenge).toContainText('Carbon Five');
  await page.keyboard.press('Escape');
  await page.locator('#btn-title-garage').click();

  const physicsBefore = await page.evaluate(() => {
    const ball = window.__BACKYARD_TEST_ENGINE__.ball;
    return [ball.density, ball.restitution, ball.friction, ball.frictionAir, ball.circleRadius, ball.mass, ball.inertia];
  });
  const classicCanvas = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.setCosmeticSelection({ ball: 'CLASSIC', trail: 'CLASSIC', impact: 'CLASSIC' });
    engine.render(1);
    return document.getElementById('game-canvas').toDataURL();
  });
  const neonBall = page.locator('#garage-ball-list button[data-cosmetic-id="NEON"]');
  await expect(neonBall).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.locator('#garage-ball-list button[data-cosmetic-id="CLASSIC"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(neonBall).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(neonBall).toHaveAttribute('aria-pressed', 'true');
  await expect(neonBall).toContainText('EQUIPPED');

  const neonCanvas = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.render(1);
    return document.getElementById('game-canvas').toDataURL();
  });
  expect(neonCanvas).not.toBe(classicCanvas);
  expect(await page.evaluate(() => {
    const ball = window.__BACKYARD_TEST_ENGINE__.ball;
    return [ball.density, ball.restitution, ball.friction, ball.frictionAir, ball.circleRadius, ball.mass, ball.inertia];
  })).toEqual(physicsBefore);

  const emberTrail = page.locator('#garage-trail-list button[data-cosmetic-id="EMBER"]');
  const comicImpact = page.locator('#garage-impact-list button[data-cosmetic-id="COMIC"]');
  await expect(emberTrail).toBeEnabled();
  await expect(comicImpact).toBeEnabled();
  await emberTrail.click();
  await comicImpact.click();

  const profileBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('backyard_meta_profile')));
  expect(profileBeforeReload.equipped.ball).toBe('NEON');
  await attachScreenshot(testInfo, page, 'phase10-garage-equipped.png');
  await page.reload();
  await page.locator('#btn-title-garage').click();
  await expect(page.locator('#garage-ball-list button[data-cosmetic-id="NEON"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cosmeticSelection.ball)).toBe('NEON');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cosmeticSelection.trail)).toBe('EMBER');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cosmeticSelection.impact)).toBe('COMIC');
  await page.locator('#btn-garage-back').click();

  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  const trailRendered = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.ball.velocity.x = 12;
    engine.ball.velocity.y = -2;
    engine.update(1 / 60);
    return engine.particles.trailPoints.some(point => point.color === '#f97316');
  });
  expect(trailRendered).toBe(true);

  const impactResult = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.particles.clear();
    const originalGravityScale = engine.engine.gravity.scale;
    engine.engine.gravity.scale = 0;
    for (let index = 0; index < 13; index++) {
      engine.emitGameplayEvent('OBJECT_DESTROYED', { score: 0, combo: 1, material: 'WOOD', propKey: `impact-e2e-${index}` });
    }
    const contactPoint = { x: engine.player.x, y: engine.player.y - 30 };
    engine.npc.onThrowCallback({
      x: contactPoint.x + 50,
      y: contactPoint.y,
      targetX: contactPoint.x
    });
    const projectile = engine.thrownProjectiles.at(-1);
    if (!projectile) return { parried: false, ringColors: [], state: engine.gameState, projectileCount: 0 };
    engine.handlePointerDown(contactPoint.x - engine.camera.x, contactPoint.y);
    engine.handlePointerUp(contactPoint.x - engine.camera.x, contactPoint.y);
    engine.engine.gravity.scale = originalGravityScale;
    return {
      parried: Boolean(projectile?.isParried),
      ringColors: engine.particles.impactRings.map(ring => ring.color),
      state: engine.gameState,
      paused: engine.isPaused,
      visible: engine.pageVisible,
      threats: engine.getProjectileThreats().map(threat => threat.timeToContact)
    };
  });
  expect(impactResult.parried, JSON.stringify(impactResult)).toBe(true);
  expect(impactResult.ringColors).toContain('#fde047');

  await page.locator('#btn-pause-game').click();
  await page.locator('#btn-restart-paused').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cosmeticSelection.ball)).toBe('NEON');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('backyard_meta_profile')).unlocked)).toContain('impact:COMIC');
  await expect(page.locator('#btn-pause-game')).toBeVisible();
});

test('Phase 10 boots and plays when browser localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage disabled', 'SecurityError'); }
    });
  });
  await page.goto('/');
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
});
