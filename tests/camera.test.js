import { describe, it, expect } from 'vitest';
import { CameraTrauma } from '../src/camera.js';

describe('Camera Trauma & Screen Shake Dynamics', () => {
  it('should initialize with 0 trauma, zoom punch, and chromatic aberration', () => {
    const cam = new CameraTrauma();
    expect(cam.trauma).toBe(0);
    expect(cam.zoomPunch).toBe(0);
    expect(cam.chromaticAberration).toBe(0);
  });

  it('should accumulate trauma and decay over time', () => {
    const cam = new CameraTrauma(1.0);
    cam.addTrauma(0.5, 0.04);

    expect(cam.trauma).toBe(0.5);
    expect(cam.zoomPunch).toBeCloseTo(0.04, 3);
    expect(cam.chromaticAberration).toBeGreaterThan(0);

    cam.decay(0.2);
    expect(cam.trauma).toBeCloseTo(0.3, 2);
    expect(cam.zoomPunch).toBeLessThan(0.04);
  });

  it('should calculate T^2 non-linear shake transform', () => {
    const cam = new CameraTrauma();
    cam.addTrauma(0.8);
    const transform = cam.getTransform(1.0);

    expect(transform).toBeDefined();
    expect(transform.zoom).toBeGreaterThanOrEqual(1.0);
    expect(typeof transform.x).toBe('number');
    expect(typeof transform.y).toBe('number');
    expect(typeof transform.angle).toBe('number');
  });

  it('tracks to the same camera target across 60 Hz and 120 Hz subdivisions', () => {
    const simulate = (dt, frames) => {
      const camera = new CameraTrauma();
      for (let i = 0; i < frames; i += 1) camera.setTargetX(800, dt);
      return camera.x;
    };
    expect(simulate(1 / 60, 60)).toBeCloseTo(simulate(1 / 120, 120), 8);
  });

  it('keeps tracking and resets all transient camera feel state', () => {
    const camera = new CameraTrauma();
    camera.setTargetX(500, 1 / 60);
    expect(camera.x).toBeGreaterThan(0);
    camera.addTrauma(2, 2);
    camera.reset();
    expect(camera.trauma).toBe(0);
    expect(camera.zoomPunch).toBe(0);
    expect(camera.chromaticAberration).toBe(0);
  });

  it('bounds repeated trauma and zoom inputs', () => {
    const camera = new CameraTrauma();
    camera.addTrauma(4, 4);
    expect(camera.trauma).toBe(1);
    expect(camera.zoomPunch).toBe(0.08);
  });

  it('bounds additive directional impulses without changing world tracking', () => {
    const camera = new CameraTrauma();
    camera.x = 640;
    camera.addImpulse(100, -100);

    const transform = camera.getTransform(0, () => 0);
    expect(Math.hypot(transform.x, transform.y)).toBeLessThanOrEqual(camera.maxImpulseOffset);
    expect(transform.worldX).toBe(640);
    expect(camera.x).toBe(640);
  });

  it('decays directional impulse equivalently at 60 Hz and 120 Hz', () => {
    const simulate = (dt, frames) => {
      const camera = new CameraTrauma();
      camera.addImpulse(8, -4);
      for (let i = 0; i < frames; i += 1) camera.decay(dt);
      return camera.getTransform(0, () => 0);
    };

    const at60 = simulate(1 / 60, 60);
    const at120 = simulate(1 / 120, 120);
    expect(at60.x).toBeCloseTo(at120.x, 10);
    expect(at60.y).toBeCloseTo(at120.y, 10);
  });

  it('recovers zoom and chromatic feedback over the same elapsed time', () => {
    const simulate = (dt, frames) => {
      const camera = new CameraTrauma();
      camera.addTrauma(0.5, 0.06, 8);
      for (let i = 0; i < frames; i += 1) camera.decay(dt);
      return camera.getTransform(0, () => 0);
    };

    const at60 = simulate(1 / 60, 60);
    const at120 = simulate(1 / 120, 120);
    expect(at60.zoom).toBeCloseTo(at120.zoom, 10);
    expect(at60.chromatic).toBeCloseTo(at120.chromatic, 10);
  });

  it('scales presentation output for reduced motion without moving the world camera', () => {
    const camera = new CameraTrauma();
    camera.x = 320;
    camera.addTrauma(0.5, 0.06, 6);
    camera.addImpulse(6, -2);
    const fullMotion = camera.getTransform(2, () => 1);

    camera.setMotionMultiplier(0.35);
    const reducedMotion = camera.getTransform(2, () => 1);

    expect(reducedMotion.x).toBeLessThan(fullMotion.x);
    expect(reducedMotion.angle).toBeLessThan(fullMotion.angle);
    expect(reducedMotion.zoom - 1).toBeCloseTo((fullMotion.zoom - 1) * 0.35, 8);
    expect(reducedMotion.chromatic).toBeCloseTo(fullMotion.chromatic * 0.35, 8);
    expect(reducedMotion.worldX).toBe(320);
    expect(camera.x).toBe(320);
  });

  it('returns finite bounded values for invalid camera input', () => {
    const camera = new CameraTrauma();
    camera.addTrauma(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN);
    camera.addImpulse(Number.POSITIVE_INFINITY, Number.NaN);
    camera.setTargetX(Number.NaN);

    const transform = camera.getTransform(Number.NaN, () => Number.NaN);
    expect(Object.values(transform).every(Number.isFinite)).toBe(true);
  });
});
