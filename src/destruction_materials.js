const SHAPE_FAMILIES = Object.freeze([
  'triangle', 'chip', 'splinter', 'scrap', 'molded', 'fabric-strip', 'clod'
]);

const VISUAL_STYLES = Object.freeze([
  'cool-glint', 'glazed', 'wood-grain', 'metallic', 'bright-molded', 'woven', 'earthy'
]);

const RESIDUE_TYPES = Object.freeze([
  'glass-glints', 'ceramic-chips', 'wood-splinters', 'metal-scrap',
  'plastic-scraps', 'collapsed-fabric', 'disturbed-soil'
]);

export const MATERIALS = Object.freeze({
  GLASS: 'GLASS',
  WOOD: 'WOOD',
  CERAMIC: 'CERAMIC',
  METAL: 'METAL',
  PLASTIC: 'PLASTIC',
  FABRIC: 'FABRIC',
  SOIL: 'SOIL'
});

export const DESTRUCTION_PROFILES = Object.freeze({
  [MATERIALS.GLASS]: Object.freeze({
    fragmentCount: 9,
    shapeFamily: 'triangle',
    density: 0.00045,
    restitution: 0.55,
    friction: 0.08,
    frictionAir: 0.008,
    lifetime: 2.2,
    scatter: 4.8,
    spin: 0.24,
    particleCount: 12,
    visualStyle: 'cool-glint',
    residueType: 'glass-glints'
  }),
  [MATERIALS.WOOD]: Object.freeze({
    fragmentCount: 6,
    shapeFamily: 'splinter',
    density: 0.00065,
    restitution: 0.15,
    friction: 0.42,
    frictionAir: 0.025,
    lifetime: 3,
    scatter: 3.2,
    spin: 0.12,
    particleCount: 6,
    visualStyle: 'wood-grain',
    residueType: 'wood-splinters'
  }),
  [MATERIALS.CERAMIC]: Object.freeze({
    fragmentCount: 6,
    shapeFamily: 'chip',
    density: 0.0007,
    restitution: 0.25,
    friction: 0.34,
    frictionAir: 0.018,
    lifetime: 2.6,
    scatter: 3.5,
    spin: 0.18,
    particleCount: 8,
    visualStyle: 'glazed',
    residueType: 'ceramic-chips'
  }),
  [MATERIALS.METAL]: Object.freeze({
    fragmentCount: 4,
    shapeFamily: 'scrap',
    density: 0.0014,
    restitution: 0.12,
    friction: 0.55,
    frictionAir: 0.012,
    lifetime: 3.6,
    scatter: 2.3,
    spin: 0.28,
    particleCount: 4,
    visualStyle: 'metallic',
    residueType: 'metal-scrap'
  }),
  [MATERIALS.PLASTIC]: Object.freeze({
    fragmentCount: 5,
    shapeFamily: 'molded',
    density: 0.00045,
    restitution: 0.36,
    friction: 0.26,
    frictionAir: 0.018,
    lifetime: 2.4,
    scatter: 3.8,
    spin: 0.16,
    particleCount: 6,
    visualStyle: 'bright-molded',
    residueType: 'plastic-scraps'
  }),
  [MATERIALS.FABRIC]: Object.freeze({
    fragmentCount: 3,
    shapeFamily: 'fabric-strip',
    density: 0.0002,
    restitution: 0.04,
    friction: 0.3,
    frictionAir: 0.12,
    lifetime: 1.8,
    scatter: 2.5,
    spin: 0.1,
    particleCount: 3,
    visualStyle: 'woven',
    residueType: 'collapsed-fabric'
  }),
  [MATERIALS.SOIL]: Object.freeze({
    fragmentCount: 6,
    shapeFamily: 'clod',
    density: 0.0005,
    restitution: 0.03,
    friction: 0.88,
    frictionAir: 0.04,
    lifetime: 2,
    scatter: 2.8,
    spin: 0.08,
    particleCount: 4,
    visualStyle: 'earthy',
    residueType: 'disturbed-soil'
  })
});

export function validateMaterialProfile(profile) {
  const errors = [];
  const finiteNonNegative = [
    'density', 'friction', 'frictionAir', 'scatter', 'spin'
  ];
  const finitePositive = ['lifetime'];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['profile must be an object'] };
  }

  if (!Number.isInteger(profile.fragmentCount) || profile.fragmentCount < 1 || profile.fragmentCount > 16) {
    errors.push('fragmentCount must be an integer between 1 and 16');
  }
  for (const key of finiteNonNegative) {
    if (!Number.isFinite(profile[key]) || profile[key] < 0 || (key === 'density' && profile[key] === 0)) {
      errors.push(`${key} must be a finite ${key === 'density' ? 'positive' : 'non-negative'} number`);
    }
  }
  if (!Number.isFinite(profile.restitution) || profile.restitution < 0 || profile.restitution > 1) {
    errors.push('restitution must be between 0 and 1');
  }
  for (const key of finitePositive) {
    if (!Number.isFinite(profile[key]) || profile[key] <= 0) errors.push(`${key} must be finite and positive`);
  }
  if (!Number.isInteger(profile.particleCount) || profile.particleCount < 0 || profile.particleCount > 30) {
    errors.push('particleCount must be an integer between 0 and 30');
  }
  if (!SHAPE_FAMILIES.includes(profile.shapeFamily)) errors.push('shapeFamily is unsupported');
  if (!VISUAL_STYLES.includes(profile.visualStyle)) errors.push('visualStyle is unsupported');
  if (!RESIDUE_TYPES.includes(profile.residueType)) errors.push('residueType is unsupported');

  return { valid: errors.length === 0, errors };
}

export function validateAllMaterialProfiles() {
  const errors = [];
  for (const [material, profile] of Object.entries(DESTRUCTION_PROFILES)) {
    const result = validateMaterialProfile(profile);
    for (const error of result.errors) errors.push(`${material}: ${error}`);
  }
  return { valid: errors.length === 0, errors };
}

export function getMaterialProfile(material) {
  const profile = DESTRUCTION_PROFILES[material];
  if (!profile) throw new RangeError(`Unknown destruction material: ${material}`);
  return profile;
}
