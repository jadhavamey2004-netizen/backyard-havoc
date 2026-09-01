import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/game.js';
import { Bodies } from 'matter-js';

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

describe('Combat & Parry Mechanics', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
  });

  it('calculates throw trajectory safely without division by zero', () => {
    game.npc.onThrowCallback({ x: 100, y: 100, targetX: 100 }); // targetX === x (dist === 0)
    expect(game.thrownProjectiles.length).toBe(1);
    const proj = game.thrownProjectiles[0];
    expect(Number.isFinite(proj.velocity.x)).toBe(true);
    expect(Number.isFinite(proj.velocity.y)).toBe(true);
  });

  it('parries projectile when player kicks near incoming projectile', () => {
    const kickPos = game.player.getKickPosition();
    const proj = Bodies.circle(kickPos.x + 10, kickPos.y, 10);
    game.thrownProjectiles.push(proj);

    const screenX = kickPos.x - game.camera.x;
    const screenY = kickPos.y;
    game.handlePointerDown(screenX, screenY);
    game.handlePointerUp(screenX, screenY);
    expect(proj.isParried).toBe(true);
    expect(proj.velocity.x).toBeGreaterThan(0);
  });

  it('applies player damage and triggers invulnerability window on direct hit', () => {
    const initialHealth = game.player.health;
    game.player.takeDamage(1);
    expect(game.player.health).toBe(initialHealth - 1);
    expect(game.player.invulnerabilityTimer).toBeGreaterThan(0);

    // Second hit immediately during invulnerability should be ignored
    game.player.takeDamage(1);
    expect(game.player.health).toBe(initialHealth - 1);
  });

  it('triggers Kevin dizzy bonk state when hit in the head by ball', () => {
    game.npc.takeDirectHit();
    expect(game.npc.state).toBe('DIZZY_BONK');
    expect(game.npc.stateTimer).toBeGreaterThan(0);
  });
});
