import { describe, expect, it } from 'vitest';
import {
  PROFILE_STORAGE_KEY,
  PROFILE_VERSION,
  ProfileStore,
  createDefaultProfile
} from '../src/meta/profile_store.js';
import { CHALLENGE_CATALOG } from '../src/meta/challenge_catalog.js';
import { COSMETIC_CATALOG } from '../src/meta/cosmetic_catalog.js';
import { MetaProgression } from '../src/meta/meta_progression.js';

const NOW = '2026-10-02T00:00:00.000Z';

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

describe('Phase 10 local profile', () => {
  it('creates a stable versioned profile with permanent classic equipment', () => {
    const profile = createDefaultProfile();

    expect(PROFILE_STORAGE_KEY).toBe('backyard_meta_profile');
    expect(PROFILE_VERSION).toBe(1);
    expect(profile).toMatchObject({
      version: 1,
      unlocked: ['ball:CLASSIC', 'trail:CLASSIC', 'impact:CLASSIC'],
      equipped: { ball: 'CLASSIC', trail: 'CLASSIC', impact: 'CLASSIC' },
      challengeProgress: {},
      completedChallenges: [],
      lifetimeStats: {
        runsCompleted: 0,
        totalScore: 0,
        highestComboObserved: 1,
        objectsDestroyed: 0,
        perfectParries: 0,
        kevinHits: 0,
        returnedAttacks: 0,
        havocActivations: 0
      },
      firstPlayedAt: null,
      updatedAt: null
    });
  });

  it('recovers missing, malformed, and unsupported-version saves without throwing', () => {
    const missing = new ProfileStore({ storage: createStorage(), now: () => NOW });
    expect(missing.getProfile()).toEqual(createDefaultProfile());

    const malformed = createStorage({ [PROFILE_STORAGE_KEY]: '{not json' });
    expect(new ProfileStore({ storage: malformed, now: () => NOW }).getProfile())
      .toEqual(createDefaultProfile());

    const unsupported = createStorage({
      [PROFILE_STORAGE_KEY]: JSON.stringify({ version: 99, unlocked: ['ball:NEON'] })
    });
    expect(new ProfileStore({ storage: unsupported, now: () => NOW }).getProfile())
      .toEqual(createDefaultProfile());
  });

  it('can replace a malformed save with a valid profile on the next write', () => {
    const storage = createStorage({ [PROFILE_STORAGE_KEY]: '{broken' });
    const store = new ProfileStore({ storage, now: () => NOW });
    const recovered = store.getProfile();
    recovered.lifetimeStats.runsCompleted = 2;

    expect(store.save(recovered)).toBe(true);
    expect(new ProfileStore({ storage, now: () => NOW }).getProfile().lifetimeStats.runsCompleted).toBe(2);
  });

  it('normalizes wrong field types, unknown fields, unknown items, and locked equipment', () => {
    const storage = createStorage({
      [PROFILE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        unlocked: 'ball:NEON',
        equipped: { ball: 'NEON', trail: 'REMOVED', impact: 'CLASSIC' },
        challengeProgress: { 'unknown-challenge': 900, 'yard-wrecker': 'bad' },
        completedChallenges: ['unknown-challenge'],
        lifetimeStats: { runsCompleted: 'many', totalScore: -5 },
        arbitraryExecutableField: { ignored: true }
      })
    });
    const profile = new ProfileStore({ storage, now: () => NOW }).getProfile();

    expect(profile.unlocked).toEqual(['ball:CLASSIC', 'trail:CLASSIC', 'impact:CLASSIC']);
    expect(profile.equipped).toEqual({ ball: 'CLASSIC', trail: 'CLASSIC', impact: 'CLASSIC' });
    expect(profile.challengeProgress).toEqual({});
    expect(profile.completedChallenges).toEqual([]);
    expect(profile.lifetimeStats.runsCompleted).toBe(0);
    expect(profile.lifetimeStats.totalScore).toBe(0);
    expect(profile).not.toHaveProperty('arbitraryExecutableField');
  });

  it('saves only the isolated meta key and reloads valid progression data', () => {
    const storage = createStorage({
      backyard_high_score: '4321',
      backyard_best_combo: '12',
      backyard_reduced_motion: 'true',
      backyard_muted: 'false'
    });
    const store = new ProfileStore({ storage, now: () => NOW });
    const profile = store.getProfile();
    profile.unlocked.push('ball:NEON');
    profile.equipped.ball = 'NEON';

    expect(store.save(profile)).toBe(true);
    expect(storage.getItem('backyard_high_score')).toBe('4321');
    expect(storage.getItem('backyard_best_combo')).toBe('12');
    expect(storage.getItem('backyard_reduced_motion')).toBe('true');
    expect(storage.getItem('backyard_muted')).toBe('false');
    expect(JSON.parse(storage.getItem(PROFILE_STORAGE_KEY))).toMatchObject({
      version: 1,
      equipped: { ball: 'NEON' },
      firstPlayedAt: NOW,
      updatedAt: NOW
    });

    const reloaded = new ProfileStore({ storage, now: () => NOW });
    expect(reloaded.getProfile().equipped.ball).toBe('NEON');
    expect(reloaded.getProfile().unlocked).toContain('ball:NEON');
  });

  it('keeps defaults usable when storage access and writes throw', () => {
    const blockedStorage = {
      getItem() { throw new Error('storage blocked'); },
      setItem() { throw new Error('quota denied'); }
    };
    const store = new ProfileStore({ storage: blockedStorage, now: () => NOW });
    expect(store.getProfile().equipped).toEqual({ ball: 'CLASSIC', trail: 'CLASSIC', impact: 'CLASSIC' });
    const profile = store.getProfile();
    profile.lifetimeStats.runsCompleted = 1;
    expect(store.save(profile)).toBe(false);
    expect(store.getProfile().lifetimeStats.runsCompleted).toBe(1);
  });
});

describe('Phase 10 challenge evidence and unlocks', () => {
  it('defines nine supported cumulative challenges with one direct reward each', () => {
    expect(CHALLENGE_CATALOG).toHaveLength(9);
    expect(new Set(CHALLENGE_CATALOG.map(challenge => challenge.rewardCosmeticId)).size).toBe(9);
    expect(CHALLENGE_CATALOG.every(challenge => challenge.goal > 0 && challenge.name && challenge.description)).toBe(true);
    expect(CHALLENGE_CATALOG.find(challenge => challenge.id === 'kevins-problem').description).toBe('Hit Kevin once.');
    expect(COSMETIC_CATALOG.ball).toHaveLength(4);
    expect(COSMETIC_CATALOG.trail).toHaveLength(4);
    expect(COSMETIC_CATALOG.impact).toHaveLength(4);
  });

  it('does not consume canonical gameplay evidence when there is no active run', () => {
    const meta = new MetaProgression({ storage: createStorage(), now: () => NOW });

    expect(meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' })).toBe(false);
    expect(meta.getProfile().lifetimeStats.objectsDestroyed).toBe(0);
    expect(meta.getProfile().unlocked).not.toContain('ball:CARBON');
  });

  it('turns canonical event evidence into durable challenge progress and an idempotent unlock', () => {
    const storage = createStorage();
    const meta = new MetaProgression({ storage, now: () => NOW });
    meta.beginRun();

    for (let index = 0; index < 5; index++) {
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD', score: 100 });
    }
    meta.handleGameplayEvent({ type: 'COMBO_CHANGED', current: 10, reason: 'BALL_CONTACT' });
    meta.handleGameplayEvent({ type: 'PERFECT_PARRY', projectileId: 'throw-1' });
    meta.handleGameplayEvent({ type: 'PERFECT_PARRY', projectileId: 'throw-2' });
    meta.handleGameplayEvent({ type: 'PERFECT_PARRY', projectileId: 'throw-3' });
    meta.handleGameplayEvent({ type: 'KEVIN_HIT', source: 'DIRECT_BALL' });
    meta.handleGameplayEvent({ type: 'KEVIN_HIT', source: 'PARRIED_PROJECTILE' });
    meta.handleGameplayEvent({ type: 'HAVOC_STARTED', meter: 100 });

    const profile = meta.getProfile();
    expect(profile.lifetimeStats).toMatchObject({
      objectsDestroyed: 5,
      highestComboObserved: 10,
      perfectParries: 3,
      kevinHits: 2,
      returnedAttacks: 1,
      havocActivations: 1
    });
    expect(profile.completedChallenges).toHaveLength(8);
    expect(profile.unlocked).toContain('ball:CARBON');
    expect(profile.unlocked).toContain('trail:EMBER');

    meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
    expect(meta.getProfile().unlocked.filter(id => id === 'ball:CARBON')).toHaveLength(1);
    const reloaded = new MetaProgression({ storage, now: () => NOW });
    expect(reloaded.getProfile().completedChallenges).toEqual(profile.completedChallenges);
  });

  it('counts a completed run once and returns the completion reward in results feedback', () => {
    const meta = new MetaProgression({ storage: createStorage(), now: () => NOW });
    meta.beginRun();
    const stats = { score: 1200, peakCombo: 4, distanceMeters: 30, survivalSeconds: 25 };

    const result = meta.completeRun(stats);
    expect(result.completedChallenges.map(challenge => challenge.id)).toContain('first-run');
    expect(result.completedChallenges).toHaveLength(1);
    expect(result.newUnlocks).toContainEqual(expect.objectContaining({ cosmeticId: 'ball:NEON' }));
    expect(result.newUnlocks).toHaveLength(1);
    expect(meta.completeRun(stats)).toEqual({ completedChallenges: [], newUnlocks: [] });
    expect(meta.getProfile().lifetimeStats.runsCompleted).toBe(1);
    expect(meta.getProfile().lifetimeStats).toMatchObject({
      runsCompleted: 1,
      totalScore: 1200,
      highestComboObserved: 4
    });
  });

  it('keeps a restarted run clean while retaining an abandoned run unlock', () => {
    const meta = new MetaProgression({ storage: createStorage(), now: () => NOW });
    const stats = { score: 0, peakCombo: 1, distanceMeters: 0, survivalSeconds: 1 };

    meta.beginRun();
    meta.completeRun(stats);
    meta.beginRun();
    for (let index = 0; index < 5; index++) {
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
    }
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');

    meta.abandonRun();
    expect(meta.runActive).toBe(false);
    expect(meta.getProfile().lifetimeStats).toMatchObject({ runsCompleted: 1, objectsDestroyed: 5 });
    meta.beginRun();
    expect(meta.runActive).toBe(true);
    const runBResults = meta.completeRun(stats);

    expect(runBResults).toEqual({ completedChallenges: [], newUnlocks: [] });
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');
    expect(meta.getProfile().completedChallenges).toContain('yard-wrecker');
    expect(meta.getProfile().lifetimeStats.runsCompleted).toBe(2);
  });

  it('keeps a new main-menu run clean while retaining an abandoned run unlock', () => {
    const meta = new MetaProgression({ storage: createStorage(), now: () => NOW });
    const stats = { score: 0, peakCombo: 1, distanceMeters: 0, survivalSeconds: 1 };

    meta.beginRun();
    meta.completeRun(stats);
    meta.beginRun();
    for (let index = 0; index < 5; index++) {
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
    }
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');

    meta.abandonRun();
    expect(meta.runActive).toBe(false);
    expect(meta.getProfile().lifetimeStats.objectsDestroyed).toBe(5);
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');
    meta.beginRun();
    const runBResults = meta.completeRun(stats);

    expect(runBResults).toEqual({ completedChallenges: [], newUnlocks: [] });
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');
  });

  it('clears stale Results feedback when a new run begins defensively', () => {
    const meta = new MetaProgression({ storage: createStorage(), now: () => NOW });
    const stats = { score: 0, peakCombo: 1, distanceMeters: 0, survivalSeconds: 1 };

    meta.beginRun();
    meta.completeRun(stats);
    meta.beginRun();
    for (let index = 0; index < 5; index++) {
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
    }
    meta.beginRun();

    expect(meta.completeRun(stats)).toEqual({ completedChallenges: [], newUnlocks: [] });
    expect(meta.getProfile().unlocked).toContain('ball:CARBON');
  });

  it('rejects locked equipment, persists valid equipment, and does not expose physics modifiers', () => {
    const storage = createStorage();
    const meta = new MetaProgression({ storage, now: () => NOW });

    expect(meta.equip('ball', 'NEON')).toBe(false);
    expect(meta.getEquipped().ball).toBe('CLASSIC');
    meta.beginRun();
    meta.completeRun({ score: 0, peakCombo: 1, distanceMeters: 0, survivalSeconds: 1 });
    expect(meta.equip('ball', 'NEON')).toBe(true);
    expect(new MetaProgression({ storage, now: () => NOW }).getEquipped().ball).toBe('NEON');

    for (const category of Object.values(COSMETIC_CATALOG)) {
      for (const cosmetic of category) {
        expect(cosmetic).not.toHaveProperty('density');
        expect(cosmetic).not.toHaveProperty('restitution');
        expect(cosmetic).not.toHaveProperty('friction');
        expect(cosmetic).not.toHaveProperty('collisionRadius');
        expect(cosmetic).not.toHaveProperty('score');
      }
    }
  });
});
