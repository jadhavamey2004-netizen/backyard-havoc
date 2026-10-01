import { describe, expect, it } from 'vitest';
import { HavocSystem, computeHavocScoreBonus } from '../src/havoc_system.js';

describe('HavocSystem meter, mode, and additive score policy', () => {
  it('starts empty and applies the event gain table once', () => {
    const system = new HavocSystem();
    expect(system.getSnapshot()).toMatchObject({ meter: 0, active: false, activeTimer: 0, havocActivations: 0 });
    const cases = [
      ['OBJECT_DESTROYED', 8], ['KEVIN_HIT', 20], ['PARRY', 5], ['PERFECT_PARRY', 14],
      ['POWER_SHOT', 6], ['BALL_CONTACT', 5, { perfectStrike: true, contactType: 'KICK' }],
      ['TRICK_CHAIN_COMPLETED', 18]
    ];

    for (const [type, gain, extra = {}] of cases) {
      system.reset();
      expect(system.processEvent({ type, ...extra }).gain).toBe(gain);
      expect(system.meter).toBe(gain);
    }
  });

  it('ignores ordinary contact, Power Shot companion contact, block, and damage', () => {
    const system = new HavocSystem();
    for (const event of [
      { type: 'BALL_CONTACT', contactType: 'KICK', perfectStrike: false },
      { type: 'BALL_CONTACT', contactType: 'POWER_SHOT', perfectStrike: true },
      { type: 'BLOCK' }, { type: 'PLAYER_DAMAGED' }
    ]) {
      expect(system.processEvent(event).gain).toBe(0);
    }
    expect(system.meter).toBe(0);
  });

  it('clamps at 100, activates once, and gives no trigger-event bonus', () => {
    const system = new HavocSystem();
    for (let i = 0; i < 12; i++) system.processEvent({ type: 'OBJECT_DESTROYED' });
    expect(system.meter).toBe(96);
    const triggeringEvent = { type: 'OBJECT_DESTROYED', score: 101, combo: 4 };
    const triggerResult = system.processEvent(triggeringEvent);
    expect(system.meter).toBe(100);
    expect(system.active).toBe(true);
    expect(system.havocActivations).toBe(1);
    expect(triggerResult.events.map(event => event.type)).toEqual(['HAVOC_CHANGED', 'HAVOC_STARTED']);
    expect(computeHavocScoreBonus(triggeringEvent, false, 4)).toBeNull();

    system.processEvent({ type: 'OBJECT_DESTROYED' });
    expect(system.meter).toBe(100);
    expect(system.havocActivations).toBe(1);
  });

  it('uses a three-second inactivity grace then decays at five points per simulation second', () => {
    const system = new HavocSystem();
    for (let i = 0; i < 6; i++) system.processEvent({ type: 'OBJECT_DESTROYED' });
    expect(system.meter).toBe(48);
    system.update(3);
    expect(system.meter).toBe(48);
    system.update(1);
    expect(system.meter).toBe(43);
    expect(system.inactivityTimer).toBe(4);
  });

  it('freezes mode time while active and ends once after six simulation seconds', () => {
    const system = new HavocSystem();
    for (let i = 0; i < 13; i++) system.processEvent({ type: 'OBJECT_DESTROYED' });
    expect(system.active).toBe(true);
    system.update(0.5);
    expect(system.activeTimer).toBe(0.5);
    system.update(0);
    expect(system.activeTimer).toBe(0.5);
    const endEvents = system.update(5.5);
    expect(endEvents.map(event => event.type)).toEqual(['HAVOC_CHANGED', 'HAVOC_ENDED']);
    expect(system.getSnapshot()).toMatchObject({ meter: 0, active: false, activeTimer: 0, inactivityTimer: 0, havocActivations: 1 });
    expect(system.update(6)).toEqual([]);
    expect(system.havocActivations).toBe(1);
  });

  it('awards one rounded additive bonus only for eligible events during prior Havoc', () => {
    const cases = [
      ['OBJECT_DESTROYED', { score: 101 }, 51], ['KEVIN_HIT', { score: 50 }, 25],
      ['PARRY', { score: 31 }, 16], ['PERFECT_PARRY', { score: 40 }, 20],
      ['POWER_SHOT', { score: 111 }, 56], ['TRICK_CHAIN_COMPLETED', { score: 1000 }, 500],
      ['BALL_CONTACT', { contactType: 'KICK', perfectStrike: true, score: 201 }, 101]
    ];
    for (const [type, payload, bonus] of cases) {
      expect(computeHavocScoreBonus({ type, ...payload }, true, 7)).toEqual({
        type: 'HAVOC_SCORE_BONUS', source: type, baseScore: payload.score,
        bonus, currentCombo: 7
      });
    }
    for (const event of [
      { type: 'BALL_CONTACT', contactType: 'KICK', score: 100 },
      { type: 'BALL_CONTACT', contactType: 'POWER_SHOT', perfectStrike: true, score: 100 },
      { type: 'BLOCK', score: 100 }, { type: 'COMBO_CHANGED', score: 100 },
      { type: 'PLAYER_DAMAGED', score: 100 }, { type: 'HAVOC_SCORE_BONUS', score: 50 }
    ]) {
      expect(computeHavocScoreBonus(event, true, 3)).toBeNull();
    }
    expect(computeHavocScoreBonus({ type: 'POWER_SHOT', score: 20 }, false, 1)).toBeNull();
  });

  it('resets meter, timers, and activation count for a new run', () => {
    const system = new HavocSystem();
    for (let i = 0; i < 13; i++) system.processEvent({ type: 'OBJECT_DESTROYED' });
    system.update(2);
    system.reset();
    expect(system.getSnapshot()).toEqual({ meter: 0, active: false, activeTimer: 0, havocActivations: 0, inactivityTimer: 0 });
  });

  it('produces identical snapshots for identical event and dt sequences', () => {
    const run = () => {
      const system = new HavocSystem();
      for (const event of [
        { type: 'PARRY' }, { type: 'OBJECT_DESTROYED' },
        { type: 'PERFECT_PARRY' }, { type: 'POWER_SHOT' }
      ]) system.processEvent(event);
      system.update(1.25);
      system.update(0.5);
      return system.getSnapshot();
    };
    expect(run()).toEqual(run());
  });
});
