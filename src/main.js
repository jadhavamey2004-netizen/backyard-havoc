/**
 * Main Entrypoint for Backyard Havoc Web Application
 * Connects canvas, HUD state, survival health indicators, modal dialogs, title screen,
 * audio engine, and metagame ball customizer.
 */

import { GameEngine } from './game.js';
import { aiService } from './ai.js';
import { sounds } from './audio.js';
import { mountAffiliateLink } from './affiliate_links.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // The deterministic character sheet exists only in the dedicated E2E build
  // and only on the local Playwright host. It uses the production model draw entry points.
  if (import.meta.env.MODE === 'e2e' && window.location.hostname === '127.0.0.1') {
    const showcase = new URLSearchParams(window.location.search).get('character-showcase');
    if (['player', 'kevin', 'player-kick-sequence', 'kevin-throw-sequence'].includes(showcase)) {
      document.getElementById('title-screen')?.classList.add('hidden');
      document.body.classList.add('character-showcase-test-mode');
      document.body.dataset.characterShowcase = showcase;
      const { renderCharacterShowcase } = await import('./character_showcase.js');
      renderCharacterShowcase(canvas, showcase);
      return;
    }
  }

  const engine = new GameEngine(canvas);

  // UI Element Selectors
  const healthDisplay = document.getElementById('player-health-display');
  const scoreDisplay = document.getElementById('score-display');
  const peakComboDisplay = document.getElementById('peak-combo-display');
  const highScoreDisplay = document.getElementById('high-score-display');
  const yardsDisplay = document.getElementById('yards-display');
  const comboDisplay = document.getElementById('combo-display');
  const comboBarFill = document.getElementById('combo-bar-fill');
  const kevinStateDisplay = document.getElementById('kevin-state-display');
  const havocValueDisplay = document.getElementById('havoc-value-display');
  const havocBarFill = document.getElementById('havoc-bar-fill');
  const havocModeDisplay = document.getElementById('havoc-mode-display');
  const havocCard = document.getElementById('havoc-card');

  // A deterministic engine bridge exists only in the local E2E build, never production.
  if (import.meta.env.MODE === 'e2e' && window.location.hostname === '127.0.0.1') {
    window.__BACKYARD_TEST_ENGINE__ = engine;
  }

  // Title Screen
  const titleScreen = document.getElementById('title-screen');
  const btnStartGame = document.getElementById('btn-start-game');

  // Buttons
  const btnResetYard = document.getElementById('btn-reset-yard');

  // Game Over Modal
  const gameOverModal = document.getElementById('gameover-modal');
  const btnRestartRun = document.getElementById('btn-restart-run');
  const btnShareScore = document.getElementById('btn-share-score');
  const goScore = document.getElementById('go-score');
  const goHighScore = document.getElementById('go-high-score');
  const goTime = document.getElementById('go-time');
  const goCombo = document.getElementById('go-combo');
  const goYards = document.getElementById('go-yards');

  // 1. Title Screen Start Interaction
  if (btnStartGame && titleScreen) {
    btnStartGame.addEventListener('click', () => {
      titleScreen.classList.add('hidden');
      sounds.init();
      engine.startIntroCutscene();
    });
  }

  // 2. Hook Game Over Event
  engine.onGameOverCallback = (stats) => {
    if (gameOverModal) {
      mountAffiliateLink(document.getElementById('affiliate-placement'));
      if (goScore) goScore.textContent = (stats.score || 0).toLocaleString();
      if (goHighScore) goHighScore.textContent = (stats.highScore || 0).toLocaleString();
      if (goTime) goTime.textContent = `${stats.survivalSeconds || 0}s`;
      if (goCombo) goCombo.textContent = `${stats.peakCombo || 1}x`;
      if (goYards) goYards.textContent = `${stats.distanceMeters || 0}m`;
      gameOverModal.classList.remove('hidden');
    }
  };

  if (btnRestartRun) {
    btnRestartRun.addEventListener('click', () => {
      if (gameOverModal) gameOverModal.classList.add('hidden');
      engine.resetEnvironment();
      engine.startIntroCutscene();
    });
  }

  if (btnShareScore) {
    btnShareScore.addEventListener('click', () => {
      const shareText = `I smashed Kevin's windows and scored ${engine.score.toLocaleString()} points with a ${engine.peakCombo}x combo in Backyard Havoc! 🏡⚽💥 Can you beat my high score?`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        btnShareScore.textContent = '✅ COPIED TO CLIPBOARD!';
        setTimeout(() => {
          btnShareScore.textContent = '📢 SHARE SCORE';
        }, 2000);
      }
    });
  }

  if (btnResetYard) {
    btnResetYard.addEventListener('click', () => {
      engine.resetEnvironment();
      engine.startIntroCutscene();
    });
  }

  // 6. Keyboard & Mouse Input Wiring
  window.addEventListener('keydown', (e) => {
    // Prevent browser scrolling during gameplay
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    // Mute Key Toggle (M)
    if (e.code === 'KeyM' && !e.repeat) {
      const isMuted = sounds.toggleMute();
      engine.particles.spawnPopText(engine.player.x, engine.player.y - 45, isMuted ? '🔇 MUTED' : '🔊 AUDIO ON', '#38bdf8', 20);
    }

    // Restart Run on Game Over (Enter / Space)
    if (gameOverModal && !gameOverModal.classList.contains('hidden')) {
      if (e.code === 'Enter' || e.code === 'Space') {
        gameOverModal.classList.add('hidden');
        engine.resetEnvironment();
        engine.startIntroCutscene();
        return;
      }
    }

    if (e.repeat) return;
    engine.handleKeyDown(e.code);
  });

  window.addEventListener('keyup', (e) => {
    engine.handleKeyUp(e.code);
  });

  // High-DPI Canvas Backing Store Scaling for Razor-Sharp Rendering
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
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.handlePointerMove(coords.x, coords.y);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only main left click
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.handlePointerDown(coords.x, coords.y);
  });

  window.addEventListener('mouseup', (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.handlePointerUp(coords.x, coords.y);
  });

  // Mobile Touch Controls
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      engine.handlePointerDown(coords.x, coords.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      engine.handlePointerMove(coords.x, coords.y);
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      engine.handlePointerUp(coords.x, coords.y);
    } else {
      engine.handlePointerUp(engine.mouseScreenPos.x, engine.mouseScreenPos.y);
    }
  });

  // 7. Page Visibility Guard (Pause music/physics when tab hidden)
  // 8. Main 60Hz Game Render & Telemetry Loop
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

    // Update Top Navigation Bar Stats
    if (healthDisplay) {
      let hearts = '';
      for (let i = 0; i < engine.player.health; i++) hearts += '❤️';
      for (let i = engine.player.health; i < engine.player.maxHealth; i++) hearts += '🖤';
      healthDisplay.textContent = hearts;
    }

    if (scoreDisplay) scoreDisplay.textContent = engine.score.toLocaleString();
    if (peakComboDisplay) peakComboDisplay.textContent = `${engine.peakCombo}x`;
    if (highScoreDisplay) highScoreDisplay.textContent = engine.highScore.toLocaleString();
    if (yardsDisplay) yardsDisplay.textContent = `${engine.distanceTraveledMeters}m`;

    // Update Floating Combo HUD
    if (comboDisplay) {
      comboDisplay.textContent = `${engine.combo}x`;
      if (engine.combo > 1) {
        comboDisplay.classList.add('active-combo');
      } else {
        comboDisplay.classList.remove('active-combo');
      }
    }

    if (comboBarFill) {
      const fillPct = Math.min(100, Math.max(8, (engine.combo / 10) * 100));
      if (comboBarFill.dataset.fillPct !== String(fillPct)) {
        comboBarFill.style.width = `${fillPct}%`;
        comboBarFill.dataset.fillPct = String(fillPct);
      }
    }

    if (kevinStateDisplay) {
      const label = `KEVIN: ${engine.kevinDirector.state}`;
      if (kevinStateDisplay.textContent !== label) kevinStateDisplay.textContent = label;
    }

    const havocPercent = Math.round(engine.havocSystem.meter);
    if (havocValueDisplay) {
      const value = `${havocPercent}%`;
      if (havocValueDisplay.textContent !== value) havocValueDisplay.textContent = value;
    }
    if (havocBarFill) {
      const fillPct = `${havocPercent}%`;
      if (havocBarFill.style.width !== fillPct) havocBarFill.style.width = fillPct;
      if (havocBarFill.parentElement?.getAttribute('aria-valuenow') !== String(havocPercent)) {
        havocBarFill.parentElement?.setAttribute('aria-valuenow', String(havocPercent));
      }
    }
    if (havocModeDisplay && havocCard) {
      const active = engine.havocSystem.active;
      if (havocModeDisplay.hidden === active) havocModeDisplay.hidden = !active;
      havocCard.classList.toggle('havoc-active', active);
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
