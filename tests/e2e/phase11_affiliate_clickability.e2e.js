import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachJsonEvidence, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const VIDEO_GEN_URL = 'https://videogen.io/ai-video-generator?fp_ref=amey-ff39df';
const viewports = [
  { name: '390x844-portrait', width: 390, height: 844 },
  { name: '412x915-portrait', width: 412, height: 915 },
  { name: '844x390-landscape', width: 844, height: 390 },
  { name: '915x412-landscape', width: 915, height: 412 },
  { name: '1280x720-desktop', width: 1280, height: 720 },
];

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function showResults(page, { progression = false } = {}) {
  await page.goto('/');
  await expect(page.locator('#affiliate-placement')).toBeHidden();
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_UI__.getState().screen)).toBe('PLAYING');

  if (progression) {
    await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      for (let index = 0; index < 5; index++) {
        engine.emitGameplayEvent('OBJECT_DESTROYED', { score: 0, combo: 1, material: 'WOOD', propKey: `phase11-${index}` });
      }
      engine.emitGameplayEvent('COMBO_CHANGED', { previous: 1, current: 10 });
      for (let index = 0; index < 3; index++) engine.emitGameplayEvent('PERFECT_PARRY');
      engine.emitGameplayEvent('KEVIN_HIT', { source: 'PARRIED_PROJECTILE' });
      engine.emitGameplayEvent('HAVOC_STARTED');
    });
  }

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await expect(page.locator('#affiliate-placement')).toBeVisible();
  await expect(page.locator('#affiliate-placement a.affiliate-link')).toBeVisible();
}

async function hitTestDiagnostics(page) {
  return page.evaluate(() => {
    const anchor = document.querySelector('#affiliate-placement a.affiliate-link');
    const rect = anchor.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    const ancestors = [];
    for (let node = anchor; node && node instanceof HTMLElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      ancestors.push({
        tag: node.tagName.toLowerCase(),
        id: node.id,
        className: typeof node.className === 'string' ? node.className : '',
        hidden: node.hidden,
        inert: node.inert,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        touchAction: style.touchAction,
      });
    }
    const panel = document.querySelector('#gameover-modal');
    const overlay = document.querySelector('#screen-overlay');
    return {
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      centerHit: hit ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}${hit.classList.length ? `.${[...hit.classList].join('.')}` : ''}` : null,
      centerHitsAffiliate: hit?.closest('a.affiliate-link') === anchor,
      pointerCoarse: matchMedia('(pointer: coarse)').matches,
      maxTouchPoints: navigator.maxTouchPoints,
      ancestors,
      panel: { scrollTop: panel.scrollTop, scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight },
      overlay: { scrollTop: overlay.scrollTop, scrollHeight: overlay.scrollHeight, clientHeight: overlay.clientHeight },
    };
  });
}

async function routeVideoGen(context) {
  await context.route('https://videogen.io/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>VideoGen test destination</title><p>Local link safety stub</p>',
  }));
}

function resultsSnapshot(page) {
  return page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return JSON.stringify({
      profile: localStorage.getItem('backyard_meta_profile'),
      screen: window.__BACKYARD_TEST_UI__.getState().screen,
      gameState: engine.gameState,
      score: engine.score,
      combo: engine.combo,
      health: engine.player.health,
    });
  });
}

test('Phase 11 affiliate hit target stays reachable and activates from real mouse input across Results layouts', async ({ page, context }, testInfo) => {
  await routeVideoGen(context);
  await showResults(page, { progression: true });
  await expect(page.locator('#progression-summary')).toBeVisible();
  await expect(page.locator('#progression-updates')).toContainText('Yard Wrecker');
  await expect(page.locator('#progression-updates')).toContainText('NEW LOOKS');
  for (const unlockName of ['Night League', 'Carbon Five', 'Last Light', 'Hot Streak', 'Live Wire', 'Comic Pop', 'Big Bonk']) {
    await expect(page.locator('#progression-updates')).toContainText(unlockName);
  }

  const affiliate = page.locator('#affiliate-placement a.affiliate-link');
  await expect(affiliate).toHaveAttribute('href', VIDEO_GEN_URL);
  await expect(affiliate).toHaveAttribute('target', '_blank');
  await expect(affiliate).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  await expect(affiliate).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(page.locator('.affiliate-disclosure')).toHaveText('Affiliate link — we may earn a commission at no extra cost to you.');

  const measuredHeights = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await affiliate.scrollIntoViewIfNeeded();
    const diagnostics = await hitTestDiagnostics(page);
    await attachJsonEvidence(testInfo, `affiliate-${viewport.name}-hit-test.json`, diagnostics);
    await attachScreenshot(testInfo, page, `affiliate-${viewport.name}.png`);

    measuredHeights.push({ viewport: viewport.name, height: diagnostics.box.height });
    expect(diagnostics.centerHitsAffiliate, `${viewport.name} center-point hit target`).toBe(true);
    expect(diagnostics.ancestors.every(item => !item.hidden && !item.inert), `${viewport.name} ancestor visibility and inert state`).toBe(true);
    expect(diagnostics.ancestors.every(item => item.pointerEvents !== 'none'), `${viewport.name} ancestor pointer behavior`).toBe(true);
    expect(diagnostics.ancestors.every(item => item.visibility === 'visible' && Number(item.opacity) > 0), `${viewport.name} ancestor visibility and opacity`).toBe(true);
    expect(diagnostics.ancestors.every(item => item.touchAction !== 'none'), `${viewport.name} ancestor touch behavior`).toBe(true);
    if (viewport.height < 570) {
      expect(diagnostics.panel.scrollHeight).toBeGreaterThan(diagnostics.panel.clientHeight);
      expect(diagnostics.panel.scrollTop).toBeGreaterThan(0);
    }
    if (viewport.name === '844x390-landscape') {
      const beforeScrolledActivation = await resultsSnapshot(page);
      const popupPromise = page.waitForEvent('popup');
      await page.mouse.click(diagnostics.box.x + diagnostics.box.width / 2, diagnostics.box.y + diagnostics.box.height / 2);
      const popup = await popupPromise;
      await expect.poll(() => popup.url()).toBe(VIDEO_GEN_URL);
      expect(await resultsSnapshot(page)).toBe(beforeScrolledActivation);
      await popup.close();
    }
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await affiliate.scrollIntoViewIfNeeded();
  const desktopDiagnostics = await hitTestDiagnostics(page);
  const beforeActivation = await resultsSnapshot(page);
  const popupPromise = page.waitForEvent('popup');
  await page.mouse.click(desktopDiagnostics.box.x + desktopDiagnostics.box.width / 2, desktopDiagnostics.box.y + desktopDiagnostics.box.height / 2);
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toBe(VIDEO_GEN_URL);
  expect(await resultsSnapshot(page)).toBe(beforeActivation);
  await popup.close();
  expect(measuredHeights.every(result => result.height >= 48), `effective link target heights: ${JSON.stringify(measuredHeights)}`).toBe(true);
});

test('Phase 11 Results keyboard order reaches the affiliate link and native Enter activates it', async ({ page, context }) => {
  await routeVideoGen(context);
  await showResults(page);

  const playAgain = page.locator('#btn-restart-run');
  const share = page.locator('#btn-share-score');
  const affiliate = page.locator('#affiliate-placement a.affiliate-link');
  await expect(playAgain).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(share).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(affiliate).toBeFocused();

  const pagesBeforeSpace = context.pages().length;
  await page.keyboard.press('Space');
  expect(context.pages()).toHaveLength(pagesBeforeSpace);
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await expect(affiliate).toBeFocused();

  const beforeActivation = await resultsSnapshot(page);
  const popupPromise = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toBe(VIDEO_GEN_URL);
  expect(await resultsSnapshot(page)).toBe(beforeActivation);
  await popup.close();
});

test.describe('Phase 11 coarse-pointer affiliate activation', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('touch tap opens the exact VideoGen destination from the production Results UI after scroll as needed', async ({ page, context }, testInfo) => {
    await routeVideoGen(context);
    await showResults(page, { progression: true });
    await expect(page.locator('#progression-summary')).toBeVisible();
    const affiliate = page.locator('#affiliate-placement a.affiliate-link');
    await affiliate.scrollIntoViewIfNeeded();

    const diagnostics = await hitTestDiagnostics(page);
    await attachJsonEvidence(testInfo, 'affiliate-touch-hit-test.json', diagnostics);
    await attachScreenshot(testInfo, page, 'affiliate-touch-results.png');
    expect(diagnostics.centerHitsAffiliate).toBe(true);
    expect(diagnostics.pointerCoarse).toBe(true);
    expect(diagnostics.maxTouchPoints).toBeGreaterThan(0);
    expect(diagnostics.ancestors.every(item => !item.hidden && !item.inert && item.pointerEvents !== 'none')).toBe(true);
    expect(diagnostics.ancestors.every(item => item.touchAction !== 'none')).toBe(true);
    if (diagnostics.panel.scrollHeight > diagnostics.panel.clientHeight) {
      expect(diagnostics.panel.scrollTop).toBeGreaterThan(0);
    }

    const beforeActivation = await resultsSnapshot(page);
    const popupPromise = page.waitForEvent('popup');
    await affiliate.tap();
    const popup = await popupPromise;
    await expect.poll(() => popup.url()).toBe(VIDEO_GEN_URL);
    expect(await resultsSnapshot(page)).toBe(beforeActivation);
    expect(diagnostics.box.height).toBeGreaterThanOrEqual(48);
    await popup.close();
  });
});
