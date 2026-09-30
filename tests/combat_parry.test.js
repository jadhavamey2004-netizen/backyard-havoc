import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../src/game.js';
import { Bodies, Body, Composite, Engine } from 'matter-js';
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

describe('Combat & Parry Mechanics', () => {
  let game;

  beforeEach(() => {
    game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
  });

  it('calculates throw trajectory safely without division by zero', () => {
    game.npc.onThrowCallback({ x: 100, y: 100, targetX: 100 }); // targetX === x (dist === 0)
    expect(game.thrownProjectiles.length).toBe(1);
    const proj = game.thrownProjectiles[0];
    expect(Number.isFinite(proj.velocity.x)).toBe(true);
    expect(Number.isFinite(proj.velocity.y)).toBe(true);
  });

  it('parries projectile when player kicks near incoming projectile', () => {
    const combatPoint = { x: game.player.x, y: game.player.y - 30 };
    const proj = Bodies.circle(combatPoint.x + 80, combatPoint.y - 20, 10);
    Body.setVelocity(proj, { x: -3, y: 0 });
    game.thrownProjectiles.push(proj);

    const events = [];
    game.onGameplayEvent = event => events.push(event);
    const screenX = game.player.x - game.camera.x;
    const screenY = game.player.y;
    game.handlePointerDown(screenX, screenY);
    game.handlePointerUp(screenX, screenY);
    expect(proj.isParried).toBe(true);
    expect(game.score).toBe(500);
    expect(game.combo).toBe(2);
    expect(events.filter(event => event.type === 'PARRY')).toHaveLength(1);
    expect(game.pendingPrimaryAction).toBeNull();
  });

  it('convertsMatterSubstepVelocityToWorldUnitsPerSecondForThreatForecast', () => {
    game.engine.gravity.scale = 0;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const projectile = Bodies.circle(point.x + 100, point.y, 10);
    Composite.add(game.world, projectile);
    Body.setVelocity(projectile, { x: -3, y: 0 });
    Engine.update(game.engine, game.subDt * 1000);
    game.thrownProjectiles.push(projectile);

    const [threat] = game.getProjectileThreats();
    expect(threat?.timeToContact).toBeCloseTo(1 / 3, 2);
  });

  it('defenseResolvesAtPointerReleaseWithoutWaitingForKickStrike', () => {
    const point = { x: game.player.x, y: game.player.y - 30 };
    const proj = Bodies.circle(point.x + 50, point.y - 5, 10);
    Body.setVelocity(proj, { x: -3, y: 0 });
    game.thrownProjectiles.push(proj);
    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);
    expect(game.score).toBe(1000);
    expect(game.combo).toBe(3);
    expect(game.player.kickProgress).toBe(0);
    expect(game.pendingPrimaryAction).toBeNull();
  });

  it('projectileAlreadyInsideContactRadiusCannotBeParriedAtRelease', () => {
    const point = { x: game.player.x, y: game.player.y - 30 };
    const proj = Bodies.circle(point.x + 20, point.y, 10);
    Body.setVelocity(proj, { x: -3, y: 0 });
    game.thrownProjectiles.push(proj);
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);
    expect(proj.isParried).not.toBe(true);
    expect(game.score).toBe(0);
    expect(events.some(event => ['BLOCK', 'PARRY', 'PERFECT_PARRY'].includes(event.type))).toBe(false);
    expect(game.pendingPrimaryAction).not.toBeNull();
  });

  it('defenseClassifiesBlockAndDoesNotAdvanceCombo', () => {
    game.engine.gravity.scale = 0;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const projectile = Bodies.circle(point.x + 100, point.y, 10);
    Body.setVelocity(projectile, { x: -3, y: 0 });
    game.thrownProjectiles.push(projectile);
    const events = [];
    game.onGameplayEvent = event => events.push(event);

    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);

    expect(game.score).toBe(100);
    expect(game.combo).toBe(1);
    expect(projectile.isParried).not.toBe(true);
    expect(projectile.velocity.x).toBeGreaterThan(0);
    expect(events.filter(event => event.type === 'BLOCK')).toHaveLength(1);
    expect(events.some(event => event.type === 'COMBO_CHANGED')).toBe(false);
  });

  it('perfectParryScoresAtPreIncrementComboAndAdvancesAtomicallyByTwo', () => {
    game.engine.gravity.scale = 0;
    game.combo = 4;
    game.peakCombo = 4;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const projectile = Bodies.circle(point.x + 50, point.y, 10);
    Body.setVelocity(projectile, { x: -3, y: 0 });
    game.thrownProjectiles.push(projectile);
    const events = [];
    game.onGameplayEvent = event => events.push(event);

    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);

    expect(game.score).toBe(4000);
    expect(game.combo).toBe(6);
    expect(events.filter(event => event.type === 'COMBO_CHANGED')).toEqual([
      expect.objectContaining({ previous: 4, current: 6, delta: 2, reason: 'PERFECT_PARRY' })
    ]);
    expect(events.filter(event => event.type === 'PERFECT_PARRY')).toHaveLength(1);
  });

  it('defenseSelectsEarliestThreatRegardlessOfArrayOrderAndConsumesItOnce', () => {
    game.engine.gravity.scale = 0;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const later = Bodies.circle(point.x + 100, point.y, 10);
    const earlier = Bodies.circle(point.x + 60, point.y, 10);
    Body.setVelocity(later, { x: -3, y: 0 });
    Body.setVelocity(earlier, { x: -3, y: 0 });
    game.thrownProjectiles.push(later, earlier);

    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);
    const score = game.score;
    expect(earlier.isParried).toBe(true);
    expect(later.isParried).not.toBe(true);
    game.thrownProjectiles = [earlier];
    expect(game.resolveDefenseAtRelease()).toBe(false);
    expect(game.score).toBe(score);
  });

  it('eligibleThreatOverridesBallAndChargedAction', () => {
    game.engine.gravity.scale = 0;
    const foot = game.player.getKickPosition();
    game.ball.position.x = foot.x;
    game.ball.position.y = game.player.y + 10;
    Body.setVelocity(game.ball, { x: 0, y: 0 });
    const ballVelocity = { ...game.ball.velocity };
    const point = { x: game.player.x, y: game.player.y - 30 };
    const projectile = Bodies.circle(point.x + 50, point.y, 10);
    Body.setVelocity(projectile, { x: -3, y: 0 });
    game.thrownProjectiles.push(projectile);
    const events = [];
    game.onGameplayEvent = event => events.push(event);
    game.handlePointerDown(700, 100);
    game.pointerDownTime = performance.now() - 700;
    game.handlePointerUp(700, 100);

    expect(game.score).toBe(1000);
    expect(game.combo).toBe(3);
    expect(game.ball.velocity).toEqual(ballVelocity);
    expect(game.pendingPrimaryAction).toBeNull();
    expect(events.some(event => event.type === 'BALL_CONTACT')).toBe(false);
    expect(events.filter(event => event.type === 'PERFECT_PARRY')).toHaveLength(1);
  });

  it('deflectionAndReturnVelocitiesStayBoundedAndPointInTheRequiredDirections', () => {
    game.engine.gravity.scale = 0;
    const point = { x: game.player.x, y: game.player.y - 30 };
    const blocker = Bodies.circle(point.x + 100, point.y, 10);
    Body.setVelocity(blocker, { x: -3, y: 0 });
    game.thrownProjectiles.push(blocker);
    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);
    expect(blocker.velocity.x).toBeGreaterThan(0);
    expect(Math.hypot(blocker.velocity.x, blocker.velocity.y)).toBeLessThanOrEqual(10);

    game.thrownProjectiles = [];
    const returner = Bodies.circle(point.x + 50, point.y, 10);
    Body.setVelocity(returner, { x: -3, y: 0 });
    game.thrownProjectiles.push(returner);
    game.player.state = 'IDLE';
    game.handlePointerDown(point.x - game.camera.x, point.y);
    game.handlePointerUp(point.x - game.camera.x, point.y);
    expect(returner.velocity.x).toBeGreaterThan(0);
    expect(Math.hypot(returner.velocity.x, returner.velocity.y)).toBeCloseTo(14, 10);
  });

  it('scales camera, hit-stop, and existing impact feedback from Block through Perfect Parry', () => {
    const resolveAtDistance = (distance) => {
      const engine = new GameEngine(createMockCanvas());
      engine.gameState = 'PLAYING';
      engine.engine.gravity.scale = 0;
      const point = { x: engine.player.x, y: engine.player.y - 30 };
      const projectile = Bodies.circle(point.x + distance, point.y, 10);
      Body.setVelocity(projectile, { x: -3, y: 0 });
      engine.thrownProjectiles.push(projectile);
      const cameraFeedback = vi.spyOn(engine.camera, 'addTrauma');
      const hitStop = vi.spyOn(engine.particles, 'triggerHitStop');
      const rings = vi.spyOn(engine.particles, 'spawnImpactRings');
      const shockwaves = vi.spyOn(engine.particles, 'spawnShockwave');
      expect(engine.resolveDefenseAtRelease()).toBe(true);
      return { cameraFeedback, hitStop, rings, shockwaves };
    };

    const block = resolveAtDistance(112);
    const parry = resolveAtDistance(76);
    const perfect = resolveAtDistance(50);
    const blockTrauma = block.cameraFeedback.mock.calls[0][0];
    const parryTrauma = parry.cameraFeedback.mock.calls[0][0];
    const perfectTrauma = perfect.cameraFeedback.mock.calls[0][0];
    const blockStop = block.hitStop.mock.calls[0][0];
    const parryStop = parry.hitStop.mock.calls[0][0];
    const perfectStop = perfect.hitStop.mock.calls[0][0];

    expect(blockTrauma).toBe(GAMEPLAY_FEEL_TUNING.CAMERA_BLOCK_TRAUMA);
    expect(blockTrauma).toBeLessThan(parryTrauma);
    expect(parryTrauma).toBeLessThan(perfectTrauma);
    expect(blockStop).toBeLessThan(parryStop);
    expect(parryStop).toBeLessThan(perfectStop);
    expect(block.rings.mock.calls[0][2]).toBe(1);
    expect(parry.rings.mock.calls[0][2]).toBe(3);
    expect(perfect.rings.mock.calls[0][2]).toBe(6);
    expect(block.shockwaves).not.toHaveBeenCalled();
    expect(parry.shockwaves).toHaveBeenCalledOnce();
    expect(perfect.shockwaves).toHaveBeenCalledOnce();
  });

  it('applies player damage and triggers invulnerability window on direct hit', () => {
    const initialHealth = game.player.health;
    game.player.takeDamage(1);
    expect(game.player.health).toBe(initialHealth - 1);
    expect(game.player.invulnerabilityTimer).toBeGreaterThan(0);

    // Second hit immediately during invulnerability should be ignored
    game.player.takeDamage(1);
    expect(game.player.health).toBe(initialHealth - 1);
  });

  it('triggers Kevin dizzy bonk state when hit in the head by ball', () => {
    game.npc.takeDirectHit();
    expect(game.npc.state).toBe('DIZZY_BONK');
    expect(game.npc.stateTimer).toBeGreaterThan(0);
  });
});
