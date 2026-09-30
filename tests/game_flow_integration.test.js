import { describe, it, expect, beforeEach, vi } from 'vitest';
import Matter from 'matter-js';
import { GameEngine } from '../src/game.js';
import { sounds } from '../src/audio.js';

const createMockCanvas = () => ({
  getContext: () => ({
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    setTransform: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    roundRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  }),
  width: 960,
  height: 540
});

describe('Game Flow & Integration Lifecycle', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
  });

  it('accumulates score and peak combo during player kicks', () => {
    expect(game.score).toBe(0);
    game.player.triggerKick();
    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x;
    game.ball.position.y = foot.y;
    game.executePlayerKick(game.player.x + 80, game.player.y - 200, 30);
    expect(game.score).toBeGreaterThan(0);
    expect(game.combo).toBe(2);
    expect(game.peakCombo).toBe(2);
  });

  it('updates distance traveled in meters as player moves horizontally', () => {
    game.player.x = 500;
    game.update(1 / 60);
    expect(game.distanceTraveledMeters).toBeGreaterThan(0);
  });

  it('keeps intro and ending updates cinematic without gameplay or Kevin attacks', () => {
    game.npc.rageMeter = 100;
    game.startIntroCutscene();
    const initialSurvival = game.survivalSeconds;
    const initialTimer = game.timedModeRemaining;
    game.update(0.5);
    expect(game.cutsceneTimer).toBeLessThan(3.6);
    expect(game.survivalSeconds).toBe(initialSurvival);
    expect(game.timedModeRemaining).toBe(initialTimer);
    expect(game.thrownProjectiles).toHaveLength(0);
    expect(['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'DIZZY_BONK', 'REPAIRING']).toContain(game.npc.state);

    game.gameState = 'PLAYING';
    game.startEndingCutscene();
    game.update(0.5);
    expect(game.survivalSeconds).toBe(initialSurvival);
    expect(game.timedModeRemaining).toBe(initialTimer);
    expect(game.thrownProjectiles).toHaveLength(0);
  });

  it('freezes updates while hidden and resumes music only for visible play', () => {
    const stop = vi.spyOn(sounds, 'stopMusic').mockImplementation(() => {});
    const start = vi.spyOn(sounds, 'startGenerativeMusic').mockImplementation(() => {});
    game.accumulator = 0.08;
    game.setPageVisibility(false);
    expect(game.accumulator).toBe(0);
    const survival = game.survivalSeconds;
    game.update(10);
    expect(game.survivalSeconds).toBe(survival);
    expect(stop).toHaveBeenCalled();
    game.gameState = 'IDLE';
    game.setPageVisibility(true);
    expect(start).not.toHaveBeenCalled();
    game.gameState = 'PLAYING';
    game.setPageVisibility(true);
    expect(start).toHaveBeenCalledOnce();
    game.update(1 / 60);
    expect(game.survivalSeconds).toBeCloseTo(survival + 1 / 60);
    stop.mockRestore();
    start.mockRestore();
  });

  it('restores transient run state while preserving records, audio preference, and callbacks', () => {
    game.highScore = 900;
    game.bestCombo = 8;
    const callback = () => {};
    game.onGameOverCallback = callback;
    const wasMuted = sounds.isMuted;
    game.score = 400;
    game.combo = 4;
    game.peakCombo = 5;
    game.juggleCount = 7;
    game.survivalSeconds = 19;
    game.timedModeRemaining = 70;
    game.distanceTraveledMeters = 13;
    game.comboGraceTimer = 1;
    game.kevinBonkTimer = 2;
    game.trickChain = ['KICK'];
    game.trickChainTimer = 3;
    game.accumulator = 0.2;
    game.isPointerDown = true;
    game.pointerDownTime = 300;
    game.mouseScreenPos = { x: 12, y: 13 };
    game.ballDeform.scaleX = 2;
    game.camera.x = 500;
    game.camera.addTrauma(0.5);
    game.player.takeDamage();
    game.player.triggerKick();
    game.player.keys.left = true;
    game.player.keys.charge = true;
    game.player.powerCharge = 0.8;
    game.player.vx = 300;
    game.player.invulnerabilityTimer = 0.5;
    game.npc.rageMeter = 80;
    game.npc.state = 'THROWING_PROJECTILE';
    game.npc.dialogue = 'dirty';
    game.npc.throwTimer = 0;
    game.mapRenderer.time = 30;
    game.mapRenderer.survivalSeconds = 20;
    game.mapRenderer.clouds[0].x = 500;
    game.mapRenderer.bird.x = 400;
    game.mapRenderer.cat.x = 700;
    const prop = game.proceduralWorld.getAllActiveProps()[0];
    if (prop) prop.isDestroyed = true;
    game.proceduralWorld.totalPropsSmashed = 9;
    game.proceduralWorld.yardsClearedCount = 2;
    const projectile = Matter.Bodies.circle(20, 30, 10, { label: 'thrown_projectile' });
    const shard = Matter.Bodies.circle(40, 30, 5, { label: 'environment_shard' });
    Matter.Composite.add(game.world, [projectile, shard]);
    game.thrownProjectiles.push(projectile);
    game.activeShards.push(shard);
    game.resetEnvironment();

    expect(game.gameState).toBe('IDLE');
    expect(game.isGameOver).toBe(false);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.peakCombo).toBe(1);
    expect(game.juggleCount).toBe(0);
    expect(game.survivalSeconds).toBe(0);
    expect(game.timedModeRemaining).toBe(180);
    expect(game.distanceTraveledMeters).toBe(0);
    expect(game.kevinBonkTimer).toBe(0);
    expect(game.trickChain).toEqual([]);
    expect(game.accumulator).toBe(0);
    expect(game.isPointerDown).toBe(false);
    expect(game.player.health).toBe(game.player.maxHealth);
    expect(game.player.state).toBe('IDLE');
    expect(game.player.kickTimer).toBe(0);
    expect(game.player.keys.left).toBe(false);
    expect(game.player.keys.charge).toBe(false);
    expect(game.player.powerCharge).toBe(0);
    expect(game.player.invulnerabilityTimer).toBe(0);
    expect(game.npc.state).toBe('PEEKING_INSIDE');
    expect(game.npc.dialogue).toBe('');
    expect(game.mapRenderer.time).toBe(0);
    expect(game.mapRenderer.survivalSeconds).toBe(0);
    expect(game.mapRenderer.clouds[0].x).toBe(120);
    expect(game.mapRenderer.bird.x).toBe(-50);
    expect(game.mapRenderer.cat.x).toBe(320);
    expect(game.thrownProjectiles).toEqual([]);
    expect(game.activeShards).toEqual([]);
    expect(Matter.Composite.allBodies(game.world)).not.toContain(projectile);
    expect(Matter.Composite.allBodies(game.world)).not.toContain(shard);
    expect(game.proceduralWorld.totalPropsSmashed).toBe(0);
    expect(game.proceduralWorld.yardsClearedCount).toBe(0);
    expect(game.camera.x).toBe(0);
    expect(game.ballDeform).toEqual({ scaleX: 1, scaleY: 1, angle: 0 });
    expect(game.highScore).toBe(900);
    expect(game.bestCombo).toBe(8);
    expect(sounds.isMuted).toBe(wasMuted);
    expect(game.onGameOverCallback).toBe(callback);
  });

  it('requires real kick contact and consumes one connection per kick', () => {
    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x + 120;
    game.ball.position.y = foot.y;
    game.trickChain = ['HEADING'];
    Matter.Body.setVelocity(game.ball, { x: 2, y: 3 });
    game.executePowerShot(1);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.ball.velocity).toEqual({ x: 2, y: 3 });
    expect(game.trickChain).toEqual(['HEADING']);
    game.handlePointerUp(700, 100);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.juggleCount).toBe(0);
    expect(game.ball.velocity).toEqual({ x: 2, y: 3 });
    expect(game.trickChain).toEqual(['HEADING']);

    game.ball.position.x = foot.x + 30;
    game.ball.position.y = foot.y;
    game.handlePointerUp(700, 100);
    expect(game.score).toBeGreaterThan(0);
    const score = game.score;
    const velocity = { ...game.ball.velocity };
    expect(game.executePlayerKick(100, 100, 30)).toBe(false);
    expect(game.score).toBe(score);
    expect(game.ball.velocity).toEqual(velocity);
    expect(game.juggleCount).toBe(1);
  });

  it('ejects Kevin hits toward their impact side with a centered fallback', () => {
    const kevin = Matter.Bodies.rectangle(790, 110, 70, 70, { label: 'destructible_kevin' });
    const exercise = (x, incoming) => {
      const ball = Matter.Bodies.circle(x, 110, 18, { label: 'player_ball' });
      Matter.Body.setVelocity(ball, { x: incoming, y: 0 });
      game.collisionHandler({ pairs: [{ bodyA: ball, bodyB: kevin }] });
      return ball.velocity.x;
    };
    expect(exercise(770, 1)).toBeLessThan(0);
    expect(exercise(810, -1)).toBeGreaterThan(0);
    expect(exercise(790, -1)).toBeLessThan(0);
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.player.facing = 1;
    expect(exercise(790, 0)).toBeLessThan(0);
  });

  it('does not advance run state or physics while idle or game over', () => {
    game.gameState = 'IDLE';
    const ball = game.ball;
    const before = {
      score: game.score,
      combo: game.combo,
      survival: game.survivalSeconds,
      timer: game.timedModeRemaining,
      x: ball.position.x,
      y: ball.position.y,
      vx: ball.velocity.x,
      vy: ball.velocity.y,
    };
    for (let i = 0; i < 120; i += 1) game.update(1 / 60);
    expect({ score: game.score, combo: game.combo, survival: game.survivalSeconds,
      timer: game.timedModeRemaining, x: ball.position.x, y: ball.position.y,
      vx: ball.velocity.x, vy: ball.velocity.y }).toEqual(before);

    game.gameState = 'GAME_OVER';
    game.isGameOver = false;
    game.update(1);
    expect(game.survivalSeconds).toBe(before.survival);
  });

  it('persists high scores when triggerGameOver is called', () => {
    game.score = 5000;
    game.peakCombo = 12;
    game.triggerGameOver();
    expect(game.highScore).toBe(5000);
    expect(game.bestCombo).toBe(12);
  });

  it('resets environment cleanly without stuck key inputs', () => {
    game.player.keys.left = true;
    game.isPointerDown = true;
    game.resetEnvironment();

    expect(game.isPointerDown).toBe(false);
    expect(game.player.keys.left).toBe(false);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.player.health).toBe(3);
  });
});
