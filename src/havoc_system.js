const HAVOC_GAINS = Object.freeze({
  OBJECT_DESTROYED: 8,
  KEVIN_HIT: 20,
  PARRY: 5,
  PERFECT_PARRY: 14,
  POWER_SHOT: 6,
  TRICK_CHAIN_COMPLETED: 18
});

const HAVOC_SCORE_SOURCES = new Set([
  'OBJECT_DESTROYED', 'KEVIN_HIT', 'PARRY', 'PERFECT_PARRY',
  'POWER_SHOT', 'TRICK_CHAIN_COMPLETED'
]);
const NO_EVENTS = Object.freeze([]);

export const HAVOC_TUNING = Object.freeze({
  MAX_METER: 100,
  INACTIVITY_GRACE_SECONDS: 3,
  DECAY_PER_SECOND: 5,
  MODE_DURATION_SECONDS: 6,
  SCORE_BONUS_PERCENT: 0.5,
  GAINS: HAVOC_GAINS
});

function gainForEvent(event = {}) {
  if (event.type === 'BALL_CONTACT') {
    if (event.contactType === 'POWER_SHOT') return 0;
    return event.perfectStrike === true ? 5 : 0;
  }
  return Object.hasOwn(HAVOC_GAINS, event.type) ? HAVOC_GAINS[event.type] : 0;
}

export function computeHavocScoreBonus(event = {}, wasActive = false, currentCombo = 1) {
  if (!wasActive || !event || event.type === 'HAVOC_SCORE_BONUS') return null;
  const eligible = HAVOC_SCORE_SOURCES.has(event.type)
    || (event.type === 'BALL_CONTACT'
      && event.contactType !== 'POWER_SHOT'
      && event.perfectStrike === true);
  const baseScore = event.score;
  if (!eligible || !Number.isFinite(baseScore) || baseScore <= 0) return null;

  const bonus = Math.round(baseScore * HAVOC_TUNING.SCORE_BONUS_PERCENT);
  if (bonus <= 0) return null;
  return {
    type: 'HAVOC_SCORE_BONUS',
    source: event.type,
    baseScore,
    bonus,
    currentCombo: Number.isFinite(event.combo) ? event.combo : currentCombo
  };
}

export class HavocSystem {
  constructor() {
    this.reset();
  }

  processEvent(event = {}) {
    if (this.active) return { gain: 0, events: NO_EVENTS };
    const gain = gainForEvent(event);
    if (!Number.isFinite(gain) || gain <= 0) return { gain: 0, events: NO_EVENTS };

    this.inactivityTimer = 0;
    const previousDisplay = Math.round(this.meter);
    this.meter = Math.min(HAVOC_TUNING.MAX_METER, this.meter + gain);
    const events = [];
    const started = this.meter >= HAVOC_TUNING.MAX_METER;

    if (started) {
      this.active = true;
      this.activeTimer = 0;
      this.havocActivations++;
    }
    if (Math.round(this.meter) !== previousDisplay || started) {
      events.push(this.changedEvent());
    }
    if (started) events.push({ type: 'HAVOC_STARTED', meter: this.meter, duration: HAVOC_TUNING.MODE_DURATION_SECONDS });
    return { gain, started, events };
  }

  update(dt) {
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (elapsed <= 0) return NO_EVENTS;

    if (this.active) {
      this.activeTimer += elapsed;
      if (this.activeTimer + 1e-9 < HAVOC_TUNING.MODE_DURATION_SECONDS) return NO_EVENTS;
      this.active = false;
      this.activeTimer = 0;
      this.meter = 0;
      this.inactivityTimer = 0;
      return [this.changedEvent(), {
        type: 'HAVOC_ENDED', meter: this.meter, havocActivations: this.havocActivations
      }];
    }

    if (this.meter <= 0) return NO_EVENTS;
    const previousDisplay = Math.round(this.meter);
    const previousInactivity = this.inactivityTimer;
    this.inactivityTimer += elapsed;
    const decayElapsed = Math.max(0, this.inactivityTimer - HAVOC_TUNING.INACTIVITY_GRACE_SECONDS)
      - Math.max(0, previousInactivity - HAVOC_TUNING.INACTIVITY_GRACE_SECONDS);
    if (decayElapsed > 0) {
      this.meter = Math.max(0, this.meter - decayElapsed * HAVOC_TUNING.DECAY_PER_SECOND);
    }

    if (this.meter <= 0) {
      this.inactivityTimer = 0;
    }
    if (Math.round(this.meter) !== previousDisplay) return [this.changedEvent()];
    return NO_EVENTS;
  }

  getSnapshot() {
    return {
      meter: this.meter,
      active: this.active,
      activeTimer: this.activeTimer,
      havocActivations: this.havocActivations,
      inactivityTimer: this.inactivityTimer
    };
  }

  reset() {
    this.meter = 0;
    this.active = false;
    this.activeTimer = 0;
    this.havocActivations = 0;
    this.inactivityTimer = 0;
  }

  changedEvent() {
    return { type: 'HAVOC_CHANGED', meter: this.meter, active: this.active };
  }
}
