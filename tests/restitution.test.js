import { describe, it, expect } from 'vitest';
import {
  calculateNormalVelocityReflection,
  calculateKineticEnergyLoss,
  BALL_VARIANTS
} from '../src/physics.js';

describe('Restitution & Kinetic Energy Dissipation', () => {
  it('should compute normal velocity reflection using coefficient of restitution', () => {
    const vNormal = 20; // 20 m/s incoming
    const e = 0.6;      // Standard leather
    const vReflected = calculateNormalVelocityReflection(vNormal, e);
    
    // v'_normal = -e * v_normal = -12
    expect(vReflected).toBeCloseTo(-12, 2);
  });

  it('should calculate kinetic energy loss across ball variants', () => {
    const mass = 1.0;
    const vNormal = 10;
    // Initial Kinetic Energy along normal: E_k = 0.5 * m * v^2 = 0.5 * 1.0 * 100 = 50 J

    // 1. Standard Leather (e = 0.6)
    // Loss = 0.5 * m * (1 - e^2) * v^2 = 50 * (1 - 0.36) = 50 * 0.64 = 32 J
    const lossStandard = calculateKineticEnergyLoss(mass, vNormal, BALL_VARIANTS.STANDARD.restitution);
    expect(lossStandard).toBeCloseTo(32, 2);

    // 2. Superball (e = 0.98)
    // Loss = 50 * (1 - 0.98^2) = 50 * (1 - 0.9604) = 50 * 0.0396 = 1.98 J (Near-zero energy loss)
    const lossSuperball = calculateKineticEnergyLoss(mass, vNormal, BALL_VARIANTS.SUPERBALL.restitution);
    expect(lossSuperball).toBeCloseTo(1.98, 2);

    // 3. Wet Sponge (e = 0.15)
    // Loss = 50 * (1 - 0.15^2) = 50 * (1 - 0.0225) = 50 * 0.9775 = 48.875 J (High energy absorption)
    const lossWetSponge = calculateKineticEnergyLoss(mass, vNormal, BALL_VARIANTS.WET_SPONGE.restitution);
    expect(lossWetSponge).toBeCloseTo(48.875, 2);

    // 4. Flaming Ball (e = 0.5)
    // Loss = 50 * (1 - 0.5^2) = 50 * 0.75 = 37.5 J
    const lossFlaming = calculateKineticEnergyLoss(mass, vNormal, BALL_VARIANTS.FLAMING_BALL.restitution);
    expect(lossFlaming).toBeCloseTo(37.5, 2);
  });
});
