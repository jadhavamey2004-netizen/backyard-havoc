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
    this.x = 0; // World tracking X position
  }

  setTargetX(targetX, dt = 1 / 60, smoothingRate = GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE) {
    this.x += (targetX - this.x) * computeCameraSmoothingFactor(dt, smoothingRate);
  }

  addTrauma(amount, addZoom = 0.04) {
    this.trauma = Math.min(1.0, this.trauma + amount);
    this.zoomPunch = Math.min(0.08, this.zoomPunch + addZoom);
    this.chromaticAberration = Math.min(12, this.chromaticAberration + amount * 10);
  }

  decay(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.decayRate * dt);
    }
    if (this.zoomPunch > 0) {
      this.zoomPunch = Math.max(0, this.zoomPunch - dt * 0.35);
    }
    if (this.chromaticAberration > 0) {
      this.chromaticAberration = Math.max(0, this.chromaticAberration - dt * 35);
    }
  }

  reset() {
    this.trauma = 0;
    this.zoomPunch = 0;
    this.chromaticAberration = 0;
  }

  getTransform(time = 0, customNoise = null) {
    const shake = Math.pow(this.trauma, 2); // Formula: Shake = Trauma^2

    const noise = customNoise || ((seed) => perlinNoise1D(seed * 0.05));

    const angle = this.maxAngle * shake * noise(time * this.frequency);
    const offsetX = this.maxOffset * shake * noise(time * this.frequency + 100);
    const offsetY = this.maxOffset * shake * noise(time * this.frequency + 200);

    return {
      x: offsetX,
      y: offsetY,
      worldX: this.x,
      angle: angle,
      zoom: 1.0 + this.zoomPunch,
      chromatic: this.chromaticAberration
    };
  }
}
