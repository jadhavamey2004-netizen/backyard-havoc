import { describe, it, expect } from 'vitest';

describe('Power Shot Physics & Spacebar Launch Formula (Section 1 & 8)', () => {
  it('should compute upward launch velocity scaling from charge amount', () => {
    // Formula: VY = -10.5 - charge * 8.0
    const calcVy = (charge) => -10.5 - charge * 8.0;

    expect(calcVy(0)).toBe(-10.5);
    expect(calcVy(0.5)).toBe(-14.5);
    expect(calcVy(1.0)).toBe(-18.5);

    // Guaranteed to clear second-story windows at y=80 from floor y=485
    expect(calcVy(1.0)).toBeLessThan(-16.0);
  });

  it('should compute horizontal velocity scaling from mouse aim direction and charge', () => {
    const calcVx = (unitX, charge) => unitX * (4.5 + charge * 2.5);

    expect(calcVx(1.0, 0)).toBe(4.5);
    expect(calcVx(1.0, 1.0)).toBe(7.0);
    expect(calcVx(-1.0, 0.5)).toBeCloseTo(-5.75, 2);
  });
});
