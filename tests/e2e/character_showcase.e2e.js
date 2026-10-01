import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { attachBrowserHealth, monitorBrowserHealth } from './browser-health.js';

const baselineGameplayPath = fileURLToPath(new URL('./fixtures/phase-3-baseline-gameplay.png', import.meta.url));

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

for (const character of ['player', 'kevin']) {
  test(`${character} production renderer has a deterministic pose/expression sheet`, async ({ page }, testInfo) => {
    await page.goto(`/?character-showcase=${character}`);
    await expect(page.locator('body')).toHaveAttribute('data-character-showcase', character);
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveJSProperty('width', 960);
    await expect(canvas).toHaveJSProperty('height', 540);
    const palettePixels = await canvas.evaluate((element, color) => {
      const [red, green, blue] = color.match(/[0-9a-f]{2}/gi).map((part) => Number.parseInt(part, 16));
      const pixels = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
      let matches = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === red && pixels[index + 1] === green && pixels[index + 2] === blue) matches += 1;
      }
      return matches;
    }, character === 'player' ? '#E85F5C' : '#55465F');
    expect(palettePixels, `${character} artwork should be visible in its sheet`).toBeGreaterThan(100);
    await testInfo.attach(`phase-3-${character}-character-sheet.png`, {
      body: await canvas.screenshot(),
      contentType: 'image/png',
    });
  });
}

test('normal gameplay has readable characters and preserves a baseline comparison', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#title-screen')).toHaveClass(/\bhidden\b/);
  await page.waitForTimeout(250);
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();

  await testInfo.attach('phase-3-baseline-gameplay.png', {
    body: await readFile(baselineGameplayPath),
    contentType: 'image/png',
  });
  await testInfo.attach('phase-3-live-gameplay.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
