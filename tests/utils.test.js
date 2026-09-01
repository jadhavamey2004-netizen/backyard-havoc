import { describe, it, expect } from 'vitest';
import {
  createVector,
  addVectors,
  subtractVectors,
  multiplyVector,
  vectorMagnitude,
  normalizeVector,
  dotProduct,
  crossProduct2D,
  clamp
} from '../src/utils.js';

describe('Vector & Utility Mathematics', () => {
  it('should perform vector addition, subtraction, and scalar multiplication', () => {
    const v1 = createVector(10, 20);
    const v2 = createVector(5, -5);

    const sum = addVectors(v1, v2);
    expect(sum.x).toBe(15);
    expect(sum.y).toBe(15);

    const diff = subtractVectors(v1, v2);
    expect(diff.x).toBe(5);
    expect(diff.y).toBe(25);

    const scaled = multiplyVector(v1, 2);
    expect(scaled.x).toBe(20);
    expect(scaled.y).toBe(40);
  });

  it('should compute vector magnitude and normalization correctly', () => {
    const v = createVector(3, 4);
    expect(vectorMagnitude(v)).toBe(5);

    const norm = normalizeVector(v);
    expect(norm.x).toBeCloseTo(0.6, 4);
    expect(norm.y).toBeCloseTo(0.8, 4);
    expect(vectorMagnitude(norm)).toBeCloseTo(1.0, 4);

    // Zero vector should not produce NaN
    const zeroNorm = normalizeVector(createVector(0, 0));
    expect(zeroNorm.x).toBe(0);
    expect(zeroNorm.y).toBe(0);
  });

  it('should calculate dot product, 2D cross product, and clamp values', () => {
    const v1 = createVector(1, 0);
    const v2 = createVector(0, 1);

    expect(dotProduct(v1, v2)).toBe(0);
    expect(crossProduct2D(v1, v2)).toBe(1);

    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
