import { describe, expect, it } from 'vitest';
import { KevinDirector } from '../src/kevin_director.js';

describe('KevinDirector escalation and deterministic context', () => {
  it('starts CALM and keeps high-level escalation separate from npc.state', () => {
    const lowLevelNpc = { state: 'PEEKING_INSIDE' };
    const director = new KevinDirector();

    expect(director.state).toBe('CALM');
    director.processEvent({ type: 'OBJECT_DESTROYED', nearKevin: true });
    expect(director.state).toBe('SUSPICIOUS');
    expect(lowLevelNpc.state).toBe('PEEKING_INSIDE');
    expect(director.npcState).toBeUndefined();
  });

  it('uses the approved upward thresholds and downward hysteresis', () => {
    const director = new KevinDirector();
    const expected = [
      [9.99, 'CALM'], [10, 'SUSPICIOUS'], [20, 'ANNOYED'],
      [35, 'ANGRY'], [50, 'FURIOUS'], [75, 'RAMPAGE'], [100, 'RAMPAGE']
    ];

    for (const [rage, state] of expected) {
      director.syncRage(rage, 'TEST');
      expect(director.state).toBe(state);
    }

    director.syncRage(72, 'DECAY');
    expect(director.state).toBe('RAMPAGE');
    director.syncRage(71.99, 'DECAY');
    expect(director.state).toBe('FURIOUS');
    director.syncRage(47, 'DECAY');
    expect(director.state).toBe('FURIOUS');
    director.syncRage(46.99, 'DECAY');
    expect(director.state).toBe('ANGRY');
    director.syncRage(32, 'DECAY');
    expect(director.state).toBe('ANGRY');
    director.syncRage(31.99, 'DECAY');
    expect(director.state).toBe('ANNOYED');
    director.syncRage(17, 'DECAY');
    expect(director.state).toBe('ANNOYED');
    director.syncRage(16.99, 'DECAY');
    expect(director.state).toBe('SUSPICIOUS');
    director.syncRage(7, 'DECAY');
    expect(director.state).toBe('SUSPICIOUS');
    director.syncRage(6.99, 'DECAY');
    expect(director.state).toBe('CALM');
  });

  it('clamps rage and publishes one transition with the provoking reason', () => {
    const director = new KevinDirector();
    expect(director.processEvent({ type: 'KEVIN_HIT' }).rage).toBe(100);
    expect(director.state).toBe('RAMPAGE');
    expect(director.lastTransition).toMatchObject({
      previous: 'CALM', current: 'RAMPAGE', rage: 100, reason: 'KEVIN_HIT'
    });
    expect(director.syncRage(101, 'OVERFLOW')).toBeNull();
    expect(director.syncRage(-20, 'UNDERFLOW').rage).toBe(0);
    expect(director.rage).toBe(0);
  });

  it('applies event gains once and ignores ordinary or companion Power Shot contact', () => {
    const director = new KevinDirector();
    expect(director.processEvent({ type: 'OBJECT_DESTROYED', nearKevin: true }).rage).toBe(12);
    expect(director.processEvent({ type: 'OBJECT_DESTROYED', nearKevin: false }).rage).toBe(16);
    expect(director.processEvent({ type: 'BALL_CONTACT', perfectStrike: true, contactType: 'KICK' }).rage).toBe(19);
    expect(director.processEvent({ type: 'BALL_CONTACT', perfectStrike: false }).rage).toBe(19);
    expect(director.processEvent({ type: 'BALL_CONTACT', perfectStrike: true, contactType: 'POWER_SHOT' }).rage).toBe(19);
    expect(director.processEvent({ type: 'POWER_SHOT' }).rage).toBe(24);
    expect(director.processEvent({ type: 'PARRY' }).rage).toBe(29);
    expect(director.processEvent({ type: 'PERFECT_PARRY' }).rage).toBe(39);
    expect(director.processEvent({ type: 'TRICK_CHAIN_COMPLETED' }).rage).toBe(51);
    expect(director.processEvent({ type: 'BLOCK' }).rage).toBe(51);
  });

  it('reports positive gameplay provocations independently of clamped rage delta', () => {
    const positiveEvents = [
      { type: 'OBJECT_DESTROYED', nearKevin: true },
      { type: 'OBJECT_DESTROYED', nearKevin: false },
      { type: 'BALL_CONTACT', contactType: 'KICK', perfectStrike: true },
      { type: 'POWER_SHOT' },
      { type: 'PARRY' },
      { type: 'PERFECT_PARRY' },
      { type: 'TRICK_CHAIN_COMPLETED' },
      { type: 'KEVIN_HIT' },
      { type: 'HAVOC_STARTED' }
    ];

    for (const event of positiveEvents) {
      const director = new KevinDirector();
      director.syncRage(100, 'TEST');

      expect(director.processEvent(event)).toMatchObject({
        rage: 100,
        gain: 0,
        provoked: true,
        transition: null
      });
    }

    const zeroGainEvents = [
      { type: 'BLOCK' },
      { type: 'BALL_CONTACT', perfectStrike: false },
      { type: 'BALL_CONTACT', contactType: 'POWER_SHOT', perfectStrike: true },
      { type: 'COMBO_CHANGED' },
      { type: 'PLAYER_DAMAGED' },
      { type: 'HAVOC_CHANGED' },
      { type: 'HAVOC_ENDED' },
      { type: 'HAVOC_SCORE_BONUS' },
      { type: 'KEVIN_ESCALATION_CHANGED' }
    ];

    for (const event of zeroGainEvents) {
      const director = new KevinDirector();
      director.syncRage(100, 'TEST');

      expect(director.processEvent(event)).toMatchObject({ rage: 100, gain: 0, provoked: false });
      expect(director.getRecentContext().recentEventCount).toBe(0);
    }
  });

  it('keeps at most eight recent provocations and ages them by simulation time', () => {
    const director = new KevinDirector();
    for (let i = 0; i < 10; i++) director.processEvent({ type: 'OBJECT_DESTROYED', nearKevin: true });
    expect(director.getRecentContext()).toMatchObject({
      destructionCount: 8, repeatedProvocationCount: 7, recentEventCount: 8,
      lastProvocationType: 'OBJECT_DESTROYED'
    });

    director.update(3.99);
    expect(director.getRecentContext().recentEventCount).toBe(8);
    director.update(0.02);
    expect(director.getRecentContext()).toMatchObject({
      destructionCount: 0, repeatedProvocationCount: 0, recentEventCount: 0,
      lastProvocationType: null
    });
  });

  it('exposes attack cadence only from ANGRY and never faster than 1.4 seconds', () => {
    const director = new KevinDirector();
    expect(director.getAttackProfile()).toEqual({ canAttack: false, intervalSeconds: null });
    director.syncRage(34.99);
    expect(director.getAttackProfile().canAttack).toBe(false);
    director.syncRage(35);
    expect(director.getAttackProfile()).toEqual({ canAttack: true, intervalSeconds: 2.8 });
    director.syncRage(50);
    expect(director.getAttackProfile().intervalSeconds).toBe(2.1);
    director.syncRage(75);
    expect(director.getAttackProfile().intervalSeconds).toBe(1.4);
    expect(director.getAttackProfile().intervalSeconds).toBeGreaterThanOrEqual(1.4);
  });

  it('cycles projectile names per escalation policy and resets every index', () => {
    const director = new KevinDirector();
    director.syncRage(35);
    expect([director.nextProjectileType(), director.nextProjectileType(), director.nextProjectileType()])
      .toEqual(['Clay Pot', 'Heavy Boot', 'Clay Pot']);
    director.syncRage(50);
    expect([director.nextProjectileType(), director.nextProjectileType(), director.nextProjectileType(), director.nextProjectileType()])
      .toEqual(['Clay Pot', 'Steel Wrench', 'Heavy Boot', 'Clay Pot']);
    director.syncRage(75);
    expect([director.nextProjectileType(), director.nextProjectileType(), director.nextProjectileType(), director.nextProjectileType()])
      .toEqual(['Steel Wrench', 'Heavy Boot', 'Clay Pot', 'Steel Wrench']);
    director.reset();
    director.syncRage(75);
    expect(director.nextProjectileType()).toBe('Steel Wrench');
    expect(director.getRecentContext().recentEventCount).toBe(0);
  });

  it('replays the same event and dt sequence with the same transition/context output', () => {
    const run = () => {
      const director = new KevinDirector();
      const transitions = [];
      for (const event of [
        { type: 'OBJECT_DESTROYED', nearKevin: true },
        { type: 'PARRY' },
        { type: 'PERFECT_PARRY' },
        { type: 'TRICK_CHAIN_COMPLETED' }
      ]) {
        const result = director.processEvent(event);
        if (result.transition) transitions.push(result.transition);
      }
      director.update(0.5);
      return { snapshot: director.getSnapshot(), transitions };
    };
    expect(run()).toEqual(run());
  });
});
