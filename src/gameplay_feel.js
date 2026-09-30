import { GAMEPLAY_TUNING } from './gameplay_rules.js';

export const GAMEPLAY_FEEL_TUNING = Object.freeze({
  PLAYER_MAX_SPEED: 480,
  PLAYER_SPRINT_MULTIPLIER: 1.4,
  PLAYER_ACCELERATION: 4200,
  PLAYER_DECELERATION: 5600,
  PLAYER_REVERSAL_ACCELERATION: 7500,
  NORMAL_KICK_SPEED: 11.5,
  PERFECT_STRIKE_SPEED_MULTIPLIER: 1.18,
  NORMAL_KICK_FACING_SPIN: 0.12,
  NORMAL_KICK_AIM_SPIN: 0.05,
  HEADER_SPEED: 9.5,
  HEADER_FACING_SPIN: 0.075,
  HEADER_AIM_SPIN: 0.035,
  PERFECT_STRIKE_FACING_SPIN: 0.22,
  PERFECT_STRIKE_AIM_SPIN: 0.09,
  POWER_SHOT_FACING_SPIN: 0.12,
  POWER_SHOT_CHARGE_SPIN: 0.16,
  POWER_SHOT_AIM_SPIN: 0.08,
  POWER_SHOT_MIN_SPEED: 13.5,
  POWER_SHOT_FULL_SPEED: 22,
  POWER_SHOT_HEADER_MULTIPLIER: 0.8,
  POWER_SHOT_MIN_CHARGE: 0.25,
  MAX_DOWNWARD_AIM_SLOPE: 0.2,
  BALL_MAX_SPEED: 23.5,
  BALL_DEFORM_NORMAL: 1.05,
  BALL_DEFORM_HEADER: 0.85,
  BALL_DEFORM_PERFECT_STRIKE: 1.55,
  BALL_DEFORM_POWER_BASE: 1.2,
  BALL_DEFORM_POWER_CHARGE: 0.8,
  BALL_FEEDBACK_NORMAL: 0.45,
  BALL_FEEDBACK_HEADER: 0.3,
  BALL_FEEDBACK_PERFECT_STRIKE: 0.8,
  HIT_STOP_BLOCK_SECONDS: 0.012,
  HIT_STOP_PARRY_SECONDS: 0.035,
  HIT_STOP_PERFECT_PARRY_SECONDS: 0.065,
  HIT_STOP_CONTACT_SECONDS: 0.012,
  HIT_STOP_HEADER_SECONDS: 0.015,
  HIT_STOP_POWER_SHOT_BASE_SECONDS: 0.025,
  HIT_STOP_POWER_SHOT_CHARGE_SECONDS: 0.02,
  HIT_STOP_PERFECT_STRIKE_SECONDS: 0.04,
  HIT_STOP_WORLD_IMPACT_SECONDS: 0.03,
  HIT_STOP_KEVIN_HIT_SECONDS: 0.07,
  CAMERA_TRACKING_RATE: 5,
  CAMERA_CUTSCENE_TRACKING_RATE: 7.5,
  CAMERA_BLOCK_TRAUMA: 0.18,
  CAMERA_PARRY_TRAUMA: 0.42,
  CAMERA_PERFECT_PARRY_TRAUMA: 0.78,
  CAMERA_NORMAL_KICK_TRAUMA: 0.18,
  CAMERA_HEADER_TRAUMA: 0.12,
  CAMERA_PERFECT_STRIKE_TRAUMA: 0.38,
  CAMERA_POWER_SHOT_TRAUMA_BASE: 0.35,
  CAMERA_POWER_SHOT_TRAUMA_CHARGE: 0.25,
  CAMERA_BLOCK_ZOOM: 0.015,
  CAMERA_PARRY_ZOOM: 0.035,
  CAMERA_PERFECT_PARRY_ZOOM: 0.065,
  CAMERA_NORMAL_KICK_ZOOM: 0.02,
  CAMERA_HEADER_ZOOM: 0.012,
  CAMERA_PERFECT_STRIKE_ZOOM: 0.04,
  CAMERA_POWER_SHOT_ZOOM_BASE: 0.035,
  CAMERA_POWER_SHOT_ZOOM_CHARGE: 0.03,
  POWER_SHOT_RING_BASE_COUNT: 4,
  POWER_SHOT_RING_CHARGE_COUNT: 2,
  POWER_SHOT_SHOCKWAVE_BASE_RADIUS: 72,
  POWER_SHOT_SHOCKWAVE_CHARGE_RADIUS: 38,
  POWER_SHOT_SHOCKWAVE_BASE_WIDTH: 5,
  POWER_SHOT_SHOCKWAVE_CHARGE_WIDTH: 2,
  BLOCK_IMPACT_RING_COUNT: 1,
  PARRY_IMPACT_RING_COUNT: 3,
  PERFECT_PARRY_IMPACT_RING_COUNT: 6
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

export function getKickPosePhase(progress) {
  if (progress < GAMEPLAY_TUNING.KICK_CONTACT_START) return 'ANTICIPATION';
  if (progress <= GAMEPLAY_TUNING.KICK_CONTACT_END) return 'STRIKE';
  return 'RECOVERY';
}

export function computeCameraSmoothingFactor(dt, rate = GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE) {
  return 1 - Math.exp(-Math.max(0, dt) * Math.max(0, rate));
}

export function computePowerShotStrength(charge) {
  const normalized = clamp(
    (clamp(charge, 0, 1) - GAMEPLAY_FEEL_TUNING.POWER_SHOT_MIN_CHARGE)
      / (1 - GAMEPLAY_FEEL_TUNING.POWER_SHOT_MIN_CHARGE),
    0,
    1
  );
  const eased = normalized * normalized * (3 - 2 * normalized);
  const { POWER_SHOT_MIN_SPEED, POWER_SHOT_FULL_SPEED } = GAMEPLAY_FEEL_TUNING;
  return POWER_SHOT_MIN_SPEED + (POWER_SHOT_FULL_SPEED - POWER_SHOT_MIN_SPEED) * eased;
}

function normalizeAim(aim, facing) {
  let x = Number.isFinite(aim?.x) ? aim.x : 0;
  let y = Number.isFinite(aim?.y) ? aim.y : 0;
  let length = Math.hypot(x, y);
  if (length < 1e-6) {
    x = facing < 0 ? -1 : 1;
    y = -0.5;
    length = Math.hypot(x, y);
  }
  x /= length;
  y /= length;

  // Preserve the selected horizontal direction and cap downward aim to a shallow,
  // playable trajectory. Upward aim remains available across the full range.
  if (y > 0) y = Math.min(y, Math.abs(x) * GAMEPLAY_FEEL_TUNING.MAX_DOWNWARD_AIM_SLOPE);
  length = Math.hypot(x, y);
  if (length < 1e-6) return { x: facing < 0 ? -1 : 1, y: 0 };
  return { x: x / length, y: y / length };
}

export function computeBallContactResponse({
  contactType = 'KICK',
  aim = { x: 1, y: -0.5 },
  charge = 0,
  perfectStrike = false,
  powerShot = false,
  facing = 1
} = {}) {
  const direction = normalizeAim(aim, facing);
  let speed;
  let angularVelocity;
  let tier;

  if (powerShot) {
    speed = computePowerShotStrength(charge);
    if (contactType === 'HEADER') speed *= GAMEPLAY_FEEL_TUNING.POWER_SHOT_HEADER_MULTIPLIER;
    angularVelocity = facing * (GAMEPLAY_FEEL_TUNING.POWER_SHOT_FACING_SPIN
      + clamp(charge, 0, 1) * GAMEPLAY_FEEL_TUNING.POWER_SHOT_CHARGE_SPIN)
      + direction.x * GAMEPLAY_FEEL_TUNING.POWER_SHOT_AIM_SPIN;
    tier = 'POWER_SHOT';
  } else if (contactType === 'HEADER') {
    speed = GAMEPLAY_FEEL_TUNING.HEADER_SPEED;
    angularVelocity = facing * GAMEPLAY_FEEL_TUNING.HEADER_FACING_SPIN
      + direction.x * GAMEPLAY_FEEL_TUNING.HEADER_AIM_SPIN;
    tier = 'HEADER';
  } else if (perfectStrike) {
    speed = GAMEPLAY_FEEL_TUNING.NORMAL_KICK_SPEED
      * GAMEPLAY_FEEL_TUNING.PERFECT_STRIKE_SPEED_MULTIPLIER;
    angularVelocity = facing * GAMEPLAY_FEEL_TUNING.PERFECT_STRIKE_FACING_SPIN
      + direction.x * GAMEPLAY_FEEL_TUNING.PERFECT_STRIKE_AIM_SPIN;
    tier = 'PERFECT_STRIKE';
  } else {
    speed = GAMEPLAY_FEEL_TUNING.NORMAL_KICK_SPEED;
    angularVelocity = facing * GAMEPLAY_FEEL_TUNING.NORMAL_KICK_FACING_SPIN
      + direction.x * GAMEPLAY_FEEL_TUNING.NORMAL_KICK_AIM_SPIN;
    tier = 'NORMAL';
  }

  return {
    speed,
    velocity: { x: direction.x * speed, y: direction.y * speed },
    angularVelocity,
    tier
  };
}

export function clampBallVelocity(velocity, maxSpeed = GAMEPLAY_FEEL_TUNING.BALL_MAX_SPEED) {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (!Number.isFinite(speed) || speed <= maxSpeed) return velocity;
  const scale = maxSpeed / speed;
  return { x: velocity.x * scale, y: velocity.y * scale };
}
