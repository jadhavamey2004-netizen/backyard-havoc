import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game.js';

const createMockCanvas = () => ({
  getContext: () => ({
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    setTransform: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    roundRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  }),
  width: 960,
  height: 540
});

describe('Cutscenes Engine State Machine', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
  });

  it('starts intro cutscene with running player state and cleared keys', () => {
    game.player.keys.right = true;
    game.startIntroCutscene();
    expect(game.gameState).toBe('INTRO_CUTSCENE');
    expect(game.player.state).toBe('RUNNING');
    expect(game.player.keys.right).toBe(false);
    expect(game.isPointerDown).toBe(false);
  });

  it('skips intro cutscene on spacebar or click trigger', () => {
    game.startIntroCutscene();
    game.skipOrEndIntroCutscene();
    expect(game.gameState).toBe('PLAYING');
    expect(game.player.state).toBe('IDLE');
    expect(game.kickoffBannerTimer).toBeGreaterThan(0);
  });

  it('starts ending defeat cutscene on player health zero', () => {
    game.startEndingCutscene();
    expect(game.gameState).toBe('ENDING_CUTSCENE');
    expect(game.player.state).toBe('HURT');
    expect(game.letterboxProgress).toBe(1.0);
    expect(game.isPointerDown).toBe(false);
  });

  it('progresses intro cutscene timer during update', () => {
    game.startIntroCutscene();
    const initialTimer = game.cutsceneTimer;
    game.update(0.5);
    expect(game.cutsceneTimer).toBeLessThan(initialTimer);
  });
});
