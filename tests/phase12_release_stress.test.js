import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { ParticleSystem, VFX_LIMITS } from '../src/particles.js';
import { ProceduralWorld } from '../src/procedural_world.js';
import { CameraTrauma } from '../src/camera.js';
import { VfxDirector } from '../src/vfx_director.js';
import { MetaProgression } from '../src/meta/meta_progression.js';
import { PROFILE_STORAGE_KEY, createDefaultProfile } from '../src/meta/profile_store.js';

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

describe('Phase 12 release stress invariants', () => {
  it('keeps streamed world bodies bounded while run history grows only for unique destroyed content', () => {
    const matter = Matter.Engine.create();
    const world = new ProceduralWorld(matter.world, 960);
    const explored = 240;
    const markedKeys = new Set();
    const samples = [];
    let peakActiveChunks = 0;
    let peakWorldBodies = 0;
    let maxBodiesInOneChunk = 0;

    world.updateActiveChunks(world.chunkSize / 2);
    const cleanRunBodyCount = matter.world.bodies.filter(body => body.chunkKey).length;

    for (let chunkIndex = 0; chunkIndex < explored; chunkIndex += 1) {
      world.updateActiveChunks(chunkIndex * world.chunkSize + world.chunkSize / 2);
      const chunk = world.activeChunks.get(chunkIndex);
      expect(chunk).toBeDefined();

      const keysToDestroy = chunkIndex % 5 === 0
        ? chunk.eligiblePropKeys
        : chunk.eligiblePropKeys.slice(0, 1);
      for (const propKey of keysToDestroy) {
        const body = chunk.props.find(prop => prop.propKey === propKey);
        expect(world.markPropDestroyed(propKey, {
          propKey,
          chunkIndex,
          theme: chunk.theme,
          material: body?.material || 'WOOD',
          residueType: 'stress-residue',
          x: body?.position.x || 0,
          y: body?.position.y || 0,
          width: body ? body.bounds.max.x - body.bounds.min.x : 12,
          height: body ? body.bounds.max.y - body.bounds.min.y : 12,
          color: body?.color || '#94a3b8'
        })).toBe(true);
        markedKeys.add(propKey);
        expect(world.markPropDestroyed(propKey)).toBe(false);
      }
      world.checkChunkClearStates();

      const activeChunks = [...world.activeChunks.values()];
      const expectedBodies = activeChunks.flatMap(activeChunk => activeChunk.props);
      const actualBodies = matter.world.bodies.filter(body => body.chunkKey);
      const actualIds = actualBodies.map(body => body.id);
      const expectedIds = expectedBodies.map(body => body.id);
      peakActiveChunks = Math.max(peakActiveChunks, activeChunks.length);
      peakWorldBodies = Math.max(peakWorldBodies, actualBodies.length);
      maxBodiesInOneChunk = Math.max(maxBodiesInOneChunk,
        ...activeChunks.map(activeChunk => activeChunk.props.length));

      expect(new Set(actualIds).size).toBe(actualIds.length);
      expect(actualIds.sort((a, b) => a - b)).toEqual(expectedIds.sort((a, b) => a - b));
      expect(actualBodies.every(body => world.activeChunks.has(body.chunkIndex))).toBe(true);
      samples.push({
        exploredChunks: chunkIndex + 1,
        activeChunks: activeChunks.length,
        activeWorldBodies: actualBodies.length,
        destroyedHistory: world.destroyedPropKeys.size,
        clearedHistory: world.clearedChunkKeys.size
      });
    }

    expect(world.destroyedPropKeys.size).toBe(markedKeys.size);
    expect(world.clearedChunkKeys.size).toBeGreaterThan(0);
    // A radius-one visible range requests 3 chunks; the unload threshold retains
    // one trailing chunk at distance two while streaming one boundary at a time.
    const streamingChunkCapacity = (2 * 1 + 1) + (2 - 1);
    expect(peakActiveChunks).toBeLessThanOrEqual(streamingChunkCapacity);
    expect(peakWorldBodies).toBeLessThanOrEqual(streamingChunkCapacity * maxBodiesInOneChunk);
    expect(samples[239].destroyedHistory).toBe(samples[119].destroyedHistory * 2);
    expect(samples[239].clearedHistory).toBe(samples[119].clearedHistory * 2);

    world.updateActiveChunks(world.chunkSize / 2);
    const revisitedFirstChunk = world.activeChunks.get(0);
    expect(revisitedFirstChunk.isCleared).toBe(true);
    expect(revisitedFirstChunk.props.some(body => markedKeys.has(body.propKey))).toBe(false);
    expect(new Set(revisitedFirstChunk.residues.map(residue => residue.propKey)).size)
      .toBe(revisitedFirstChunk.residues.length);

    world.reset();
    expect(world.activeChunks.size).toBe(0);
    expect(world.destroyedPropKeys.size).toBe(0);
    expect(world.clearedChunkKeys.size).toBe(0);
    expect(matter.world.bodies.filter(body => body.chunkKey)).toHaveLength(0);
    world.updateActiveChunks(world.chunkSize / 2);
    expect(matter.world.bodies.filter(body => body.chunkKey)).toHaveLength(cleanRunBodyCount);
  });

  it('keeps every production VFX buffer within its authored cap during repeated mixed effects', () => {
    const camera = new CameraTrauma();
    const particles = new ParticleSystem();
    particles.setSeed(0x12F1A1);
    const director = new VfxDirector({ camera, particles });
    const context = { x: 470, y: 240, direction: -1 };

    for (let index = 0; index < 500; index += 1) {
      director.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'GLASS' }, context);
      director.handleGameplayEvent({ type: 'POWER_SHOT', charge: 1 }, context);
      director.handleGameplayEvent({ type: 'PERFECT_PARRY' }, context);
      director.handleGameplayEvent({ type: 'HAVOC_STARTED' }, context);
      director.handleGameplayEvent({ type: 'TRICK_CHAIN_COMPLETED' }, context);
      particles.spawnYardClearFireworks(context.x, context.y);
      particles.spawnSprintLines(context.x, context.y, context.direction);
      particles.spawnAnimeSpeedLines(context.x, context.y, 24);
      particles.addTrailPoint(context, '#38bdf8', 6, 10, index / 60);
      particles.spawnPopText(context.x, context.y, `HIT ${index}`);
    }

    const bufferSizes = {
      particles: particles.particles.length,
      popTexts: particles.popTexts.length,
      shockwaves: particles.shockwaves.length,
      speedLines: particles.speedLines.length,
      lightningArcs: particles.lightningArcs.length,
      trailPoints: particles.trailPoints.length,
      impactRings: particles.impactRings.length,
      vignettes: particles.vignettes.length,
      powerBeams: particles.powerBeams.length
    };
    for (const [name, size] of Object.entries(bufferSizes)) {
      expect(size, `${name} exceeded its production cap`).toBeLessThanOrEqual(VFX_LIMITS[name]);
    }

    particles.triggerHitStop(0.1);
    particles.clear();
    camera.reset();
    expect(particles.hitStopRemainingSeconds).toBe(0);
    for (const key of Object.keys(bufferSizes)) expect(particles[key]).toHaveLength(0);
    expect(camera.trauma).toBe(0);
    expect(camera.zoomPunch).toBe(0);
    expect(camera.chromaticAberration).toBe(0);
    expect(camera.impulseX).toBe(0);
    expect(camera.impulseY).toBe(0);
  });

  it('preserves unrelated legacy storage through repeated completed runs and corrupt-profile recovery', () => {
    const storage = createStorage({
      [PROFILE_STORAGE_KEY]: JSON.stringify(createDefaultProfile()),
      backyard_high_score: '98765',
      backyard_best_combo: '37',
      backyard_muted: 'true',
      backyard_reduced_motion: 'false'
    });
    const meta = new MetaProgression({ storage, now: () => '2026-10-02T00:00:00.000Z' });
    const completedResults = [];

    for (let run = 0; run < 25; run += 1) {
      meta.beginRun();
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
      meta.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'WOOD' });
      completedResults.push(meta.completeRun({ score: 100 + run, peakCombo: 2 }));
    }

    const profile = JSON.parse(storage.getItem(PROFILE_STORAGE_KEY));
    expect(profile.lifetimeStats.runsCompleted).toBe(25);
    expect(new Set(profile.completedChallenges).size).toBe(profile.completedChallenges.length);
    expect(new Set(profile.unlocked).size).toBe(profile.unlocked.length);
    expect(completedResults.filter(result => result.completedChallenges.some(challenge => challenge.id === 'first-run')))
      .toHaveLength(1);
    expect(storage.getItem('backyard_high_score')).toBe('98765');
    expect(storage.getItem('backyard_best_combo')).toBe('37');
    expect(storage.getItem('backyard_muted')).toBe('true');
    expect(storage.getItem('backyard_reduced_motion')).toBe('false');

    storage.setItem(PROFILE_STORAGE_KEY, '{malformed');
    const recovered = new MetaProgression({ storage, now: () => '2026-10-02T00:01:00.000Z' });
    expect(recovered.getProfile().lifetimeStats.runsCompleted).toBe(0);
    recovered.beginRun();
    recovered.completeRun({ score: 1, peakCombo: 1 });
    expect(JSON.parse(storage.getItem(PROFILE_STORAGE_KEY)).lifetimeStats.runsCompleted).toBe(1);
    expect(storage.getItem('backyard_high_score')).toBe('98765');
    expect(storage.getItem('backyard_best_combo')).toBe('37');
    expect(storage.getItem('backyard_muted')).toBe('true');
    expect(storage.getItem('backyard_reduced_motion')).toBe('false');
  });
});
