import { describe, expect, it, vi } from 'vitest';
import { RendererAdapter } from '../src/rendering/renderer_adapter.js';
import { createRendererFrame } from '../src/rendering/render_frame.js';
import { mapClientToLogicalCoordinates } from '../src/rendering/coordinate_mapper.js';
import { comparePlanterCollisionShapes } from '../src/rendering/phase13_collision_shapes.js';

describe('Phase 13 renderer boundary', () => {
  it('maps pointer client coordinates once into the shared logical 960 by 540 frame', () => {
    const rect = { left: 120, top: 40, width: 640, height: 360 };
    expect(mapClientToLogicalCoordinates(120, 40, rect)).toEqual({ x: 0, y: 0 });
    expect(mapClientToLogicalCoordinates(440, 220, rect)).toEqual({ x: 480, y: 270 });
    expect(mapClientToLogicalCoordinates(760, 400, rect)).toEqual({ x: 960, y: 540 });
    expect(mapClientToLogicalCoordinates(0, 0, { left: 0, top: 0, width: 0, height: 0 }))
      .toEqual({ x: 0, y: 0 });
  });

  it('hands renderers canonical state references and one authoritative camera transform', () => {
    const props = [{ id: 1, position: { x: 20, y: 30 } }];
    const residues = [{ x: 40, y: 50 }];
    const shards = [{ id: 2 }];
    const player = { x: 10, state: 'RUNNING' };
    const ball = { position: { x: 70, y: 90 } };
    const kevin = { x: 790, state: 'PEEKING_INSIDE' };
    const projectiles = [{ id: 3 }];
    const world = { getAllActiveProps: () => props, getActiveResidues: () => residues };
    const camera = { x: 25, getTransform: vi.fn(() => ({ x: 2, y: -1, angle: 0.01, zoom: 1.02, chromatic: 0.4 })) };
    const engine = {
      width: 960,
      height: 540,
      camera,
      mapRenderer: { time: 4 },
      proceduralWorld: world,
      player,
      ball,
      npc: kevin,
      thrownProjectiles: projectiles,
      activeShards: shards,
      particles: { particles: [] },
      vfxDirector: { havocActive: false },
      isReducedMotion: true
    };

    const frame = createRendererFrame(engine, 2500);
    expect(frame.time).toBe(2500);
    expect(frame.viewport).toEqual({ width: 960, height: 540 });
    expect(frame.player).toBe(player);
    expect(frame.ball).toBe(ball);
    expect(frame.kevin).toBe(kevin);
    expect(frame.world.proceduralWorld).toBe(world);
    expect(frame.world.activeProps).toBe(props);
    expect(frame.world.residues).toBe(residues);
    expect(frame.destruction.shards).toBe(shards);
    expect(frame.projectiles).toBe(projectiles);
    expect(frame.camera.transform).toEqual({ x: 2, y: -1, angle: 0.01, zoom: 1.02, chromatic: 0.4 });
    expect(camera.getTransform).toHaveBeenCalledTimes(1);
    expect(camera.getTransform).toHaveBeenCalledWith(2.5);
    expect(frame.reducedMotion).toBe(true);
  });

  it('switches renderers without changing canonical gameplay objects', () => {
    const player = Object.freeze({ x: 110, y: 470, state: 'IDLE', keys: Object.freeze({ left: false }) });
    const ball = Object.freeze({ position: Object.freeze({ x: 180, y: 300 }), velocity: Object.freeze({ x: 0, y: 0 }) });
    const renderCanvas = vi.fn();
    const renderPixi = vi.fn();
    const adapter = new RendererAdapter({
      canvasRenderer: { mode: 'canvas', renderFrame: renderCanvas },
      activeRenderer: { mode: 'pixi', renderFrame: renderPixi }
    });
    const frame = Object.freeze({ player, ball, time: 100 });

    adapter.renderFrame(frame);

    expect(renderPixi).toHaveBeenCalledTimes(1);
    expect(renderPixi).toHaveBeenCalledWith(frame);
    expect(renderCanvas).not.toHaveBeenCalled();
    expect(player).toEqual({ x: 110, y: 470, state: 'IDLE', keys: { left: false } });
    expect(ball.position).toEqual({ x: 180, y: 300 });
  });

  it('falls back to Canvas after a renderer failure without re-running the frame', () => {
    const renderCanvas = vi.fn();
    const failedRenderer = { mode: 'pixi', renderFrame: vi.fn(() => { throw new Error('context lost'); }) };
    const adapter = new RendererAdapter({
      canvasRenderer: { mode: 'canvas', renderFrame: renderCanvas },
      activeRenderer: failedRenderer
    });
    const frame = { time: 250 };

    adapter.renderFrame(frame);

    expect(renderCanvas).toHaveBeenCalledTimes(1);
    expect(renderCanvas).toHaveBeenCalledWith(frame);
    expect(adapter.mode).toBe('canvas-fallback');
    expect(adapter.lastError.message).toBe('context lost');
  });

  it('compares planter collision candidates without changing the gameplay fixture', () => {
    const comparison = comparePlanterCollisionShapes({ iterations: 30 });
    expect(comparison.candidates.map(candidate => candidate.name)).toEqual([
      'old-rectangle', 'manual-compound', 'from-vertices-poly-decomp'
    ]);
    expect(comparison.candidates.map(candidate => candidate.fixtureCount)).toEqual([1, 3, 3]);
    for (const candidate of comparison.candidates) {
      expect(candidate.stability.finite).toBe(true);
      expect(candidate.stability.staticBodyDisplacement).toBe(0);
      expect(candidate.bounds.width).toBeGreaterThan(0);
      expect(candidate.bounds.height).toBeGreaterThan(0);
      expect(candidate.area).toBeGreaterThan(0);
    }
  });
});
