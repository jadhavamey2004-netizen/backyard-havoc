import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { COLLISION_CATEGORIES } from '../src/destructibles.js';
import { MATERIALS } from '../src/destruction_materials.js';
import {
  MAX_ACTIVE_FRAGMENTS,
  breakObjectIntoFragments,
  generateFragmentDescriptors
} from '../src/destruction_system.js';

const fractureInput = {
  material: 'WOOD',
  propKey: '3:SHED_TRAMPOLINE:crate',
  seed: 123456,
  center: { x: 470, y: 455 },
  width: 60,
  height: 36,
  impactVelocity: { x: 8, y: -3 },
  color: '#a16207'
};

function fragmentSignature(fragments) {
  return fragments.map(fragment => ({
    shape: fragment.shape,
    x: fragment.x,
    y: fragment.y,
    width: fragment.width,
    height: fragment.height,
    radius: fragment.radius,
    vx: fragment.velocity.x,
    vy: fragment.velocity.y,
    angularVelocity: fragment.angularVelocity,
    angle: fragment.angle
  }));
}

describe('material destruction system', () => {
  it('generates identical fracture descriptors for the same object, seed, dimensions, and impact', () => {
    for (const material of Object.values(MATERIALS)) {
      const input = { ...fractureInput, material };
      expect(fragmentSignature(generateFragmentDescriptors(input)))
        .toEqual(fragmentSignature(generateFragmentDescriptors(input)));
    }
  });

  it('uses incoming impact direction and keeps every generated dimension finite and positive', () => {
    const rightward = generateFragmentDescriptors(fractureInput);
    const leftward = generateFragmentDescriptors({
      ...fractureInput,
      seed: 123456,
      impactVelocity: { x: -8, y: -3 }
    });
    expect(rightward.length).toBe(6);
    expect(rightward.some(fragment => fragment.velocity.x > 0)).toBe(true);
    expect(leftward.some(fragment => fragment.velocity.x < 0)).toBe(true);

    for (const fragment of [...rightward, ...leftward]) {
      expect(Number.isFinite(fragment.x)).toBe(true);
      expect(Number.isFinite(fragment.y)).toBe(true);
      expect(fragment.width).toBeGreaterThan(0);
      expect(fragment.height).toBeGreaterThan(0);
      expect(Number.isFinite(fragment.angularVelocity)).toBe(true);
    }
  });

  it('clamps fragment geometry for degenerate source dimensions', () => {
    const fragments = generateFragmentDescriptors({
      ...fractureInput,
      width: 0,
      height: Number.NaN
    });
    expect(fragments).toHaveLength(6);
    for (const fragment of fragments) {
      expect(fragment.width).toBeGreaterThan(0);
      expect(fragment.height).toBeGreaterThan(0);
    }
  });

  it('keeps physical debris at or below the configured cap and removes evicted bodies', () => {
    const engine = Matter.Engine.create();
    const activeFragments = [];
    const firstTarget = Matter.Bodies.rectangle(100, 100, 30, 30, {
      isDestructible: true,
      material: 'GLASS',
      propKey: '0:GREENHOUSE:glass-a',
      theme: 'GREENHOUSE'
    });
    Matter.Composite.add(engine.world, firstTarget);
    const firstBatch = breakObjectIntoFragments(engine.world, firstTarget, { x: 4, y: -2 }, {
      activeFragments,
      maxActiveFragments: 10
    });
    expect(firstBatch).toHaveLength(9);

    const secondTarget = Matter.Bodies.rectangle(160, 100, 30, 30, {
      isDestructible: true,
      material: 'GLASS',
      propKey: '0:GREENHOUSE:glass-b',
      theme: 'GREENHOUSE'
    });
    Matter.Composite.add(engine.world, secondTarget);
    const secondBatch = breakObjectIntoFragments(engine.world, secondTarget, { x: -4, y: -2 }, {
      activeFragments,
      maxActiveFragments: 10
    });

    expect(secondBatch).toHaveLength(9);
    expect(activeFragments).toHaveLength(10);
    expect(activeFragments.length).toBeLessThanOrEqual(10);
    expect(firstBatch.filter(fragment => Matter.Composite.allBodies(engine.world).includes(fragment))).toHaveLength(1);
    expect(firstBatch.filter(fragment => !Matter.Composite.allBodies(engine.world).includes(fragment))).toHaveLength(8);
    expect(secondBatch.every(fragment => Matter.Composite.allBodies(engine.world).includes(fragment))).toBe(true);
    expect(MAX_ACTIVE_FRAGMENTS).toBe(96);
  });

  it('isolates debris collision masks from balls and destructible props', () => {
    const engine = Matter.Engine.create();
    const target = Matter.Bodies.rectangle(100, 100, 30, 30, {
      isDestructible: true,
      material: 'GLASS',
      propKey: '0:GREENHOUSE:glass'
    });
    Matter.Composite.add(engine.world, target);
    const fragments = breakObjectIntoFragments(engine.world, target, { x: 5, y: 0 });

    expect(fragments[0].collisionFilter.category).toBe(COLLISION_CATEGORIES.SHARDS);
    expect(fragments[0].collisionFilter.mask).toBe(COLLISION_CATEGORIES.STATIC);
    expect(fragments[0].collisionFilter.mask & COLLISION_CATEGORIES.BALL).toBe(0);
    expect(fragments[0].collisionFilter.mask & COLLISION_CATEGORIES.DESTRUCTIBLE).toBe(0);
  });

  it('never exceeds the production debris cap across repeated fracture batches', () => {
    const engine = Matter.Engine.create();
    const activeFragments = [];
    for (let index = 0; index < 14; index++) {
      const target = Matter.Bodies.rectangle(100 + index * 40, 100, 40, 30, {
        material: 'GLASS',
        isDestructible: true,
        propKey: `0:GREENHOUSE:glass-${index}`
      });
      Matter.Composite.add(engine.world, target);
      breakObjectIntoFragments(engine.world, target, { x: 4, y: -2 }, { activeFragments });
    }
    const shardBodies = Matter.Composite.allBodies(engine.world).filter(body => body.isShard);
    expect(activeFragments).toHaveLength(MAX_ACTIVE_FRAGMENTS);
    expect(shardBodies).toHaveLength(MAX_ACTIVE_FRAGMENTS);
    expect(shardBodies.every(body => Number.isFinite(body.lifeTime) && body.lifeTime > 0)).toBe(true);
  });

  it('honors a configured cap smaller than a single material fracture batch', () => {
    const engine = Matter.Engine.create();
    const activeFragments = [];
    const target = Matter.Bodies.rectangle(100, 100, 40, 30, {
      material: 'GLASS', isDestructible: true, propKey: 'small-cap:glass'
    });
    Matter.Composite.add(engine.world, target);
    const fragments = breakObjectIntoFragments(engine.world, target, { x: 5, y: 0 }, {
      activeFragments,
      maxActiveFragments: 3
    });
    expect(fragments).toHaveLength(3);
    expect(activeFragments).toHaveLength(3);
    expect(Matter.Composite.allBodies(engine.world).filter(body => body.isShard)).toHaveLength(3);
  });
});
