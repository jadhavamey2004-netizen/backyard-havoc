import { expect, test } from '@playwright/test';
import { attachBrowserHealth, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        window.__phase12ShareCalls = (window.__phase12ShareCalls || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async text => { window.__phase12CopiedText = text; }
      }
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('Phase 12 share paths prevent duplicate activation and clear stale Results feedback', async ({ page }) => {
  const showResults = async () => {
    await page.locator('#btn-start-game').click();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
    await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
    await expect(page.locator('#gameover-modal')).toBeVisible();
  };
  await page.goto('/');
  const share = page.locator('#btn-share-score');
  await showResults();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => {
        window.__phase12ShareCalls = (window.__phase12ShareCalls || 0) + 1;
        return new Promise(resolve => { window.__phase12ResolveShare = resolve; });
      }
    });
  });
  await share.click();
  await expect(share).toBeDisabled();
  await page.evaluate(() => document.getElementById('btn-share-score').click());
  await expect.poll(() => page.evaluate(() => window.__phase12ShareCalls)).toBe(1);
  await page.locator('#btn-restart-run').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await page.evaluate(() => window.__phase12ResolveShare());
  await expect(share).toBeEnabled();
  await expect(share).toHaveText('SHARE SCORE');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { window.__phase12ShareCalls += 1; }
    });
  });
  await share.click();
  await expect.poll(() => page.evaluate(() => window.__phase12ShareCalls)).toBe(2);
  await expect(share).toHaveText('SHARED!');
  await expect(share).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { throw new DOMException('User dismissed share sheet', 'AbortError'); }
    });
  });
  await page.locator('#btn-restart-run').click();
  await expect(share).toHaveText('SHARE SCORE');
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await expect(share).toHaveText('SHARE SCORE');

  await share.click();
  await expect(share).toHaveText('SHARE CANCELLED');
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
  await page.locator('#btn-restart-run').click();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();

  await share.click();
  await expect(share).toHaveText('COPIED!');
  expect(await page.evaluate(() => window.__phase12CopiedText)).toContain('Backyard Havoc');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); });
  await page.locator('#btn-restart-run').click();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();

  await share.click();
  await expect(share).toHaveText('SHARING UNAVAILABLE');
});
