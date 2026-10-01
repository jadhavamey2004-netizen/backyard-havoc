import { clamp01, easeInOutCubic, easeOutCubic, lerp, smoothstep } from './animation_utils.js';
import { PLAYER_VISUAL_STYLE } from './character_style.js';

const { geometry: g } = PLAYER_VISUAL_STYLE;
const TWO_PI = Math.PI * 2;

export const PLAYER_ANIMATION_TUNING = Object.freeze({
  IDLE_CYCLE_SECONDS: 3.2,
  RUN_CYCLE_RATE_RADIANS_PER_SECOND: 16,
  SPRINT_CYCLE_RATE_RADIANS_PER_SECOND: 24,
  START_TRANSITION_SECONDS: 0.10,
  STOP_TRANSITION_SECONDS: 0.13,
  REVERSAL_TRANSITION_SECONDS: 0.10,
  KICK_CONTACT_PROGRESS: 0.5,
  HEADER_CONTACT_PROGRESS: 0.5,
  CONTACT_ALIGNMENT_TOLERANCE: 3,
  HURT_RECOIL_SECONDS: 0.12,
  HURT_RECOVERY_SECONDS: 0.55,
  PERFECT_STRIKE_ACCENT_SECONDS: 0.20,
  POWER_SHOT_ACCENT_SECONDS: 0.26,
  BLINK_PERIOD_SECONDS: 3.7,
  BLINK_DURATION_SECONDS: 0.12,
  MAX_CHARGE_POSTURE: 0.10,
});

const isLocomotion = (state) => state === 'IDLE' || state === 'RUNNING';

function blendValue(from, to, amount, key = '') {
  if (typeof from === 'number' && typeof to === 'number' && key !== 'facing') {
    return lerp(from, to, amount);
  }
  if (from && to && typeof from === 'object' && typeof to === 'object') {
    const result = {};
    for (const childKey of Object.keys(to)) result[childKey] = blendValue(from[childKey], to[childKey], amount, childKey);
    return result;
  }
  return to;
}

function point(x, y) {
  return { x, y };
}

const RUN_POSE_KEYS = Object.freeze([
  Object.freeze({ phase: 0, foot: 0, lift: 0, kneeX: 0, kneeY: 0, arm: -1, bob: 0 }),
  Object.freeze({ phase: 0.25, foot: 0.55, lift: 0, kneeX: 0.3, kneeY: 4, arm: 0, bob: 1 }),
  Object.freeze({ phase: 0.5, foot: 0, lift: 7, kneeX: -0.25, kneeY: -1, arm: 1, bob: 0.15 }),
  Object.freeze({ phase: 0.75, foot: -0.7, lift: 4, kneeX: -0.35, kneeY: 1, arm: 0, bob: -0.4 }),
  Object.freeze({ phase: 1, foot: 0, lift: 0, kneeX: 0, kneeY: 0, arm: -1, bob: 0 }),
]);

function sampleRunPose(phase) {
  const cyclePhase = ((phase % TWO_PI) + TWO_PI) % TWO_PI / TWO_PI;
  const nextIndex = RUN_POSE_KEYS.findIndex((key) => key.phase >= cyclePhase);
  const index = Math.max(0, nextIndex - 1);
  const from = RUN_POSE_KEYS[index];
  const to = RUN_POSE_KEYS[index + 1] || RUN_POSE_KEYS[0];
  const progress = from.phase === to.phase
    ? 0
    : easeInOutCubic((cyclePhase - from.phase) / (to.phase - from.phase));
  return {
    foot: lerp(from.foot, to.foot, progress),
    lift: lerp(from.lift, to.lift, progress),
    kneeX: lerp(from.kneeX, to.kneeX, progress),
    kneeY: lerp(from.kneeY, to.kneeY, progress),
    arm: lerp(from.arm, to.arm, progress),
    bob: lerp(from.bob, to.bob, progress),
  };
}

function legRunPose(hipX, phase, stride, kneeY, ankleY) {
  const pose = sampleRunPose(phase);
  return {
    knee: point(hipX + pose.kneeX * stride * 0.45, kneeY + pose.kneeY),
    ankle: point(hipX + pose.foot * stride, ankleY - pose.lift),
    lift: pose.lift,
    arm: pose.arm,
    bob: pose.bob,
  };
}

function getBlink(elapsed, offset) {
  const phase = (elapsed + offset) % PLAYER_ANIMATION_TUNING.BLINK_PERIOD_SECONDS;
  const duration = PLAYER_ANIMATION_TUNING.BLINK_DURATION_SECONDS;
  return phase < duration ? Math.sin((phase / duration) * Math.PI) : 0;
}

function computeBasePose(player, animation) {
  const elapsed = Number.isFinite(animation?.elapsed) ? animation.elapsed : 0;
  const idlePhase = (Number.isFinite(animation?.idleElapsed) ? animation.idleElapsed : elapsed)
    / PLAYER_ANIMATION_TUNING.IDLE_CYCLE_SECONDS * TWO_PI;
  const breath = Math.sin(idlePhase) * 0.9;
  const state = player.state;
  const progress = clamp01(player.kickProgress);
  const activeKick = state === 'KICKING';
  const activeHeader = state === 'HEADING';
  const hurtWeight = Number.isFinite(animation?.hurtElapsed)
    ? 1 - smoothstep(animation.hurtElapsed / PLAYER_ANIMATION_TUNING.HURT_RECOVERY_SECONDS)
    : (state === 'HURT' ? 1 : 0);
  const runWeight = clamp01(animation?.runBlend ?? (state === 'RUNNING' ? 1 : 0));
  const runPhase = Number.isFinite(animation?.runPhase) ? animation.runPhase : 0;
  const sprint = Boolean(player.keys?.sprint);
  const stride = sprint ? 18 : 14;
  const frontLeg = legRunPose(g.hipOffsetX, runPhase, stride, g.kneeY, g.ankleY);
  const backLeg = legRunPose(-g.hipOffsetX, runPhase + Math.PI, stride, g.kneeY, g.ankleY);
  const cycleBob = (frontLeg.bob + backLeg.bob) * 0.5;
  const runLean = (sprint ? 0.18 : 0.11) * runWeight;
  const charge = player.powerCharging && !hurtWeight && !activeKick && !activeHeader
    ? clamp01(player.powerCharge)
    : 0;
  const chargeSettle = charge * PLAYER_ANIMATION_TUNING.MAX_CHARGE_POSTURE;

  const anchors = {
    root: point(Number.isFinite(player.x) ? player.x : 0, Number.isFinite(player.y) ? player.y : 0),
    pelvis: point(0, g.pelvisY + breath + runWeight * cycleBob * 1.8 + chargeSettle * 9),
    torso: point(-runLean * 10, g.torso.centerY + breath * 0.75 + chargeSettle * 8),
    neck: point(0, -67 + breath * 0.35),
    head: point(0, g.head.y + breath * 0.4 - runWeight * cycleBob * 0.55),
    shoulderBack: point(-14, g.shoulderY + breath * 0.7),
    shoulderFront: point(14, g.shoulderY + breath * 0.7),
    elbowBack: point(-23, -43),
    wristBack: point(-17, -29),
    elbowFront: point(23, -44),
    wristFront: point(17, -30),
    hipBack: point(-g.hipOffsetX, g.pelvisY),
    hipFront: point(g.hipOffsetX, g.pelvisY),
    kneeBack: backLeg.knee,
    ankleBack: backLeg.ankle,
    kneeFront: frontLeg.knee,
    ankleFront: frontLeg.ankle,
    torsoLean: runLean + Math.sin(idlePhase) * 0.012,
    torsoRotation: 0,
    headRotation: 0,
    facing: player.facing < 0 ? -1 : 1,
    runWeight,
    charge,
    hurtWeight,
    blink: getBlink(elapsed, 0.42),
    gazeX: (player.facing < 0 ? -1 : 1) * (0.6 + charge * 0.5),
    headbandSwing: Math.sin(elapsed * 7.5) * (0.5 + runWeight * 2.2),
    strikeAccent: 0,
  };
  anchors.hipBack.y += breath;
  anchors.hipFront.y += breath;

  const armSwing = frontLeg.arm * (sprint ? 13 : 9) * runWeight;
  anchors.elbowBack = point(-23 - armSwing * 0.48, -43 + backLeg.lift * 0.35 * runWeight);
  anchors.wristBack = point(-17 - armSwing, -29 + backLeg.lift * runWeight);
  anchors.elbowFront = point(23 + armSwing * 0.48, -44 + frontLeg.lift * 0.35 * runWeight);
  anchors.wristFront = point(17 + armSwing, -30 + frontLeg.lift * runWeight);

  if (charge > 0) {
    const brace = charge * 5;
    anchors.elbowBack.x += 6 * charge;
    anchors.wristBack.x += 9 * charge;
    anchors.elbowFront.x -= 6 * charge;
    anchors.wristFront.x -= 9 * charge;
    anchors.elbowBack.y += brace;
    anchors.wristBack.y += brace;
    anchors.elbowFront.y += brace;
    anchors.wristFront.y += brace;
    anchors.headRotation -= charge * 0.035;
  }

  if (activeKick) {
    const rest = point(8, 2);
    const chamber = point(21, -5);
    const squash = Math.max(0.75, Number.isFinite(player.squashY) ? player.squashY : 1);
    const contact = point(15, -22 / squash - 2);
    const extension = point(41, -10);
    const recover = point(31, 4);
    let foot;
    if (progress < 0.3) {
      foot = blendValue(rest, chamber, easeOutCubic(progress / 0.3));
    } else if (progress < 0.5) {
      foot = blendValue(chamber, contact, easeInOutCubic((progress - 0.3) / 0.2));
    } else if (progress <= 0.7) {
      foot = blendValue(contact, extension, easeOutCubic((progress - 0.5) / 0.2));
    } else if (progress < 0.88) {
      foot = blendValue(extension, recover, easeOutCubic((progress - 0.7) / 0.18));
    } else {
      foot = blendValue(recover, rest, easeInOutCubic((progress - 0.88) / 0.12));
    }
    anchors.ankleFront = foot;
    anchors.kneeFront = point(lerp(g.hipOffsetX, foot.x, 0.55), lerp(g.kneeY, foot.y, 0.42));
    anchors.torsoLean = -0.12 * (progress < 0.3 ? 1 - progress / 0.3 : 0)
      + (progress >= 0.3 ? 0.06 * Math.sin(progress * Math.PI) : 0);
    anchors.torsoRotation = -0.08 + 0.18 * Math.sin(progress * Math.PI);
    anchors.elbowBack = point(-29, -47 - Math.sin(progress * Math.PI) * 5);
    anchors.wristBack = point(-36, -36 - Math.sin(progress * Math.PI) * 3);
    anchors.elbowFront = point(25 + progress * 7, -45 - Math.sin(progress * Math.PI) * 5);
    anchors.wristFront = point(18 + progress * 10, -36 - Math.sin(progress * Math.PI) * 9);
  } else if (activeHeader) {
    let drive = 0;
    let recoil = 0;
    if (progress < 0.3) drive = -easeOutCubic(progress / 0.3);
    else if (progress <= 0.5) drive = lerp(-1, 1, easeInOutCubic((progress - 0.3) / 0.2));
    else if (progress <= 0.7) recoil = easeOutCubic((progress - 0.5) / 0.2);
    else recoil = 1 - smoothstep((progress - 0.7) / 0.3);
    const squash = Math.max(0.75, Number.isFinite(player.squashY) ? player.squashY : 1);
    anchors.head = point(
      lerp(0, 10, progress >= 0.3 && progress <= 0.5 ? drive : (progress > 0.5 ? 1 - recoil * 0.35 : 0)),
      progress >= 0.5 && progress <= 0.7
        ? lerp(-70 / squash, -65 / squash, recoil)
        : lerp(g.head.y, -70 / squash, Math.max(0, drive))
    );
    anchors.neck = point(anchors.head.x * 0.45, anchors.head.y + 10);
    anchors.torso = point(anchors.head.x * 0.22, g.torso.centerY + drive * 2 + recoil * 2);
    anchors.torsoLean = 0.14 * Math.max(0, drive) - 0.09 * recoil;
    anchors.torsoRotation = anchors.torsoLean;
    anchors.headRotation = 0.20 * Math.max(0, drive) - 0.16 * recoil;
    anchors.elbowBack = point(-31, -48);
    anchors.wristBack = point(-36, -39);
    anchors.elbowFront = point(31, -50);
    anchors.wristFront = point(38, -43);
  }

  if (hurtWeight > 0) {
    const recoil = animation.hurtElapsed <= PLAYER_ANIMATION_TUNING.HURT_RECOIL_SECONDS
      ? 1 - animation.hurtElapsed / PLAYER_ANIMATION_TUNING.HURT_RECOIL_SECONDS
      : 0;
    anchors.torso.x -= 3.5 * hurtWeight;
    anchors.torso.y += 2.5 * hurtWeight;
    anchors.torsoLean -= 0.16 * hurtWeight;
    anchors.torsoRotation -= 0.09 * hurtWeight;
    anchors.head.x -= 2 * hurtWeight;
    anchors.head.y += (3 + 3 * recoil) * hurtWeight;
    anchors.headRotation -= 0.18 * hurtWeight;
    anchors.elbowBack.x -= 4 * hurtWeight;
    anchors.elbowFront.x += 4 * hurtWeight;
    anchors.wristBack.y += 5 * hurtWeight;
    anchors.wristFront.y += 5 * hurtWeight;
    anchors.hurtWeight = hurtWeight;
  }

  if (Number.isFinite(animation?.accentElapsed) && animation.accentDuration > 0) {
    anchors.strikeAccent = 1 - smoothstep(animation.accentElapsed / animation.accentDuration);
  }
  if (activeKick && progress >= 0.7 && anchors.strikeAccent > 0) {
    anchors.ankleFront.x += anchors.strikeAccent * 3;
    anchors.elbowFront.x += anchors.strikeAccent * 2;
    anchors.torsoRotation += anchors.strikeAccent * 0.06;
  }
  return anchors;
}

export class PlayerAnimationController {
  constructor() {
    this.reset();
  }

  reset() {
    this.elapsed = 0;
    this.idleElapsed = 0;
    this.runPhase = 0;
    this.runBlend = 0;
    this.hurtElapsed = Number.POSITIVE_INFINITY;
    this.accentElapsed = Number.POSITIVE_INFINITY;
    this.accentDuration = 0;
    this.previousState = null;
    this.previousFacing = null;
    this.transitionFrom = null;
    this.transitionElapsed = 0;
    this.transitionDuration = 0;
    this.lastPose = null;
  }

  triggerHurt() {
    this.hurtElapsed = 0;
  }

  triggerActionAccent(kind = 'PERFECT_STRIKE') {
    this.accentElapsed = 0;
    this.accentDuration = kind === 'POWER_SHOT'
      ? PLAYER_ANIMATION_TUNING.POWER_SHOT_ACCENT_SECONDS
      : PLAYER_ANIMATION_TUNING.PERFECT_STRIKE_ACCENT_SECONDS;
  }

  update(dt, player) {
    const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
    if (elapsed <= 0) return;

    this.elapsed += elapsed;
    this.idleElapsed += elapsed;
    const targetRunBlend = player.state === 'RUNNING' ? 1 : 0;
    const blendDuration = targetRunBlend > this.runBlend
      ? PLAYER_ANIMATION_TUNING.START_TRANSITION_SECONDS
      : PLAYER_ANIMATION_TUNING.STOP_TRANSITION_SECONDS;
    this.runBlend += Math.sign(targetRunBlend - this.runBlend)
      * Math.min(Math.abs(targetRunBlend - this.runBlend), elapsed / blendDuration);
    if (player.state === 'RUNNING' || this.runBlend > 0) {
      const rate = player.keys?.sprint
        ? PLAYER_ANIMATION_TUNING.SPRINT_CYCLE_RATE_RADIANS_PER_SECOND
        : PLAYER_ANIMATION_TUNING.RUN_CYCLE_RATE_RADIANS_PER_SECOND;
      this.runPhase = (this.runPhase + elapsed * rate) % TWO_PI;
    }
    if (Number.isFinite(this.hurtElapsed)) this.hurtElapsed += elapsed;
    if (Number.isFinite(this.accentElapsed)) this.accentElapsed += elapsed;

    const stateChanged = this.previousState !== null && this.previousState !== player.state;
    const facingChanged = this.previousFacing !== null && this.previousFacing !== player.facing;
    const currentIsLocomotion = isLocomotion(player.state);
    if (this.lastPose && ((stateChanged && currentIsLocomotion) || (facingChanged && currentIsLocomotion))) {
      this.transitionFrom = this.lastPose;
      this.transitionElapsed = 0;
      this.transitionDuration = facingChanged
        ? PLAYER_ANIMATION_TUNING.REVERSAL_TRANSITION_SECONDS
        : (player.state === 'RUNNING'
          ? PLAYER_ANIMATION_TUNING.START_TRANSITION_SECONDS
          : PLAYER_ANIMATION_TUNING.STOP_TRANSITION_SECONDS);
    }
    if (this.transitionFrom) this.transitionElapsed += elapsed;
    if (this.transitionDuration > 0 && this.transitionElapsed >= this.transitionDuration) {
      this.transitionFrom = null;
    }
    this.previousState = player.state;
    this.previousFacing = player.facing;
    this.lastPose = this.pose(player);
  }

  pose(player) {
    const target = computeBasePose(player, this);
    if (!this.transitionFrom || this.transitionDuration <= 0 || !isLocomotion(player.state)) return target;
    const blend = smoothstep(this.transitionElapsed / this.transitionDuration);
    return blendValue(this.transitionFrom, target, blend);
  }
}

export function getPlayerVisualKickContact(player, pose = player.animation.pose(player)) {
  const squash = Number.isFinite(player.squashY) ? player.squashY : 1;
  return {
    x: pose.root.x + pose.facing * (pose.ankleFront.x + 17),
    y: pose.root.y + (pose.ankleFront.y + 2) * squash,
  };
}
