import { describe, it, expect } from 'vitest';
import { Player } from '../src/player.js';

describe('Player Model & Mechanics (Section 7)', () => {
  it('should initialize with 3 hearts and correct base coordinates', () => {
    const player = new Player(340, 485);
    expect(player.health).toBe(3);
    expect(player.maxHealth).toBe(3);
    expect(player.x).toBe(340);
    expect(player.y).toBe(485);
    expect(player.isDead()).toBe(false);
  });

  it('should take damage, trigger invulnerability window, and prevent rapid-fire damage', () => {
    const player = new Player(340, 485);
    const damaged = player.takeDamage(1);
    expect(damaged).toBe(true);
    expect(player.health).toBe(2);
    expect(player.invulnerabilityTimer).toBeGreaterThan(0);

    // Second hit during invulnerability should be ignored
    const secondHit = player.takeDamage(1);
    expect(secondHit).toBe(false);
    expect(player.health).toBe(2);
  });

  it('should report isDead when health reaches 0', () => {
    const player = new Player(340, 485);
    player.health = 1;
    player.invulnerabilityTimer = 0;
    player.takeDamage(1);
    expect(player.health).toBe(0);
    expect(player.isDead()).toBe(true);
  });

  it('should apply 1.6x sprint speed multiplier when sprint key is active', () => {
    const player = new Player(340, 485);
    player.keys.right = true;
    player.keys.sprint = false;
    player.update(0.1);
    const normalVx = player.vx;

    player.keys.sprint = true;
    player.update(0.1);
    const sprintVx = player.vx;

    expect(sprintVx).toBeCloseTo(normalVx * 1.6, 2);
  });

  it('should track power shot charging state', () => {
    const player = new Player(340, 485);
    player.powerCharging = true;
    player.powerCharge = 0.5;
    expect(player.powerCharging).toBe(true);
    expect(player.powerCharge).toBe(0.5);

    player.powerCharging = false;
    player.powerCharge = 0;
    expect(player.powerCharging).toBe(false);
    expect(player.powerCharge).toBe(0);
  });
});
