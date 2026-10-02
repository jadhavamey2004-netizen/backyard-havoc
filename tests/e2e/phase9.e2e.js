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
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    if (!NativeAudioContext) return;
    let created = 0;
    window.AudioContext = class CountedAudioContext extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        created += 1;
      }
    };
    window.__countAudioContexts = () => created;
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

async function attachScreenShot(testInfo, page, viewport, state) {
  await attachScreenshot(testInfo, page, `phase9-${viewport}-${state}.png`);
}

async function expectExclusivePanel(page, expectedId) {
  const visibleIds = await page.evaluate(() => [...document.querySelectorAll('#screen-overlay > section')]
    .filter(panel => !panel.hidden)
    .map(panel => panel.id));
  expect(visibleIds).toEqual(expectedId ? [expectedId] : []);
}

async function expectInsideViewport(page, selector, viewport) {
  const bounds = await page.locator(selector).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
}

test('Phase 9 screen flow stays readable across five required viewports', async ({ page }, testInfo) => {
  let popupOpened = false;
  page.on('popup', () => { popupOpened = true; });

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('#screen-overlay')).toBeVisible();
    await expect(page.locator('#title-screen')).toBeVisible();
    await expectExclusivePanel(page, 'title-screen');
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#btn-start-game')).toBeFocused();
    await expect(page.locator('#affiliate-placement')).toBeHidden();
    await expectNoHorizontalOverflow(page);
    const titleBounds = await page.locator('#btn-start-game').boundingBox();
    expect(titleBounds?.x).toBeGreaterThanOrEqual(0);
    expect(titleBounds?.y).toBeGreaterThanOrEqual(0);
    expect(titleBounds?.x + titleBounds?.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(titleBounds?.y + titleBounds?.height).toBeLessThanOrEqual(viewport.height + 1);
    await attachScreenShot(testInfo, page, viewport.name, 'title');

    if (viewport.name === '1280x720') await page.keyboard.press('Enter');
    else await page.locator('#btn-start-game').click();
    await page.keyboard.press('Space');
    await expectExclusivePanel(page, null);
    await expect(page.locator('#game-hud')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__countAudioContexts?.() ?? 0)).toBe(1);
    for (const id of ['score-display', 'combo-display', 'player-health-display', 'kevin-state-display', 'havoc-value-display']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('#title-screen')).toHaveClass(/\bhidden\b/);
    await expect(page.locator('#affiliate-placement')).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await attachScreenShot(testInfo, page, viewport.name, 'gameplay');

    await page.locator('#btn-pause-game').click();
    await expect(page.locator('#pause-screen')).toBeVisible();
    await expectExclusivePanel(page, 'pause-screen');
    await expectInsideViewport(page, '#btn-resume', viewport);
    const pausedSnapshot = await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return { seconds: engine.survivalSeconds, ballX: engine.ball.position.x, paused: engine.isPaused };
    });
    await page.waitForTimeout(240);
    const afterPauseWait = await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return { seconds: engine.survivalSeconds, ballX: engine.ball.position.x, paused: engine.isPaused };
    });
    expect(afterPauseWait).toEqual(pausedSnapshot);
    await expectNoHorizontalOverflow(page);
    await attachScreenShot(testInfo, page, viewport.name, 'pause');

    await page.locator('#btn-pause-settings').click();
    await expect(page.locator('#settings-screen')).toBeVisible();
    await expectExclusivePanel(page, 'settings-screen');
    await expectInsideViewport(page, '#btn-settings-back', viewport);
    await page.keyboard.press('Tab');
    await expect(page.locator('#setting-muted')).toBeFocused();
    const contextsBeforeSettings = await page.evaluate(() => window.__countAudioContexts?.() ?? 0);
    await page.locator('#setting-muted').check();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio.muted)).toBe(true);
    await page.locator('#setting-muted').uncheck();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio.muted)).toBe(false);
    await page.locator('#setting-reduced-motion').check();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier)).toBe(0.35);
    await page.locator('#setting-reduced-motion').uncheck();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier)).toBe(1);
    expect(await page.evaluate(() => window.__countAudioContexts?.() ?? 0)).toBe(contextsBeforeSettings);
    await expectNoHorizontalOverflow(page);
    await attachScreenShot(testInfo, page, viewport.name, 'settings');

    await page.locator('#btn-settings-back').click();
    await expect(page.locator('#pause-screen')).toBeVisible();
    await expect(page.locator('#btn-pause-settings')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);

    await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      engine.score = 7654;
      engine.peakCombo = 9;
      engine.distanceTraveledMeters = 56;
      engine.survivalSeconds = 31;
      engine.triggerGameOver();
    });
    await expect(page.locator('#gameover-modal')).toBeVisible();
    await expectExclusivePanel(page, 'gameover-modal');
    await expect(page.locator('#go-score')).toHaveText('7,654');
    await expect(page.locator('#go-high-score')).toHaveText('7,654');
    await expect(page.locator('#go-time')).toHaveText('31s');
    await expect(page.locator('#go-combo')).toHaveText('9x');
    await expect(page.locator('#go-yards')).toHaveText('56m');
    const affiliate = page.locator('#affiliate-placement a');
    await expect(affiliate).toHaveAttribute('href', 'https://videogen.io/ai-video-generator?fp_ref=amey-ff39df');
    await expect(affiliate).toHaveAttribute('target', '_blank');
    await expect(affiliate).toHaveAttribute('rel', /sponsored.*noopener.*noreferrer/);
    await expect(affiliate).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(page.locator('#affiliate-placement .affiliate-disclosure')).toContainText('Affiliate link — we may earn a commission at no extra cost to you.');
    await expectInsideViewport(page, '#affiliate-placement .affiliate-disclosure', viewport);
    await expectNoHorizontalOverflow(page);
    await page.waitForTimeout(80);
    expect(popupOpened).toBe(false);
    await attachScreenShot(testInfo, page, viewport.name, 'results');
  }
});

test('Phase 9 restart paths stay canonical and repeatable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.handlePointerDown(500, 180));
  await page.waitForFunction(() => window.__BACKYARD_TEST_ENGINE__?.getAudioDiagnostics().audio.chargeVoiceActive);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-screen')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio.chargeVoiceActive)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(false);
  await page.locator('#btn-restart-paused').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.__countAudioContexts?.() ?? 0)).toBe(1);

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.locator('#btn-pause-game').click();
    await page.locator('#btn-restart-paused').click();
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);
    expect(await page.evaluate(() => window.__countAudioContexts?.() ?? 0)).toBe(1);
  }

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async value => { window.__phase9SharedScore = value; } }
    });
  });
  await page.locator('#btn-share-score').click();
  await expect(page.locator('#btn-share-score')).toHaveText('COPIED!');
  await expect.poll(() => page.evaluate(() => window.__phase9SharedScore)).toContain('Backyard Havoc');

  // The primary results action is focused, so native Enter activation restarts immediately.
  await page.locator('#btn-restart-run').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect(page.locator('#gameover-modal')).toBeHidden();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await page.locator('#btn-restart-run').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio.chargeVoiceActive)).toBe(false);
});

test('Phase 9 title settings, Escape transitions and focus stay accessible', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-title-settings').click();
  await expect(page.locator('#settings-screen')).toBeVisible();
  await expect(page.locator('#game-stage')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#btn-title-settings')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('#btn-start-game')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('#btn-pause-game').click();
  await expect(page.locator('#pause-screen')).toBeVisible();
  const introTimer = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cutsceneTimer);
  await page.waitForTimeout(180);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.cutsceneTimer)).toBe(introTimer);
  await page.locator('#btn-resume').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  const canvasBounds = await page.locator('#game-canvas').boundingBox();
  await page.mouse.click(canvasBounds.x + canvasBounds.width / 2, canvasBounds.y + canvasBounds.height / 2);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-screen')).toBeVisible();
  await expect(page.locator('#btn-resume')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#btn-pause-game')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#pause-screen')).toBeVisible();
  await expect(page.locator('#btn-resume')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#btn-pause-game')).toBeFocused();
  await attachScreenshot(testInfo, page, '1280x720', 'keyboard-focus-resumed');
});

test('Phase 9 follows the operating system reduced-motion preference', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\breduced-motion\b/);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier)).toBe(0.35);
  await page.locator('#btn-title-settings').click();
  await expect(page.locator('#setting-reduced-motion')).toBeChecked();
  await expect(page.locator('#settings-screen')).toBeVisible();
  await attachScreenShot(testInfo, page, '390x844', 'reduced-motion-settings');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).not.toHaveClass(/\breduced-motion\b/);
  await expect(page.locator('#setting-reduced-motion')).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#setting-reduced-motion')).toBeChecked();
  await page.locator('#setting-reduced-motion').uncheck();
  await expect(page.locator('html')).not.toHaveClass(/\breduced-motion\b/);
  await expect(page.locator('html')).toHaveClass(/\bmotion-setting-overridden\b/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/\breduced-motion\b/);
  await expect(page.locator('#setting-reduced-motion')).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.camera.motionMultiplier)).toBe(1);
});
