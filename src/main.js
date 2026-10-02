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
  let releaseAllGameInput = () => {};
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
    onPause: () => {
      releaseAllGameInput();
      return engine.setPaused(true);
    },
    onResume: () => engine.setPaused(false),
    onRestart: () => {
      releaseAllGameInput();
      metaProgression.abandonRun();
      engine.resetEnvironment();
      engine.startIntroCutscene();
      sounds.resetTransientAudio();
      engine.skipOrEndIntroCutscene();
      metaProgression.beginRun();
      return true;
    },
    onMainMenu: () => {
      releaseAllGameInput();
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
    releaseAllGameInput();
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

  const heldSources = {
    left: new Set(),
    right: new Set(),
    sprint: new Set()
  };
  const movementPointers = new Map();
  let canvasActionPointerId = null;
  const movementKeyByAction = { left: 'ArrowLeft', right: 'ArrowRight', sprint: 'ShiftLeft' };
  const actionForKey = code => {
    if (code === 'KeyA' || code === 'ArrowLeft') return 'left';
    if (code === 'KeyD' || code === 'ArrowRight') return 'right';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'sprint';
    return null;
  };
  const syncMovementButtonState = action => {
    const button = document.getElementById(action === 'left' ? 'mobile-move-left' : 'mobile-move-right');
    button?.setAttribute('aria-pressed', String(heldSources[action].size > 0));
  };
  const addHeldSource = (action, source) => {
    const sources = heldSources[action];
    if (sources.has(source)) return;
    const wasHeld = sources.size > 0;
    sources.add(source);
    if (!wasHeld) engine.handleKeyDown(movementKeyByAction[action]);
    if (action !== 'sprint') syncMovementButtonState(action);
  };
  const removeHeldSource = (action, source) => {
    const sources = heldSources[action];
    if (!sources.delete(source)) return;
    if (sources.size === 0) engine.handleKeyUp(movementKeyByAction[action]);
    if (action !== 'sprint') syncMovementButtonState(action);
  };
  const releaseCanvasAction = () => {
    const pointerId = canvasActionPointerId;
    canvasActionPointerId = null;
    if (engine.isPointerDown) engine.handlePointerCancel();
    if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) {
      try { canvas.releasePointerCapture(pointerId); } catch (_) {}
    }
  };
  const releaseMovementPointer = pointerId => {
    const entry = movementPointers.get(pointerId);
    if (!entry) return;
    movementPointers.delete(pointerId);
    removeHeldSource(entry.action, `pointer:${pointerId}`);
    if (entry.element.hasPointerCapture?.(pointerId)) {
      try { entry.element.releasePointerCapture(pointerId); } catch (_) {}
    }
  };
  let nextKeyboardActivationId = 0;
  releaseAllGameInput = () => {
    const actionPointerId = canvasActionPointerId;
    const movementPointerEntries = [...movementPointers.entries()];
    canvasActionPointerId = null;
    engine.handlePointerCancel();
    if (actionPointerId !== null && canvas.hasPointerCapture?.(actionPointerId)) {
      try { canvas.releasePointerCapture(actionPointerId); } catch (_) {}
    }
    for (const [action, sources] of Object.entries(heldSources)) {
      if (sources.size > 0) {
        sources.clear();
        engine.handleKeyUp(movementKeyByAction[action]);
      }
      if (action !== 'sprint') syncMovementButtonState(action);
    }
    movementPointers.clear();
    for (const [pointerId, entry] of movementPointerEntries) {
      if (entry.element.hasPointerCapture?.(pointerId)) {
        try { entry.element.releasePointerCapture(pointerId); } catch (_) {}
      }
    }
  };

  const heldKeyCodes = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  window.addEventListener('keydown', event => {
    if (ui.handleKeyDown(event)) return;

    const nativeSpaceActivation = event.code === 'Space' && event.target?.closest('button, summary');
    if (nativeSpaceActivation) return;

    const gameplayKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight'];
    if (ui.getState().screen === 'PLAYING' && gameplayKeys.includes(event.code)) event.preventDefault();

    if (event.code === 'KeyM' && !event.repeat) {
      ui.syncSettings({ muted: sounds.toggleMute() });
    }

    if (event.repeat || ui.getState().screen !== 'PLAYING') return;
    const action = actionForKey(event.code);
    if (action) addHeldSource(action, `keyboard:${event.code}`);
    else engine.handleKeyDown(event.code);
  });

  window.addEventListener('keyup', event => {
    if (heldKeyCodes.has(event.code)) {
      const action = actionForKey(event.code);
      if (action) removeHeldSource(action, `keyboard:${event.code}`);
      return;
    }
    engine.handleKeyUp(event.code);
  });

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

  const coarsePointerQuery = window.matchMedia?.('(pointer: coarse)');
  const anyCoarsePointerQuery = window.matchMedia?.('(any-pointer: coarse)');
  const isTouchCapable = () => Boolean(
    coarsePointerQuery?.matches || anyCoarsePointerQuery?.matches || navigator.maxTouchPoints > 0
  );
  const mobileControls = document.getElementById('mobile-game-controls');
  const updateTouchCapability = () => document.documentElement.classList.toggle('touch-capable', isTouchCapable());
  updateTouchCapability();
  for (const query of [coarsePointerQuery, anyCoarsePointerQuery]) {
    query?.addEventListener?.('change', updateTouchCapability);
  }
  const syncMobileControls = () => {
    const shouldShow = isTouchCapable() && ui.getState().screen === 'PLAYING' && engine.gameState === 'PLAYING' &&
      !engine.isPaused && !engine.isGameOver && engine.pageVisible;
    const isHidden = !shouldShow;
    if (mobileControls.hidden !== isHidden) mobileControls.hidden = isHidden;
    const ariaHidden = String(isHidden);
    if (mobileControls.getAttribute('aria-hidden') !== ariaHidden) mobileControls.setAttribute('aria-hidden', ariaHidden);
  };

  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen' && event.pointerId !== canvasActionPointerId) return;
    if (canvasActionPointerId !== null && event.pointerId !== canvasActionPointerId) return;
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerMove(coords.x, coords.y);
  });
  canvas.addEventListener('pointerdown', event => {
    if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && event.button !== 0) return;
    if (canvasActionPointerId !== null) return;
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerDown(coords.x, coords.y);
    if (!engine.isPointerDown) return;
    canvasActionPointerId = event.pointerId;
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== canvasActionPointerId) return;
    canvasActionPointerId = null;
    const coords = getCanvasCoords(event.clientX, event.clientY);
    engine.handlePointerUp(coords.x, coords.y);
  });
  const cancelCanvasPointer = event => {
    if (event.pointerId !== canvasActionPointerId) return;
    releaseCanvasAction();
  };
  canvas.addEventListener('pointercancel', cancelCanvasPointer);
  canvas.addEventListener('lostpointercapture', cancelCanvasPointer);

  for (const [id, action] of [['mobile-move-left', 'left'], ['mobile-move-right', 'right']]) {
    const button = document.getElementById(id);
    button.addEventListener('pointerdown', event => {
      if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && event.button !== 0) return;
      event.preventDefault();
      if (movementPointers.has(event.pointerId)) return;
      movementPointers.set(event.pointerId, { action, element: button });
      addHeldSource(action, `pointer:${event.pointerId}`);
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });
    button.addEventListener('pointerup', event => releaseMovementPointer(event.pointerId));
    button.addEventListener('pointercancel', event => releaseMovementPointer(event.pointerId));
    button.addEventListener('lostpointercapture', event => releaseMovementPointer(event.pointerId));
    button.addEventListener('click', event => {
      if (event.detail !== 0) return;
      const source = `activation:${++nextKeyboardActivationId}`;
      addHeldSource(action, source);
      window.setTimeout(() => removeHeldSource(action, source), 180);
    });
  }

  window.addEventListener('blur', releaseAllGameInput);

  let lastTime = performance.now();
  engine.setPageVisibility(!document.hidden);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAllGameInput();
    engine.setPageVisibility(!document.hidden);
    syncMobileControls();
    lastTime = performance.now();
  });

  function gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
    lastTime = currentTime;
    engine.update(dt);
    engine.render(currentTime);
    syncMobileControls();
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
