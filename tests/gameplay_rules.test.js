import { describe, expect, it } from 'vitest';
import {
  GAMEPLAY_TUNING,
  classifyDefense,
  getContactPhase,
  getPowerCharge,
  getProjectileThreat,
  selectEarliestThreat
} from '../src/gameplay_rules.js';

describe('approved gameplay rules', () => {
  it('getContactPhaseIncludesOnlyConfiguredStrikeBounds', () => {
    expect(getContactPhase(0.299)).toBe(false);
    expect(getContactPhase(0.3)).toBe(true);
    expect(getContactPhase(0.7)).toBe(true);
    expect(getContactPhase(0.701)).toBe(false);
  });

  it('getPowerChargeUsesElapsedHoldAndClampsToOne', () => {
    expect(getPowerCharge(0.19)).toBe(0);
    expect(getPowerCharge(0.4125)).toBeCloseTo(0.25, 8);
    expect(getPowerCharge(1.05)).toBe(1);
    expect(getPowerCharge(10)).toBe(1);
  });

  it('getProjectileThreatRejectsMovingAwayAndMissPaths', () => {
    const player = { x: 0, y: 0 };
    const still = { x: 0, y: 0 };
    expect(getProjectileThreat({ x: 100, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, player, still)).toBeNull();
    expect(getProjectileThreat({ x: 100, y: -30 }, { x: -100, y: 20 }, { x: 0, y: -400 }, player, still)).toBeNull();
    const incoming = getProjectileThreat({ x: 100, y: 0 }, { x: -200, y: 0 }, { x: 0, y: 0 }, player, still);
    expect(incoming?.timeToContact).toBeGreaterThan(0);
    expect(incoming?.timeToContact).toBeLessThan(GAMEPLAY_TUNING.BLOCK_MAX_TIME_TO_CONTACT);
    expect(incoming?.closestDistance).toBeLessThanOrEqual(GAMEPLAY_TUNING.PROJECTILE_PLAYER_CONTACT_RADIUS);
  });

  it('gravityTurnsPreviouslySafePathIntoThreat', () => {
    const pos = { x: 60, y: -90 };
    const velocity = { x: -100, y: 0 };
    const player = { x: 0, y: 0 };
    const still = { x: 0, y: 0 };
    expect(getProjectileThreat(pos, velocity, { x: 0, y: 0 }, player, still)).toBeNull();
    expect(getProjectileThreat(pos, velocity, { x: 0, y: 400 }, player, still)?.timeToContact).toBeGreaterThan(0);
  });

  it('gravityKeepsMissPathIneligible', () => {
    const threat = getProjectileThreat(
      { x: 100, y: -30 }, { x: -100, y: 20 }, { x: 0, y: -400 },
      { x: 0, y: 0 }, { x: 0, y: 0 }
    );
    expect(threat).toBeNull();
  });

  it('upwardProjectileCanDescendIntoPlayerContactRegion', () => {
    const threat = getProjectileThreat(
      { x: 0, y: -50 }, { x: 0, y: -40 }, { x: 0, y: 400 },
      { x: 0, y: 0 }, { x: 0, y: 0 }
    );
    expect(threat?.timeToContact).toBeGreaterThan(0.1);
    expect(threat?.timeToContact).toBeLessThan(0.6);
  });

  it('alreadyOverlappingProjectileIsNotDefended', () => {
    expect(getProjectileThreat({ x: 20, y: 0 }, { x: -100, y: 0 }, { x: 0, y: 400 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });

  it('selectEarliestThreatIsIndependentOfInputOrder', () => {
    const later = { body: { id: 1 }, timeToContact: 0.2, closestDistance: 10 };
    const earlier = { body: { id: 2 }, timeToContact: 0.1, closestDistance: 30 };
    const tieHighId = { body: { id: 9 }, timeToContact: 0.1, closestDistance: 20 };
    const tieLowId = { body: { id: 3 }, timeToContact: 0.1, closestDistance: 20 };
    expect(selectEarliestThreat([later, earlier, tieHighId, tieLowId])).toBe(tieLowId);
    expect(selectEarliestThreat([tieLowId, tieHighId, earlier, later])).toBe(tieLowId);
  });

  it('classifyDefenseUsesDocumentedInclusiveBoundaries', () => {
    expect(classifyDefense(0.08)).toBe('PERFECT_PARRY');
    expect(classifyDefense(0.08001)).toBe('PARRY');
    expect(classifyDefense(0.25)).toBe('PARRY');
    expect(classifyDefense(0.25001)).toBe('BLOCK');
    expect(classifyDefense(0.6)).toBe('BLOCK');
    expect(classifyDefense(0)).toBe('MISS');
    expect(classifyDefense(0.60001)).toBe('MISS');
  });
});
