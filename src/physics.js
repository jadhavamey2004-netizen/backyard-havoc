/**
 * Physics mathematical formulations and implementations for Backyard Havoc
 */

import { subtractVectors, vectorMagnitude } from './utils.js';

// Design-doc reference specifications for ball physics profiles.
// NOTE: Runtime BALL_VARIANTS used in game logic are defined in src/game.js.
// These serve as the canonical physical spec reference per techContext.md.
export const BALL_VARIANTS = {
  STANDARD: {
    name: 'Standard Leather',
    density: 1.0,
    restitution: 0.6,
    friction: 0.3,
    drag: 0.47,
    flag: 'COLLIDE_DEFAULT'
  },
  SUPERBALL: {
    name: 'Superball',
    density: 1.2,
    restitution: 0.98,
    friction: 0.1,
    drag: 0.2,
    flag: 'BOUNCE_BOOST'
  },
  WET_SPONGE: {
    name: 'Wet Sponge',
    density: 1.5,
    restitution: 0.15,
    friction: 0.8,
    drag: 0.8,
    flag: 'SPLATTER_MUD'
  },
  FLAMING_BALL: {
    name: 'Flaming Ball',
    density: 0.9,
    restitution: 0.5,
    friction: 0.4,
    drag: 0.5,
    flag: 'IGNITE_SURFACE'
  }
};

/**
 * Formula 1.1: Impulse calculation with distance clamping and combo multiplier scaling
 * J = u * (J_base + clamped_distance * (1 + alpha * M_combo))
 */
export function calculateImpulse(
  inputPos,
  ballPos,
  baseImpulse = 10,
  minRadius = 15,
  comboMultiplier = 1,
  alpha = 0.35
) {
  const d = subtractVectors(ballPos, inputPos);
  const rawDist = vectorMagnitude(d);
  const unit = rawDist === 0 ? { x: 0, y: -1 } : { x: d.x / rawDist, y: d.y / rawDist };
  const clampedDist = Math.max(rawDist, minRadius);
  const impulseMag = baseImpulse + clampedDist * (1 + alpha * comboMultiplier);

  return {
    x: unit.x * impulseMag,
    y: unit.y * impulseMag
  };
}

/**
 * Rotational dynamics: Torque = r_offset x F_tan
 * In 2D: tau = r_x * F_y - r_y * F_x
 */
export function calculateTorque(contactOffset, forceVector) {
  return contactOffset.x * forceVector.y - contactOffset.y * forceVector.x;
}

/**
 * Moment of inertia for a uniform circular disk: I = 0.5 * m * R^2
 */
export function calculateMomentOfInertia(mass, radius) {
  return 0.5 * mass * radius * radius;
}

/**
 * Change in angular velocity: Delta omega = (Torque * dt) / I
 */
export function calculateAngularVelocityChange(torque, momentOfInertia, dt) {
  if (momentOfInertia === 0) return 0;
  return (torque * dt) / momentOfInertia;
}

/**
 * Normal velocity reflection: v'_normal = -e * v_normal
 */
export function calculateNormalVelocityReflection(velocityNormal, restitution) {
  return -restitution * velocityNormal;
}

/**
 * Kinetic energy loss: Delta E_k = 0.5 * m * (1 - e^2) * (v_normal)^2
 */
export function calculateKineticEnergyLoss(mass, velocityNormal, restitution) {
  return 0.5 * mass * (1 - restitution * restitution) * velocityNormal * velocityNormal;
}

/**
 * Sub-stepping timestep division: dt_sub = dt / N_sub
 */
export function calculateSubStepDt(dt, nSub = 4) {
  if (nSub <= 0) return dt;
  return dt / nSub;
}

/**
 * Swept-AABB / Raycast continuous collision detection between a moving circular/box body and a static box
 * Returns { hit: boolean, time: number, normal: {x, y} }
 */
export function sweptAABBIntersect(movingBox, velocity, staticBox, dt) {
  const dx = velocity.x * dt;
  const dy = velocity.y * dt;

  const mLeft = movingBox.x - movingBox.width / 2;
  const mRight = movingBox.x + movingBox.width / 2;
  const mTop = movingBox.y - movingBox.height / 2;
  const mBottom = movingBox.y + movingBox.height / 2;

  const sLeft = staticBox.x - staticBox.width / 2;
  const sRight = staticBox.x + staticBox.width / 2;
  const sTop = staticBox.y - staticBox.height / 2;
  const sBottom = staticBox.y + staticBox.height / 2;

  let xInvEntry, xInvExit;
  let yInvEntry, yInvExit;

  // Find the distance between the objects on the near and far sides for both x and y
  if (dx > 0) {
    xInvEntry = sLeft - mRight;
    xInvExit = sRight - mLeft;
  } else {
    xInvEntry = sRight - mLeft;
    xInvExit = sLeft - mRight;
  }

  if (dy > 0) {
    yInvEntry = sTop - mBottom;
    yInvExit = sBottom - mTop;
  } else {
    yInvEntry = sBottom - mTop;
    yInvExit = sTop - mBottom;
  }

  // Find time of collision and time of leaving for each axis
  let xEntry, xExit;
  let yEntry, yExit;

  if (dx === 0) {
    const isOverlappingX = mRight >= sLeft && mLeft <= sRight;
    xEntry = isOverlappingX ? -Infinity : Infinity;
    xExit = isOverlappingX ? Infinity : -Infinity;
  } else {
    xEntry = xInvEntry / dx;
    xExit = xInvExit / dx;
  }

  if (dy === 0) {
    const isOverlappingY = mBottom >= sTop && mTop <= sBottom;
    yEntry = isOverlappingY ? -Infinity : Infinity;
    yExit = isOverlappingY ? Infinity : -Infinity;
  } else {
    yEntry = yInvEntry / dy;
    yExit = yInvExit / dy;
  }

  // Find the earliest/latest times of collision
  const entryTime = Math.max(xEntry, yEntry);
  const exitTime = Math.min(xExit, yExit);

  // If there was no collision
  if (
    entryTime > exitTime ||
    (xEntry < 0 && yEntry < 0) ||
    xEntry > 1.0 ||
    yEntry > 1.0 ||
    entryTime > 1.0 ||
    entryTime < 0
  ) {
    return {
      hit: false,
      time: 1.0,
      normal: { x: 0, y: 0 }
    };
  }

  // Calculate normal of collided surface
  let normalX = 0;
  let normalY = 0;

  if (xEntry > yEntry) {
    normalX = dx > 0 ? -1 : 1;
    normalY = 0;
  } else {
    normalX = 0;
    normalY = dy > 0 ? -1 : 1;
  }

  return {
    hit: true,
    time: entryTime,
    normal: { x: normalX, y: normalY }
  };
}
