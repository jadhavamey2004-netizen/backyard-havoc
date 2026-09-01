import { describe, it, expect } from 'vitest';
import {
  calculateSubStepDt,
  sweptAABBIntersect
} from '../src/physics.js';

describe('Collision Resolution & Anti-Tunneling (Swept-AABB & Sub-Stepping)', () => {
  it('should accurately divide frame timestep into sub-step increments (N_sub)', () => {
    const dt = 1 / 60; // ~0.01667 s
    const nSub = 4;
    const dtSub = calculateSubStepDt(dt, nSub);

    expect(dtSub).toBeCloseTo(1 / 240, 6);
  });

  it('should detect when a fast-moving body would tunnel through a thin obstacle', () => {
    // Fast moving ball (radius = 5, center = (50, 100))
    // AABB: minX = 45, maxX = 55, minY = 95, maxY = 105
    const movingBall = {
      x: 50,
      y: 100,
      width: 10,
      height: 10
    };

    // Very high horizontal velocity: 2000 px/s
    const velocity = { x: 2000, y: 0 };
    const dt = 1 / 60; // in 1 frame, travels 2000 * (1/60) = 33.33 px -> reaches x = 83.33

    // Thin window barrier positioned at x = 70 to 75 (thickness = 5px)
    const thinWall = {
      x: 72.5,
      y: 100,
      width: 5,
      height: 100
    };

    const intersection = sweptAABBIntersect(movingBall, velocity, thinWall, dt);

    expect(intersection).toBeDefined();
    expect(intersection.hit).toBe(true);
    expect(intersection.time).toBeGreaterThan(0);
    expect(intersection.time).toBeLessThanOrEqual(1.0);
    // Contact point or normal should face against incoming velocity
    expect(intersection.normal.x).toBe(-1);
    expect(intersection.normal.y).toBe(0);
  });

  it('should return hit: false when trajectory does not cross the obstacle', () => {
    const movingBall = {
      x: 50,
      y: 100,
      width: 10,
      height: 10
    };

    // Moving vertically away from wall
    const velocity = { x: 0, y: -500 };
    const dt = 1 / 60;

    const thinWall = {
      x: 72.5,
      y: 100,
      width: 5,
      height: 100
    };

    const intersection = sweptAABBIntersect(movingBall, velocity, thinWall, dt);

    expect(intersection).toBeDefined();
    expect(intersection.hit).toBe(false);
  });
});
