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

describe('Ball Safety & Edge Case System', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
  });

  it('rescues ball when knocked out of bounds below map', () => {
    game.ball.position.y = 800; // Far below ground (height is 540)
    game.update(1 / 60);
    expect(game.ball.position.y).toBeLessThan(540);
    expect(game.ball.position.x).toBeCloseTo(game.player.x + 30, -1);
  });

  it('rescues ball when knocked into orbit above sky limit', () => {
    game.ball.position.y = -4000;
    game.update(1 / 60);
    expect(game.ball.position.y).toBeGreaterThan(-500);
  });

  it('rescues ball when NaN is injected into position or velocity', () => {
    game.ball.position.x = NaN;
    game.update(1 / 60);
    expect(Number.isFinite(game.ball.position.x)).toBe(true);
    expect(Number.isFinite(game.ball.position.y)).toBe(true);
  });

  it('ejects ball hovering near Kevin window sill', () => {
    game.ball.position.x = game.npc.x;
    game.ball.position.y = game.npc.y - 10;
    game.update(1 / 60);
    expect(game.ball.velocity.x).toBeLessThan(0);
  });

  it('prevents spring scale overshoot during lag spikes', () => {
    game.ballDeform = { scaleX: 1.8, scaleY: 0.6, angle: 0 };
    game.update(0.1); // 100ms lag spike
    expect(Number.isFinite(game.ballDeform.scaleX)).toBe(true);
    expect(Number.isFinite(game.ballDeform.scaleY)).toBe(true);
    expect(game.ballDeform.scaleX).toBeLessThan(1.8);
  });
});
