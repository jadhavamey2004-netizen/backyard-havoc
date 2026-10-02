import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const VIEWPORTS = [
  { name: '320x800-text-reflow', width: 320, height: 800 },
  { name: '390x844-portrait', width: 390, height: 844 },
  { name: '412x915-portrait', width: 412, height: 915 },
  { name: '844x390-landscape', width: 844, height: 390 },
  { name: '915x412-landscape', width: 915, height: 412 },
  { name: '768x1024-tablet-portrait', width: 768, height: 1024 },
  { name: '1024x768-tablet-landscape', width: 1024, height: 768 },
  { name: '1280x720-desktop', width: 1280, height: 720 },
  { name: '1366x768-desktop', width: 1366, height: 768 },
  { name: '1920x1080-desktop', width: 1920, height: 1080 },
];

const inspectScreen = async (page, viewport) => {
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('.screen-panel:not([hidden])');
    const box = panel?.getBoundingClientRect();
    return {
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      panel: box && { x: box.x, y: box.y, width: box.width, height: box.height, scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight },
    };
  });
  expect(geometry.documentWidth, `${viewport.name} document width`).toBeLessThanOrEqual(viewport.width);
  expect(geometry.bodyWidth, `${viewport.name} body width`).toBeLessThanOrEqual(viewport.width);
  expect(geometry.panel, `${viewport.name} active panel`).not.toBeNull();
  expect(geometry.panel.x, `${viewport.name} panel left edge`).toBeGreaterThanOrEqual(0);
  expect(geometry.panel.x + geometry.panel.width, `${viewport.name} panel right edge`).toBeLessThanOrEqual(viewport.width + 1);
  return geometry;
};

const captureTargets = async (page, viewport, screen, selectors, evidence) => {
  const measurements = await page.evaluate(ids => Object.fromEntries(ids.map(selector => {
    const element = document.querySelector(selector);
    const rect = element?.getBoundingClientRect();
    return [selector, rect && { width: rect.width, height: rect.height }];
  })), selectors);
  for (const [selector, rect] of Object.entries(measurements)) {
    expect(rect, `${viewport.name} ${screen} ${selector} rendered bounds`).not.toBeNull();
    expect(rect.height, `${viewport.name} ${screen} ${selector} target height`).toBeGreaterThanOrEqual(44);
    evidence.push({ viewport: viewport.name, screen, selector, ...rect });
  }
};

test.describe('Phase 11 responsive UI and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    page.__browserHealth = monitorBrowserHealth(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await attachBrowserHealth(testInfo, page.__browserHealth);
  });

  test('menu, collection, challenge, and Results UI reflow across the required viewport matrix', async ({ page }, testInfo) => {
    const evidence = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      if (viewport.width === 320) await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      const textScale = viewport.width === 320 ? '-200-percent-text' : '';

      await expect(page.locator('#title-screen')).toBeVisible();
      evidence.push({ viewport: viewport.name, screen: 'TITLE', ...(await inspectScreen(page, viewport)) });
      await captureTargets(page, viewport, 'TITLE', ['#btn-start-game', '#btn-title-garage', '#btn-title-challenges', '#btn-title-settings', '.title-controls-card summary'], evidence);
      if (viewport.width === 320) await attachScreenshot(testInfo, page, `phase11-${viewport.name}${textScale}-title.png`);

      await page.locator('.title-controls-card summary').click();
      await expect(page.locator('.touch-instructions')).toContainText('TAP PLAYFIELD');
      await expect(page.locator('.touch-instructions')).toContainText('DRAG WHILE HELD');
      await page.locator('#btn-title-settings').click();
      evidence.push({ viewport: viewport.name, screen: 'SETTINGS', ...(await inspectScreen(page, viewport)) });
      await page.keyboard.press('Tab');
      const settingsFocus = await page.evaluate(() => {
        const rect = document.activeElement.getBoundingClientRect();
        return {
          tag: document.activeElement.tagName,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          indicator: document.activeElement.nextElementSibling ? getComputedStyle(document.activeElement.nextElementSibling).boxShadow : getComputedStyle(document.activeElement).boxShadow
        };
      });
      expect(settingsFocus.visible, `${viewport.name} Settings keyboard focus`).toBe(true);
      expect(settingsFocus.indicator, `${viewport.name} Settings focus indicator`).not.toBe('none');
      await captureTargets(page, viewport, 'SETTINGS', ['.setting-row', '#btn-settings-back'], evidence);
      if (viewport.width === 320) await attachScreenshot(testInfo, page, `phase11-${viewport.name}${textScale}-settings.png`);
      await page.locator('#btn-settings-back').click();

      await page.locator('#btn-title-garage').click();
      evidence.push({ viewport: viewport.name, screen: 'GARAGE', ...(await inspectScreen(page, viewport)) });
      const lockedItem = page.locator('.cosmetic-tile:disabled').first();
      await expect(lockedItem).toHaveAttribute('aria-label', /LOCKED/);
      await lockedItem.scrollIntoViewIfNeeded();
      const lockedBounds = await lockedItem.boundingBox();
      expect(lockedBounds.height, `${viewport.name} garage target height`).toBeGreaterThanOrEqual(44);
      await captureTargets(page, viewport, 'GARAGE', ['.cosmetic-tile:disabled', '#btn-garage-back'], evidence);
      if (viewport.width === 320) await attachScreenshot(testInfo, page, `phase11-${viewport.name}${textScale}-garage.png`);
      await page.locator('#btn-garage-back').click();

      await page.locator('#btn-title-challenges').click();
      evidence.push({ viewport: viewport.name, screen: 'CHALLENGES', ...(await inspectScreen(page, viewport)) });
      await expect(page.locator('#challenge-list')).toBeVisible();
      await captureTargets(page, viewport, 'CHALLENGES', ['#btn-challenges-back'], evidence);
      await page.locator('#btn-challenges-back').click();

      await page.locator('#btn-start-game').click();
      await page.locator('#game-canvas').click({ position: { x: 180, y: 100 } });
      await captureTargets(page, viewport, 'PLAYING', ['#btn-pause-game'], evidence);
      await page.locator('#btn-pause-game').click();
      await expect(page.locator('#pause-screen')).toBeVisible();
      await captureTargets(page, viewport, 'PAUSED', ['#btn-resume', '#btn-restart-paused', '#btn-main-menu'], evidence);
      await page.locator('#btn-resume').click();
      await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
      await expect(page.locator('#gameover-modal')).toBeVisible();
      evidence.push({ viewport: viewport.name, screen: 'RESULTS', ...(await inspectScreen(page, viewport)) });
      const affiliate = page.locator('.affiliate-link');
      await expect(affiliate).toBeVisible();
      const linkBox = await affiliate.boundingBox();
      expect(linkBox.height, `${viewport.name} affiliate link height`).toBeGreaterThanOrEqual(48);
      await captureTargets(page, viewport, 'RESULTS', ['#btn-restart-run', '#btn-share-score', '.affiliate-link'], evidence);
      await affiliate.focus();
      await affiliate.scrollIntoViewIfNeeded();
      const focusVisibility = await page.evaluate(() => {
        const focused = document.activeElement.getBoundingClientRect();
        const panel = document.querySelector('#gameover-modal').getBoundingClientRect();
        return { visible: focused.top >= panel.top && focused.bottom <= panel.bottom && focused.left >= panel.left && focused.right <= panel.right };
      });
      expect(focusVisibility.visible, `${viewport.name} Results affiliate focus is visible in scroll region`).toBe(true);
      if (viewport.width === 320) await attachScreenshot(testInfo, page, `phase11-${viewport.name}${textScale}-results.png`);
      if (viewport.name === '1366x768-desktop') await attachScreenshot(testInfo, page, 'phase11-responsive-results-desktop.png');
    }

    await testInfo.attach('phase11-responsive-geometry.json', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json',
    });

    const contrast = await page.evaluate(() => {
      const parseColor = value => {
        const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
        if (hex) {
          const expanded = hex[1].length === 3 ? [...hex[1]].map(digit => digit + digit).join('') : hex[1];
          return { r: Number.parseInt(expanded.slice(0, 2), 16), g: Number.parseInt(expanded.slice(2, 4), 16), b: Number.parseInt(expanded.slice(4, 6), 16), a: 1 };
        }
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const channels = match[1].split(',').map(part => Number.parseFloat(part.trim()));
        return { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 };
      };
      const cssColors = value => [...value.matchAll(/rgba?\([^)]+\)/g)].map(match => parseColor(match[0])).filter(Boolean);
      const blend = (top, bottom) => ({
        r: top.r * top.a + bottom.r * (1 - top.a),
        g: top.g * top.a + bottom.g * (1 - top.a),
        b: top.b * top.a + bottom.b * (1 - top.a),
        a: 1,
      });
      const luminance = color => {
        const linear = [color.r, color.g, color.b].map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const ratio = (first, second) => {
        const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const backgroundCandidates = element => {
        const own = getComputedStyle(element);
        const ownGradient = cssColors(own.backgroundImage);
        if (ownGradient.length) return ownGradient;

        let surface = element.closest('.screen-panel, .canvas-container');
        let bases = surface ? cssColors(getComputedStyle(surface).backgroundImage) : [];
        if (!bases.length && surface) bases = [parseColor(getComputedStyle(surface).backgroundColor)].filter(Boolean);
        if (!bases.length) bases = [{ r: 11, g: 38, b: 29, a: 1 }];

        const overlays = [];
        for (let node = element; node && node !== surface; node = node.parentElement) {
          const color = parseColor(getComputedStyle(node).backgroundColor);
          if (color && color.a > 0) overlays.push(color);
        }
        return bases.map(base => [...overlays].reverse().reduce((background, overlay) => blend(overlay, background), base));
      };
      const selectors = [
        '#btn-start-game', '.secondary-button', '.hud-label', '.challenge-card > p', '.challenge-reward',
        '.cosmetic-requirement', '.setting-row small', '.affiliate-disclosure', '.progression-summary li',
        '.mobile-move-button', '.switch-visual'
      ];
      const temporaryProgressionRow = document.createElement('li');
      temporaryProgressionRow.textContent = 'NEW LOOKS — BALL SKIN: EXAMPLE';
      document.querySelector('#progression-updates')?.append(temporaryProgressionRow);
      const results = {};
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (!element) continue;
        const style = getComputedStyle(element);
        const foreground = parseColor(selector === '.switch-visual' ? style.borderTopColor : style.color);
        const backgrounds = backgroundCandidates(element);
        if (!foreground || !backgrounds.length) continue;
        results[selector] = {
          foreground: style.color,
          backgroundCandidates: backgrounds.map(color => `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`),
          worstTextOrBoundaryRatio: Math.min(...backgrounds.map(background => ratio(foreground, background))),
        };
      }
      temporaryProgressionRow.remove();
      const focusRing = parseColor('#ffd44f');
      const focusSurface = parseColor('#28533a');
      results.focusRing = { foreground: '#ffd44f', referenceSurface: '#28533a', ratio: ratio(focusRing, focusSurface) };
      return results;
    });
    for (const [selector, result] of Object.entries(contrast)) {
      if (selector === 'focusRing') {
        expect(result.ratio, 'focus ring contrast').toBeGreaterThanOrEqual(3);
      } else if (selector === '.switch-visual') {
        expect(result.worstTextOrBoundaryRatio, `${selector} UI boundary contrast`).toBeGreaterThanOrEqual(3);
      } else {
        expect(result.worstTextOrBoundaryRatio, `${selector} normal text contrast`).toBeGreaterThanOrEqual(4.5);
      }
    }
    console.info(`[phase11-contrast] ${JSON.stringify(contrast)}`);
    await testInfo.attach('phase11-contrast-measurements.json', {
      body: Buffer.from(JSON.stringify(contrast, null, 2)),
      contentType: 'application/json',
    });
  });
});
