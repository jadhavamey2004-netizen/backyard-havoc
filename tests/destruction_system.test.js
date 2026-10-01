import Matter from 'matter-js';
import { describe, expect, it, vi } from 'vitest';
import { COLLISION_CATEGORIES } from '../src/destructibles.js';
import { MATERIALS } from '../src/destruction_materials.js';
import { GameEngine } from '../src/game.js';
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

  it('stores descriptor-local render geometry unchanged when a fragment rotates', () => {
    const engine = Matter.Engine.create();
    const target = Matter.Bodies.rectangle(fractureInput.center.x, fractureInput.center.y, fractureInput.width, fractureInput.height, {
      material: 'WOOD',
      propKey: fractureInput.propKey,
      theme: 'SHED_TRAMPOLINE',
      color: fractureInput.color
    });
    Matter.Composite.add(engine.world, target);
    const descriptor = generateFragmentDescriptors(fractureInput)[0];
    const [fragment] = breakObjectIntoFragments(engine.world, target, fractureInput.impactVelocity, {
      seed: fractureInput.seed
    });
    const localGeometry = {
      width: fragment.fragmentRenderWidth,
      height: fragment.fragmentRenderHeight,
      radius: fragment.fragmentRenderRadius,
      sides: fragment.fragmentSides
    };

    expect(localGeometry).toEqual({
      width: descriptor.width,
      height: descriptor.height,
      radius: descriptor.radius ?? null,
      sides: descriptor.sides ?? 0
    });

    Matter.Body.setAngle(fragment, fragment.angle + Math.PI / 3);
    expect({
      width: fragment.fragmentRenderWidth,
      height: fragment.fragmentRenderHeight,
      radius: fragment.fragmentRenderRadius,
      sides: fragment.fragmentSides
    }).toEqual(localGeometry);
  });

  it('stores finite render dimensions, relevant radii, and polygon sides for every material', () => {
    for (const material of Object.values(MATERIALS)) {
      const engine = Matter.Engine.create();
      const input = { ...fractureInput, material };
      const target = Matter.Bodies.rectangle(input.center.x, input.center.y, input.width, input.height, {
        material,
        propKey: input.propKey,
        theme: 'SHED_TRAMPOLINE',
        color: input.color
      });
      Matter.Composite.add(engine.world, target);
      const descriptors = generateFragmentDescriptors(input);
      const fragments = breakObjectIntoFragments(engine.world, target, input.impactVelocity, { seed: input.seed });

      expect(fragments).toHaveLength(descriptors.length);
      for (const [index, fragment] of fragments.entries()) {
        const descriptor = descriptors[index];
        expect(fragment.fragmentShape).toBe(descriptor.shape);
        expect(Number.isFinite(fragment.fragmentRenderWidth)).toBe(true);
        expect(fragment.fragmentRenderWidth).toBeGreaterThan(0);
        expect(Number.isFinite(fragment.fragmentRenderHeight)).toBe(true);
        expect(fragment.fragmentRenderHeight).toBeGreaterThan(0);
        expect(fragment.fragmentRenderWidth).toBe(descriptor.width);
        expect(fragment.fragmentRenderHeight).toBe(descriptor.height);

        if (['triangle', 'chip', 'clod'].includes(descriptor.shape)) {
          expect(Number.isFinite(fragment.fragmentRenderRadius)).toBe(true);
          expect(fragment.fragmentRenderRadius).toBeGreaterThan(0);
          expect(fragment.fragmentRenderRadius).toBe(descriptor.radius);
        } else {
          expect(fragment.fragmentRenderRadius).toBeNull();
        }

        if (['triangle', 'chip'].includes(descriptor.shape)) {
          expect(fragment.fragmentSides).toBe(descriptor.sides);
          expect(fragment.fragmentSides).toBeGreaterThanOrEqual(3);
          expect(fragment.fragmentSides).toBeLessThanOrEqual(5);
        } else {
          expect(fragment.fragmentSides).toBe(0);
        }
      }
    }
  });

  it('renders ceramic chips with their polygon sides instead of rectangle drawing', () => {
    const engine = Matter.Engine.create();
    const target = Matter.Bodies.rectangle(100, 100, 56, 34, {
      material: MATERIALS.CERAMIC,
      propKey: '0:GREENHOUSE:ceramic-pot',
      color: '#c2410c'
    });
    Matter.Composite.add(engine.world, target);
    const [chip] = breakObjectIntoFragments(engine.world, target, { x: 8, y: -2 });
    const ctx = {
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      ellipse: vi.fn(),
      restore: vi.fn()
    };

    GameEngine.prototype.drawEnvironmentShards.call({ activeShards: [chip] }, ctx);

    expect(chip.fragmentShape).toBe('chip');
    expect(Number.isInteger(chip.fragmentSides)).toBe(true);
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);
    expect(ctx.lineTo).toHaveBeenCalledTimes(chip.fragmentSides - 1);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('draws rotating wood splinters from stable local dimensions instead of the AABB', () => {
    const engine = Matter.Engine.create();
    const target = Matter.Bodies.rectangle(fractureInput.center.x, fractureInput.center.y, fractureInput.width, fractureInput.height, {
      material: MATERIALS.WOOD,
      propKey: fractureInput.propKey,
      theme: 'SHED_TRAMPOLINE',
      color: fractureInput.color
    });
    Matter.Composite.add(engine.world, target);
    const [splinter] = breakObjectIntoFragments(engine.world, target, fractureInput.impactVelocity, {
      seed: fractureInput.seed
    });
    Matter.Body.setAngle(splinter, Math.PI / 4);
    const expectedWidth = splinter.fragmentRenderWidth;
    const expectedHeight = splinter.fragmentRenderHeight;
    expect(splinter.bounds.max.x - splinter.bounds.min.x).not.toBeCloseTo(expectedWidth);
    expect(splinter.bounds.max.y - splinter.bounds.min.y).not.toBeCloseTo(expectedHeight);
    const ctx = {
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      restore: vi.fn()
    };

    GameEngine.prototype.drawEnvironmentShards.call({ activeShards: [splinter] }, ctx);

    expect(ctx.fillRect).toHaveBeenCalledWith(-expectedWidth / 2, -expectedHeight / 2, expectedWidth, expectedHeight);
    expect(ctx.strokeRect).toHaveBeenCalledWith(-expectedWidth / 2, -expectedHeight / 2, expectedWidth, expectedHeight);
  });
});
