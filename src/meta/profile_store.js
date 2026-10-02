import { CHALLENGE_BY_ID, CHALLENGE_CATALOG } from './challenge_catalog.js';
import {
  COSMETIC_CATALOG,
  DEFAULT_EQUIPMENT,
  cosmeticUnlockId,
  isKnownCosmeticUnlockId
} from './cosmetic_catalog.js';

export const PROFILE_STORAGE_KEY = 'backyard_meta_profile';
export const PROFILE_VERSION = 1;
const MAX_STAT_VALUE = 1_000_000_000;
const STAT_DEFAULTS = Object.freeze({
  runsCompleted: 0,
  totalScore: 0,
  highestComboObserved: 1,
  objectsDestroyed: 0,
  perfectParries: 0,
  kevinHits: 0,
  returnedAttacks: 0,
  havocActivations: 0
});
const CATEGORIES = Object.keys(DEFAULT_EQUIPMENT);

function resolveBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (_) {
    return null;
  }
}

function boundedInteger(value, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return Math.min(MAX_STAT_VALUE, Math.floor(value));
}

function safeTimestamp(value) {
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

export function createDefaultProfile() {
  return {
    version: PROFILE_VERSION,
    unlocked: CATEGORIES.map(category => cosmeticUnlockId(category, DEFAULT_EQUIPMENT[category])),
    equipped: { ...DEFAULT_EQUIPMENT },
    challengeProgress: {},
    completedChallenges: [],
    lifetimeStats: { ...STAT_DEFAULTS },
    firstPlayedAt: null,
    updatedAt: null
  };
}

function normalizeProfile(value) {
  const defaults = createDefaultProfile();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== PROFILE_VERSION) return defaults;

  const unlocked = new Set(defaults.unlocked);
  if (Array.isArray(value.unlocked)) {
    for (const id of value.unlocked) {
      if (isKnownCosmeticUnlockId(id)) unlocked.add(id);
    }
  }

  const lifetimeStats = { ...STAT_DEFAULTS };
  if (value.lifetimeStats && typeof value.lifetimeStats === 'object' && !Array.isArray(value.lifetimeStats)) {
    for (const key of Object.keys(STAT_DEFAULTS)) {
      lifetimeStats[key] = boundedInteger(value.lifetimeStats[key], STAT_DEFAULTS[key]);
    }
    lifetimeStats.highestComboObserved = Math.max(1, lifetimeStats.highestComboObserved);
  }

  const challengeProgress = {};
  if (value.challengeProgress && typeof value.challengeProgress === 'object' && !Array.isArray(value.challengeProgress)) {
    for (const [id, challenge] of Object.entries(CHALLENGE_BY_ID)) {
      const progress = Math.min(challenge.goal, boundedInteger(value.challengeProgress[id]));
      if (progress > 0) challengeProgress[id] = progress;
    }
  }

  const completedChallenges = [];
  for (const challenge of CHALLENGE_CATALOG) {
    const completed = challengeProgress[challenge.id] >= challenge.goal;
    if (completed) {
      completedChallenges.push(challenge.id);
      if (isKnownCosmeticUnlockId(challenge.rewardCosmeticId)) unlocked.add(challenge.rewardCosmeticId);
    }
  }

  const equipped = {};
  for (const category of CATEGORIES) {
    const requested = value.equipped?.[category];
    const unlockId = cosmeticUnlockId(category, requested);
    equipped[category] = unlockId && unlocked.has(unlockId) ? requested : DEFAULT_EQUIPMENT[category];
  }

  return {
    version: PROFILE_VERSION,
    unlocked: [...unlocked],
    equipped,
    challengeProgress,
    completedChallenges,
    lifetimeStats,
    firstPlayedAt: safeTimestamp(value.firstPlayedAt),
    updatedAt: safeTimestamp(value.updatedAt)
  };
}

function cloneProfile(profile) {
  return {
    ...profile,
    unlocked: [...profile.unlocked],
    equipped: { ...profile.equipped },
    challengeProgress: { ...profile.challengeProgress },
    completedChallenges: [...profile.completedChallenges],
    lifetimeStats: { ...profile.lifetimeStats }
  };
}

export class ProfileStore {
  constructor({ storage, now = () => new Date().toISOString() } = {}) {
    this.storage = storage === undefined ? resolveBrowserStorage() : storage;
    this.now = typeof now === 'function' ? now : () => new Date().toISOString();
    this.profile = this.load();
  }

  load() {
    if (!this.storage) return createDefaultProfile();
    let raw;
    try {
      raw = this.storage.getItem(PROFILE_STORAGE_KEY);
    } catch (_) {
      this.storage = null;
      return createDefaultProfile();
    }
    if (typeof raw !== 'string' || raw.length > 16_384) return createDefaultProfile();
    try {
      return normalizeProfile(JSON.parse(raw));
    } catch (_) {
      // Keep working storage so the next successful profile update can replace a corrupt save.
      return createDefaultProfile();
    }
  }

  getProfile() {
    return cloneProfile(this.profile);
  }

  save(profile) {
    const normalized = normalizeProfile(profile);
    let timestamp = null;
    try {
      timestamp = safeTimestamp(this.now());
    } catch (_) {
      timestamp = null;
    }
    normalized.firstPlayedAt = normalized.firstPlayedAt || this.profile.firstPlayedAt || timestamp;
    normalized.updatedAt = timestamp || this.profile.updatedAt || null;
    this.profile = normalized;

    if (!this.storage) return false;
    try {
      const serialized = JSON.stringify(normalized);
      if (serialized.length > 16_384) {
        this.storage = null;
        return false;
      }
      this.storage.setItem(PROFILE_STORAGE_KEY, serialized);
      return true;
    } catch (_) {
      this.storage = null;
      return false;
    }
  }
}
