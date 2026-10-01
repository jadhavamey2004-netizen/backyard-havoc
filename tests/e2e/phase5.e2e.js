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

test('Phase 5 escalation follows production events and renders the named Kevin states', async ({ page }, testInfo) => {
  await startGameplay(page);
  const state = page.locator('#kevin-state-display');
  await expect(state).toHaveText('KEVIN: CALM');
  await expect(page.locator('#havoc-value-display')).toHaveText('0%');
  await attachScreenshot(testInfo, page, 'phase5-normal-gameplay.png');

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
  });
  await expect(state).toHaveText('KEVIN: ANNOYED');
  await attachScreenshot(testInfo, page, 'phase5-kevin-escalation.png');

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
  });
  await expect(state).toHaveText('KEVIN: FURIOUS');
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true, score: 0, combo: 1 });
  });
  await expect(state).toHaveText('KEVIN: RAMPAGE');
  await attachScreenshot(testInfo, page, 'phase5-kevin-rampage.png');

  const snapshot = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.kevinDirector.getSnapshot());
  expect(snapshot).toMatchObject({ state: 'RAMPAGE', rage: 84 });
  expect(snapshot.recentContext).toMatchObject({ destructionCount: 7, recentEventCount: 7 });
});

test('Phase 5 Havoc fills, activates, rewards a later event, and resets through production systems', async ({ page }, testInfo) => {
  await startGameplay(page);
  const engineState = () => page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return {
      havoc: engine.havocSystem.getSnapshot(),
      score: engine.score,
      kevin: engine.kevinDirector.getSnapshot()
    };
  });

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    for (let index = 0; index < 12; index++) {
      engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: false, score: 0, combo: 1 });
    }
  });
  expect((await engineState()).havoc.meter).toBe(96);
  await expect(page.locator('#havoc-value-display')).toHaveText('96%');
  await attachScreenshot(testInfo, page, 'phase5-havoc-near-full.png');

  const activation = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.score += 50;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: false, score: 50, combo: 1 });
    return {
      active: engine.havocSystem.active,
      meter: engine.havocSystem.meter,
      activeTimer: engine.havocSystem.activeTimer
    };
  });
  expect(activation).toMatchObject({ active: true, meter: 100, activeTimer: 0 });
  await expect(page.locator('#havoc-value-display')).toHaveText('100%');
  await expect(page.locator('#havoc-mode-display')).toBeVisible();
  expect((await engineState()).havoc).toMatchObject({ meter: 100, active: true, havocActivations: 1 });
  await attachScreenshot(testInfo, page, 'phase5-havoc-active.png');

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.score += 50;
    engine.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: false, score: 50, combo: 1 });
  });
  expect((await engineState()).score).toBe(125);

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.resetEnvironment();
    engine.startIntroCutscene();
    engine.skipOrEndIntroCutscene();
  });
  await expect(page.locator('#havoc-value-display')).toHaveText('0%');
  await expect(page.locator('#havoc-mode-display')).toBeHidden();
  await expect(page.locator('#kevin-state-display')).toHaveText('KEVIN: CALM');
  expect((await engineState()).havoc).toMatchObject({ meter: 0, active: false, havocActivations: 0 });
  expect((await engineState()).kevin.recentContext.recentEventCount).toBe(0);
  await attachScreenshot(testInfo, page, 'phase5-reset.png');
});
