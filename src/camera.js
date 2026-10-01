/**
 * Camera Trauma & Smooth World Tracking Controller
 * Supports horizontal tracking across infinite procedural chunks, quadratic T^2 trauma, and zoom punch.
 */

import { perlinNoise1D } from './utils.js';
import { computeCameraSmoothingFactor, GAMEPLAY_FEEL_TUNING } from './gameplay_feel.js';

export class CameraTrauma {
  constructor(decayRate = 1.0, maxOffset = 25, maxAngle = 0.08, frequency = 25) {
    this.decayRate = decayRate;
    this.maxOffset = maxOffset;
    this.maxAngle = maxAngle;
    this.frequency = frequency;
    this.trauma = 0;
    this.zoomPunch = 0;
    this.chromaticAberration = 0;
    this.impulseX = 0;
    this.impulseY = 0;
    this.maxImpulseOffset = Math.min(10, Math.max(0, maxOffset * 0.5));
    this.impulseDecayRate = 8;
    this.motionMultiplier = 1;
    this.x = 0; // World tracking X position
  }

  setTargetX(targetX, dt = 1 / 60, smoothingRate = GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE) {
    if (!Number.isFinite(targetX) || !Number.isFinite(dt) || dt <= 0) return;
    this.x += (targetX - this.x) * computeCameraSmoothingFactor(dt, smoothingRate);
  }

  setMotionMultiplier(multiplier) {
    this.motionMultiplier = Number.isFinite(multiplier)
      ? Math.max(0, Math.min(1, multiplier))
      : 1;
  }

  addTrauma(amount, addZoom = 0.04, addChromatic = Number.isFinite(amount) ? amount * 10 : 0) {
    if (Number.isFinite(amount)) this.trauma = Math.max(0, Math.min(1, this.trauma + amount));
    if (Number.isFinite(addZoom)) this.zoomPunch = Math.max(0, Math.min(0.08, this.zoomPunch + addZoom));
    if (Number.isFinite(addChromatic)) {
      this.chromaticAberration = Math.max(0, Math.min(12, this.chromaticAberration + addChromatic));
    }
  }

  addImpulse(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    let nextX = this.impulseX + x;
    let nextY = this.impulseY + y;
    const magnitude = Math.hypot(nextX, nextY);
    if (magnitude > this.maxImpulseOffset && magnitude > 0) {
      const scale = Math.max(0, this.maxImpulseOffset - 1e-9) / magnitude;
      nextX *= scale;
      nextY *= scale;
    }
    this.impulseX = nextX;
    this.impulseY = nextY;
  }

  decay(frameSeconds) {
    const dt = Number.isFinite(frameSeconds) ? Math.max(0, frameSeconds) : 0;
    if (dt === 0) return;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - Math.max(0, this.decayRate) * dt);
    }
    if (this.zoomPunch > 0) {
      this.zoomPunch = Math.max(0, this.zoomPunch - dt * 0.35);
    }
    if (this.chromaticAberration > 0) {
      this.chromaticAberration = Math.max(0, this.chromaticAberration - dt * 35);
    }
    const impulseDecay = Math.exp(-this.impulseDecayRate * dt);
    this.impulseX *= impulseDecay;
    this.impulseY *= impulseDecay;
    if (Math.hypot(this.impulseX, this.impulseY) < 1e-4) {
      this.impulseX = 0;
      this.impulseY = 0;
    }
  }

  reset() {
    this.trauma = 0;
    this.zoomPunch = 0;
    this.chromaticAberration = 0;
    this.impulseX = 0;
    this.impulseY = 0;
  }

  getTransform(time = 0, customNoise = null) {
    const safeTime = Number.isFinite(time) ? time : 0;
    const motion = Number.isFinite(this.motionMultiplier)
      ? Math.max(0, Math.min(1, this.motionMultiplier))
      : 1;
    const shake = Math.pow(Math.max(0, Math.min(1, this.trauma)), 2); // Formula: Shake = Trauma^2

    const noise = customNoise || ((seed) => perlinNoise1D(seed * 0.05));
    const sample = (seed) => {
      const value = noise(seed);
      return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    };

    const angle = Math.max(-this.maxAngle, Math.min(this.maxAngle,
      this.maxAngle * shake * sample(safeTime * this.frequency))) * motion;
    const offsetX = Math.max(-this.maxOffset, Math.min(this.maxOffset,
      this.maxOffset * shake * sample(safeTime * this.frequency + 100) + this.impulseX)) * motion;
    const offsetY = Math.max(-this.maxOffset, Math.min(this.maxOffset,
      this.maxOffset * shake * sample(safeTime * this.frequency + 200) + this.impulseY)) * motion;

    return {
      x: offsetX,
      y: offsetY,
      worldX: Number.isFinite(this.x) ? this.x : 0,
      angle: angle,
      zoom: 1.0 + Math.max(0, Math.min(0.08, this.zoomPunch)) * motion,
      chromatic: Math.max(0, Math.min(12, this.chromaticAberration)) * motion
    };
  }

  drawChromaticEdges(ctx, width, height) {
    const intensity = Math.max(0, Math.min(12, this.chromaticAberration * this.motionMultiplier));
    if (!ctx || intensity <= 0 || width <= 0 || height <= 0) return;

    const alpha = Math.min(0.12, intensity / 12 * 0.12);
    const edgeWidth = Math.min(14, 3 + intensity * 0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(0, 0, edgeWidth, height);
    ctx.fillRect(width - edgeWidth, 0, edgeWidth, height);
    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(edgeWidth, 0, edgeWidth * 0.5, height);
    ctx.fillRect(width - edgeWidth * 1.5, 0, edgeWidth * 0.5, height);
    ctx.restore();
  }
}
