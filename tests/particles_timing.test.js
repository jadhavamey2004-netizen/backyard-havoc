import { describe, expect, it } from 'vitest';
import { ParticleSystem } from '../src/particles.js';

const makeParticle = () => ({
  x: 0,
  y: 0,
  vx: 60,
  vy: -30,
  gravity: 12,
  size: 8,
  life: 2,
  maxLife: 2,
  alpha: 1
});

function simulateParticleMotion(hz, motionMultiplier = 1) {
  const particles = new ParticleSystem();
  particles.setMotionMultiplier(motionMultiplier);
  particles.particles.push(makeParticle());
  for (let i = 0; i < hz; i += 1) particles.update(1 / hz);
  return particles.particles[0];
}

describe('time-correct particle presentation', () => {
  it('moves particles at equivalent rates over one second at 60 Hz and 120 Hz', () => {
    const at60 = simulateParticleMotion(60);
    const at120 = simulateParticleMotion(120);

    expect(at60.x).toBeCloseTo(at120.x, 8);
    expect(at60.y).toBeCloseTo(at120.y, 1);
    expect(at60.vy).toBeCloseTo(at120.vy, 8);
    expect(at60.life).toBeCloseTo(at120.life, 8);
  });

  it('advances shockwave, ring, vignette, and pop-text lifetimes consistently', () => {
    const simulate = (hz) => {
      const particles = new ParticleSystem();
      particles.spawnShockwave(10, 20, 90);
      particles.spawnImpactRings(10, 20, 1);
      particles.spawnVignetteFlash(undefined, 0.8);
      particles.spawnPopText(10, 20, 'TIMED');
      for (let i = 0; i < hz / 5; i += 1) particles.update(1 / hz);
      return {
        shockwave: particles.shockwaves[0],
        ring: particles.impactRings[0],
        vignette: particles.vignettes[0],
        popText: particles.popTexts[0]
      };
    };

    const at60 = simulate(60);
    const at120 = simulate(120);
    expect(at60.shockwave.radius).toBeCloseTo(at120.shockwave.radius, 8);
    expect(at60.shockwave.life).toBeCloseTo(at120.shockwave.life, 8);
    expect(at60.ring.radius).toBeCloseTo(at120.ring.radius, 8);
    expect(at60.ring.life).toBeCloseTo(at120.ring.life, 8);
    expect(at60.vignette.life).toBeCloseTo(at120.vignette.life, 8);
    expect(at60.popText.y).toBeCloseTo(at120.popText.y, 1);
    expect(at60.popText.life).toBeCloseTo(at120.popText.life, 8);
  });

  it('bounds every transient effect collection at its declared hard cap', () => {
    const particles = new ParticleSystem(5);
    particles.spawnDebris(0, 0, 20);
    particles.spawnFire(0, 0, 20);
    particles.spawnDust(0, 0, 20);
    particles.spawnYardClearFireworks(0, 0);
    for (let i = 0; i < 30; i += 1) {
      particles.spawnShockwave(0, 0);
      particles.spawnPowerBeam(0, 0);
      particles.spawnVignetteFlash();
      particles.spawnPopText(0, 0, 'CAP');
      particles.spawnSprintLines(0, 0);
      particles.spawnLightningArc(0, 0, 20, 10);
      particles.spawnImpactRings(0, 0, 10);
      particles.addTrailPoint({ x: i, y: i });
    }

    expect(particles.particles.length).toBeLessThanOrEqual(5);
    expect(particles.shockwaves.length).toBeLessThanOrEqual(20);
    expect(particles.powerBeams.length).toBeLessThanOrEqual(8);
    expect(particles.vignettes.length).toBeLessThanOrEqual(6);
    expect(particles.popTexts.length).toBeLessThanOrEqual(30);
    expect(particles.speedLines.length).toBeLessThanOrEqual(64);
    expect(particles.lightningArcs.length).toBeLessThanOrEqual(30);
    expect(particles.impactRings.length).toBeLessThanOrEqual(25);
    expect(particles.trailPoints.length).toBeLessThanOrEqual(60);
  });

  it('caps particle creation and resets the presentation clock and buffers', () => {
    const particles = new ParticleSystem(2);
    particles.spawnDebris(0, 0, 20);
    particles.update(0.25);
    particles.spawnShockwave(0, 0);
    particles.addTrailPoint({ x: 0, y: 0 });

    expect(particles.particles).toHaveLength(2);
    expect(particles.presentationTimeSeconds).toBeCloseTo(0.25);
    particles.clear();
    expect(particles.presentationTimeSeconds).toBe(0);
    expect(particles.particles).toHaveLength(0);
    expect(particles.shockwaves).toHaveLength(0);
    expect(particles.trailPoints).toHaveLength(0);
  });

  it('uses simulation presentation time rather than wall-clock time for rainbow trails', () => {
    const first = new ParticleSystem();
    const second = new ParticleSystem();
    first.setSeed(42);
    second.setSeed(42);
    const point = { x: 10, y: 20 };

    first.addTrailPoint(point, undefined, undefined, 10, 0.12);
    second.addTrailPoint(point, undefined, undefined, 10, 0.12);

    expect(first.trailPoints[0].color).toBe(second.trailPoints[0].color);
    expect(first.trailPoints[0].color).toBe('#facc15');
  });

  it('scales particle travel when reduced motion is enabled', () => {
    const normal = simulateParticleMotion(60);
    const reduced = simulateParticleMotion(60, 0.35);
    expect(reduced.x).toBeCloseTo(normal.x * 0.35, 8);
    expect(reduced.y).toBeLessThan(normal.y);
  });

  it('keeps particle state finite when elapsed time is invalid', () => {
    const particles = new ParticleSystem();
    particles.particles.push(makeParticle());
    particles.update(Number.NaN);
    const state = particles.particles[0];
    expect([state.x, state.y, state.vy, state.life, state.alpha].every(Number.isFinite)).toBe(true);
  });
});
