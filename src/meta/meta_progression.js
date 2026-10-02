import { CHALLENGE_CATALOG } from './challenge_catalog.js';
import { COSMETIC_CATALOG, DEFAULT_EQUIPMENT, cosmeticUnlockId, getCosmetic } from './cosmetic_catalog.js';
import { ProfileStore } from './profile_store.js';
import { applyCompletedRunEvidence, applyGameplayEvidence } from './challenge_tracker.js';

const EMPTY_SUMMARY = () => ({ completedChallenges: [], newUnlocks: [] });

export class MetaProgression {
  constructor({ store, storage, now } = {}) {
    this.store = store || new ProfileStore({ storage, now });
    this.runActive = false;
    this.pendingSummary = EMPTY_SUMMARY();
  }

  beginRun() {
    this.pendingSummary = EMPTY_SUMMARY();
    this.runActive = true;
  }

  abandonRun() {
    this.runActive = false;
    this.pendingSummary = EMPTY_SUMMARY();
  }

  handleGameplayEvent(event) {
    if (!this.runActive) return false;
    const result = applyGameplayEvidence(this.store.getProfile(), event);
    if (!result.changed) return false;
    this.store.save(result.profile);
    this.queueSummary(result);
    return true;
  }

  completeRun(stats) {
    if (!this.runActive) return EMPTY_SUMMARY();
    this.runActive = false;
    const result = applyCompletedRunEvidence(this.store.getProfile(), stats);
    if (result.changed) {
      this.store.save(result.profile);
      this.queueSummary(result);
    }
    return this.takeRunSummary();
  }

  queueSummary(result) {
    const knownChallenges = new Set(this.pendingSummary.completedChallenges.map(item => item.id));
    for (const challenge of result.completedChallenges) {
      if (!knownChallenges.has(challenge.id)) this.pendingSummary.completedChallenges.push(challenge);
    }
    const knownUnlocks = new Set(this.pendingSummary.newUnlocks.map(item => item.cosmeticId));
    for (const cosmetic of result.newUnlocks) {
      if (!knownUnlocks.has(cosmetic.cosmeticId)) this.pendingSummary.newUnlocks.push(cosmetic);
    }
  }

  takeRunSummary() {
    const summary = this.pendingSummary;
    this.pendingSummary = EMPTY_SUMMARY();
    return {
      completedChallenges: summary.completedChallenges.map(item => ({ ...item })),
      newUnlocks: summary.newUnlocks.map(item => ({ ...item }))
    };
  }

  getProfile() {
    return this.store.getProfile();
  }

  getEquipped() {
    return { ...this.store.getProfile().equipped };
  }

  equip(category, id) {
    const unlockId = cosmeticUnlockId(category, id);
    const profile = this.store.getProfile();
    if (!unlockId || !profile.unlocked.includes(unlockId)) return false;
    profile.equipped[category] = id;
    this.store.save(profile);
    return true;
  }

  getGarageItems() {
    const profile = this.store.getProfile();
    return Object.entries(COSMETIC_CATALOG).map(([category, items]) => ({
      category,
      label: category.toUpperCase(),
      items: items.map(item => {
        const unlockId = cosmeticUnlockId(category, item.id);
        const challenge = CHALLENGE_CATALOG.find(candidate => candidate.rewardCosmeticId === unlockId);
        const owned = profile.unlocked.includes(unlockId);
        return {
          category,
          id: item.id,
          name: item.name,
          description: item.description,
          swatch: item.swatch,
          owned,
          equipped: profile.equipped[category] === item.id,
          requirement: challenge ? `Complete: ${challenge.name}` : 'Always available'
        };
      })
    }));
  }

  getChallenges() {
    const profile = this.store.getProfile();
    return CHALLENGE_CATALOG.map(challenge => {
      const rewardSeparator = challenge.rewardCosmeticId.indexOf(':');
      const reward = getCosmetic(challenge.rewardCosmeticId.slice(0, rewardSeparator), challenge.rewardCosmeticId.slice(rewardSeparator + 1));
      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        goal: challenge.goal,
        progress: profile.challengeProgress[challenge.id] || 0,
        completed: profile.completedChallenges.includes(challenge.id),
        reward: reward?.name || 'Mystery style'
      };
    });
  }
}

export { DEFAULT_EQUIPMENT };
