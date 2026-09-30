import { describe, expect, it } from 'vitest';
import { Player } from '../src/player.js';
import {
  computeBallContactResponse,
  computePowerShotStrength,
  getKickPosePhase,
  moveToward
} from '../src/gameplay_feel.js';

describe('Phase 2 gameplay feel rules', () => {
  it('moves a scalar toward its target by a bounded amount', () => {
    expect(moveToward(0, 10, 3)).toBe(3);
    expect(moveToward(8, 10, 3)).toBe(10);
    expect(moveToward(10, 0, 3)).toBe(7);
  });

  it('aligns the procedural strike pose with the complete authoritative contact interval', () => {
    expect(getKickPosePhase(0.299)).toBe('ANTICIPATION');
    expect(getKickPosePhase(0.3)).toBe('STRIKE');
    expect(getKickPosePhase(0.7)).toBe('STRIKE');
    expect(getKickPosePhase(0.701)).toBe('RECOVERY');
  });

  it('accelerates from rest without snapping to maximum speed', () => {
    const player = new Player();
    player.keys.right = true;
    player.update(1 / 60);

    expect(player.vx).toBeGreaterThan(0);
    expect(player.vx).toBeLessThan(player.speed);
  });

  it('accelerates to a bounded sprint speed above normal maximum speed', () => {
    const normal = new Player();
    normal.keys.right = true;
    for (let i = 0; i < 120; i += 1) normal.update(1 / 60);

    const sprint = new Player();
    sprint.keys.right = true;
    sprint.keys.sprint = true;
    for (let i = 0; i < 120; i += 1) sprint.update(1 / 60);

    expect(normal.vx).toBeCloseTo(normal.speed, 5);
    expect(sprint.vx).toBeGreaterThan(normal.vx);
    expect(sprint.vx).toBeLessThanOrEqual(sprint.speed * 1.5);
  });

  it('decelerates on release and reverses more sharply than normal acceleration', () => {
    const player = new Player();
    player.keys.right = true;
    for (let i = 0; i < 30; i += 1) player.update(1 / 60);
    const beforeRelease = player.vx;
    player.keys.right = false;
    player.update(1 / 60);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.vx).toBeLessThan(beforeRelease);

    player.keys.left = true;
    player.update(1 / 60);
    const reversalDelta = beforeRelease - player.vx;
    expect(player.facing).toBe(-1);
    expect(reversalDelta).toBeGreaterThan(beforeRelease * 0.15);
  });

  it('keeps responsive movement available while charging and reset clears motion', () => {
    const player = new Player();
    player.keys.right = true;
    player.powerCharging = true;
    player.powerCharge = 0.7;
    player.update(1 / 60);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.powerCharge).toBe(0.7);

    player.resetRunState();
    expect(player.vx).toBe(0);
    expect(player.keys.right).toBe(false);
    expect(player.powerCharging).toBe(false);
  });

  it('produces materially equivalent movement across 60 Hz and 120 Hz subdivisions', () => {
    const simulate = (step, count) => {
      const player = new Player();
      player.keys.right = true;
      for (let i = 0; i < count; i += 1) player.update(step);
      return { x: player.x, vx: player.vx };
    };
    const at60Hz = simulate(1 / 60, 60);
    const at120Hz = simulate(1 / 120, 120);

    expect(at120Hz.vx).toBeCloseTo(at60Hz.vx, 6);
    expect(at120Hz.x).toBeCloseTo(at60Hz.x, 1);
  });

  it('keeps normal and perfect launch physics independent from score combo', () => {
    const launch = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: -0.3 } });
    const repeatedLaunch = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: -0.3 } });
    const perfect = computeBallContactResponse({
      contactType: 'KICK', aim: { x: 1, y: -0.3 }, perfectStrike: true
    });

    expect(launch).toEqual(repeatedLaunch);
    expect(Math.hypot(perfect.velocity.x, perfect.velocity.y))
      .toBeGreaterThan(Math.hypot(launch.velocity.x, launch.velocity.y));
  });

  it('makes cursor elevation materially change a safe normal kick trajectory', () => {
    const high = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: -1 } });
    const forward = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: 0 } });
    const low = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: 1 } });

    expect(high.velocity.y).toBeLessThan(forward.velocity.y);
    expect(forward.velocity.y).toBeLessThan(low.velocity.y);
    expect(low.velocity.y).toBeGreaterThan(0);
    expect(low.velocity.y / Math.abs(low.velocity.x)).toBeCloseTo(0.2, 10);
    expect(Number.isFinite(Math.hypot(...Object.values(high.velocity)))).toBe(true);
  });

  it('gives contextual headers a distinct lower-power launch', () => {
    const kick = computeBallContactResponse({ contactType: 'KICK', aim: { x: 1, y: -0.3 } });
    const header = computeBallContactResponse({ contactType: 'HEADER', aim: { x: 1, y: -0.3 } });

    expect(header).not.toEqual(kick);
    expect(Math.hypot(header.velocity.x, header.velocity.y))
      .toBeLessThan(Math.hypot(kick.velocity.x, kick.velocity.y));
  });

  it('scales power-shot strength monotonically from threshold through full charge', () => {
    const threshold = computePowerShotStrength(0.25);
    const half = computePowerShotStrength(0.5);
    const full = computePowerShotStrength(1);

    expect(threshold).toBeLessThan(half);
    expect(half).toBeLessThan(full);
    expect(full).toBeLessThanOrEqual(23.5);
  });

  it('uses cursor aim for power shots and provides safe finite fallback aim', () => {
    const left = computeBallContactResponse({
      contactType: 'KICK', aim: { x: -1, y: -0.4 }, powerShot: true, charge: 1
    });
    const right = computeBallContactResponse({
      contactType: 'KICK', aim: { x: 1, y: -0.4 }, powerShot: true, charge: 1
    });
    const fallback = computeBallContactResponse({
      contactType: 'KICK', aim: { x: 0, y: 0 }, powerShot: true, facing: -1
    });
    const straightDown = computeBallContactResponse({
      contactType: 'KICK', aim: { x: 0, y: 1 }, facing: 1
    });

    expect(left.velocity.x).toBeLessThan(0);
    expect(right.velocity.x).toBeGreaterThan(0);
    expect(Object.values(fallback.velocity).every(Number.isFinite)).toBe(true);
    expect(fallback.velocity.x).toBeLessThan(0);
    expect(Object.values(straightDown.velocity).every(Number.isFinite)).toBe(true);
    expect(straightDown.velocity.x).toBeGreaterThan(0);
  });
});
