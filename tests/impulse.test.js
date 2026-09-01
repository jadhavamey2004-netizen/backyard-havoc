import { describe, it, expect } from 'vitest';
import {
  calculateImpulse,
  calculateTorque,
  calculateMomentOfInertia,
  calculateAngularVelocityChange
} from '../src/physics.js';
import { vectorMagnitude } from '../src/utils.js';

describe('Impulse & Trajectory Mechanics (Formula 1.1)', () => {
  const baseImpulse = 10;
  const minRadius = 15;
  const alpha = 0.35;

  it('should correctly normalize unit direction vector and compute impulse for standard input', () => {
    const inputPos = { x: 100, y: 150 }; // Tap below ball
    const ballPos = { x: 100, y: 100 };  // Ball at (100, 100)
    // Displacement d = ballPos - inputPos = (0, -50), magnitude = 50 >= minRadius
    const combo = 1;
    const impulse = calculateImpulse(inputPos, ballPos, baseImpulse, minRadius, combo, alpha);

    expect(impulse).toBeDefined();
    expect(impulse.x).toBeCloseTo(0, 4);
    // Upward impulse in 2D canvas (negative y)
    expect(impulse.y).toBeLessThan(0);
    // Expected magnitude = (J_base + dist * (1 + alpha * combo)) = 10 + 50 * (1 + 0.35 * 1) = 10 + 67.5 = 77.5
    const mag = vectorMagnitude(impulse);
    expect(mag).toBeCloseTo(77.5, 2);
  });

  it('should clamp distance when input is within minimum interaction radius (r_min = 15)', () => {
    const inputPos = { x: 100, y: 105 }; // Distance = 5 < 15
    const ballPos = { x: 100, y: 100 };
    const combo = 1;
    const impulse = calculateImpulse(inputPos, ballPos, baseImpulse, minRadius, combo, alpha);

    expect(impulse).toBeDefined();
    // Clamped distance should be 15
    // Expected magnitude = 10 + 15 * (1 + 0.35 * 1) = 10 + 20.25 = 30.25
    const mag = vectorMagnitude(impulse);
    expect(mag).toBeCloseTo(30.25, 2);
  });

  it('should scale impulse magnitude with combo multipliers (M_combo = 1, 5, 10)', () => {
    const inputPos = { x: 100, y: 150 };
    const ballPos = { x: 100, y: 100 };
    const dist = 50;

    const impulse1 = calculateImpulse(inputPos, ballPos, baseImpulse, minRadius, 1, alpha);
    const impulse5 = calculateImpulse(inputPos, ballPos, baseImpulse, minRadius, 5, alpha);
    const impulse10 = calculateImpulse(inputPos, ballPos, baseImpulse, minRadius, 10, alpha);

    const mag1 = vectorMagnitude(impulse1);
    const mag5 = vectorMagnitude(impulse5);
    const mag10 = vectorMagnitude(impulse10);

    // M_combo = 1: 10 + 50 * (1 + 0.35 * 1) = 77.5
    expect(mag1).toBeCloseTo(77.5, 2);
    // M_combo = 5: 10 + 50 * (1 + 0.35 * 5) = 10 + 50 * 2.75 = 147.5
    expect(mag5).toBeCloseTo(147.5, 2);
    // M_combo = 10: 10 + 50 * (1 + 0.35 * 10) = 10 + 50 * 4.5 = 235.0
    expect(mag10).toBeCloseTo(235.0, 2);

    expect(mag10).toBeGreaterThan(mag5);
    expect(mag5).toBeGreaterThan(mag1);
  });

  it('should correctly compute rotational dynamics and change in angular velocity', () => {
    const mass = 0.5; // 0.5 kg
    const radius = 20; // 20 px
    const dt = 1 / 60; // 60Hz step

    // Moment of inertia for solid circle: I = 0.5 * m * r^2 = 0.5 * 0.5 * 400 = 100
    const I = calculateMomentOfInertia(mass, radius);
    expect(I).toBeCloseTo(100, 2);

    // Tangential force at contact offset r = (10, 0) with force F = (0, 50)
    const contactOffset = { x: 10, y: 0 };
    const forceVector = { x: 0, y: 50 };
    const torque = calculateTorque(contactOffset, forceVector);
    // Torque tau = r_x * F_y - r_y * F_x = 10 * 50 - 0 = 500
    expect(torque).toBeCloseTo(500, 2);

    // Delta omega = (Torque * dt) / I = (500 * (1/60)) / 100 = 5 / 60 = 0.0833 rad/s
    const deltaOmega = calculateAngularVelocityChange(torque, I, dt);
    expect(deltaOmega).toBeCloseTo(0.08333, 4);
  });
});
