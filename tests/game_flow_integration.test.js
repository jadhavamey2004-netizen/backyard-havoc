import { describe, it, expect, beforeEach, vi } from 'vitest';
import Matter from 'matter-js';
import { GameEngine } from '../src/game.js';
import { COLLISION_CATEGORIES } from '../src/destructibles.js';
import { sounds } from '../src/audio.js';
import { aiService } from '../src/ai.js';
import { GAMEPLAY_TUNING } from '../src/gameplay_rules.js';
import { GAMEPLAY_FEEL_TUNING } from '../src/gameplay_feel.js';

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

  const primeKevinAtCap = (calmTimer = 5) => {
    game.kevinDirector.syncRage(100, 'TEST');
    game.npc.setRage(100);
    game.npc.calmTimer = calmTimer;
  };

  it('accumulates score and peak combo during player kicks', () => {
    expect(game.score).toBe(0);
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x + 90;
    game.ball.position.y = foot.y;
    game.executePlayerKick(game.player.x + 180, game.player.y - 80);
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
    game.update(0.5);
    expect(game.cutsceneTimer).toBeLessThan(3.6);
    expect(game.survivalSeconds).toBe(initialSurvival);
    expect(game.thrownProjectiles).toHaveLength(0);
    expect(['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'DIZZY_BONK', 'REPAIRING']).toContain(game.npc.state);

    game.gameState = 'PLAYING';
    game.startEndingCutscene();
    game.update(0.5);
    expect(game.survivalSeconds).toBe(initialSurvival);
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

  it('cancels held charge, movement momentum, and camera impact feedback when hidden', () => {
    game.isPointerDown = true;
    game.pointerDownTime = performance.now() - 5000;
    game.player.powerCharging = true;
    game.player.powerCharge = 0.9;
    game.player.keys.left = true;
    game.player.keys.right = true;
    game.player.keys.sprint = true;
    game.player.vx = 480;
    game.camera.x = 640;
    game.camera.addTrauma(0.7, 0.06);

    game.setPageVisibility(false);
    expect(game.isPointerDown).toBe(false);
    expect(game.pointerDownTime).toBe(0);
    expect(game.player.powerCharging).toBe(false);
    expect(game.player.powerCharge).toBe(0);
    expect(game.player.keys).toEqual({ left: false, right: false, sprint: false, charge: false });
    expect(game.player.vx).toBe(0);
    expect(game.camera.x).toBe(640);
    expect(game.camera.trauma).toBe(0);
    expect(game.camera.zoomPunch).toBe(0);
    expect(game.camera.chromaticAberration).toBe(0);

    game.setPageVisibility(true);
    const playerX = game.player.x;
    game.update(1 / 60);
    expect(game.isPointerDown).toBe(false);
    expect(game.player.powerCharging).toBe(false);
    expect(game.player.powerCharge).toBe(0);
    expect(game.player.keys.left).toBe(false);
    expect(game.player.keys.right).toBe(false);
    expect(game.player.keys.sprint).toBe(false);
    expect(game.player.x).toBe(playerX);
    expect(game.player.vx).toBe(0);

    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x;
    game.ball.position.y = foot.y;
    game.handlePointerUp(700, 100);
    expect(game.score).toBe(0);
    expect(game.player.hasHitBallThisKick).toBe(false);
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
    game.distanceTraveledMeters = 13;
    game.ballGroundedDuration = 0.5;
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
    expect(game.ballGroundedDuration).toBe(0);
    expect(game.pendingPrimaryAction).toBeNull();
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

    game.ball.position.x = foot.x + 30;
    game.ball.position.y = foot.y;
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    game.executePlayerKick(700, 100);
    expect(game.score).toBeGreaterThan(0);
    const score = game.score;
    const velocity = { ...game.ball.velocity };
    expect(game.executePlayerKick(100, 100)).toBe(false);
    expect(game.score).toBe(score);
    expect(game.ball.velocity).toEqual(velocity);
    expect(game.juggleCount).toBe(1);
  });

  it('consumes the kick contact after a successful power shot', () => {
    const foot = game.player.getKickPosition();
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    game.ball.position.x = foot.x + 30;
    game.ball.position.y = foot.y;
    game.mouseScreenPos = { x: 700, y: 100 };
    game.executePowerShot(0.8);

    expect(game.player.hasHitBallThisKick).toBe(true);
    expect(game.juggleCount).toBe(1);
    const scoreAfterPowerShot = game.score;
    const velocityAfterPowerShot = { ...game.ball.velocity };
    expect(game.executePlayerKick(100, 100)).toBe(false);
    expect(game.score).toBe(scoreAfterPowerShot);
    expect(game.juggleCount).toBe(1);
    expect(game.ball.velocity).toEqual(velocityAfterPowerShot);
  });

  it('missedPrimaryActionHasNoGameplayConsequences', () => {
    game.engine.gravity.scale = 0;
    game.ball.position.x = game.player.x + 400;
    game.ball.position.y = game.player.y - 100;
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    const before = { ...game.ball.velocity };
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.handlePointerDown(700, 100);
    game.handlePointerUp(700, 100);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.ball.velocity).toEqual(before);
    expect(game.pendingPrimaryAction).not.toBeNull();
    for (let frame = 0; frame < 25; frame += 1) game.update(1 / 60);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.juggleCount).toBe(0);
    expect(game.ball.velocity).toEqual(before);
    expect(events.some(event => event.type === 'BALL_CONTACT')).toBe(false);
  });

  it('normalKickOnlyConnectsDuringStrikeWindow', () => {
    game.engine.gravity.scale = 0;
    game.ball.position.x = game.player.x + 30;
    game.ball.position.y = game.ground.bounds.min.y - game.ball.circleRadius;
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.handlePointerDown(700, 100);
    game.handlePointerUp(700, 100);
    expect(game.score).toBe(0);
    expect(game.player.kickProgress).toBe(0);
    for (let frame = 0; frame < 20 && game.score === 0; frame += 1) game.update(1 / 60);
    expect(game.score).toBe(300);
    expect(game.combo).toBe(2);
    expect(game.player.hasHitBallThisKick).toBe(true);
    expect(events.filter(event => event.type === 'BALL_CONTACT').map(event => event.contactType)).toEqual(['KICK']);
  });

  it('capsActionAndWorldTimeToTheSamePhysicsBudgetOnLongFrames', () => {
    game.engine.gravity.scale = 0;
    const foot = game.player.getKickPosition();
    Matter.Body.setPosition(game.ball, {
      x: foot.x,
      y: game.ground.bounds.min.y - game.ball.circleRadius
    });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.player.triggerKick();
    game.pendingPrimaryAction = {
      charge: 0,
      powerShot: false,
      aim: { x: foot.x + 100, y: foot.y }
    };

    const playerUpdate = vi.spyOn(game.player, 'update');
    const worldTimestamp = game.engine.timing.timestamp;
    const survivalBefore = game.survivalSeconds;
    game.update(0.1);

    const playerDt = playerUpdate.mock.calls.at(-1)[0];
    const actionElapsed = game.player.kickDuration - game.player.kickTimer;
    const worldElapsed = (game.engine.timing.timestamp - worldTimestamp) / 1000;
    expect(playerDt).toBeCloseTo(0.05, 8);
    expect(actionElapsed).toBeCloseTo(worldElapsed, 8);
    expect(worldElapsed).toBeCloseTo(0.05, 8);
    expect(game.survivalSeconds - survivalBefore).toBeCloseTo(worldElapsed, 8);
    expect(game.player.kickProgress).toBeCloseTo(worldElapsed / GAMEPLAY_TUNING.KICK_ACTION_DURATION, 8);
  });

  it('consequenceHelpersCannotBypassStrikeContactPhase', () => {
    const foot = game.player.getKickPosition();
    Matter.Body.setPosition(game.ball, { x: foot.x + 90, y: foot.y });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    expect(game.executePlayerKick(700, 100, 'KICK')).toBe(false);
    expect(game.executePowerShot(1, 700, 100, 'KICK')).toBe(false);
    expect(game.score).toBe(0);
    expect(game.combo).toBe(1);
    expect(game.player.hasHitBallThisKick).toBe(false);
  });

  it('primaryActionSelectsHeaderBeforeKick', () => {
    game.engine.gravity.scale = 0;
    const head = game.player.getHeaderPosition();
    game.ball.position.x = head.x;
    game.ball.position.y = head.y;
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.handlePointerDown(700, 100);
    game.handlePointerUp(700, 100);
    for (let frame = 0; frame < 20 && game.score === 0; frame += 1) game.update(1 / 60);
    expect(events.filter(event => event.type === 'BALL_CONTACT').map(event => event.contactType)).toEqual(['HEADER']);
    expect(game.score).toBe(200);
    expect(game.combo).toBe(2);
    expect(game.player.hasHitBallThisKick).toBe(true);
  });

  it('chargedActionUsesReleaseSnapshotAndOnlyScoresOnContact', () => {
    game.engine.gravity.scale = 0;
    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x;
    game.ball.position.y = game.player.y + 10;
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.handlePointerDown(700, 100);
    game.pointerDownTime = performance.now() - 600;
    game.player.powerCharge = 0;
    game.handlePointerUp(700, 100);
    expect(game.score).toBe(0);
    expect(game.pendingPrimaryAction?.powerShot).toBe(true);
    for (let frame = 0; frame < 20 && game.score === 0; frame += 1) game.update(1 / 60);
    expect(game.score).toBe(200);
    expect(game.player.hasHitBallThisKick).toBe(true);
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
      x: ball.position.x,
      y: ball.position.y,
      vx: ball.velocity.x,
      vy: ball.velocity.y,
    };
    for (let i = 0; i < 120; i += 1) game.update(1 / 60);
    expect({ score: game.score, combo: game.combo, survival: game.survivalSeconds,
      x: ball.position.x, y: ball.position.y,
      vx: ball.velocity.x, vy: ball.velocity.y }).toEqual(before);

    game.gameState = 'GAME_OVER';
    game.isGameOver = false;
    game.update(1);
    expect(game.survivalSeconds).toBe(before.survival);
  });

  it('survivalTimeAdvancesOnlyInPlayingAndPastFormerTimer', () => {
    game.survivalSeconds = 180;
    game.update(1 / 60);
    expect(game.gameState).toBe('PLAYING');
    expect(game.survivalSeconds).toBeCloseTo(180 + 1 / 60);
    expect(game.isGameOver).toBe(false);
  });

  it('constructorAndRunResetDoNotEmitGameplayComboEvents', () => {
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.combo = 4;
    game.resetEnvironment();
    expect(events).toEqual([]);
    expect(game.combo).toBe(1);
    expect(game.onGameplayEvent).toBeTypeOf('function');
  });

  it('comboGroundGraceUsesContinuousGroundedTimeAcrossBounces', () => {
    const setGrounded = () => {
      Matter.Body.setPosition(game.ball, {
        x: game.player.x,
        y: game.ground.bounds.min.y - game.ball.circleRadius
      });
      Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    };
    game.combo = 4;
    game.juggleCount = 5;

    setGrounded();
    game.updateComboGroundGrace(0.4);
    expect(game.combo).toBe(4);
    Matter.Body.setVelocity(game.ball, { x: 0, y: -2 });
    game.updateComboGroundGrace(0.05);
    expect(game.ballGroundedDuration).toBe(0);
    setGrounded();
    game.updateComboGroundGrace(0.5);
    expect(game.combo).toBe(4);
    expect(game.juggleCount).toBe(5);
  });

  it('comboGroundGraceExpiresAfterOneContinuousGroundedInterval', () => {
    Matter.Body.setPosition(game.ball, {
      x: game.player.x,
      y: game.ground.bounds.min.y - game.ball.circleRadius
    });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.combo = 4;
    game.juggleCount = 5;
    game.updateComboGroundGrace(0.79);
    expect(game.combo).toBe(4);
    game.updateComboGroundGrace(0.02);
    expect(game.combo).toBe(1);
    expect(game.juggleCount).toBe(0);
  });

  it('successfulContactClearsGroundGraceBeforeReset', () => {
    const foot = game.player.getKickPosition();
    Matter.Body.setPosition(game.ball, { x: foot.x, y: game.player.y - 9 });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.combo = 3;
    game.ballGroundedDuration = 0.79;
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    expect(game.player.getContactCandidate(game.ball.position)).toBe('KICK');
    expect(game.executePlayerKick(700, 100)).toBe(true);
    expect(game.ballGroundedDuration).toBe(0);
    expect(game.combo).toBe(4);
  });

  it('healthZeroStartsDefeatExactlyOnceAndEmitsDamageOnce', () => {
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.combo = 3;
    game.player.health = 1;
    game.player.invulnerabilityTimer = 0;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const projectile = Matter.Bodies.circle(point.x, point.y, 10, { label: 'thrown_projectile' });
    game.thrownProjectiles.push(projectile);
    const ending = vi.spyOn(game, 'startEndingCutscene');
    game.update(1 / 60);
    game.update(1 / 60);
    expect(game.player.health).toBe(0);
    expect(ending).toHaveBeenCalledOnce();
    expect(events.filter(event => event.type === 'PLAYER_DAMAGED')).toHaveLength(1);
    expect(game.combo).toBe(1);
  });

  it('destructionAndKevinImpactsDoNotAdvanceCombo', () => {
    game.combo = 4;
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    const ball = game.ball;
    const prop = Matter.Bodies.rectangle(500, 200, 30, 30, {
      label: 'destructible_prop', isDestructible: true, pointValue: 100, color: '#888'
    });
    game.collisionHandler({ pairs: [{ bodyA: ball, bodyB: prop }] });
    expect(game.combo).toBe(4);
    expect(events.filter(event => event.type === 'OBJECT_DESTROYED')).toHaveLength(1);

    const kevin = Matter.Bodies.rectangle(game.npc.x, game.npc.y, 70, 70, { label: 'destructible_kevin' });
    game.kevinBonkTimer = 0;
    const scoreBeforeKevin = game.score;
    const havocBeforeKevin = game.havocSystem.meter;
    game.collisionHandler({ pairs: [{ bodyA: ball, bodyB: kevin }] });
    expect(game.combo).toBe(4);
    expect(events.filter(event => event.type === 'KEVIN_HIT')).toHaveLength(1);
    expect(game.score - scoreBeforeKevin).toBe(500 * game.combo);
    expect(game.npc.rageMeter).toBe(100);
    expect(game.kevinDirector.state).toBe('RAMPAGE');
    expect(game.havocSystem.meter - havocBeforeKevin).toBe(20);

    const scoreAfterFirstHit = game.score;
    game.collisionHandler({ pairs: [{ bodyA: ball, bodyB: kevin }] });
    expect(game.score).toBe(scoreAfterFirstHit);
    expect(events.filter(event => event.type === 'KEVIN_HIT')).toHaveLength(1);
  });

  it('powerShotUsesNormalBaseContactScoreWithoutChargeMultiplier', () => {
    const foot = game.player.getKickPosition();
    Matter.Body.setPosition(game.ball, { x: foot.x + 90, y: foot.y });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    expect(game.executePowerShot(0.5, 700, 100)).toBe(true);
    expect(game.score).toBe(200);
    expect(events.filter(event => event.type === 'BALL_CONTACT')).toEqual([
      expect.objectContaining({ contactType: 'POWER_SHOT', score: 200 })
    ]);
    expect(events.filter(event => event.type === 'POWER_SHOT')).toHaveLength(1);
  });

  it('simulates only the frame remainder after elapsed-time hit-stop expires', () => {
    game.player.triggerKick();
    const initialKickTime = game.player.kickTimer;
    game.particles.triggerHitStop(0.02);
    game.update(0.05);

    expect(game.survivalSeconds).toBeCloseTo(0.03, 10);
    expect(game.player.kickTimer).toBeCloseTo(initialKickTime - 0.03, 10);
    expect(game.particles.hitStopRemainingSeconds).toBe(0);

    game.particles.triggerHitStop(0.05);
    game.ballFeedbackTier = 'POWER_SHOT';
    game.ballFeedbackStrength = 1;
    game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    game.setPageVisibility(false);
    expect(game.particles.hitStopRemainingSeconds).toBe(0);
    expect(game.ballFeedbackTier).toBe('NORMAL');
    expect(game.ballFeedbackStrength).toBe(0);
    expect(game.ballDeform).toEqual({ scaleX: 1, scaleY: 1, angle: 0 });
  });

  it('stops the current update after a football contact creates hit-stop', () => {
    game.engine.gravity.scale = 0;
    const foot = game.player.getKickPosition();
    Matter.Body.setPosition(game.ball, { x: foot.x + 80, y: foot.y });
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
    game.score = 0;
    game.combo = 1;
    game.trickChain = [];
    game.player.triggerKick();
    game.player.kickProgress = 0.29;
    game.player.kickTimer = game.player.kickDuration * (1 - game.player.kickProgress);
    game.pendingPrimaryAction = { charge: 0, powerShot: false, aim: { x: foot.x + 100, y: foot.y } };
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.accumulator = 0;
    const physicsUpdate = vi.spyOn(Matter.Engine, 'update');

    game.update(0.05);

    expect(events.filter(event => event.type === 'BALL_CONTACT')).toHaveLength(1);
    expect(game.player.hasHitBallThisKick).toBe(true);
    expect(game.score).toBe(events.find(event => event.type === 'BALL_CONTACT').score);
    expect(game.particles.hitStopRemainingSeconds).toBe(GAMEPLAY_FEEL_TUNING.HIT_STOP_CONTACT_SECONDS);
    expect(physicsUpdate).not.toHaveBeenCalled();
    expect(game.accumulator).toBe(0);
    physicsUpdate.mockRestore();
  });

  it('stops later Matter substeps when a collision creates hit-stop', () => {
    game.engine.gravity.scale = 0;
    game.player.x = 280;
    Matter.Body.setPosition(game.ball, { x: 462, y: 300 });
    Matter.Body.setVelocity(game.ball, { x: 8, y: 0 });
    const glass = Matter.Bodies.rectangle(500, 300, 50, 50, {
      label: 'destructible_window', isDestructible: true, isGlass: true, color: '#cbd5e1'
    });
    Matter.Composite.add(game.world, glass);
    const originalUpdate = Matter.Engine.update;
    let collisionDispatched = false;
    const physicsUpdate = vi.spyOn(Matter.Engine, 'update').mockImplementation((engine, milliseconds) => {
      const result = originalUpdate(engine, milliseconds);
      if (!collisionDispatched) {
        collisionDispatched = true;
        Matter.Events.trigger(engine, 'collisionStart', {
          source: engine,
          pairs: [{ bodyA: game.ball, bodyB: glass }]
        });
      }
      return result;
    });
    game.accumulator = 0;

    game.update(0.05);

    expect(glass.isDestroyed).toBe(true);
    expect(game.particles.hitStopRemainingSeconds)
      .toBe(GAMEPLAY_FEEL_TUNING.HIT_STOP_WORLD_IMPACT_SECONDS);
    expect(collisionDispatched).toBe(true);
    expect(physicsUpdate).toHaveBeenCalled();
    expect(physicsUpdate.mock.calls.length).toBeLessThan(game.nSub * 3);
    expect(game.accumulator).toBe(0);
    const physicsCallsAtImpact = physicsUpdate.mock.calls.length;
    game.update(1 / 60);
    expect(physicsUpdate).toHaveBeenCalledTimes(physicsCallsAtImpact);
    physicsUpdate.mockRestore();
  });

  it('stops before physics when a parried projectile hits Kevin', () => {
    const projectile = Matter.Bodies.circle(game.npc.x, game.npc.y, 10, { label: 'thrown_projectile' });
    projectile.isParried = true;
    Matter.Composite.add(game.world, projectile);
    game.thrownProjectiles.push(projectile);
    game.accumulator = 0.003;
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    const kevinHit = vi.spyOn(game.npc, 'takeDirectHit');
    const physicsUpdate = vi.spyOn(Matter.Engine, 'update');

    game.update(0.05);

    expect(events.filter(event => event.type === 'KEVIN_HIT')).toHaveLength(1);
    expect(game.score).toBe(1000);
    expect(kevinHit).toHaveBeenCalledOnce();
    expect(game.thrownProjectiles).not.toContain(projectile);
    expect(Matter.Composite.allBodies(game.world)).not.toContain(projectile);
    expect(game.particles.hitStopRemainingSeconds)
      .toBe(GAMEPLAY_FEEL_TUNING.HIT_STOP_KEVIN_HIT_SECONDS);
    expect(game.npc.rageMeter).toBe(100);
    expect(game.kevinDirector.state).toBe('RAMPAGE');
    expect(game.havocSystem.meter).toBe(20);
    expect(physicsUpdate).not.toHaveBeenCalled();
    expect(game.accumulator).toBe(0);

    game.update(0.01);
    expect(physicsUpdate).not.toHaveBeenCalled();
    expect(game.accumulator).toBe(0);
    expect(events.filter(event => event.type === 'KEVIN_HIT')).toHaveLength(1);
    physicsUpdate.mockRestore();
  });

  it('clears temporary feel state on intro, ending, game over, and run reset', () => {
    const primeTransientFeel = () => {
      game.particles.triggerHitStop(0.1);
      game.particles.spawnVignetteFlash();
      game.particles.spawnImpactRings(10, 20, 2);
      game.particles.addTrailPoint({ x: 30, y: 40 });
      game.camera.addTrauma(0.5, 0.04);
      game.camera.addImpulse(4, -2);
      game.ballFeedbackTier = 'POWER_SHOT';
      game.ballFeedbackStrength = 0.9;
      game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    };
    const expectFeelReset = () => {
      expect(game.particles.hitStopRemainingSeconds).toBe(0);
      expect(game.particles.vignettes).toHaveLength(0);
      expect(game.particles.impactRings).toHaveLength(0);
      expect(game.particles.trailPoints).toHaveLength(0);
      expect(game.ballFeedbackTier).toBe('NORMAL');
      expect(game.ballFeedbackStrength).toBe(0);
      expect(game.ballDeform).toEqual({ scaleX: 1, scaleY: 1, angle: 0 });
      expect(game.camera.trauma).toBe(0);
      expect(game.camera.zoomPunch).toBe(0);
      expect(game.camera.chromaticAberration).toBe(0);
      expect(game.camera.impulseX).toBe(0);
      expect(game.camera.impulseY).toBe(0);
    };
    primeTransientFeel();
    game.startIntroCutscene();
    expectFeelReset();

    primeTransientFeel();
    game.ballFeedbackTier = 'PERFECT_STRIKE';
    game.ballFeedbackStrength = 0.8;
    game.startEndingCutscene();
    expectFeelReset();

    primeTransientFeel();
    game.ballFeedbackStrength = 1;
    game.triggerGameOver();
    expectFeelReset();

    primeTransientFeel();
    game.ballFeedbackStrength = 1;
    game.resetEnvironment();
    expectFeelReset();
  });

  it('dispatches gameplay events to presentation without changing their gameplay results', () => {
    game.score = 1234;
    game.combo = 4;
    const event = { type: 'PERFECT_PARRY', score: 1000, combo: 4 };

    game.publishGameplayEvent(event, { x: 100, y: 120, direction: 1 });

    expect(game.camera.trauma).toBe(GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_PARRY_TRAUMA);
    expect(game.particles.impactRings).toHaveLength(6);
    expect(game.score).toBe(1234);
    expect(game.combo).toBe(4);
    expect(event).toEqual({ type: 'PERFECT_PARRY', score: 1000, combo: 4 });
  });

  it('maps mouse aim through zoom without incorporating shake or changing world camera position', () => {
    game.camera.x = 420;
    const initial = game.getScreenAimWorldPoint(960, 540);
    game.camera.addTrauma(0, 0.08, 0);
    game.camera.addImpulse(8, -4);
    const transformed = game.getScreenAimWorldPoint(960, 540);

    expect(initial).toEqual({ x: 1380, y: 540 });
    expect(transformed.x).toBeCloseTo(420 + 480 + 480 / 1.08, 8);
    expect(transformed.y).toBeCloseTo(270 + 270 / 1.08, 8);
    expect(game.camera.x).toBe(420);
  });

  it('renders bounded zoom around the stable screen center without drifting world tracking', () => {
    const scale = vi.spyOn(game.ctx, 'scale');
    game.camera.x = 420;
    game.camera.addTrauma(0, 0.05, 0);
    game.mapRenderer.drawSkyAndSun = vi.fn();
    game.mapRenderer.drawWorldLayers = vi.fn();
    game.mapRenderer.drawProps = vi.fn();
    game.mapRenderer.drawResidues = vi.fn();
    game.npc.draw = vi.fn();
    game.drawThrownProjectiles = vi.fn();
    game.drawEnvironmentShards = vi.fn();
    game.particles.draw = vi.fn();
    game.player.draw = vi.fn();
    game.drawBall = vi.fn();
    game.drawAimGuide = vi.fn();
    game.drawBallIndicators = vi.fn();
    game.drawPowerMeterInCanvas = vi.fn();

    game.render(0);

    expect(scale).toHaveBeenCalledWith(1.05, 1.05);
    expect(game.camera.x).toBe(420);
  });

  it('applies reduced-motion scaling only to presentation systems', () => {
    game.score = 765;
    game.combo = 3;
    game.camera.addTrauma(0.4, 0.03, 2);

    game.setReducedMotion(true);

    expect(game.camera.motionMultiplier).toBe(0.35);
    expect(game.particles.motionMultiplier).toBe(0.35);
    expect(game.camera.trauma).toBe(0.4);
    expect(game.score).toBe(765);
    expect(game.combo).toBe(3);
  });

  it('identical kick inputs produce identical physics at different combo levels', () => {
    const launchAtCombo = (combo) => {
      game.combo = combo;
      game.player.resetRunState(game.startX, game.height - 55);
      game.player.triggerKick();
      game.player.kickProgress = 0.5;
      const foot = game.player.getKickPosition();
      Matter.Body.setPosition(game.ball, foot);
      Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
      expect(game.executePlayerKick(700, 100)).toBe(true);
      return { velocity: { ...game.ball.velocity }, angularVelocity: game.ball.angularVelocity };
    };

    expect(launchAtCombo(20)).toEqual(launchAtCombo(1));
  });

  it('keeps gameplay outcomes identical with normal and reduced-motion presentation', () => {
    const runScenario = (reducedMotion) => {
      const engine = new GameEngine(createMockCanvas());
      engine.gameState = 'PLAYING';
      engine.setReducedMotion(reducedMotion);
      engine.player.triggerKick();
      engine.player.kickProgress = 0.5;
      const foot = engine.player.getKickPosition();
      Matter.Body.setPosition(engine.ball, foot);
      Matter.Body.setVelocity(engine.ball, { x: 0, y: 0 });
      expect(engine.executePlayerKick(foot.x + 200, foot.y - 120, 'KICK')).toBe(true);
      const kickVelocity = { ...engine.ball.velocity };

      const target = engine.proceduralWorld.getAllActiveProps().find(prop =>
        prop.isDestructible && prop.material === 'WOOD' && !prop.isNpc);
      expect(target).toBeDefined();
      Matter.Body.setVelocity(engine.ball, { x: 8, y: -2 });
      engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });

      return {
        kickVelocity,
        impactVelocity: { ...engine.ball.velocity },
        score: engine.score,
        combo: engine.combo,
        health: engine.player.health,
        kevinRage: engine.npc.rageMeter,
        kevinState: engine.kevinDirector.getSnapshot(),
        havoc: engine.havocSystem.getSnapshot(),
        destroyedPropKeys: [...engine.proceduralWorld.destroyedPropKeys].sort(),
        totalPropsSmashed: engine.proceduralWorld.totalPropsSmashed
      };
    };

    expect(runScenario(true)).toEqual(runScenario(false));
  });

  it('power-shot contact strength rises with charge without changing contact score', () => {
    const launchAtCharge = (charge) => {
      game.score = 0;
      game.combo = 1;
      game.trickChain = [];
      game.trickChainTimer = 0;
      game.player.resetRunState(game.startX, game.height - 55);
      game.player.triggerKick();
      game.player.kickProgress = 0.5;
      Matter.Body.setPosition(game.ball, game.player.getKickPosition());
      Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });
      expect(game.executePowerShot(charge, 700, 100)).toBe(true);
      return { speed: Math.hypot(game.ball.velocity.x, game.ball.velocity.y), score: game.score };
    };

    const threshold = launchAtCharge(0.25);
    const half = launchAtCharge(0.5);
    const full = launchAtCharge(1);
    expect(threshold.speed).toBeLessThan(half.speed);
    expect(half.speed).toBeLessThan(full.speed);
    expect([threshold.score, half.score, full.score]).toEqual([200, 200, 200]);
  });

  it('keeps the post-update ball safety cap above the full-charge launch', () => {
    game.engine.gravity.scale = 0;
    Matter.Body.setPosition(game.ball, { x: 450, y: 300 });
    Matter.Body.setVelocity(game.ball, { x: 30, y: 0 });
    game.update(1 / 60);

    expect(Math.hypot(game.ball.velocity.x, game.ball.velocity.y))
      .toBeLessThanOrEqual(GAMEPLAY_FEEL_TUNING.BALL_MAX_SPEED);
    expect(GAMEPLAY_FEEL_TUNING.BALL_MAX_SPEED)
      .toBeGreaterThan(GAMEPLAY_FEEL_TUNING.POWER_SHOT_FULL_SPEED);
  });

  it('uses Matter air friction consistently across equivalent frame subdivisions', () => {
    const velocityAfter = (frameDt, frames) => {
      game.engine.gravity.scale = 0;
      game.player.x = 280;
      game.accumulator = 0;
      Matter.Body.setPosition(game.ball, { x: 450, y: 300 });
      Matter.Body.setVelocity(game.ball, { x: 8, y: 0 });
      for (let i = 0; i < frames; i += 1) game.update(frameDt);
      return { x: game.ball.velocity.x, y: game.ball.velocity.y };
    };

    const at60Hz = velocityAfter(1 / 60, 60);
    const at120Hz = velocityAfter(1 / 120, 120);
    expect(at120Hz.x).toBeCloseTo(at60Hz.x, 5);
    expect(at120Hz.y).toBeCloseTo(at60Hz.y, 5);
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

  it('routes gameplay events through Kevin escalation and Havoc without recursive system events', () => {
    const published = [];
    game.onGameplayEvent = event => published.push(event);

    game.emitGameplayEvent('OBJECT_DESTROYED', { score: 100, combo: 1, distanceToKevin: 100 });
    expect(game.npc.rageMeter).toBe(12);
    expect(game.kevinDirector.state).toBe('SUSPICIOUS');
    expect(game.havocSystem.meter).toBe(8);
    expect(published.map(event => event.type)).toEqual([
      'OBJECT_DESTROYED', 'KEVIN_ESCALATION_CHANGED', 'HAVOC_CHANGED'
    ]);
    expect(published[1]).toMatchObject({ previous: 'CALM', current: 'SUSPICIOUS', rage: 12, reason: 'OBJECT_DESTROYED' });
  });

  it('refreshes capped rage grace after a new positive gameplay provocation', () => {
    primeKevinAtCap(5.9);
    const applyGameplayRage = vi.spyOn(game.npc, 'applyGameplayRage');

    game.emitGameplayEvent('PERFECT_PARRY');

    expect(game.kevinDirector.state).toBe('RAMPAGE');
    expect(game.kevinDirector.rage).toBe(100);
    expect(game.npc.rageMeter).toBe(100);
    expect(game.npc.calmTimer).toBe(0);
    expect(applyGameplayRage).toHaveBeenCalledOnce();
    expect(applyGameplayRage).toHaveBeenCalledWith(100, { provoked: true });
  });

  it('preserves the full six-second grace after a capped provocation before normal decay', () => {
    primeKevinAtCap(5.9);
    game.emitGameplayEvent('PERFECT_PARRY');
    const updateKevin = dt => game.npc.update(dt, game.player.x, game.particles, false, rage => {
      game.kevinDirector.syncRage(rage, 'RAGE_DECAY');
      return game.kevinDirector.getAttackProfile();
    });

    updateKevin(5.9);
    expect(game.npc.calmTimer).toBeCloseTo(5.9);
    expect(game.npc.rageMeter).toBe(100);

    updateKevin(0.1);
    expect(game.npc.calmTimer).toBeCloseTo(6);
    expect(game.npc.rageMeter).toBe(100);

    updateKevin(0.1);
    expect(game.npc.calmTimer).toBeCloseTo(6.1);
    expect(game.npc.rageMeter).toBeCloseTo(99.65);
    expect(game.kevinDirector.rage).toBeCloseTo(99.65);
  });

  it('does not refresh capped rage grace for BLOCK', () => {
    primeKevinAtCap(5);
    game.emitGameplayEvent('BLOCK');
    expect(game.npc.calmTimer).toBe(5);
  });

  it('does not refresh capped rage grace for ordinary ball contact', () => {
    primeKevinAtCap(5);
    game.emitGameplayEvent('BALL_CONTACT', { contactType: 'KICK', perfectStrike: false });
    expect(game.npc.calmTimer).toBe(5);
  });

  it('ignores the Power Shot companion contact but refreshes once for canonical Power Shot', () => {
    primeKevinAtCap(5);
    const applyGameplayRage = vi.spyOn(game.npc, 'applyGameplayRage');

    game.emitGameplayEvent('BALL_CONTACT', { contactType: 'POWER_SHOT', perfectStrike: true });
    expect(game.npc.calmTimer).toBe(5);
    expect(applyGameplayRage).not.toHaveBeenCalled();

    game.emitGameplayEvent('POWER_SHOT');
    expect(game.npc.calmTimer).toBe(0);
    expect(applyGameplayRage).toHaveBeenCalledOnce();
    expect(applyGameplayRage).toHaveBeenCalledWith(100, { provoked: true });
  });

  it('refreshes capped calm grace through production Havoc activation and reaction', () => {
    primeKevinAtCap(5);
    game.havocSystem.meter = 94;
    const applyGameplayRage = vi.spyOn(game.npc, 'applyGameplayRage');

    game.emitGameplayEvent('POWER_SHOT');

    expect(game.havocSystem.active).toBe(true);
    expect(game.kevinDirector.rage).toBe(100);
    expect(game.kevinDirector.getRecentContext()).toMatchObject({
      lastProvocationType: 'HAVOC_STARTED', recentEventCount: 2
    });
    expect(game.npc.calmTimer).toBe(0);
    expect(applyGameplayRage).toHaveBeenCalledTimes(2);
    expect(applyGameplayRage).toHaveBeenNthCalledWith(1, 100, { provoked: true });
    expect(applyGameplayRage).toHaveBeenNthCalledWith(2, 100, { provoked: true });
  });

  it('refreshes capped calm grace when KEVIN_HIT is processed', () => {
    primeKevinAtCap(5);
    game.emitGameplayEvent('KEVIN_HIT');
    expect(game.kevinDirector.state).toBe('RAMPAGE');
    expect(game.npc.rageMeter).toBe(100);
    expect(game.npc.calmTimer).toBe(0);
  });

  it('keeps local delayed dialogue cosmetic and unable to alter rage, escalation, or attack timing', () => {
    const speak = vi.spyOn(sounds, 'speakKevinVoice').mockImplementation(() => {});
    primeKevinAtCap(5);
    const initial = {
      rage: game.npc.rageMeter,
      state: game.kevinDirector.state,
      throwTimer: game.npc.throwTimer,
      lowLevel: game.npc.state,
      calmTimer: game.npc.calmTimer
    };

    aiService.handleEdgeResponse({
      impact_object: 'window',
      combo_multiplier: 1,
      ball_type: 'Standard Match Ball',
      environmental_tags: ['DESTRUCTION'],
      npcRage: 0,
      isHeadshot: false,
      isParry: false,
      isRampage: false,
      isFirstHit: false
    });

    expect(game.npc.dialogue).not.toBe('');
    expect(game.npc.rageMeter).toBe(initial.rage);
    expect(game.kevinDirector.state).toBe(initial.state);
    expect(game.npc.throwTimer).toBe(initial.throwTimer);
    expect(game.npc.state).toBe(initial.lowLevel);
    expect(game.npc.calmTimer).toBe(initial.calmTimer);
    expect(speak).toHaveBeenCalled();
    speak.mockRestore();
  });

  it('applies canonical Power Shot score, combo, rage, and Havoc exactly once', () => {
    const published = [];
    game.onGameplayEvent = event => published.push(event);
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    Matter.Body.setPosition(game.ball, game.player.getKickPosition());
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });

    expect(game.executePowerShot(0.5, 700, 100)).toBe(true);

    expect(game.score).toBe(GAMEPLAY_TUNING.NORMAL_CONTACT_REWARD * 2);
    expect(game.combo).toBe(2);
    expect(game.npc.rageMeter).toBe(5);
    expect(game.havocSystem.meter).toBe(6);
    expect(published.filter(event => event.type === 'BALL_CONTACT')).toHaveLength(1);
    expect(published.filter(event => event.type === 'POWER_SHOT')).toHaveLength(1);
    expect(published.some(event => event.type === 'HAVOC_SCORE_BONUS')).toBe(false);
  });

  it('awards one Havoc bonus for a Power Shot without double-counting its companion contact', () => {
    const published = [];
    game.onGameplayEvent = event => published.push(event);
    game.havocSystem.meter = 100;
    game.havocSystem.active = true;
    game.havocSystem.havocActivations = 1;
    game.player.triggerKick();
    game.player.kickProgress = 0.5;
    Matter.Body.setPosition(game.ball, game.player.getKickPosition());
    Matter.Body.setVelocity(game.ball, { x: 0, y: 0 });

    expect(game.executePowerShot(0.5, 700, 100)).toBe(true);
    expect(game.player.hasHitBallThisKick).toBe(true);
    expect(game.executePowerShot(0.5, 700, 100)).toBe(false);
    expect(game.score).toBe(GAMEPLAY_TUNING.NORMAL_CONTACT_REWARD * 2 * 1.5);
    expect(game.combo).toBe(2);
    expect(published.filter(event => event.type === 'BALL_CONTACT')).toHaveLength(1);
    expect(published.filter(event => event.type === 'POWER_SHOT')).toHaveLength(1);
    expect(published.filter(event => event.type === 'HAVOC_SCORE_BONUS')).toEqual([
      expect.objectContaining({ source: 'POWER_SHOT', baseScore: 200, bonus: 100, currentCombo: 2 })
    ]);
    expect(game.havocSystem.meter).toBe(100);
  });

  it('does not bonus the Havoc-filling event and adds one bonus to a later eligible base score', () => {
    const published = [];
    game.onGameplayEvent = event => published.push(event);
    game.havocSystem.meter = 96;
    game.score = 50;

    game.emitGameplayEvent('OBJECT_DESTROYED', { score: 50, combo: 1, nearKevin: false });
    expect(game.score).toBe(50);
    expect(game.havocSystem.active).toBe(true);
    expect(published.filter(event => event.type === 'HAVOC_SCORE_BONUS')).toHaveLength(0);

    game.score += 50;
    game.emitGameplayEvent('OBJECT_DESTROYED', { score: 50, combo: 1, nearKevin: false });
    expect(game.score).toBe(125);
    expect(published.filter(event => event.type === 'HAVOC_SCORE_BONUS')).toEqual([
      expect.objectContaining({ source: 'OBJECT_DESTROYED', baseScore: 50, bonus: 25, currentCombo: 1 })
    ]);
    expect(game.havocSystem.meter).toBe(100);
  });

  it('publishes the existing three-event trick bonus once as a completed chain', () => {
    const published = [];
    game.combo = 4;
    game.onGameplayEvent = event => published.push(event);

    game.recordTrickEvent('KICK');
    expect(game.trickChainTimer).toBe(3);
    expect(published.filter(event => event.type === 'TRICK_CHAIN_COMPLETED')).toHaveLength(0);
    game.recordTrickEvent('WINDOW_SHATTER');
    game.recordTrickEvent('GNOME_BONK');

    const completionEvents = published.filter(event => event.type === 'TRICK_CHAIN_COMPLETED');
    expect(completionEvents).toHaveLength(1);
    expect(completionEvents[0]).toMatchObject({
      completedEvents: ['KICK', 'WINDOW_SHATTER', 'GNOME_BONK'],
      combo: 4,
      score: 4000,
      bonusScore: 4000
    });
    expect(game.score).toBe(4000);
    expect(game.trickChain).toEqual([]);
    expect(game.havocSystem.meter).toBe(18);
  });

  it('freezes Kevin memory and Havoc timers during hidden time, hit-stop, cutscenes, and game over', () => {
    game.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true });
    const memory = game.kevinDirector.getSnapshot();
    const havoc = game.havocSystem.getSnapshot();
    const rage = game.npc.rageMeter;

    game.particles.triggerHitStop(1);
    game.update(0.2);
    expect(game.kevinDirector.getSnapshot()).toEqual(memory);
    expect(game.havocSystem.getSnapshot()).toEqual(havoc);
    expect(game.npc.rageMeter).toBe(rage);

    game.setPageVisibility(false);
    game.update(5);
    expect(game.kevinDirector.getSnapshot()).toEqual(memory);
    expect(game.havocSystem.getSnapshot()).toEqual(havoc);
    game.setPageVisibility(true);

    game.gameState = 'INTRO_CUTSCENE';
    game.update(0.1);
    expect(game.kevinDirector.getSnapshot().simulationTime).toBe(memory.simulationTime);
    expect(game.havocSystem.getSnapshot()).toEqual(havoc);
    expect(game.npc.rageMeter).toBe(rage);

    game.gameState = 'GAME_OVER';
    game.isGameOver = true;
    game.update(5);
    expect(game.kevinDirector.getSnapshot()).toEqual(memory);
    expect(game.havocSystem.getSnapshot()).toEqual(havoc);
  });

  it('resets director memory, projectile policy, rage, and Havoc on run and intro restart', () => {
    game.emitGameplayEvent('OBJECT_DESTROYED', { nearKevin: true });
    game.havocSystem.processEvent({ type: 'OBJECT_DESTROYED' });
    game.startIntroCutscene();
    expect(game.kevinDirector.getSnapshot()).toMatchObject({ state: 'CALM', rage: 0, recentContext: { recentEventCount: 0 } });
    expect(game.havocSystem.getSnapshot()).toMatchObject({ meter: 0, active: false, havocActivations: 0 });
    expect(game.npc.rageMeter).toBe(0);

    game.emitGameplayEvent('KEVIN_HIT');
    game.havocSystem.processEvent({ type: 'OBJECT_DESTROYED' });
    game.resetEnvironment();
    expect(game.kevinDirector.getSnapshot()).toMatchObject({ state: 'CALM', rage: 0, recentContext: { recentEventCount: 0 } });
    expect(game.havocSystem.getSnapshot()).toMatchObject({ meter: 0, active: false, havocActivations: 0 });
    expect(game.npc.rageMeter).toBe(0);
  });

  it('emits one metadata-complete destruction event and preserves glass special behavior', () => {
    const target = game.proceduralWorld.activeChunks.get(0).props.find(prop => prop.label === 'destructible_greenhouse');
    const events = [];
    game.combo = 3;
    game.onGameplayEvent = event => events.push(event);
    game.ball.velocity.x = 8;
    game.ball.velocity.y = -2;

    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: target }] });
    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: target }] });

    const destructionEvents = events.filter(event => event.type === 'OBJECT_DESTROYED');
    expect(destructionEvents).toHaveLength(1);
    expect(destructionEvents[0]).toMatchObject({
      material: 'GLASS',
      theme: 'GREENHOUSE',
      propKey: target.propKey,
      objectName: target.objectName,
      score: target.pointValue * 3,
      combo: 3,
      nearKevin: true
    });
    expect(game.proceduralWorld.totalPropsSmashed).toBe(1);
    expect(game.activeShards).toHaveLength(9);
    expect(game.havocSystem.meter).toBe(8);
    expect(game.kevinDirector.getSnapshot().rage).toBe(12);
    expect(game.particles.hitStopRemainingSeconds).toBe(GAMEPLAY_FEEL_TUNING.HIT_STOP_WORLD_IMPACT_SECONDS);
    expect(game.trickChain).toContain('GREENHOUSE_SHATTER');
    expect(game.proceduralWorld.destroyedPropKeys.has(target.propKey)).toBe(true);
    expect(game.proceduralWorld.getActiveResidues().some(residue => residue.propKey === target.propKey)).toBe(true);

    const farTarget = Matter.Bodies.rectangle(1600, 300, 32, 32, {
      label: 'destructible_wood_crate',
      isDestructible: true,
      material: 'WOOD',
      propKey: '1:PATIO_BBQ:far-crate',
      theme: 'PATIO_BBQ',
      chunkIndex: 1,
      pointValue: 180,
      color: '#92400e'
    });
    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: farTarget }] });
    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: farTarget }] });
    expect(events.filter(event => event.type === 'OBJECT_DESTROYED')).toHaveLength(2);
    expect(events.find(event => event.propKey === farTarget.propKey)).toMatchObject({
      material: 'WOOD', theme: 'PATIO_BBQ', score: 180 * 3, combo: 3, nearKevin: false
    });
    expect(game.havocSystem.meter).toBe(16);
    expect(game.kevinDirector.getSnapshot().rage).toBe(16);
  });

  it('preserves grill, gnome, window, greenhouse, and pot special trick paths exactly once', () => {
    const cases = [
      { label: 'destructible_grill', material: 'METAL', isGrill: true, trick: 'GRILL_BLAST' },
      { label: 'destructible_gnome', material: 'CERAMIC', trick: 'GNOME_BONK' },
      { label: 'destructible_window', material: 'GLASS', isGlass: true, trick: 'WINDOW_SHATTER' },
      { label: 'destructible_greenhouse', material: 'GLASS', isGlass: true, trick: 'GREENHOUSE_SHATTER' },
      { label: 'destructible_flowerpot', material: 'CERAMIC', trick: 'POT_SMASH' }
    ];
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    const explosion = vi.spyOn(sounds, 'playExplosion').mockImplementation(() => {});
    const gnomeBonk = vi.spyOn(sounds, 'playGnomeBonk').mockImplementation(() => {});
    const fire = vi.spyOn(game.particles, 'spawnFire').mockImplementation(() => {});
    const trick = vi.spyOn(game, 'recordTrickEvent');

    for (let index = 0; index < cases.length; index++) {
      const spec = cases[index];
      const target = Matter.Bodies.rectangle(500 + index * 70, 300, 32, 32, {
        label: spec.label,
        isDestructible: true,
        material: spec.material,
        isGlass: !!spec.isGlass,
        isGrill: !!spec.isGrill,
        propKey: `special:${index}`,
        theme: 'PATIO_BBQ',
        chunkIndex: 1,
        pointValue: 120,
        color: '#94a3b8'
      });
      game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: target }] });
      game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: target }] });
      expect(trick).toHaveBeenCalledWith(spec.trick);
      expect(events.filter(event => event.type === 'OBJECT_DESTROYED' && event.propKey === target.propKey)).toHaveLength(1);
    }

    expect(explosion).toHaveBeenCalledOnce();
    expect(gnomeBonk).toHaveBeenCalledOnce();
    expect(fire).toHaveBeenCalledOnce();
    expect(game.proceduralWorld.totalPropsSmashed).toBe(cases.length);
  });

  it('keeps material debris outside gameplay events and expires it only in simulation time', () => {
    const target = game.proceduralWorld.activeChunks.get(0).props.find(prop => prop.label === 'destructible_wood_crate');
    const secondTarget = game.proceduralWorld.activeChunks.get(0).props.find(prop => prop.label === 'destructible_gnome');
    game.ball.velocity.x = 8;
    game.ball.velocity.y = -2;
    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: target }] });
    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: secondTarget }] });
    const fragment = game.activeShards[0];
    const initialLifetime = fragment.lifeTime;
    const scoreAfterDestruction = game.score;
    const havocAfterDestruction = game.havocSystem.meter;
    const rageAfterDestruction = game.npc.rageMeter;
    const events = [];
    game.onGameplayEvent = event => events.push(event);

    game.collisionHandler({ pairs: [{ bodyA: game.ball, bodyB: fragment }] });
    expect(game.score).toBe(scoreAfterDestruction);
    expect(game.havocSystem.meter).toBe(havocAfterDestruction);
    expect(game.npc.rageMeter).toBe(rageAfterDestruction);
    expect(events).toEqual([]);
    expect(fragment.collisionFilter.mask).toBe(COLLISION_CATEGORIES.STATIC);

    game.update(0.05);
    expect(fragment.lifeTime).toBeCloseTo(initialLifetime - 0.05, 5);
    const visibleLifetime = fragment.lifeTime;

    game.setPageVisibility(false);
    game.update(0.5);
    expect(fragment.lifeTime).toBe(visibleLifetime);
    game.setPageVisibility(true);
    game.particles.triggerHitStop(0.2);
    game.update(0.05);
    expect(fragment.lifeTime).toBe(visibleLifetime);

    game.resetEnvironment();
    expect(game.activeShards).toHaveLength(0);
    expect(game.proceduralWorld.destroyedPropKeys.size).toBe(0);
    expect(game.proceduralWorld.clearedChunkKeys.size).toBe(0);
    expect(game.proceduralWorld.getActiveResidues()).toHaveLength(0);
    expect(game.proceduralWorld.totalPropsSmashed).toBe(0);
    expect(game.proceduralWorld.getAllActiveProps().some(prop => prop.propKey === target.propKey)).toBe(true);
    expect(game.proceduralWorld.getAllActiveProps().some(prop => prop.propKey === secondTarget.propKey)).toBe(true);
  });
});
