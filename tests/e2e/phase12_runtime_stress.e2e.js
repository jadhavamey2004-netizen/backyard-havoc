import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachJsonEvidence, monitorBrowserHealth } from './browser-health.js';
import { AUDIO_MIX_TUNING } from '../../src/audio_mix.js';
import { MAX_ACTIVE_FRAGMENTS } from '../../src/destruction_system.js';
import { VFX_LIMITS } from '../../src/particles.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

test('Phase 12 repeats 20 production lifecycle cycles and records bounded release resources', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.__phase12ListenerRegistrations = [];
    const addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      const target = this === window ? 'window' : this === document ? 'document' : this?.id ? `#${this.id}` : '';
      if (target) window.__phase12ListenerRegistrations.push({ target, type });
      return addEventListener.call(this, type, listener, options);
    };

    window.__phase12AudioContextCreations = 0;
    window.__phase12AudioContextInstrumentation = false;
    for (const name of ['AudioContext', 'webkitAudioContext']) {
      const NativeContext = window[name];
      if (typeof NativeContext !== 'function') continue;
      try {
        Object.defineProperty(window, name, {
          configurable: true,
          writable: true,
          value: new Proxy(NativeContext, {
            construct(target, args, newTarget) {
              window.__phase12AudioContextCreations += 1;
              return Reflect.construct(target, args, newTarget);
            }
          })
        });
        window.__phase12AudioContextInstrumentation = true;
      } catch (_) {
        // Keep the browser API intact if its descriptor cannot be wrapped.
      }
    }
  });

  await page.goto('/');
  const engineReady = await page.evaluate(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
  expect(engineReady).toBe(true);
  const listenersAtBoot = await page.evaluate(() => window.__phase12ListenerRegistrations.length);
  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const original = engine.onGameOverCallback;
    window.__phase12GameOverCallbackCount = 0;
    engine.onGameOverCallback = stats => {
      window.__phase12GameOverCallbackCount += 1;
      original(stats);
    };

    window.__phase12DialogueDeliveryCount = 0;
    const originalShowDialogue = engine.npc.showDialogue.bind(engine.npc);
    engine.npc.showDialogue = (...args) => {
      window.__phase12DialogueDeliveryCount += 1;
      return originalShowDialogue(...args);
    };
  });

  const cyclePeaks = {
    activeChunks: 0,
    worldBodies: 0,
    activeShards: 0,
    thrownProjectiles: 0,
    particles: 0,
    activeSfxVoices: 0
  };
  const postCycleListenerCounts = [];
  const cycleSamples = [];

  for (let cycle = 0; cycle < 20; cycle += 1) {
    await page.locator('#btn-start-game').click();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
    await expect(page.locator('#game-canvas')).toBeFocused();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');

    const startX = await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x);
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.keys.right)).toBe(true);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.x)).toBeGreaterThan(startX);

    const bounds = await page.locator('#game-canvas').boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.45);
    await page.mouse.down();
    const chargingCycle = cycle % 5 === 0;
    await page.waitForTimeout(chargingCycle ? 470 : 35);
    if (chargingCycle) {
      await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.player.powerCharging)).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      return {
        pointerDown: engine.isPointerDown,
        powerCharging: engine.player.powerCharging,
        powerCharge: engine.player.powerCharge,
        left: engine.player.keys.left,
        right: engine.player.keys.right,
        sprint: engine.player.keys.sprint
      };
    })).toEqual({ pointerDown: false, powerCharging: false, powerCharge: 0, left: false, right: false, sprint: false });
    await page.keyboard.up('ArrowRight');
    await page.locator('#btn-resume').click();
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.isPaused)).toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await page.locator('#btn-restart-paused').click();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await page.locator('#btn-main-menu').click();
    await expect(page.locator('#title-screen')).toBeVisible();

    await page.locator('#btn-start-game').click();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('INTRO_CUTSCENE');
    await page.keyboard.press('Space');
    await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());
    await expect(page.locator('#gameover-modal')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__phase12GameOverCallbackCount)).toBe(cycle + 1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('backyard_meta_profile')).lifetimeStats.runsCompleted))
      .toBe(cycle + 1);
    await page.locator('#btn-restart-run').click();
    await expect(page.locator('#screen-overlay')).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeFocused();
    await expect(page.locator('#progression-summary')).toBeHidden();
    await expect(page.locator('#affiliate-placement')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');

    const sample = await page.evaluate(() => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      const audio = engine.getAudioDiagnostics().audio;
      return {
        activeChunks: engine.proceduralWorld.activeChunks.size,
        worldBodies: engine.world.bodies.length,
        activeShards: engine.activeShards.length,
        thrownProjectiles: engine.thrownProjectiles.length,
        particles: engine.particles.particles.length,
        activeSfxVoices: audio.activeSfxVoices,
        audioFailures: audio.audioFailures,
        chargeVoiceActive: audio.chargeVoiceActive,
        musicDuck: audio.musicDuck,
        inputReleased: !engine.isPointerDown && !engine.player.keys.left && !engine.player.keys.right && !engine.player.keys.sprint
      };
    });
    cyclePeaks.activeChunks = Math.max(cyclePeaks.activeChunks, sample.activeChunks);
    cyclePeaks.worldBodies = Math.max(cyclePeaks.worldBodies, sample.worldBodies);
    cyclePeaks.activeShards = Math.max(cyclePeaks.activeShards, sample.activeShards);
    cyclePeaks.thrownProjectiles = Math.max(cyclePeaks.thrownProjectiles, sample.thrownProjectiles);
    cyclePeaks.particles = Math.max(cyclePeaks.particles, sample.particles);
    cyclePeaks.activeSfxVoices = Math.max(cyclePeaks.activeSfxVoices, sample.activeSfxVoices);
    cycleSamples.push(sample);
    expect(sample.audioFailures).toBe(0);
    expect(sample.activeSfxVoices).toBeLessThanOrEqual(AUDIO_MIX_TUNING.SFX_POLYPHONY_LIMIT);
    expect(sample.chargeVoiceActive).toBe(false);
    expect(sample.musicDuck).toBe(1);
    expect(sample.inputReleased).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await page.locator('#btn-main-menu').click();
    await expect(page.locator('#title-screen')).toBeVisible();
    postCycleListenerCounts.push(await page.evaluate(() => window.__phase12ListenerRegistrations.length));
  }

  const lifecycleSnapshot = await page.evaluate(() => ({
    gameOverCallbacks: window.__phase12GameOverCallbackCount,
    registeredListeners: window.__phase12ListenerRegistrations.length,
    audioContextCreations: window.__phase12AudioContextCreations,
    audioContextInstrumentationAvailable: window.__phase12AudioContextInstrumentation,
    dialogueDeliveries: window.__phase12DialogueDeliveryCount,
    playerKeys: { ...window.__BACKYARD_TEST_ENGINE__.player.keys },
    pointerDown: window.__BACKYARD_TEST_ENGINE__.isPointerDown,
    runCount: JSON.parse(localStorage.getItem('backyard_meta_profile')).lifetimeStats.runsCompleted
  }));
  expect(lifecycleSnapshot.gameOverCallbacks).toBe(20);
  expect(new Set(postCycleListenerCounts.slice(1)).size).toBe(1);
  expect(new Set(cycleSamples.map(sample => sample.worldBodies)).size).toBe(1);
  expect(new Set(cycleSamples.map(sample => sample.activeChunks)).size).toBe(1);
  if (lifecycleSnapshot.audioContextInstrumentationAvailable) {
    expect(lifecycleSnapshot.audioContextCreations).toBeLessThanOrEqual(1);
  }
  expect(lifecycleSnapshot.playerKeys).toMatchObject({ left: false, right: false, sprint: false, charge: false });
  expect(lifecycleSnapshot.pointerDown).toBe(false);

  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.gameState)).toBe('PLAYING');
  await page.keyboard.down('ArrowRight');
  const performanceEvidence = await page.evaluate(async () => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const getSnapshot = () => ({
      worldBodies: engine.world.bodies.length,
      activeChunks: engine.proceduralWorld.activeChunks.size,
      particles: engine.particles.particles.length,
      activeShards: engine.activeShards.length,
      thrownProjectiles: engine.thrownProjectiles.length,
      activeSfxVoices: engine.getAudioDiagnostics().audio.activeSfxVoices,
      vfxBuffers: {
        popTexts: engine.particles.popTexts.length,
        shockwaves: engine.particles.shockwaves.length,
        speedLines: engine.particles.speedLines.length,
        lightningArcs: engine.particles.lightningArcs.length,
        trailPoints: engine.particles.trailPoints.length,
        impactRings: engine.particles.impactRings.length,
        vignettes: engine.particles.vignettes.length,
        powerBeams: engine.particles.powerBeams.length
      },
      canvasBacking: {
        width: engine.canvas.width,
        height: engine.canvas.height
      }
    });
    const initial = getSnapshot();
    const phaseCoverage = { ordinary: false, destruction: false, havoc: false, projectiles: false };
    const intervals = [];
    const peak = { ...initial, vfxBuffers: { ...initial.vfxBuffers } };
    const start = performance.now();
    let previousFrame = null;
    let frameCount = 0;

    await new Promise(resolve => {
      const sampleFrame = timestamp => {
        if (previousFrame !== null) intervals.push(timestamp - previousFrame);
        previousFrame = timestamp;
        frameCount += 1;
        const elapsed = timestamp - start;
        if (elapsed < 900) phaseCoverage.ordinary = true;

        if (elapsed >= 900 && elapsed < 2200 && frameCount % 8 === 0) {
          const target = engine.proceduralWorld.getAllActiveProps()
            .find(body => body.isDestructible && !body.isDestroyed);
          if (target) {
            engine.ball.velocity.x = 7;
            engine.ball.velocity.y = -4;
            engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
            phaseCoverage.destruction = true;
          }
        }

        if (elapsed >= 2200 && !phaseCoverage.havoc) {
          for (let index = 0; index < 20 && !engine.havocSystem.active; index += 1) {
            engine.emitGameplayEvent('OBJECT_DESTROYED', {
              score: 1,
              combo: 1,
              material: 'WOOD',
              propKey: `phase12-performance-${index}`
            });
          }
          phaseCoverage.havoc = engine.havocSystem.active;
        }

        if ((elapsed >= 3000 && elapsed < 3400 || elapsed >= 3700 && elapsed < 4100)
          && frameCount % 8 === 0 && engine.npc.onThrowCallback) {
          engine.npc.onThrowCallback({
            x: engine.npc.x,
            y: engine.npc.y,
            targetX: engine.player.x
          });
          phaseCoverage.projectiles = true;
        }

        const current = getSnapshot();
        peak.worldBodies = Math.max(peak.worldBodies, current.worldBodies);
        peak.activeChunks = Math.max(peak.activeChunks, current.activeChunks);
        peak.particles = Math.max(peak.particles, current.particles);
        peak.activeShards = Math.max(peak.activeShards, current.activeShards);
        peak.thrownProjectiles = Math.max(peak.thrownProjectiles, current.thrownProjectiles);
        peak.activeSfxVoices = Math.max(peak.activeSfxVoices, current.activeSfxVoices);
        for (const name of Object.keys(current.vfxBuffers)) {
          peak.vfxBuffers[name] = Math.max(peak.vfxBuffers[name], current.vfxBuffers[name]);
        }

        if (elapsed >= 4500) resolve();
        else requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);
    });

    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const percentile = ratio => sortedIntervals.length
      ? sortedIntervals[Math.min(sortedIntervals.length - 1, Math.floor((sortedIntervals.length - 1) * ratio))]
      : null;
    return {
      sampleDurationMs: Math.round(performance.now() - start),
      frameCount,
      frameIntervalsMs: intervals.map(value => Number(value.toFixed(2))),
      intervalSummaryMs: {
        median: percentile(0.5),
        p95: percentile(0.95),
        maximum: sortedIntervals.at(-1) ?? null
      },
      initial,
      peak,
      phaseCoverage,
      audio: engine.getAudioDiagnostics().audio
    };
  });
  await page.keyboard.up('ArrowRight');
  expect(performanceEvidence.phaseCoverage).toEqual({ ordinary: true, destruction: true, havoc: true, projectiles: true });
  expect(performanceEvidence.peak.activeShards).toBeLessThanOrEqual(MAX_ACTIVE_FRAGMENTS);
  expect(performanceEvidence.peak.activeSfxVoices).toBeLessThanOrEqual(AUDIO_MIX_TUNING.SFX_POLYPHONY_LIMIT);
  for (const [name, size] of Object.entries(performanceEvidence.peak.vfxBuffers)) {
    expect(size, `${name} exceeded its production cap during the frame sample`)
      .toBeLessThanOrEqual(VFX_LIMITS[name]);
  }
  await attachJsonEvidence(testInfo, 'phase12-performance-sanity.json', performanceEvidence);

  const resourceEvidence = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const resourceSnapshot = () => ({
      activeChunks: engine.proceduralWorld.activeChunks.size,
      worldBodies: engine.world.bodies.length,
      chunkBodies: engine.world.bodies.filter(body => body.chunkKey).length,
      destroyedHistory: engine.proceduralWorld.destroyedPropKeys.size,
      clearedHistory: engine.proceduralWorld.clearedChunkKeys.size,
      activeShards: engine.activeShards.length,
      thrownProjectiles: engine.thrownProjectiles.length,
      activeResidues: engine.proceduralWorld.getActiveResidues().length,
      particles: engine.particles.particles.length,
      vfxBuffers: {
        popTexts: engine.particles.popTexts.length,
        shockwaves: engine.particles.shockwaves.length,
        speedLines: engine.particles.speedLines.length,
        lightningArcs: engine.particles.lightningArcs.length,
        trailPoints: engine.particles.trailPoints.length,
        impactRings: engine.particles.impactRings.length,
        vignettes: engine.particles.vignettes.length,
        powerBeams: engine.particles.powerBeams.length
      },
      audio: engine.getAudioDiagnostics().audio
    });

    engine.resetEnvironment();
    const before = resourceSnapshot();
    const world = engine.proceduralWorld;
    const explored = 240;
    const marked = new Set();
    const historySamples = [];
    let peak = { ...before, activeChunks: 0, worldBodies: 0, chunkBodies: 0, destroyedHistory: 0, clearedHistory: 0 };
    let maxBodiesInOneChunk = 0;
    let identityInvariant = true;

    for (let index = 0; index < explored; index += 1) {
      world.updateActiveChunks(index * world.chunkSize + world.chunkSize / 2);
      const chunk = world.activeChunks.get(index);
      const keys = index % 5 === 0 ? chunk.eligiblePropKeys : chunk.eligiblePropKeys.slice(0, 1);
      for (const propKey of keys) {
        if (world.markPropDestroyed(propKey)) marked.add(propKey);
      }
      world.checkChunkClearStates();

      const expected = [...world.activeChunks.values()].flatMap(activeChunk => activeChunk.props);
      const actual = engine.world.bodies.filter(body => body.chunkKey);
      const expectedIds = expected.map(body => body.id).sort((a, b) => a - b);
      const actualIds = actual.map(body => body.id).sort((a, b) => a - b);
      identityInvariant &&= new Set(actualIds).size === actualIds.length
        && expectedIds.length === actualIds.length
        && expectedIds.every((id, idIndex) => id === actualIds[idIndex]);
      maxBodiesInOneChunk = Math.max(maxBodiesInOneChunk,
        ...[...world.activeChunks.values()].map(activeChunk => activeChunk.props.length));
      const current = resourceSnapshot();
      for (const key of ['activeChunks', 'worldBodies', 'chunkBodies', 'destroyedHistory', 'clearedHistory']) {
        peak[key] = Math.max(peak[key] || 0, current[key]);
      }
      historySamples.push({
        exploredChunks: index + 1,
        destroyedHistory: current.destroyedHistory,
        clearedHistory: current.clearedHistory
      });
    }

    const historyLinear = world.destroyedPropKeys.size === marked.size
      && historySamples[239].destroyedHistory === historySamples[119].destroyedHistory * 2
      && historySamples[239].clearedHistory === historySamples[119].clearedHistory * 2;
    const chunkCapacity = (2 * 1 + 1) + (2 - 1);
    const bodyPlateau = peak.activeChunks <= chunkCapacity && peak.chunkBodies <= chunkCapacity * maxBodiesInOneChunk;

    engine.resetEnvironment();
    const afterReset = resourceSnapshot();
    return {
      runCycles: 20,
      before,
      peak,
      afterReset,
      worldStress: {
        chunksTraversed: explored,
        uniqueDestroyedKeys: marked.size,
        destroyedHistorySamples: [historySamples[59], historySamples[119], historySamples[239]],
        maxBodiesInOneChunk,
        streamingChunkCapacity: chunkCapacity,
        historyLinear,
        bodyPlateau,
        noDuplicateOrUnloadedChunkBodies: identityInvariant
      },
      lifecycle: {
        gameOverCallbacks: window.__phase12GameOverCallbackCount,
        uiListenerCountAtBoot: window.__phase12ListenerRegistrations.length,
        uiListenerCountAtEnd: window.__phase12ListenerRegistrations.length,
        audioContextCreations: window.__phase12AudioContextCreations,
        audioContextInstrumentationAvailable: window.__phase12AudioContextInstrumentation,
        dialogueDeliveries: window.__phase12DialogueDeliveryCount
      }
    };
  });

  resourceEvidence.lifecycle.uiListenerCountAtBoot = listenersAtBoot;
  resourceEvidence.lifecycle.uiListenerCountAfterEachCycle = postCycleListenerCounts;
  resourceEvidence.lifecycle.cycleResourcePeaks = cyclePeaks;
  resourceEvidence.lifecycle.cycleSamples = cycleSamples;
  expect(resourceEvidence.worldStress.historyLinear).toBe(true);
  expect(resourceEvidence.worldStress.bodyPlateau).toBe(true);
  expect(resourceEvidence.worldStress.noDuplicateOrUnloadedChunkBodies).toBe(true);
  expect(resourceEvidence.afterReset.destroyedHistory).toBe(0);
  expect(resourceEvidence.afterReset.clearedHistory).toBe(0);
  expect(resourceEvidence.afterReset.activeShards).toBe(0);
  expect(resourceEvidence.afterReset.thrownProjectiles).toBe(0);
  await attachJsonEvidence(testInfo, 'phase12-release-resource-stress.json', resourceEvidence);

  const aiLifecycle = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    Math.random = () => 0;
    const dispatchNearbyDestruction = () => {
      const target = engine.proceduralWorld.activeChunks.get(0)?.props
        .find(body => body.material === 'GLASS' && body.label === 'destructible_greenhouse');
      if (!target) throw new Error('Expected a nearby greenhouse glass prop for the dialogue lifecycle probe.');
      // After the long-run traversal sample, place this real prop at Kevin's
      // current world position so the production collision's proximity gate is deterministic.
      target.position.x = engine.npc.x;
      target.position.y = engine.npc.y;
      engine.ball.velocity.x = 8;
      engine.ball.velocity.y = -2;
      engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
    };

    engine.resetEnvironment();
    engine.startIntroCutscene();
    dispatchNearbyDestruction();
    engine.resetEnvironment();
    engine.startIntroCutscene();
    return { expectedNewSessionDialogue: engine.npc.dialogue };
  });
  await page.waitForTimeout(100);
  const oldCallback = await page.evaluate(() => ({
    stillNewSessionDialogue: window.__BACKYARD_TEST_ENGINE__.npc.dialogue,
    deliveries: window.__phase12DialogueDeliveryCount
  }));
  expect(oldCallback.stillNewSessionDialogue).toBe(aiLifecycle.expectedNewSessionDialogue);
  expect(oldCallback.deliveries).toBe(0);

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    Math.random = () => 0;
    const target = engine.proceduralWorld.activeChunks.get(0)?.props
      .find(body => body.material === 'GLASS' && body.label === 'destructible_greenhouse');
    target.position.x = engine.npc.x;
    target.position.y = engine.npc.y;
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
  });
  await expect.poll(() => page.evaluate(() => window.__phase12DialogueDeliveryCount)).toBe(1);
  const newCallback = await page.evaluate(() => ({
    deliveredDialogue: window.__BACKYARD_TEST_ENGINE__.npc.dialogue,
    deliveries: window.__phase12DialogueDeliveryCount
  }));
  expect(newCallback.deliveredDialogue).toEqual(expect.any(String));
  expect(newCallback.deliveredDialogue.length).toBeGreaterThan(0);
  expect(newCallback.deliveries).toBe(1);

  await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    Math.random = () => 0;
    engine.resetEnvironment();
    engine.startIntroCutscene();
    const target = engine.proceduralWorld.activeChunks.get(0)?.props
      .find(body => body.material === 'GLASS' && body.label === 'destructible_greenhouse');
    target.position.x = engine.npc.x;
    target.position.y = engine.npc.y;
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
  });
  await expect.poll(() => page.evaluate(() => window.__phase12DialogueDeliveryCount)).toBe(2);
  const afterFreshRun = await page.evaluate(() => ({
    deliveries: window.__phase12DialogueDeliveryCount,
    deliveredDialogue: window.__BACKYARD_TEST_ENGINE__.npc.dialogue
  }));
  expect(afterFreshRun.deliveries).toBe(2);
  expect(afterFreshRun.deliveredDialogue).toEqual(expect.any(String));
  expect(afterFreshRun.deliveredDialogue.length).toBeGreaterThan(0);
  await attachJsonEvidence(testInfo, 'phase12-async-lifecycle.json', {
    oldSessionCallbacksAfterReset: oldCallback.deliveries,
    newSessionCallbackWorks: newCallback.deliveries === 1,
    staleRateLimitCarriedAcrossReset: afterFreshRun.deliveries !== 2,
    observedDialogueDeliveries: [oldCallback.deliveries, newCallback.deliveries, afterFreshRun.deliveries]
  });
});
