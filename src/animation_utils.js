export function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function lerp(start, end, amount) {
  return start + (end - start) * clamp01(amount);
}

export function smoothstep(amount) {
  const t = clamp01(amount);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(amount) {
  const inverse = 1 - clamp01(amount);
  return 1 - inverse * inverse * inverse;
}

export function easeInOutCubic(amount) {
  const t = clamp01(amount);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2;
}
