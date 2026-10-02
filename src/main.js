/** Browser entry point: input, engine lifecycle and the presentation controller. */

import { GameEngine } from './game.js';
import { sounds } from './audio.js';
import { mountAffiliateLink } from './affiliate_links.js';
import { UiController } from './ui/ui_controller.js';
import { MetaProgression } from './meta/meta_progression.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // The deterministic character sheet exists only in the dedicated E2E build.
  if (import.meta.env.MODE === 'e2e' && window.location.hostname === '127.0.0.1') {
    const showcase = new URLSearchParams(window.location.search).get('character-showcase');
    if (['player', 'kevin', 'player-kick-sequence', 'kevin-throw-sequence'].includes(showcase)) {
      document.getElementById('screen-overlay')?.classList.add('hidden');
      document.getElementById('screen-overlay')?.setAttribute('hidden', '');
      document.body.classList.add('character-showcase-test-mode');
      document.body.dataset.characterShowcase = showcase;
      const { renderCharacterShowcase } = await import('./character_showcase.js');
      renderCharacterShowcase(canvas, showcase);
      return;
    }
  }

  const engine = new GameEngine(canvas);
  const metaProgression = new MetaProgression();
  engine.setCosmeticSelection(metaProgression.getEquipped());
  const reducedMotionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotionOverride = null;
  try {
    const stored = localStorage.getItem('backyard_reduced_motion');
    if (stored === 'true' || stored === 'false') reducedMotionOverride = stored === 'true';
  } catch (_) {
    // Storage can be unavailable in a restricted browser context; OS preference still applies.
  }
  document.documentElement.classList.toggle('motion-setting-overridden', reducedMotionOverride !== null);
  const getReducedMotion = () => reducedMotionOverride ?? Boolean(reducedMotionPreference?.matches);
  const applyReducedMotion = value => {
    engine.setReducedMotion(value);
    document.documentElement.classList.toggle('reduced-motion', value);
  };
  let ui = null;
  applyReducedMotion(getReducedMotion());
  reducedMotionPreference?.addEventListener?.('change', event => {
    if (reducedMotionOverride === null) {
      applyReducedMotion(event.matches);
      ui?.syncSettings({ reducedMotion: event.matches });
    }
  });

  ui = new UiController({
    onStart: () => {
      sounds.init();
      engine.startIntroCutscene();
      metaProgression.beginRun();
      return true;
    },
    onPause: () => engine.setPaused(true),
    onResume: () => engine.setPaused(false),
    onRestart: () => {
      metaProgression.abandonRun();
      engine.resetEnvironment();
      engine.startIntroCutscene();
      sounds.resetTransientAudio();
      engine.skipOrEndIntroCutscene();
      metaProgression.beginRun();
      return true;
    },
    onMainMenu: () => {
      metaProgression.abandonRun();
      engine.resetEnvironment();
      return true;
    },
    onSetMuted: muted => {
      if (Boolean(muted) !== sounds.isMuted) sounds.toggleMute();
      return sounds.isMuted;
    },
    onSetReducedMotion: reduced => {
      reducedMotionOverride = Boolean(reduced);
      document.documentElement.classList.add('motion-setting-overridden');
      try { localStorage.setItem('backyard_reduced_motion', String(reducedMotionOverride)); } catch (_) {}
      applyReducedMotion(reducedMotionOverride);
      return reducedMotionOverride;
    },
    onShare: async () => {
      const shareText = `I smashed Kevin's windows and scored ${engine.score.toLocaleString()} points with a ${engine.peakCombo}x combo in Backyard Havoc! 🏡⚽💥 Can you beat my high score?`;
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Backyard Havoc', text: shareText });
          return 'SHARED!';
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText);
          return 'COPIED!';
        }
      } catch (_) {
        return 'SHARE CANCELLED';
      }
      return 'SHARING UNAVAILABLE';
    },
    getGarageItems: () => metaProgression.getGarageItems(),
    getChallenges: () => metaProgression.getChallenges(),
    onEquipCosmetic: (category, id) => {
      if (!metaProgression.equip(category, id)) return false;
      engine.setCosmeticSelection(metaProgression.getEquipped());
      return true;
    },
    muted: sounds.isMuted,
    reducedMotion: getReducedMotion()
  });

  const affiliatePlacement = document.getElementById('affiliate-placement');
  engine.onGameOverCallback = stats => {
    const progressionSummary = metaProgression.completeRun(stats);
    mountAffiliateLink(affiliatePlacement);
    ui.showResults(stats, progressionSummary);
  };
  engine.onGameplayEvent = event => metaProgression.handleGameplayEvent(event);

  // A deterministic engine and UI bridge exists only in the local E2E build.
  if (import.meta.env.MODE === 'e2e' && window.location.hostname === '127.0.0.1') {
    engine.particles.setSeed(0xBADC0DE);
    window.__BACKYARD_TEST_ENGINE__ = engine;
    window.__BACKYARD_TEST_UI__ = ui;
    window.__BACKYARD_TEST_META__ = metaProgression;
  }

  window.addEventListener('keydown', event => {
    if (ui.handleKeyDown(event)) return;

    const nativeSpaceActivation = event.code === 'Space' && event.target?.closest('button, summary');
    if (nativeSpaceActivation) return;

    const gameplayKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (ui.getState().screen === 'PLAYING' && gameplayKeys.includes(event.code)) event.preventDefault();

    if (event.code === 'KeyM' && !event.repeat) {
      ui.syncSettings({ muted: sounds.toggleMute() });
    }

    if (event.repeat || ui.getState().screen !== 'PLAYING') return;
    engine.handleKeyDown(event.code);
  });

  window.addEventListener('keyup', event => engine.handleKeyUp(event.code));

  const setupHighDPICanvas = () => {
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    canvas.width = 960 * dpr;
    canvas.height = 540 * dpr;
  };
  setupHighDPICanvas();
  window.addEventListener('resize', setupHighDPICanvas);

  const getCanvasCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 960 / (rect.width || 1);
    const scaleY = 540 / (rect.height || 1);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  canvas.addEventListener('mousemove', event => {
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerMove(coords.x, coords.y);
  });
  canvas.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerDown(coords.x, coords.y);
  });
  window.addEventListener('mouseup', event => {
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerUp(coords.x, coords.y);
  });
  window.addEventListener('pointercancel', () => engine.handlePointerCancel());
  window.addEventListener('blur', () => engine.handlePointerCancel());

  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    if (!event.touches.length) return;
    const touch = event.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    engine.handlePointerDown(coords.x, coords.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    if (!event.touches.length) return;
    const touch = event.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    engine.handlePointerMove(coords.x, coords.y);
  }, { passive: false });
  window.addEventListener('touchend', event => {
    if (event.changedTouches?.length) {
      const touch = event.changedTouches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      engine.handlePointerUp(coords.x, coords.y);
    } else {
      engine.handlePointerUp(engine.mouseScreenPos.x, engine.mouseScreenPos.y);
    }
  });
  window.addEventListener('touchcancel', () => engine.handlePointerCancel());

  let lastTime = performance.now();
  engine.setPageVisibility(!document.hidden);
  document.addEventListener('visibilitychange', () => {
    engine.setPageVisibility(!document.hidden);
    lastTime = performance.now();
  });

  function gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
    lastTime = currentTime;
    engine.update(dt);
    engine.render(currentTime);
    ui.updateHud({
      score: engine.score,
      combo: engine.combo,
      playerHealth: engine.player.health,
      maxHealth: engine.player.maxHealth,
      kevinState: engine.kevinDirector.state,
      havocMeter: engine.havocSystem.meter,
      havocActive: engine.havocSystem.active
    });
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
