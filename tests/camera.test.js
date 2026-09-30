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
});
