import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import { ProceduralWorld, YARD_THEMES } from '../src/procedural_world.js';

describe('Procedural Endless World Streaming', () => {
  it('should map world X coordinates to chunk indices', () => {
    const engine = Matter.Engine.create();
    const world = new ProceduralWorld(engine.world, 960);

    expect(world.getChunkIndexForX(0)).toBe(0);
    expect(world.getChunkIndexForX(450)).toBe(0);
    expect(world.getChunkIndexForX(960)).toBe(1);
    expect(world.getChunkIndexForX(-100)).toBe(-1);
  });

  it('should load and unload chunks while managing Matter.js bodies', () => {
    const engine = Matter.Engine.create();
    const world = new ProceduralWorld(engine.world, 960);

    world.loadChunk(0);
    expect(world.activeChunks.has(0)).toBe(true);

    const props = world.getAllActiveProps();
    expect(props.length).toBeGreaterThan(0);

    world.unloadChunk(0);
    expect(world.activeChunks.has(0)).toBe(false);
    expect(world.getAllActiveProps().length).toBe(0);
  });

  it('should rotate through all yard themes deterministically', () => {
    expect(YARD_THEMES).toContain('GREENHOUSE');
    expect(YARD_THEMES).toContain('PATIO_BBQ');
    expect(YARD_THEMES).toContain('SHED_TRAMPOLINE');
    expect(YARD_THEMES).toContain('DOG_PARK');
  });
});
