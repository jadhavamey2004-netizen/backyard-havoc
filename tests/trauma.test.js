import { describe, it, expect } from 'vitest';
import { CameraTrauma } from '../src/camera.js';

describe('Camera Trauma & Shake Dynamics', () => {
  it('should accumulate trauma additively and clamp at 1.0', () => {
    const cam = new CameraTrauma(1.2, 25, 0.08, 25);
    expect(cam.trauma).toBe(0);

    cam.addTrauma(0.4);
    expect(cam.trauma).toBeCloseTo(0.4, 4);

    cam.addTrauma(0.3);
    expect(cam.trauma).toBeCloseTo(0.7, 4);

    // Overflows 1.0 -> should clamp to 1.0
    cam.addTrauma(0.5);
    expect(cam.trauma).toBeCloseTo(1.0, 4);
  });

  it('should linearly decay trauma over time and clamp at 0', () => {
    const decayRate = 1.0; // 1.0 per second
    const cam = new CameraTrauma(decayRate, 25, 0.08, 25);
    cam.addTrauma(0.8);

    // After 0.5s: 0.8 - 1.0 * 0.5 = 0.3
    cam.decay(0.5);
    expect(cam.trauma).toBeCloseTo(0.3, 4);

    // After another 0.5s: 0.3 - 0.5 = -0.2 -> clamped to 0
    cam.decay(0.5);
    expect(cam.trauma).toBe(0);
  });

  it('should apply quadratic trauma exponent (T^2) to compute camera transform offsets', () => {
    const maxOffset = 20;
    const maxAngle = 0.1;
    const cam = new CameraTrauma(1.0, maxOffset, maxAngle, 20);

    // Mock noise function returning 1.0
    const mockNoise = () => 1.0;

    // With trauma = 0 -> shake should be 0
    const shake0 = cam.getTransform(0, mockNoise);
    expect(shake0.x).toBe(0);
    expect(shake0.y).toBe(0);
    expect(shake0.angle).toBe(0);

    // With trauma = 0.5 -> T^2 = 0.25
    cam.addTrauma(0.5);
    const shakeHalf = cam.getTransform(0, mockNoise);
    // x = maxOffset * T^2 * 1.0 = 20 * 0.25 = 5.0
    expect(shakeHalf.x).toBeCloseTo(5.0, 2);
    expect(shakeHalf.y).toBeCloseTo(5.0, 2);
    // angle = maxAngle * T^2 * 1.0 = 0.1 * 0.25 = 0.025
    expect(shakeHalf.angle).toBeCloseTo(0.025, 4);

    // With trauma = 1.0 -> T^2 = 1.0
    cam.addTrauma(0.5); // total = 1.0
    const shakeFull = cam.getTransform(0, mockNoise);
    expect(shakeFull.x).toBeCloseTo(20.0, 2);
    expect(shakeFull.y).toBeCloseTo(20.0, 2);
    expect(shakeFull.angle).toBeCloseTo(0.1, 4);
  });
});
