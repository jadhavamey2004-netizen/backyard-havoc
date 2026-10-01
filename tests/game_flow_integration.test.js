import { describe, it, expect, beforeEach, vi } from 'vitest';
import Matter from 'matter-js';
import { GameEngine } from '../src/game.js';
import { sounds } from '../src/audio.js';
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
    game.collisionHandler({ pairs: [{ bodyA: ball, bodyB: kevin }] });
    expect(game.combo).toBe(4);
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
    expect(physicsUpdate).not.toHaveBeenCalled();
    expect(game.accumulator).toBe(0);

    game.update(0.01);
    expect(physicsUpdate).not.toHaveBeenCalled();
    expect(game.accumulator).toBe(0);
    expect(events.filter(event => event.type === 'KEVIN_HIT')).toHaveLength(1);
    physicsUpdate.mockRestore();
  });

  it('clears temporary feel state on intro, ending, game over, and run reset', () => {
    const expectFeelReset = () => {
      expect(game.particles.hitStopRemainingSeconds).toBe(0);
      expect(game.ballFeedbackTier).toBe('NORMAL');
      expect(game.ballFeedbackStrength).toBe(0);
      expect(game.ballDeform).toEqual({ scaleX: 1, scaleY: 1, angle: 0 });
      expect(game.camera.trauma).toBe(0);
      expect(game.camera.zoomPunch).toBe(0);
      expect(game.camera.chromaticAberration).toBe(0);
    };
    game.particles.triggerHitStop(0.1);
    game.camera.addTrauma(0.5, 0.04);
    game.ballFeedbackTier = 'POWER_SHOT';
    game.ballFeedbackStrength = 0.9;
    game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    game.startIntroCutscene();
    expectFeelReset();

    game.particles.triggerHitStop(0.1);
    game.camera.addTrauma(0.5, 0.04);
    game.ballFeedbackTier = 'PERFECT_STRIKE';
    game.ballFeedbackStrength = 0.8;
    game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    game.startEndingCutscene();
    expectFeelReset();

    game.particles.triggerHitStop(0.1);
    game.camera.addTrauma(0.5, 0.04);
    game.ballFeedbackTier = 'POWER_SHOT';
    game.ballFeedbackStrength = 1;
    game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    game.triggerGameOver();
    expectFeelReset();

    game.particles.triggerHitStop(0.1);
    game.camera.addTrauma(0.5, 0.04);
    game.ballFeedbackTier = 'POWER_SHOT';
    game.ballFeedbackStrength = 1;
    game.ballDeform = { scaleX: 0.7, scaleY: 1.3, angle: 1 };
    game.resetEnvironment();
    expectFeelReset();
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
});
