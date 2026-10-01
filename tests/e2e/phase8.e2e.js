import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('Phase 8 audio paths, cleanup, mute and VideoGen referral are diagnosable', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
  await page.waitForFunction(() => {
    const audio = window.__BACKYARD_TEST_ENGINE__?.getAudioDiagnostics()?.audio;
    return audio?.initialized && audio.musicPlaying;
  });

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.handlePointerDown(500, 200));
  await page.waitForFunction(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio.chargeVoiceActive, null, { timeout: 5000 });
  const chargeStarted = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio);
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.handlePointerCancel());
  const chargeCancelled = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio);
  expect(chargeStarted.chargeVoiceActive).toBe(true);
  expect(chargeCancelled.chargeVoiceActive).toBe(false);

  const lifecycle = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const publish = (type, payload = {}) => engine.emitGameplayEvent(type, payload, {
      x: engine.camera.x + engine.width * 0.85,
      y: engine.player.y - 40,
      direction: 1
    });

    publish('BALL_CONTACT', { contactType: 'KICK', combo: 2, score: 20 });
    publish('BALL_CONTACT', { contactType: 'HEADER', combo: 3, score: 30 });
    publish('BALL_CONTACT', { contactType: 'KICK', perfectStrike: true, combo: 4, score: 80 });
    publish('BALL_CONTACT', { contactType: 'POWER_SHOT', footballContactType: 'KICK', combo: 5, score: 50 });
    publish('POWER_SHOT', { charge: 0.85, combo: 5, score: 50 });
    publish('BLOCK');
    publish('PARRY');
    publish('PERFECT_PARRY');
    for (const material of ['GLASS', 'CERAMIC', 'WOOD', 'METAL', 'PLASTIC', 'FABRIC', 'SOIL']) {
      publish('OBJECT_DESTROYED', { material, objectName: `destructible_${material.toLowerCase()}`, score: 100 });
    }
    publish('OBJECT_DESTROYED', { material: 'METAL', objectName: 'destructible_grill', score: 100 });
    publish('OBJECT_DESTROYED', { material: 'CERAMIC', objectName: 'destructible_gnome', score: 100 });
    publish('KEVIN_HIT', { score: 500, combo: 3 });
    publish('KEVIN_HIT', { score: 1000, combo: 4, source: 'PARRIED_PROJECTILE' });
    publish('PLAYER_DAMAGED', { health: 2, damage: 1 });
    publish('TRICK_CHAIN_COMPLETED', { score: 1000, combo: 4 });
    const current = engine.kevinDirector.state;
    publish('KEVIN_ESCALATION_CHANGED', { previous: current, current: 'ANGRY' });
    publish('KEVIN_ESCALATION_CHANGED', { previous: 'ANGRY', current: 'FURIOUS' });
    publish('KEVIN_ESCALATION_CHANGED', { previous: 'FURIOUS', current: 'RAMPAGE' });

    // Use the real Havoc meter to reach and leave its active state.
    for (let i = 0; i < 13 && !engine.havocSystem.active; i++) {
      publish('OBJECT_DESTROYED', { material: 'WOOD', objectName: 'audio-diagnostic-prop' });
    }
    const ended = engine.havocSystem.update(6);
    for (const event of ended) engine.publishGameplayEvent(event);
    const activity = engine.getAudioDiagnostics();

    publish('PERFECT_PARRY');
    engine.setPageVisibility(false);
    const hidden = engine.getAudioDiagnostics().audio;
    engine.setPageVisibility(true);
    return { hidden, resumed: engine.getAudioDiagnostics().audio, activity };
  });

  await page.keyboard.press('KeyM');
  const muted = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio);
  expect(muted.muted).toBe(true);
  await page.keyboard.press('KeyM');
  const unmuted = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics().audio);
  expect(unmuted.muted).toBe(false);

  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.resetEnvironment());
  const reset = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics());
  expect(reset.audio).toMatchObject({ musicPlaying: false, chargeVoiceActive: false, activeSfxVoices: 0, musicDuck: 1 });
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
  const affiliate = await page.evaluate(() => {
    const placement = document.querySelector('#affiliate-placement');
    const anchor = placement?.querySelector('a');
    const disclosure = placement?.querySelector('.affiliate-disclosure');
    return {
      placement: 'game-over',
      enabled: Boolean(anchor && !placement.hidden),
      href: anchor?.href || null,
      disclosureVisible: Boolean(disclosure && disclosure.textContent.includes('Affiliate link')),
      gameplayImpact: null
    };
  });
  expect(affiliate).toEqual({
    placement: 'game-over',
    enabled: true,
    href: 'https://videogen.io/ai-video-generator?fp_ref=amey-ff39df',
    disclosureVisible: true,
    gameplayImpact: null
  });

  const affiliateGameplayBefore = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return {
      score: engine.score,
      combo: engine.combo,
      health: engine.player.health,
      ballPosition: { x: engine.ball.position.x, y: engine.ball.position.y },
      ballVelocity: { x: engine.ball.velocity.x, y: engine.ball.velocity.y },
      kevinRage: engine.kevinDirector.rage,
      kevinState: engine.kevinDirector.state,
      havoc: engine.havocSystem.getSnapshot(),
      destroyedProps: engine.proceduralWorld.totalPropsSmashed
    };
  });
  await page.context().route('https://videogen.io/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>VideoGen test destination</title><p>Local link safety stub</p>'
  }));
  const [affiliatePopup] = await Promise.all([
    page.waitForEvent('popup'),
    page.locator('#affiliate-placement a').click()
  ]);
  await affiliatePopup.waitForLoadState();
  const affiliateGameplayAfter = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return {
      score: engine.score,
      combo: engine.combo,
      health: engine.player.health,
      ballPosition: { x: engine.ball.position.x, y: engine.ball.position.y },
      ballVelocity: { x: engine.ball.velocity.x, y: engine.ball.velocity.y },
      kevinRage: engine.kevinDirector.rage,
      kevinState: engine.kevinDirector.state,
      havoc: engine.havocSystem.getSnapshot(),
      destroyedProps: engine.proceduralWorld.totalPropsSmashed
    };
  });
  affiliate.gameplayImpact = JSON.stringify(affiliateGameplayBefore) !== JSON.stringify(affiliateGameplayAfter);
  expect(affiliateGameplayAfter).toEqual(affiliateGameplayBefore);
  expect(affiliate.gameplayImpact).toBe(false);
  await affiliatePopup.close();

  const diagnostics = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.getAudioDiagnostics());
  const evidence = {
    phase: 'Phase 8 audio diagnostics',
    audioEventsAndCues: lifecycle.activity.director,
    musicIntensityTransitions: lifecycle.activity.audio.musicTransitions,
    charge: {
      started: chargeStarted.chargeVoiceActive,
      cancelled: !chargeCancelled.chargeVoiceActive,
      cleanupAfterReset: !diagnostics.audio.chargeVoiceActive
    },
    duckCleanupOnVisibilityLoss: {
      passed: lifecycle.hidden.musicDuck === 1 && !lifecycle.hidden.musicPlaying,
      hiddenSnapshot: lifecycle.hidden
    },
    visibilityResume: { musicPlaying: lifecycle.resumed.musicPlaying },
    mute: { muted: muted.muted, unmuted: !unmuted.muted },
    cleanupAfterReset: reset.audio,
    affiliate,
    finalAudioSnapshot: diagnostics.audio
  };
  expect(lifecycle.hidden.musicDuck).toBe(1);
  expect(lifecycle.hidden.musicPlaying).toBe(false);
  expect(lifecycle.activity.audio.audioFailures).toBe(0);
  expect(diagnostics.audio.audioFailures).toBe(0);
  evidence.visibilityCleanup = {
    passed: lifecycle.hidden.musicDuck === 1 && !lifecycle.hidden.chargeVoiceActive,
    musicResumedForGameplay: lifecycle.resumed.musicPlaying
  };
  const diagnosticPath = testInfo.outputPath('phase8-audio-diagnostics.json');
  await mkdir(dirname(diagnosticPath), { recursive: true });
  const diagnosticBody = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(diagnosticPath, diagnosticBody);
  await testInfo.attach('phase8-audio-diagnostics.json', {
    path: diagnosticPath,
    contentType: 'application/json'
  });
  await attachScreenshot(testInfo, page, 'phase8-results-affiliate-audio-evidence.png');

  expect(lifecycle.activity.director.cues).toMatchObject({
    normalKick: expect.any(Number),
    header: expect.any(Number),
    perfectStrike: expect.any(Number),
    powerShot: expect.any(Number),
    block: expect.any(Number),
    parry: expect.any(Number),
    perfectParry: expect.any(Number),
    materialBreak: expect.any(Number),
    havocStart: expect.any(Number),
    havocEnd: expect.any(Number)
  });
  expect(lifecycle.activity.audio.musicTransitions.some(transition => transition.state === 'HAVOC')).toBe(true);
});
