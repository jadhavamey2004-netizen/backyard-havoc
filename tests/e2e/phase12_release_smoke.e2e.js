import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachJsonEvidence, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

const VIDEO_GEN_URL = 'https://videogen.io/ai-video-generator?fp_ref=amey-ff39df';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('release smoke boots menus, starts an intro, accepts keyboard and pointer input, and resumes cleanly', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Backyard Havoc/i);
  await expect(page.locator('#title-screen')).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.locator('#btn-title-settings').click();
  await expect(page.locator('#settings-screen')).toBeVisible();
  await page.locator('#btn-settings-back').click();
  await page.locator('#btn-title-garage').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
  await page.locator('#btn-garage-back').click();
  await page.locator('#btn-title-challenges').click();
  await expect(page.locator('#challenges-screen')).toBeVisible();
  await expect(page.locator('#challenge-list [data-challenge-id]')).toHaveCount(9);
  await page.locator('#btn-challenges-back').click();

  await page.locator('#btn-start-game').click();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
  await expect(page.locator('#game-canvas')).toBeFocused();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');

  const startX = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x);
  await page.keyboard.down('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x))
    .toBeGreaterThan(startX);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(false);

  const canvas = page.locator('#game-canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.42);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(true);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPointerDown)).toBe(false);

  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-screen')).toBeVisible();
  await page.locator('#btn-resume').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(canvas).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);
  await attachScreenshot(testInfo, page, 'phase12-release-playing.png');
});

test('release smoke preserves local progression and the Results-only affiliate contract', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const initialProfile = await page.evaluate(() => window.__BACKYARD_TEST_META__.getProfile());
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  const affiliate = page.locator('#affiliate-placement a');
  await expect(affiliate).toBeVisible();
  await expect(affiliate).toHaveAttribute('href', VIDEO_GEN_URL);
  await expect(affiliate).toHaveAttribute('target', '_blank');
  await expect(affiliate).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  await expect(affiliate).toHaveAttribute('referrerpolicy', 'no-referrer');
  const affiliateHeight = await affiliate.evaluate(element => element.getBoundingClientRect().height);
  expect(affiliateHeight).toBeGreaterThanOrEqual(48);

  const savedRuns = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('backyard_meta_profile'));
    return profile.lifetimeStats.runsCompleted;
  });
  expect(savedRuns).toBe(1);

  await page.evaluate(() => {
    localStorage.setItem('backyard_high_score', '98765');
    localStorage.setItem('backyard_best_combo', '37');
    localStorage.setItem('backyard_muted', 'true');
    localStorage.setItem('backyard_reduced_motion', 'false');
  });
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('backyard_meta_profile')).lifetimeStats.runsCompleted))
    .toBe(savedRuns);

  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  await expect(page.locator('#gameover-modal')).toBeVisible();
  await page.locator('#btn-restart-run').click();
  await expect(page.locator('#screen-overlay')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeFocused();
  await expect(page.locator('#affiliate-placement')).toBeHidden();
  await expect(page.locator('#progression-summary')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left)).toBe(true);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.left)).toBe(false);

  const afterPlayAgain = await page.evaluate(() => window.__BACKYARD_TEST_META__.getProfile());
  await page.evaluate(() => { localStorage.setItem('backyard_meta_profile', '{malformed'); });
  await page.reload();
  const recoveredDefault = await page.evaluate(() => window.__BACKYARD_TEST_META__.getProfile());
  const preservedLegacyKeys = await page.evaluate(() => ({
    highScore: localStorage.getItem('backyard_high_score'),
    bestCombo: localStorage.getItem('backyard_best_combo'),
    muted: localStorage.getItem('backyard_muted'),
    reducedMotion: localStorage.getItem('backyard_reduced_motion')
  }));
  expect(recoveredDefault.lifetimeStats.runsCompleted).toBe(0);
  expect(preservedLegacyKeys).toEqual({
    highScore: '98765',
    bestCombo: '37',
    muted: 'true',
    reducedMotion: 'false'
  });
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  const repairedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('backyard_meta_profile')));
  expect(repairedProfile.lifetimeStats.runsCompleted).toBe(1);
  await attachJsonEvidence(testInfo, 'phase12-persistence-stress.json', {
    initialProfile,
    afterValidRuns: { completedRunsBeforeCorruption: afterPlayAgain.lifetimeStats.runsCompleted },
    afterReload: { completedRunsPreserved: savedRuns },
    corruptProfileRecovery: {
      malformedProfileFallsBackToDefaults: recoveredDefault.lifetimeStats.runsCompleted === 0,
      unrelatedStoragePreserved: preservedLegacyKeys,
      nextCompletedRunReplacesMalformedValue: repairedProfile.lifetimeStats.runsCompleted === 1
    },
    storageUnavailable: {
      result: 'covered by existing Phase 10 Chromium scenario and Phase 10 ProfileStore unit regressions'
    },
    restartPersistence: {
      profileRunsBeforeCorruption: afterPlayAgain.lifetimeStats.runsCompleted,
      unlockedIdsUnique: new Set(afterPlayAgain.unlocked).size === afterPlayAgain.unlocked.length,
      completedChallengesUnique: new Set(afterPlayAgain.completedChallenges).size === afterPlayAgain.completedChallenges.length
    }
  });
  await attachScreenshot(testInfo, page, 'phase12-release-results-and-play-again.png');
});
