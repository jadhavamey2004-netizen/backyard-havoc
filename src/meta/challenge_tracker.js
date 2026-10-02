import { CHALLENGE_CATALOG } from './challenge_catalog.js';
import { getCosmeticByUnlockId, isKnownCosmeticUnlockId } from './cosmetic_catalog.js';

const MAX_STAT_VALUE = 1_000_000_000;
const finiteCount = value => Number.isFinite(value) && value >= 0
  ? Math.min(MAX_STAT_VALUE, Math.floor(value))
  : null;

function increment(stats, key, amount = 1) {
  stats[key] = Math.min(MAX_STAT_VALUE, stats[key] + amount);
}

function updateProgress(profile) {
  const completedChallenges = [];
  const newUnlocks = [];
  const unlocked = new Set(profile.unlocked);

  for (const challenge of CHALLENGE_CATALOG) {
    const observed = finiteCount(profile.lifetimeStats[challenge.metric]) ?? 0;
    const progress = Math.min(challenge.goal, observed);
    profile.challengeProgress[challenge.id] = progress;
    if (progress < challenge.goal || profile.completedChallenges.includes(challenge.id)) continue;

    profile.completedChallenges.push(challenge.id);
    completedChallenges.push({ id: challenge.id, name: challenge.name });
    if (isKnownCosmeticUnlockId(challenge.rewardCosmeticId) && !unlocked.has(challenge.rewardCosmeticId)) {
      unlocked.add(challenge.rewardCosmeticId);
      const cosmetic = getCosmeticByUnlockId(challenge.rewardCosmeticId);
      if (cosmetic) newUnlocks.push({ cosmeticId: challenge.rewardCosmeticId, ...cosmetic });
    }
  }

  profile.unlocked = [...unlocked];
  return { completedChallenges, newUnlocks };
}

export function applyGameplayEvidence(profile, event) {
  if (!event || typeof event.type !== 'string') return { changed: false, profile, completedChallenges: [], newUnlocks: [] };
  const stats = profile.lifetimeStats;

  switch (event.type) {
    case 'OBJECT_DESTROYED':
      increment(stats, 'objectsDestroyed');
      break;
    case 'COMBO_CHANGED': {
      const combo = finiteCount(event.current);
      if (combo === null) return { changed: false, profile, completedChallenges: [], newUnlocks: [] };
      stats.highestComboObserved = Math.max(stats.highestComboObserved, combo);
      break;
    }
    case 'PERFECT_PARRY':
      increment(stats, 'perfectParries');
      break;
    case 'KEVIN_HIT':
      increment(stats, 'kevinHits');
      if (event.source === 'PARRIED_PROJECTILE') increment(stats, 'returnedAttacks');
      break;
    case 'HAVOC_STARTED':
      increment(stats, 'havocActivations');
      break;
    default:
      return { changed: false, profile, completedChallenges: [], newUnlocks: [] };
  }

  return { changed: true, profile, ...updateProgress(profile) };
}

export function applyCompletedRunEvidence(profile, statsSnapshot) {
  if (!statsSnapshot || typeof statsSnapshot !== 'object' || Array.isArray(statsSnapshot)) {
    return { changed: false, profile, completedChallenges: [], newUnlocks: [] };
  }
  const score = finiteCount(statsSnapshot.score);
  const peakCombo = finiteCount(statsSnapshot.peakCombo);
  increment(profile.lifetimeStats, 'runsCompleted');
  if (score !== null) {
    profile.lifetimeStats.totalScore = Math.min(MAX_STAT_VALUE, profile.lifetimeStats.totalScore + score);
  }
  if (peakCombo !== null) {
    profile.lifetimeStats.highestComboObserved = Math.max(profile.lifetimeStats.highestComboObserved, peakCombo);
  }
  return { changed: true, profile, ...updateProgress(profile) };
}
