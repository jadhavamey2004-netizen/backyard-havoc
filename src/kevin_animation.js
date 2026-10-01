import { clamp01, easeInOutCubic, easeOutCubic, lerp, smoothstep } from './animation_utils.js';
import { KEVIN_VISUAL_STYLE } from './character_style.js';

const { geometry: g } = KEVIN_VISUAL_STYLE;

export const KEVIN_ANIMATION_TUNING = Object.freeze({
  KEVIN_WATCH_CYCLE_SECONDS: 3.8,
  THROW_WINDUP_SECONDS: 0.22,
  THROW_DURATION: 0.65,
  THROW_RELEASE_HOLD_SECONDS: 0.08,
  STEAM_INTERVAL_SECONDS: 0.72,
  BLINK_PERIOD_SECONDS: 4.1,
  BLINK_DURATION_SECONDS: 0.12,
  HIGH_RAGE_LEAN_RADIANS: 0.11,
});

function getBlink(elapsed) {
  const phase = (elapsed + 0.88) % KEVIN_ANIMATION_TUNING.BLINK_PERIOD_SECONDS;
  const duration = KEVIN_ANIMATION_TUNING.BLINK_DURATION_SECONDS;
  return phase < duration ? Math.sin((phase / duration) * Math.PI) : 0;
}

function point(x, y) {
  return { x, y };
}

function getThrowHand(age) {
  const hold = KEVIN_ANIMATION_TUNING.THROW_RELEASE_HOLD_SECONDS;
  if (age <= hold) return point(10, 12);
  const windupEnd = hold + 0.13;
  const followThroughEnd = hold + 0.34;
  if (age < windupEnd) {
    return {
      x: lerp(10, 39, easeOutCubic((age - hold) / (windupEnd - hold))),
      y: lerp(12, -21, easeOutCubic((age - hold) / (windupEnd - hold))),
    };
  }
  if (age < followThroughEnd) {
    const t = easeInOutCubic((age - windupEnd) / (followThroughEnd - windupEnd));
    return { x: lerp(39, 28, t), y: lerp(-21, 7, t) };
  }
  const recovery = smoothstep((age - followThroughEnd) / Math.max(0.01, KEVIN_ANIMATION_TUNING.THROW_DURATION - followThroughEnd));
  return { x: lerp(28, 39, recovery), y: lerp(7, -12, recovery) };
}

export function computeKevinPoseAnchors(npc, animation) {
  const elapsed = Number.isFinite(animation?.elapsed) ? animation.elapsed : 0;
  const state = npc.state;
  const peeking = state === 'PEEKING_INSIDE';
  const repairing = state === 'REPAIRING';
  const bonked = state === 'DIZZY_BONK';
  const throwing = state === 'THROWING_PROJECTILE';
  const rage = clamp01((Number.isFinite(npc.rageMeter) ? npc.rageMeter : 0) / 100);
  const breathPhase = elapsed / KEVIN_ANIMATION_TUNING.KEVIN_WATCH_CYCLE_SECONDS * Math.PI * 2;
  const breath = Math.sin(breathPhase) * 0.85;
  const bonkAge = Number.isFinite(animation?.bonkAge) ? animation.bonkAge : elapsed;
  const wobble = bonked ? Math.sin(bonkAge * 7) : 0;
  const transition = !throwing && !bonked && npc.state === 'LEANING_OUT_RAGE'
    ? clamp01(1 - (Number.isFinite(npc.throwTimer) ? npc.throwTimer : 1) / KEVIN_ANIMATION_TUNING.THROW_WINDUP_SECONDS)
    : 0;
  const throwAge = Math.max(0, Number.isFinite(animation?.throwElapsed) ? animation.throwElapsed : 0);
  const throwHand = throwing ? getThrowHand(throwAge) : null;
  const repairingPhase = repairing ? (elapsed % 0.72) / 0.72 : 0;
  const repairWave = repairing ? Math.sin(repairingPhase * Math.PI * 2) : 0;
  const leanAmount = KEVIN_ANIMATION_TUNING.HIGH_RAGE_LEAN_RADIANS * rage;
  const shake = rage >= 0.7 ? Math.sin(elapsed * (8 + rage * 4)) * 0.018 * rage : 0;
  const bodyLean = peeking
    ? Math.sin(breathPhase + 0.6) * 0.018
    : (bonked ? wobble * 0.09 : (leanAmount + shake + (throwing ? -0.06 : 0)));
  const currentDialogue = npc.dialogueTimer > 0 && Boolean(npc.dialogue);
  const shouting = throwing || (currentDialogue && npc.dialogueEmotion === 'RAGE');
  const shoutPulse = shouting ? 0.5 + 0.5 * Math.sin(elapsed * 11) : 0;
  const frontRest = peeking || repairing
    ? point(25, g.windowSillY - 1)
    : point(39 - transition * 29, -12 + transition * 24);
  const backRest = peeking || repairing
    ? point(-25, g.windowSillY - 1)
    : point(-38, -11);
  const repairHand = repairing
    ? point(18 + repairWave * 8, g.windowSillY - 4 + Math.max(0, repairWave) * 4)
    : frontRest;

  return {
    windowCenter: point(0, 0),
    sill: point(0, g.windowSillY),
    torso: point(0, g.torso.centerY + (peeking ? 5 : 0) + breath * 0.55 + (bonked ? wobble * 2 : 0)),
    neck: point(peeking ? 0 : 4, (peeking ? -16 : (repairing ? -21 : -31)) + 17 + breath * 0.3),
    head: point(peeking ? 0 : (bonked ? 2 + wobble * 2 : 4), (peeking ? -16 : (repairing ? -21 : -31)) + breath * 0.45 + (bonked ? Math.abs(wobble) * 2 : 0)),
    shoulderBack: point(-g.shoulderSpan / 2 + 4, -6 + breath * 0.3),
    shoulderFront: point(g.shoulderSpan / 2 - 4, -6 + breath * 0.3),
    elbowBack: point(peeking || repairing ? -27 : (bonked ? -31 : -38), peeking || repairing ? 9 : (bonked ? 4 : -16)),
    wristBack: backRest,
    elbowFront: point(throwing ? 23 : 31, throwing ? -20 : (peeking || repairing ? 9 : -17)),
    wristFront: throwing ? throwHand : (repairing ? repairHand : frontRest),
    gaze: point(npc.facing < 0 ? -1 : 1, 0),
    facing: npc.facing < 0 ? -1 : 1,
    bodyLean,
    bodyRotation: throwing ? 0 : bodyLean,
    glassesJolt: bonked ? Math.sin(bonkAge * 21) * Math.max(0, 1 - bonkAge / 0.8) * 2 : 0,
    moustacheBounce: bonked ? Math.abs(wobble) * 1.6 : (shouting ? shoutPulse * 0.7 : breath * 0.18),
    blink: getBlink(elapsed),
    gazeX: 0.9,
    mouthOpen: shouting ? 0.45 + shoutPulse * 0.55 : 0,
    shoutPulse,
    rageIntensity: rage,
    throwProgress: throwing ? clamp01(throwAge / KEVIN_ANIMATION_TUNING.THROW_DURATION) : 0,
    repairPhase: repairingPhase,
    repairClothAngle: repairing ? -0.18 + repairWave * 0.22 : -0.18,
    bonkWobble: wobble,
  };
}

export class KevinAnimationController {
  constructor() {
    this.reset();
  }

  reset() {
    this.elapsed = 0;
    this.throwElapsed = 0;
    this.throwActive = false;
    this.throwJustStarted = false;
    this.bonkAge = 0;
  }

  beginThrow() {
    this.throwElapsed = 0;
    this.throwActive = true;
    this.throwJustStarted = true;
  }

  triggerBonk() {
    this.bonkAge = 0;
  }

  update(dt, npc) {
    const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
    if (elapsed <= 0) return;
    this.elapsed += elapsed;
    if (npc.state === 'THROWING_PROJECTILE') {
      if (this.throwJustStarted) this.throwJustStarted = false;
      else if (this.throwActive) this.throwElapsed = Math.min(KEVIN_ANIMATION_TUNING.THROW_DURATION, this.throwElapsed + elapsed);
    } else {
      this.throwActive = false;
      this.throwJustStarted = false;
      this.throwElapsed = 0;
    }
    if (npc.state === 'DIZZY_BONK') this.bonkAge += elapsed;
    else this.bonkAge = 0;
  }

  pose(npc) {
    return computeKevinPoseAnchors(npc, this);
  }
}

export function getKevinProjectileHandWorldPosition(npc, pose = npc.animation.pose(npc)) {
  return {
    x: npc.x + pose.facing * pose.wristFront.x,
    y: npc.y + pose.wristFront.y,
  };
}
