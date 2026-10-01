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

  it('gives every generated prop stable identity and explicitly material-tags ordinary destructibles', () => {
    const engine = Matter.Engine.create();
    const world = new ProceduralWorld(engine.world, 960);
    const materialSet = new Set();

    for (let chunkIndex = 0; chunkIndex < YARD_THEMES.length; chunkIndex++) {
      world.loadChunk(chunkIndex);
      const props = world.getAllActiveProps();
      expect(props.length).toBeGreaterThan(0);
      expect(props.every(prop => typeof prop.propKey === 'string' && prop.propKey.length > 0)).toBe(true);
      expect(new Set(props.map(prop => prop.propKey)).size).toBe(props.length);
      for (const prop of props.filter(item => item.isDestructible && !item.isNpc)) {
        expect(prop.material).toBeTruthy();
        materialSet.add(prop.material);
      }
    }

    expect([...materialSet].sort()).toEqual(['CERAMIC', 'FABRIC', 'GLASS', 'METAL', 'PLASTIC', 'SOIL', 'WOOD']);
  });

  it('remembers destroyed props and their residue across chunk unload and reload', () => {
    const engine = Matter.Engine.create();
    const world = new ProceduralWorld(engine.world, 960);
    world.loadChunk(0);

    const originalProps = world.getAllActiveProps();
    const target = originalProps.find(prop => prop.isDestructible && !prop.isNpc);
    const intactKey = originalProps.find(prop => prop.isDestructible && !prop.isNpc && prop !== target).propKey;
    const residue = {
      propKey: target.propKey,
      chunkIndex: 0,
      theme: 'GREENHOUSE',
      material: target.material,
      residueType: 'wood-splinters',
      x: target.position.x,
      y: target.position.y
    };

    target.isDestroyed = true;
    expect(world.markPropDestroyed(target.propKey, residue)).toBe(true);
    world.unloadChunk(0);
    world.loadChunk(0);

    const reloadedProps = world.getAllActiveProps();
    expect(reloadedProps.some(prop => prop.propKey === target.propKey)).toBe(false);
    expect(reloadedProps.some(prop => prop.propKey === intactKey)).toBe(true);
    expect(world.getActiveResidues()).toContainEqual(expect.objectContaining({
      propKey: target.propKey,
      material: target.material,
      residueType: 'glass-glints'
    }));

    world.reset();
    world.loadChunk(0);
    expect(world.destroyedPropKeys.size).toBe(0);
    expect(world.clearedChunkKeys.size).toBe(0);
    expect(world.getActiveResidues()).toHaveLength(0);
    expect(world.getAllActiveProps().some(prop => prop.propKey === target.propKey)).toBe(true);
  });

  it('counts a cleared yard once across reloads and clears that memory on reset', () => {
    const engine = Matter.Engine.create();
    const world = new ProceduralWorld(engine.world, 960);
    world.loadChunk(0);
    const chunk = world.activeChunks.get(0);
    const eligibleKeys = [...chunk.eligiblePropKeys];

    expect(eligibleKeys.length).toBeGreaterThan(0);
    for (const propKey of eligibleKeys) world.markPropDestroyed(propKey);
    world.checkChunkClearStates();
    expect(world.yardsClearedCount).toBe(1);
    expect(world.clearedChunkKeys.has('0:GREENHOUSE')).toBe(true);

    world.checkChunkClearStates();
    expect(world.yardsClearedCount).toBe(1);
    world.unloadChunk(0);
    world.loadChunk(0);
    world.checkChunkClearStates();
    expect(world.activeChunks.get(0).isCleared).toBe(true);
    expect(world.yardsClearedCount).toBe(1);

    world.reset();
    expect(world.yardsClearedCount).toBe(0);
    expect(world.clearedChunkKeys.size).toBe(0);
    expect(world.destroyedPropKeys.size).toBe(0);
  });
});
