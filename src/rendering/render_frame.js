export function createRendererFrame(engine, currentTime) {
  const props = engine.proceduralWorld.getAllActiveProps();
  const residues = engine.proceduralWorld.getActiveResidues();
  const time = Number.isFinite(currentTime) ? currentTime : 0;
  const mouseScreenPos = engine.mouseScreenPos;
  return Object.freeze({
    viewport: Object.freeze({ width: engine.width, height: engine.height }),
    time,
    camera: Object.freeze({
      source: engine.camera,
      worldX: engine.camera.x,
      transform: engine.camera.getTransform(time / 1000)
    }),
    world: Object.freeze({
      mapRenderer: engine.mapRenderer,
      proceduralWorld: engine.proceduralWorld,
      activeProps: props,
      residues
    }),
    player: engine.player,
    ball: engine.ball,
    kevin: engine.npc,
    projectiles: engine.thrownProjectiles,
    destruction: Object.freeze({ shards: engine.activeShards }),
    particles: engine.particles,
    vfx: engine.vfxDirector,
    matterWorld: engine.world,
    gameState: engine.gameState,
    reducedMotion: Boolean(engine.isReducedMotion),
    input: Object.freeze({
      mouseScreenPos,
      aimWorld: mouseScreenPos
        ? engine.getScreenAimWorldPoint(mouseScreenPos.x, mouseScreenPos.y)
        : null
    })
  });
}
