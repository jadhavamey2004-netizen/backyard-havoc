import { describe, it, expect, beforeEach } from 'vitest';
import { MapRenderer } from '../src/map_renderer.js';

describe('Map Renderer & Canvas Mechanics', () => {
  let mapRenderer;

  beforeEach(() => {
    mapRenderer = new MapRenderer(960, 540);
  });

  it('updates survival seconds and time-of-day progression', () => {
    mapRenderer.update(1.0, 75);
    expect(mapRenderer.survivalSeconds).toBe(75);
  });

  it('recycles clouds when drifting past canvas width', () => {
    const cloud = mapRenderer.clouds[0];
    cloud.x = 1200; // Far right beyond canvas (width is 960)
    mapRenderer.update(0.1, 10);
    expect(cloud.x).toBeLessThan(0); // Wrapped around to left
  });

  it('reverses cat patrol direction when hitting fence boundaries', () => {
    mapRenderer.cat.x = 860; // At right boundary limit
    mapRenderer.cat.facing = 1;
    mapRenderer.update(0.1, 10);
    expect(mapRenderer.cat.facing).toBe(-1); // Reversed velocity direction
  });
});
