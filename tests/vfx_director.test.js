import { describe, expect, it } from 'vitest';
import { CameraTrauma } from '../src/camera.js';
import { ParticleSystem } from '../src/particles.js';
import { resolveVfxProfile, VfxDirector } from '../src/vfx_director.js';

describe('Phase 7 VFX feedback profiles', () => {
  it('keeps the feedback hierarchy ordered by gameplay importance', () => {
    const intensity = (name, options) => resolveVfxProfile(name, options).intensity;
    expect(intensity('PERFECT_PARRY')).toBeGreaterThan(intensity('PARRY'));
    expect(intensity('PARRY')).toBeGreaterThan(intensity('BLOCK'));
    expect(intensity('PERFECT_STRIKE')).toBeGreaterThan(intensity('NORMAL_CONTACT'));
    expect(intensity('POWER_SHOT', { charge: 1 })).toBeGreaterThan(intensity('PERFECT_STRIKE'));
    expect(intensity('PERFECT_PARRY')).toBeGreaterThan(intensity('POWER_SHOT', { charge: 1 }));
    expect(intensity('POWER_SHOT', { charge: 1 })).toBeGreaterThanOrEqual(
      intensity('POWER_SHOT', { charge: 0.25 })
    );
    expect(intensity('KEVIN_HIT')).toBeGreaterThan(intensity('NORMAL_CONTACT'));
    expect(intensity('HAVOC_STARTED')).toBeGreaterThan(intensity('OBJECT_DESTROYED'));
  });

  it('scales visible Power Shot recipes from minimum to maximum charge', () => {
    const minimum = resolveVfxProfile('POWER_SHOT', { charge: 0.25 });
    const maximum = resolveVfxProfile('POWER_SHOT', { charge: 1 });
    expect(maximum.intensity).toBeGreaterThan(minimum.intensity);
    expect(maximum.ringCount).toBeGreaterThanOrEqual(minimum.ringCount);
    expect(maximum.shockwaveRadius).toBeGreaterThan(minimum.shockwaveRadius);
    expect(maximum.beamWidth).toBeGreaterThan(minimum.beamWidth);
  });

  it('keeps profiles presentation-only', () => {
    const profile = resolveVfxProfile('PERFECT_PARRY');
    expect(Object.keys(profile)).not.toEqual(expect.arrayContaining([
      'score', 'rage', 'health', 'combo', 'havoc', 'physics'
    ]));
  });

  it('coordinates the Perfect Parry recipe through existing camera and particle systems', () => {
    const camera = new CameraTrauma(1, 20, 0.05, 20);
    const particles = new ParticleSystem();
    const director = new VfxDirector({ camera, particles });

    director.present('PERFECT_PARRY', { x: 12, y: 24, direction: 1 });

    expect(camera.trauma).toBeCloseTo(0.78);
    expect(camera.zoomPunch).toBeCloseTo(0.065);
    expect(camera.chromaticAberration).toBeGreaterThan(0);
    expect(camera.impulseX).toBeGreaterThan(0);
    expect(particles.impactRings).toHaveLength(6);
    expect(particles.shockwaves).toHaveLength(1);
    expect(particles.lightningArcs).toHaveLength(4);
    expect(particles.vignettes).toHaveLength(1);
    expect(particles.popTexts).toHaveLength(0);
  });

  it('dispatches gameplay presentation events without changing event or economy data', () => {
    const camera = new CameraTrauma();
    const particles = new ParticleSystem();
    const director = new VfxDirector({ camera, particles });
    const event = { type: 'BALL_CONTACT', contactType: 'KICK', score: 150, combo: 2, perfectStrike: true };

    director.handleGameplayEvent(event, { x: 100, y: 200, direction: 1 });

    expect(camera.trauma).toBeGreaterThan(0);
    expect(particles.shockwaves).toHaveLength(1);
    expect(event).toEqual({ type: 'BALL_CONTACT', contactType: 'KICK', score: 150, combo: 2, perfectStrike: true });
  });
});
