/**
 * 2D Vector mathematics and noise utilities for Backyard Havoc
 */

export function createVector(x = 0, y = 0) {
  return { x, y };
}

export function addVectors(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractVectors(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function multiplyVector(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function vectorMagnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v, minRadius = 0) {
  const mag = vectorMagnitude(v);
  const effectiveMag = Math.max(mag, minRadius);
  if (effectiveMag === 0) return { x: 0, y: 0 };
  return { x: v.x / effectiveMag, y: v.y / effectiveMag };
}

export function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function crossProduct2D(a, b) {
  return a.x * b.y - a.y * b.x;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Deterministic 1D pseudo-random noise generator in [-1, 1]
 */
export function pseudoNoise1D(x) {
  const sinVal = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
  return (sinVal - Math.floor(sinVal)) * 2 - 1;
}

export const perlinNoise1D = pseudoNoise1D;
