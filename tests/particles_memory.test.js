import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem } from '../src/particles.js';

describe('Particle System & Memory Lifecycle', () => {
  let particles;

  beforeEach(() => {
    particles = new ParticleSystem(100);
  });

  it('enforces maximum particle count limit', () => {
    particles.spawnDebris(0, 0, 150);
    expect(particles.particles.length).toBeLessThanOrEqual(100);
  });

  it('clears all particle buffers when clear() is invoked', () => {
    particles.spawnImpactRings(10, 10, 5);
    particles.spawnPopText(20, 20, 'TEST');
    particles.addTrailPoint({ x: 30, y: 30 });

    particles.clear();
    expect(particles.impactRings.length).toBe(0);
    expect(particles.popTexts.length).toBe(0);
    expect(particles.trailPoints.length).toBe(0);
  });

  it('consumes hit-stop by elapsed simulation seconds including partial-frame remainder', () => {
    particles.triggerHitStop(0.05);
    expect(particles.consumeHitStop(0.02)).toBe(0);
    expect(particles.consumeHitStop(0.02)).toBe(0);
    expect(particles.consumeHitStop(0.02)).toBeCloseTo(0.01, 10);
    expect(particles.hitStopRemainingSeconds).toBe(0);
  });

  it('ignores invalid NaN coordinates in addTrailPoint', () => {
    particles.addTrailPoint({ x: NaN, y: 10 });
    expect(particles.trailPoints.length).toBe(0);
  });
});
