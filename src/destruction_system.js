import Matter from 'matter-js';
import { COLLISION_CATEGORIES } from './destructibles.js';
import { DESTRUCTION_PROFILES, getMaterialProfile, MATERIALS } from './destruction_materials.js';

const { Bodies, Body, Composite } = Matter;

export const MAX_ACTIVE_FRAGMENTS = 96;
export const MIN_FRAGMENT_DIMENSION = 2;
export const MAX_FRAGMENT_DIMENSION = 36;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finiteDimension(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x6d2b79f5;
}

export function createSeededRandom(seed) {
  let state = Number.isFinite(seed) ? seed >>> 0 : hashSeed(seed);
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getBodyDimensions(body) {
  const width = body?.bounds ? body.bounds.max.x - body.bounds.min.x : body?.width;
  const height = body?.bounds ? body.bounds.max.y - body.bounds.min.y : body?.height;
  return {
    width: clamp(finiteDimension(width, 18), MIN_FRAGMENT_DIMENSION, 256),
    height: clamp(finiteDimension(height, 18), MIN_FRAGMENT_DIMENSION, 256)
  };
}

function getFallbackMaterial(body) {
  if (body?.material) return body.material;
  if (body?.isGlass) return MATERIALS.GLASS;
  if (body?.isGrill || body?.label === 'destructible_trashcan') return MATERIALS.METAL;
  if (body?.isWood) return MATERIALS.WOOD;
  return MATERIALS.CERAMIC;
}

function derivedSeed({ material, propKey, center, width, height, impactVelocity, occurrence = 1 }) {
  return hashSeed([
    propKey || 'unkeyed-prop', material, center.x.toFixed(3), center.y.toFixed(3),
    width.toFixed(3), height.toFixed(3), impactVelocity.x.toFixed(3), impactVelocity.y.toFixed(3), occurrence
  ].join('|'));
}

function fragmentDimensions(shapeFamily, cellWidth, cellHeight, sourceWidth, sourceHeight, random) {
  if (shapeFamily === 'splinter') {
    return {
      width: clamp(sourceWidth * (0.36 + random() * 0.22), 8, MAX_FRAGMENT_DIMENSION),
      height: clamp(sourceHeight * (0.09 + random() * 0.07), MIN_FRAGMENT_DIMENSION, 8)
    };
  }
  if (shapeFamily === 'fabric-strip') {
    return {
      width: clamp(sourceWidth * (0.34 + random() * 0.2), 8, MAX_FRAGMENT_DIMENSION),
      height: clamp(sourceHeight * (0.07 + random() * 0.05), MIN_FRAGMENT_DIMENSION, 6)
    };
  }
  if (shapeFamily === 'clod') {
    const radius = clamp(Math.min(cellWidth, cellHeight) * (0.18 + random() * 0.12), 1.5, 8);
    return { width: radius * 2, height: radius * 2, radius };
  }
  return {
    width: clamp(cellWidth * (0.72 + random() * 0.18), MIN_FRAGMENT_DIMENSION, MAX_FRAGMENT_DIMENSION),
    height: clamp(cellHeight * (0.72 + random() * 0.18), MIN_FRAGMENT_DIMENSION, MAX_FRAGMENT_DIMENSION)
  };
}

export function generateFragmentDescriptors({
  material,
  propKey = 'unkeyed-prop',
  seed,
  center = { x: 0, y: 0 },
  width = 18,
  height = 18,
  impactVelocity = { x: 0, y: 0 },
  color = '#94a3b8',
  occurrence = 1
}) {
  const profile = getMaterialProfile(material);
  const safeWidth = finiteDimension(width, 18);
  const safeHeight = finiteDimension(height, 18);
  const safeCenter = {
    x: Number.isFinite(center?.x) ? center.x : 0,
    y: Number.isFinite(center?.y) ? center.y : 0
  };
  const safeImpact = {
    x: Number.isFinite(impactVelocity?.x) ? impactVelocity.x : 0,
    y: Number.isFinite(impactVelocity?.y) ? impactVelocity.y : 0
  };
  const actualSeed = seed ?? derivedSeed({
    material, propKey, center: safeCenter, width: safeWidth, height: safeHeight,
    impactVelocity: safeImpact, occurrence
  });
  const random = createSeededRandom(actualSeed);
  const count = profile.fragmentCount;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * (safeWidth / safeHeight))));
  const rows = Math.ceil(count / columns);
  const cellWidth = safeWidth / columns;
  const cellHeight = safeHeight / rows;
  const speed = Math.hypot(safeImpact.x, safeImpact.y);
  const fallbackDirection = random() < 0.5 ? -1 : 1;
  const directionX = Math.abs(safeImpact.x) > 0.001
    ? Math.sign(safeImpact.x)
    : (speed > 0.001 ? Math.sign(safeImpact.y) * fallbackDirection : fallbackDirection);

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const dimensions = fragmentDimensions(profile.shapeFamily, cellWidth, cellHeight, safeWidth, safeHeight, random);
    const x = safeCenter.x + (column + 0.5) * cellWidth - safeWidth / 2
      + (random() - 0.5) * cellWidth * 0.25;
    const y = safeCenter.y + (row + 0.5) * cellHeight - safeHeight / 2
      + (random() - 0.5) * cellHeight * 0.25;
    const scatter = profile.scatter;
    const velocity = {
      x: directionX * (scatter * (0.28 + random() * 0.62) + Math.abs(safeImpact.x) * 0.18)
        + (random() - 0.5) * scatter * 0.12,
      y: -Math.abs(safeImpact.y) * 0.08 - scatter * (0.12 + random() * 0.52)
    };
    const fragmentWidth = clamp(dimensions.width, MIN_FRAGMENT_DIMENSION, MAX_FRAGMENT_DIMENSION);
    const fragmentHeight = clamp(dimensions.height, MIN_FRAGMENT_DIMENSION, MAX_FRAGMENT_DIMENSION);
    const radius = dimensions.radius ?? (
      profile.shapeFamily === 'triangle' || profile.shapeFamily === 'chip'
        ? clamp(Math.min(fragmentWidth, fragmentHeight) * 0.58, 1, 14)
        : null
    );

    return {
      material,
      propKey,
      shape: profile.shapeFamily,
      sides: profile.shapeFamily === 'triangle' ? 3 : (profile.shapeFamily === 'chip' ? 3 + Math.floor(random() * 3) : 0),
      x,
      y,
      width: fragmentWidth,
      height: fragmentHeight,
      radius,
      velocity,
      angularVelocity: (random() * 2 - 1) * profile.spin,
      angle: (random() - 0.5) * Math.PI,
      color,
      lifetime: profile.lifetime
    };
  });
}

export function createResidueRecord(body, profile = getMaterialProfile(getFallbackMaterial(body))) {
  const dimensions = getBodyDimensions(body);
  return {
    propKey: body.propKey || `unkeyed:${body.id}`,
    chunkIndex: Number.isInteger(body.chunkIndex) ? body.chunkIndex : 0,
    theme: body.theme || 'UNKNOWN',
    material: body.material || getFallbackMaterial(body),
    residueType: profile.residueType,
    x: Number.isFinite(body.position?.x) ? body.position.x : 0,
    y: Number.isFinite(body.position?.y) ? body.position.y : 0,
    width: dimensions.width,
    height: dimensions.height,
    color: body.color || '#94a3b8'
  };
}

function createFragmentBody(descriptor, profile, sourceBody) {
  const options = {
    density: profile.density,
    restitution: profile.restitution,
    friction: profile.friction,
    frictionAir: profile.frictionAir,
    label: 'debris_shard',
    color: descriptor.color,
    isGlass: descriptor.material === MATERIALS.GLASS,
    isShard: true,
    material: descriptor.material,
    fragmentShape: descriptor.shape,
    residueType: profile.residueType,
    propKey: descriptor.propKey,
    theme: sourceBody?.theme || 'UNKNOWN',
    lifeTime: descriptor.lifetime,
    collisionFilter: {
      category: COLLISION_CATEGORIES.SHARDS,
      mask: COLLISION_CATEGORIES.STATIC
    }
  };

  let fragment;
  if (descriptor.shape === 'clod') {
    fragment = Bodies.circle(descriptor.x, descriptor.y, clamp(descriptor.radius || 2, 1, 12), options);
  } else if (descriptor.shape === 'triangle' || descriptor.shape === 'chip') {
    const radius = clamp(descriptor.radius ?? Math.min(descriptor.width, descriptor.height) * 0.58, 1, 14);
    const sides = descriptor.shape === 'triangle' ? 3 : clamp(descriptor.sides || 4, 3, 5);
    fragment = Bodies.polygon(descriptor.x, descriptor.y, radius, sides, options);
  } else {
    fragment = Bodies.rectangle(descriptor.x, descriptor.y, descriptor.width, descriptor.height, options);
  }
  fragment.fragmentRenderWidth = descriptor.width;
  fragment.fragmentRenderHeight = descriptor.height;
  fragment.fragmentRenderRadius = Number.isFinite(descriptor.radius) && descriptor.radius > 0
    ? descriptor.radius
    : null;
  fragment.fragmentSides = Number.isInteger(descriptor.sides) ? descriptor.sides : 0;
  Body.setAngle(fragment, descriptor.angle);
  Body.setVelocity(fragment, descriptor.velocity);
  Body.setAngularVelocity(fragment, descriptor.angularVelocity);
  return fragment;
}

export function breakObjectIntoFragments(world, targetBody, impactVelocity = { x: 0, y: 0 }, options = {}) {
  const material = targetBody.material || getFallbackMaterial(targetBody);
  const profile = getMaterialProfile(material);
  const dimensions = getBodyDimensions(targetBody);
  const activeFragments = Array.isArray(options.activeFragments) ? options.activeFragments : [];
  const maxActiveFragments = Number.isInteger(options.maxActiveFragments) && options.maxActiveFragments > 0
    ? options.maxActiveFragments
    : MAX_ACTIVE_FRAGMENTS;
  const descriptors = generateFragmentDescriptors({
    material,
    propKey: options.propKey || targetBody.propKey || `unkeyed:${targetBody.id}`,
    seed: options.seed,
    center: targetBody.position,
    width: dimensions.width,
    height: dimensions.height,
    impactVelocity,
    color: targetBody.color || '#94a3b8',
    occurrence: options.occurrence || 1
  });
  const boundedDescriptors = descriptors.length > maxActiveFragments
    ? descriptors.slice(0, maxActiveFragments)
    : descriptors;

  const overflow = Math.max(0, activeFragments.length + boundedDescriptors.length - maxActiveFragments);
  for (let i = 0; i < overflow; i++) {
    const oldest = activeFragments.shift();
    if (oldest) Composite.remove(world, oldest);
  }

  Composite.remove(world, targetBody);
  const fragments = boundedDescriptors.map(descriptor => createFragmentBody(descriptor, profile, targetBody));
  Composite.add(world, fragments);
  if (Array.isArray(options.activeFragments)) activeFragments.push(...fragments);
  return fragments;
}

export function getMaterialResidueType(material) {
  return DESTRUCTION_PROFILES[material]?.residueType || null;
}
