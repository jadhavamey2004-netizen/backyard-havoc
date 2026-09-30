import { describe, it, expect } from 'vitest';
import { Player } from '../src/player.js';
import { GAMEPLAY_TUNING } from '../src/gameplay_rules.js';

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

  it('kickActionRunsForConfiguredTotalDuration', () => {
    const player = new Player();
    player.triggerKick();
    expect(player.kickDuration).toBe(GAMEPLAY_TUNING.KICK_ACTION_DURATION);
    player.update(GAMEPLAY_TUNING.KICK_ACTION_DURATION - 0.001);
    expect(player.state).toBe('KICKING');
    player.update(0.001);
    expect(player.state).toBe('IDLE');
  });

  it('contactCandidateRequiresStrikePhase', () => {
    const player = new Player();
    player.triggerKick();
    player.kickProgress = 0.299;
    let footEdge = player.getKickPosition();
    const kickBall = { x: footEdge.x + 90, y: footEdge.y };
    expect(player.getContactCandidate(kickBall)).toBeNull();
    player.kickProgress = 0.3;
    expect(player.getContactCandidate(kickBall)).toBe('KICK');
    player.kickProgress = 0.7;
    expect(player.getContactCandidate(kickBall)).toBe('KICK');
    player.kickProgress = 0.701;
    expect(player.getContactCandidate(kickBall)).toBeNull();
  });

  it('contactCandidateUsesSeparateFootAndHeadZones', () => {
    const player = new Player();
    player.triggerKick();
    player.kickProgress = 0.5;
    const foot = player.getKickPosition();
    const head = player.getHeaderPosition();
    expect(player.getContactCandidate({ x: foot.x + 95, y: foot.y })).toBe('KICK');
    expect(player.getContactCandidate({ x: foot.x + 95.01, y: foot.y })).toBeNull();
    expect(player.getContactCandidate({ x: head.x + 60, y: head.y })).toBe('HEADER');
    expect(player.getContactCandidate({ x: head.x - 60.01, y: head.y })).toBeNull();
  });

  it('headContactWinsWhenZonesOverlap', () => {
    const player = new Player();
    player.triggerKick();
    player.kickProgress = 0.5;
    expect(player.getContactCandidate(player.getHeaderPosition())).toBe('HEADER');
  });

  it('eachActionConsumesAtMostOneContactAndResetClearsIt', () => {
    const player = new Player();
    player.triggerKick();
    player.kickProgress = 0.5;
    const foot = player.getKickPosition();
    const ball = { x: foot.x + 90, y: foot.y };
    expect(player.getContactCandidate(ball)).toBe('KICK');
    player.consumeKickContact();
    expect(player.getContactCandidate(ball)).toBeNull();
    player.resetRunState();
    player.triggerKick();
    player.kickProgress = 0.5;
    expect(player.getContactCandidate(ball)).toBe('KICK');
  });

  it('contextualHeaderPoseDoesNotRestartActionClock', () => {
    const player = new Player();
    player.triggerKick();
    player.update(0.12);
    const timer = player.kickTimer;
    player.triggerHeader();
    expect(player.state).toBe('HEADING');
    expect(player.kickTimer).toBe(timer);
    expect(player.kickProgress).toBeCloseTo(0.12 / 0.38, 8);
  });
});
