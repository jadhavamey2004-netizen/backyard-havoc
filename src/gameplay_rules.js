export const GAMEPLAY_TUNING = Object.freeze({
  KICK_ACTION_DURATION: 0.38,
  KICK_CONTACT_START: 0.30,
  KICK_CONTACT_END: 0.70,
  FOOT_CONTACT_RADIUS: 95,
  HEADER_CONTACT_RADIUS: 45,
  PERFECT_STRIKE_RADIUS: 45,
  POWER_CHARGE_START_DELAY: 0.20,
  POWER_CHARGE_RAMP_DURATION: 0.85,
  POWER_SHOT_MIN_CHARGE: 0.25,
  COMBO_GROUND_GRACE_SECONDS: 0.8,
  DEFENSE_ENVELOPE_RADIUS: 120,
  PROJECTILE_PLAYER_CONTACT_RADIUS: 40,
  BLOCK_MAX_TIME_TO_CONTACT: 0.60,
  PARRY_MAX_TIME_TO_CONTACT: 0.25,
  PERFECT_PARRY_MAX_TIME_TO_CONTACT: 0.08,
  PROJECTILE_FORECAST_STEP_SECONDS: 0.01,
  MATTER_BASE_HZ: 60,
  MATTER_GRAVITY_MILLISECONDS_TO_SECONDS: 1000000,
  PROJECTILE_BLOCK_DEFLECTION_SPEED: 10,
  PROJECTILE_RETURN_SPEED: 14,
  BLOCK_REWARD: 100,
  PARRY_REWARD: 500,
  PERFECT_PARRY_REWARD: 1000,
  NORMAL_CONTACT_REWARD: 100,
  PERFECT_STRIKE_REWARD: 150
});

export function getContactPhase(progress) {
  return progress >= GAMEPLAY_TUNING.KICK_CONTACT_START
    && progress <= GAMEPLAY_TUNING.KICK_CONTACT_END;
}

export function getPowerCharge(elapsedHoldSeconds) {
  const { POWER_CHARGE_START_DELAY: delay, POWER_CHARGE_RAMP_DURATION: ramp } = GAMEPLAY_TUNING;
  return Math.max(0, Math.min(1, (elapsedHoldSeconds - delay) / ramp));
}

function distanceAt(time, position, velocity, acceleration, playerPosition, playerVelocity) {
  const x = position.x + velocity.x * time + 0.5 * acceleration.x * time * time
    - playerPosition.x - playerVelocity.x * time;
  const y = position.y + velocity.y * time + 0.5 * acceleration.y * time * time
    - playerPosition.y - playerVelocity.y * time;
  return Math.hypot(x, y);
}

export function getProjectileThreat(
  projectilePosition,
  projectileVelocityPerSecond,
  projectileAccelerationPerSecondSquared,
  playerPosition,
  playerVelocityPerSecond,
  tuning = GAMEPLAY_TUNING
) {
  const {
    BLOCK_MAX_TIME_TO_CONTACT: horizon,
    DEFENSE_ENVELOPE_RADIUS: envelope,
    PROJECTILE_PLAYER_CONTACT_RADIUS: radius,
    PROJECTILE_FORECAST_STEP_SECONDS: step
  } = tuning;
  const acceleration = projectileAccelerationPerSecondSquared || { x: 0, y: 0 };
  const playerVelocity = playerVelocityPerSecond || { x: 0, y: 0 };
  const initialDistance = Math.hypot(
    projectilePosition.x - playerPosition.x,
    projectilePosition.y - playerPosition.y
  );

  // Current overlap belongs to ordinary collision handling, never a defensive tier.
  if (initialDistance <= radius || initialDistance > envelope || horizon <= 0 || step <= 0) return null;

  let earliestContact = null;
  let closestDistance = initialDistance;
  let previousTime = 0;
  const steps = Math.ceil(horizon / step);

  for (let index = 1; index <= steps; index += 1) {
    const time = Math.min(index * step, horizon);
    const distance = distanceAt(time, projectilePosition, projectileVelocityPerSecond,
      acceleration, playerPosition, playerVelocity);
    closestDistance = Math.min(closestDistance, distance);

    if (earliestContact === null && distance <= radius) {
      let low = previousTime;
      let high = time;
      for (let iteration = 0; iteration < 12; iteration += 1) {
        const middle = (low + high) / 2;
        if (distanceAt(middle, projectilePosition, projectileVelocityPerSecond,
          acceleration, playerPosition, playerVelocity) <= radius) high = middle;
        else low = middle;
      }
      earliestContact = high;
    }

    previousTime = time;
  }

  if (earliestContact === null || earliestContact <= 0) return null;
  return { timeToContact: earliestContact, closestDistance };
}

export function selectEarliestThreat(threats) {
  return [...threats].sort((left, right) =>
    left.timeToContact - right.timeToContact
    || left.closestDistance - right.closestDistance
    || (left.body?.id ?? 0) - (right.body?.id ?? 0)
  )[0] || null;
}

export function classifyDefense(timeToContact, tuning = GAMEPLAY_TUNING) {
  if (!(timeToContact > 0) || timeToContact > tuning.BLOCK_MAX_TIME_TO_CONTACT) return 'MISS';
  if (timeToContact <= tuning.PERFECT_PARRY_MAX_TIME_TO_CONTACT) return 'PERFECT_PARRY';
  if (timeToContact <= tuning.PARRY_MAX_TIME_TO_CONTACT) return 'PARRY';
  return 'BLOCK';
}
