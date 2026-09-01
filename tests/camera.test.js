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
});
