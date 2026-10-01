import { describe, expect, it } from 'vitest';
import {
  DESTRUCTION_PROFILES,
  MATERIALS,
  getMaterialProfile,
  validateAllMaterialProfiles,
  validateMaterialProfile
} from '../src/destruction_materials.js';

describe('destruction material profiles', () => {
  it('defines a valid immutable profile for every primary material', () => {
    expect(Object.keys(DESTRUCTION_PROFILES).sort()).toEqual([
      'CERAMIC', 'FABRIC', 'GLASS', 'METAL', 'PLASTIC', 'SOIL', 'WOOD'
    ]);
    expect(validateAllMaterialProfiles()).toEqual({ valid: true, errors: [] });

    for (const material of Object.values(MATERIALS)) {
      const profile = getMaterialProfile(material);
      expect(Object.isFrozen(profile)).toBe(true);
      expect(validateMaterialProfile(profile)).toEqual({ valid: true, errors: [] });
      expect(profile.fragmentCount).toBeGreaterThan(0);
      expect(Number.isFinite(profile.lifetime)).toBe(true);
    }
  });

  it('rejects invalid values without accepting non-finite fragment geometry settings', () => {
    expect(validateMaterialProfile({
      fragmentCount: 0,
      density: Number.NaN,
      restitution: -1,
      friction: 0,
      frictionAir: Infinity,
      lifetime: 0,
      scatter: -2,
      spin: 1,
      particleCount: -1,
      shapeFamily: 'unknown',
      visualStyle: 'unknown',
      residueType: 'unknown'
    }).valid).toBe(false);
  });
});
