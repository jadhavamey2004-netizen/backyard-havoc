const ESCALATION_STATES = Object.freeze([
  'CALM', 'SUSPICIOUS', 'ANNOYED', 'ANGRY', 'FURIOUS', 'RAMPAGE'
]);

const UPWARD_THRESHOLDS = Object.freeze([0, 10, 20, 35, 50, 75]);
const DOWNWARD_THRESHOLDS = Object.freeze([0, 7, 17, 32, 47, 72]);
const MEMORY_WINDOW_SECONDS = 4;
const MAX_RECENT_EVENTS = 8;

const ATTACK_PROFILES = Object.freeze({
  CALM: Object.freeze({ canAttack: false, intervalSeconds: null }),
  SUSPICIOUS: Object.freeze({ canAttack: false, intervalSeconds: null }),
  ANNOYED: Object.freeze({ canAttack: false, intervalSeconds: null }),
  ANGRY: Object.freeze({ canAttack: true, intervalSeconds: 2.8 }),
  FURIOUS: Object.freeze({ canAttack: true, intervalSeconds: 2.1 }),
  RAMPAGE: Object.freeze({ canAttack: true, intervalSeconds: 1.4 })
});

const PROJECTILE_PATTERNS = Object.freeze({
  ANGRY: Object.freeze(['Clay Pot', 'Heavy Boot']),
  FURIOUS: Object.freeze(['Clay Pot', 'Steel Wrench', 'Heavy Boot']),
  RAMPAGE: Object.freeze(['Steel Wrench', 'Heavy Boot', 'Clay Pot', 'Steel Wrench'])
});

const clampRage = value => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

function getRageGain(event = {}) {
  switch (event.type) {
    case 'OBJECT_DESTROYED': {
      const nearKevin = typeof event.nearKevin === 'boolean'
        ? event.nearKevin
        : Number.isFinite(event.distanceToKevin) && event.distanceToKevin < 280;
      return nearKevin ? 12 : 4;
    }
    case 'BALL_CONTACT':
      return event.contactType !== 'POWER_SHOT' && event.perfectStrike === true ? 3 : 0;
    case 'POWER_SHOT': return 5;
    case 'PARRY': return 5;
    case 'PERFECT_PARRY': return 10;
    case 'TRICK_CHAIN_COMPLETED': return 12;
    case 'HAVOC_STARTED': return 10;
    default: return 0;
  }
}

function isProvocation(event = {}) {
  return event.type === 'KEVIN_HIT'
    || getRageGain(event) > 0;
}

export class KevinDirector {
  constructor() {
    this.reset();
  }

  processEvent(event = {}) {
    const currentRage = this.rage;
    const gain = getRageGain(event);
    const provoked = isProvocation(event);
    const nextRage = event.type === 'KEVIN_HIT'
      ? 100
      : clampRage(currentRage + gain);

    if (provoked) this.recordProvocation(event.type);
    const reason = event.type === 'BALL_CONTACT' && event.perfectStrike === true
      ? 'PERFECT_STRIKE'
      : event.type || 'UNKNOWN';
    const transition = this.syncRage(nextRage, reason);
    return {
      rage: this.rage,
      // This is the actual clamped numeric delta; provoked can stay true at the rage cap.
      gain: this.rage - currentRage,
      provoked,
      transition,
      context: this.getRecentContext()
    };
  }

  syncRage(value, reason = 'RAGE_DECAY') {
    const rage = clampRage(value);
    const previous = this.state;
    this.rage = rage;
    let index = ESCALATION_STATES.indexOf(this.state);

    while (index < ESCALATION_STATES.length - 1 && rage >= UPWARD_THRESHOLDS[index + 1]) index++;
    while (index > 0 && rage < DOWNWARD_THRESHOLDS[index]) index--;

    this.state = ESCALATION_STATES[index];
    if (this.state === previous) return null;

    this.lastTransition = {
      previous,
      current: this.state,
      rage,
      reason,
      context: this.getRecentContext()
    };
    return this.lastTransition;
  }

  update(dt) {
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (elapsed <= 0) return;
    this.simulationTime += elapsed;
    this.pruneMemory();
  }

  getAttackProfile() {
    return ATTACK_PROFILES[this.state] || ATTACK_PROFILES.CALM;
  }

  nextProjectileType() {
    const pattern = PROJECTILE_PATTERNS[this.state];
    if (!pattern) return null;
    const index = this.patternIndices[this.state] || 0;
    this.patternIndices[this.state] = (index + 1) % pattern.length;
    return pattern[index];
  }

  getRecentContext() {
    let destructionCount = 0;
    let parryCount = 0;
    let kevinHitCount = 0;
    const counts = new Map();

    for (const entry of this.recentEvents) {
      counts.set(entry.type, (counts.get(entry.type) || 0) + 1);
      if (entry.type === 'OBJECT_DESTROYED') destructionCount++;
      if (entry.type === 'PARRY' || entry.type === 'PERFECT_PARRY') parryCount++;
      if (entry.type === 'KEVIN_HIT') kevinHitCount++;
    }

    const lastProvocationType = this.recentEvents.length
      ? this.recentEvents[this.recentEvents.length - 1].type
      : null;
    return {
      lastProvocationType,
      destructionCount,
      parryCount,
      kevinHitCount,
      repeatedProvocationCount: lastProvocationType ? Math.max(0, (counts.get(lastProvocationType) || 0) - 1) : 0,
      recentEventCount: this.recentEvents.length
    };
  }

  getSnapshot() {
    return {
      state: this.state,
      rage: this.rage,
      simulationTime: this.simulationTime,
      recentContext: this.getRecentContext(),
      patternIndices: { ...this.patternIndices },
      lastTransition: this.lastTransition ? { ...this.lastTransition, context: { ...this.lastTransition.context } } : null
    };
  }

  reset() {
    this.state = 'CALM';
    this.rage = 0;
    this.simulationTime = 0;
    this.recentEvents = [];
    this.patternIndices = { ANGRY: 0, FURIOUS: 0, RAMPAGE: 0 };
    this.lastTransition = null;
  }

  recordProvocation(type) {
    this.recentEvents.push({ type, time: this.simulationTime });
    if (this.recentEvents.length > MAX_RECENT_EVENTS) {
      this.recentEvents.splice(0, this.recentEvents.length - MAX_RECENT_EVENTS);
    }
  }

  pruneMemory() {
    const oldestAllowed = this.simulationTime - MEMORY_WINDOW_SECONDS;
    while (this.recentEvents.length > 0 && this.recentEvents[0].time < oldestAllowed) {
      this.recentEvents.shift();
    }
  }
}

export const KEVIN_ESCALATION_TUNING = Object.freeze({
  UPWARD_THRESHOLDS,
  DOWNWARD_THRESHOLDS,
  MEMORY_WINDOW_SECONDS,
  MAX_RECENT_EVENTS
});
