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

describe('Game Flow & Integration Lifecycle', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
  });

  it('accumulates score and peak combo during player kicks', () => {
    expect(game.score).toBe(0);
    game.executePlayerKick(game.player.x + 80, game.player.y - 200, 30);
    expect(game.score).toBeGreaterThan(0);
    expect(game.combo).toBe(2);
    expect(game.peakCombo).toBe(2);
  });

  it('updates distance traveled in meters as player moves horizontally', () => {
    game.player.x = 500;
    game.update(1 / 60);
    expect(game.distanceTraveledMeters).toBeGreaterThan(0);
  });

  it('persists high scores when triggerGameOver is called', () => {
    game.score = 5000;
    game.peakCombo = 12;
    game.triggerGameOver();
    expect(game.highScore).toBe(5000);
    expect(game.bestCombo).toBe(12);
  });

  it('resets environment cleanly without stuck key inputs', () => {
    game.player.keys.left = true;
    game.isPointerDown = true;
    game.resetEnvironment();

    expect(game.isPointerDown).toBe(false);
    expect(game.player.keys.left).toBe(false);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.player.health).toBe(3);
  });
});
