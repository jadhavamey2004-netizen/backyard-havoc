import { describe, expect, it, vi } from 'vitest';
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  smoothstep,
} from '../src/animation_utils.js';
import { Player } from '../src/player.js';
import {
  getPlayerVisualKickContact,
  PLAYER_ANIMATION_TUNING,
} from '../src/player_animation.js';
import { NeighborKevinNPC } from '../src/npc.js';
import {
  getKevinProjectileHandWorldPosition,
  KEVIN_ANIMATION_TUNING,
} from '../src/kevin_animation.js';
import { GAMEPLAY_TUNING } from '../src/gameplay_rules.js';
import { GameEngine } from '../src/game.js';
import { sounds } from '../src/audio.js';

function createMockCanvas() {
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (key === 'measureText') return (text) => ({ width: String(text).length * 6 });
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { getContext: () => context, width: 960, height: 540 };
}

function expectFiniteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(expectFiniteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(expectFiniteNumbers);
}

function makePlayerPose(state, progress = 0) {
  const player = new Player(340, 485);
  player.state = state;
  player.kickProgress = progress;
  if (state === 'HURT') player.hurtTimer = 0.3;
  return player;
}

describe('deterministic animation easing', () => {
  it('clamps and interpolates normalized values with bounded curves', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(lerp(4, 12, 0.5)).toBe(8);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    for (let step = 0; step <= 100; step += 1) {
      const t = step / 100;
      expect(smoothstep(t)).toBeGreaterThanOrEqual(0);
      expect(smoothstep(t)).toBeLessThanOrEqual(1);
      expect(easeOutCubic(t)).toBeGreaterThanOrEqual(0);
      expect(easeOutCubic(t)).toBeLessThanOrEqual(1);
      expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(0);
      expect(easeInOutCubic(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe('player animation controller', () => {
  it('produces finite production poses for every gameplay animation state', () => {
    const player = new Player();
    for (const state of ['IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT']) {
      player.state = state;
      player.kickProgress = 0.5;
      player.hurtTimer = 0.2;
      player.powerCharging = state === 'IDLE';
      player.powerCharge = 0.8;
      player.animation.update(1 / 60, player);
      expectFiniteNumbers(player.animation.pose(player));
    }
  });

  it('loops idle motion and uses a faster sprint cycle than a normal run', () => {
    const player = makePlayerPose('IDLE');
    const idlePeriod = PLAYER_ANIMATION_TUNING.IDLE_CYCLE_SECONDS;
    const idleStart = player.animation.pose(player);
    player.animation.update(idlePeriod, player);
    const idleEnd = player.animation.pose(player);
    expect(idleEnd.head.y).toBeCloseTo(idleStart.head.y, 5);

    expect(PLAYER_ANIMATION_TUNING.SPRINT_CYCLE_RATE_RADIANS_PER_SECOND)
      .toBeGreaterThan(PLAYER_ANIMATION_TUNING.RUN_CYCLE_RATE_RADIANS_PER_SECOND);
  });

  it('uses elapsed seconds for equivalent 60 Hz and 120 Hz run poses', () => {
    const makeRunner = () => {
      const player = makePlayerPose('RUNNING');
      player.vx = 140;
      player.keys.right = true;
      return player;
    };
    const at60Hz = makeRunner();
    const at120Hz = makeRunner();
    for (let i = 0; i < 30; i += 1) at60Hz.animation.update(1 / 60, at60Hz);
    for (let i = 0; i < 60; i += 1) at120Hz.animation.update(1 / 120, at120Hz);
    expect(at60Hz.animation.pose(at60Hz).ankleFront.x)
      .toBeCloseTo(at120Hz.animation.pose(at120Hz).ankleFront.x, 5);
    expect(at60Hz.animation.pose(at60Hz).wristFront.y)
      .toBeCloseTo(at120Hz.animation.pose(at120Hz).wristFront.y, 5);
  });

  it('returns to the same four-pose run cycle phase after one complete cycle', () => {
    const player = makePlayerPose('RUNNING');
    player.animation.runBlend = 1;
    const start = player.animation.pose(player);
    const cycleSeconds = (Math.PI * 2) / PLAYER_ANIMATION_TUNING.RUN_CYCLE_RATE_RADIANS_PER_SECOND;
    player.animation.update(cycleSeconds, player);
    const end = player.animation.pose(player);
    expect(end.ankleFront.x).toBeCloseTo(start.ankleFront.x, 7);
    expect(end.ankleFront.y).toBeCloseTo(start.ankleFront.y, 7);
    expect(end.wristFront.x).toBeCloseTo(start.wristFront.x, 7);

    const sprinter = makePlayerPose('RUNNING');
    sprinter.keys.sprint = true;
    sprinter.animation.update(0.25, sprinter);
    expect(sprinter.animation.runPhase).toBeGreaterThan(player.animation.runPhase);
  });

  it('blends locomotion start, stop, and reversal without delaying model response', () => {
    const player = new Player();
    player.update(1 / 60);
    player.keys.right = true;
    player.update(1 / 60);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.facing).toBe(1);
    expect(player.animation.transitionDuration).toBe(PLAYER_ANIMATION_TUNING.START_TRANSITION_SECONDS);

    for (let index = 0; index < 10; index += 1) player.update(1 / 60);
    player.keys.right = false;
    player.update(0.2);
    expect(player.state).toBe('IDLE');
    expect(player.animation.transitionDuration).toBe(PLAYER_ANIMATION_TUNING.STOP_TRANSITION_SECONDS);

    player.keys.left = true;
    player.update(1 / 60);
    expect(player.facing).toBe(-1);
    expect(player.animation.transitionDuration).toBe(PLAYER_ANIMATION_TUNING.REVERSAL_TRANSITION_SECONDS);
  });

  it('places the visible cleat contact anchor on the canonical kick point mid-strike', () => {
    const player = makePlayerPose('KICKING', 0.5);
    const visualContact = getPlayerVisualKickContact(player);
    const gameplayContact = player.getKickPosition();
    expect(Math.hypot(visualContact.x - gameplayContact.x, visualContact.y - gameplayContact.y))
      .toBeLessThanOrEqual(PLAYER_ANIMATION_TUNING.CONTACT_ALIGNMENT_TOLERANCE);
    expect(GAMEPLAY_TUNING.KICK_ACTION_DURATION).toBe(0.38);
    expect(GAMEPLAY_TUNING.KICK_CONTACT_START).toBe(0.3);
    expect(GAMEPLAY_TUNING.KICK_CONTACT_END).toBe(0.7);
    player.squashY = 0.78;
    const squashedContact = getPlayerVisualKickContact(player);
    expect(Math.hypot(squashedContact.x - gameplayContact.x, squashedContact.y - gameplayContact.y))
      .toBeLessThanOrEqual(PLAYER_ANIMATION_TUNING.CONTACT_ALIGNMENT_TOLERANCE);
  });

  it('drives the visible head through the canonical header point during contact', () => {
    const player = makePlayerPose('HEADING', 0.5);
    const pose = player.animation.pose(player);
    const visualHead = {
      x: player.x + pose.facing * pose.head.x,
      y: player.y + pose.head.y * player.squashY,
    };
    const gameplayHead = player.getHeaderPosition();
    expect(Math.hypot(visualHead.x - gameplayHead.x, visualHead.y - gameplayHead.y))
      .toBeLessThanOrEqual(PLAYER_ANIMATION_TUNING.CONTACT_ALIGNMENT_TOLERANCE);
  });

  it('layers charging and hurt presentation over locomotion without non-finite recovery poses', () => {
    const charging = makePlayerPose('RUNNING');
    charging.vx = 140;
    charging.powerCharging = true;
    charging.powerCharge = 1;
    const chargePose = charging.animation.pose(charging);

    const hurt = makePlayerPose('HURT');
    hurt.animation.triggerHurt();
    hurt.animation.update(0.2, hurt);
    expectFiniteNumbers(hurt.animation.pose(hurt));
    hurt.animation.update(0.5, hurt);
    expectFiniteNumbers(hurt.animation.pose(hurt));
    const neutral = makePlayerPose('RUNNING').animation.pose(makePlayerPose('RUNNING'));
    expect(chargePose.charge).toBe(1);
    expect(chargePose.pelvis.y).toBeGreaterThan(neutral.pelvis.y);
    expect(Math.abs(chargePose.wristFront.x)).toBeLessThan(Math.abs(neutral.wristFront.x));
  });

  it('adds bounded contact-success accents only after authoritative ball contact', () => {
    const player = makePlayerPose('KICKING', 0.5);
    const contactBefore = getPlayerVisualKickContact(player);
    player.animation.triggerActionAccent('PERFECT_STRIKE');
    expect(getPlayerVisualKickContact(player)).toEqual(contactBefore);
    player.kickProgress = 0.78;
    const regularFollowThrough = makePlayerPose('KICKING', 0.78).animation.pose(makePlayerPose('KICKING', 0.78));
    player.animation.update(0.02, player);
    const accentedFollowThrough = player.animation.pose(player);
    expect(accentedFollowThrough.strikeAccent).toBeGreaterThan(0);
    expect(accentedFollowThrough.ankleFront.x).toBeGreaterThan(regularFollowThrough.ankleFront.x);
  });

  it('does not mutate gameplay state while sampling, freezes on zero simulation time, and resets every clock', () => {
    const player = makePlayerPose('KICKING', 0.5);
    player.animation.update(0.12, player);
    const before = JSON.stringify({ state: player.state, kickProgress: player.kickProgress, x: player.x });
    const heldPose = JSON.stringify(player.animation.pose(player));
    player.animation.update(0, player);
    expect(JSON.stringify(player.animation.pose(player))).toBe(heldPose);
    expect(JSON.stringify({ state: player.state, kickProgress: player.kickProgress, x: player.x })).toBe(before);

    player.resetRunState();
    expect(player.animation.elapsed).toBe(0);
    expect(player.animation.runPhase).toBe(0);
    expect(player.animation.pose(player)).toEqual(expect.objectContaining({ root: { x: 340, y: 485 } }));
  });

  it('holds the exact character pose through hit-stop and hidden-page time', () => {
    const game = new GameEngine(createMockCanvas());
    game.gameState = 'PLAYING';
    game.player.state = 'RUNNING';
    game.player.keys.right = true;
    game.update(1 / 60);
    const beforeHitStop = game.player.animation.pose(game.player);
    const clockBeforeHitStop = game.player.animation.elapsed;
    game.particles.triggerHitStop(0.06);
    game.update(0.04);
    expect(game.player.animation.elapsed).toBe(clockBeforeHitStop);
    expect(game.player.animation.pose(game.player)).toEqual(beforeHitStop);

    game.setPageVisibility(false);
    game.update(4);
    expect(game.player.animation.elapsed).toBe(clockBeforeHitStop);
    game.setPageVisibility(true);
    game.update(1 / 60);
    expect(game.player.animation.elapsed).toBeCloseTo(clockBeforeHitStop + 1 / 60, 5);
  });

  it('ticks the presentation clock with cutscene simulation time without taking position ownership', () => {
    const game = new GameEngine(createMockCanvas());
    game.gameState = 'INTRO_CUTSCENE';
    game.cutsceneTimer = 3.6;
    game.cutsceneDuration = 3.6;
    game.player.x = 180;
    game.player.state = 'RUNNING';
    game.update(0.05);
    expect(game.player.animation.elapsed).toBeCloseTo(0.05, 6);
    expect(game.player.x).toBe(180);

    game.gameState = 'ENDING_CUTSCENE';
    game.cutsceneTimer = 3.2;
    game.cutsceneDuration = 3.2;
    const beforeEndingFrame = game.player.animation.elapsed;
    game.update(0.05);
    expect(game.player.animation.elapsed).toBeCloseTo(beforeEndingFrame + 0.05, 6);
    expect(game.player.state).toBe('HURT');
  });
});

describe('Kevin animation controller', () => {
  it('produces finite production poses for every existing runtime state', () => {
    const kevin = new NeighborKevinNPC();
    for (const state of ['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING']) {
      kevin.state = state;
      kevin.stateTimer = 0.3;
      kevin.rageMeter = 80;
      kevin.animation.update(1 / 60, kevin);
      expectFiniteNumbers(kevin.animation.pose(kevin));
    }
  });

  it('increases anger presentation by rage intensity without adding gameplay states', () => {
    const kevin = new NeighborKevinNPC();
    kevin.state = 'LEANING_OUT_RAGE';
    kevin.animation.elapsed = 1;
    kevin.rageMeter = 25;
    const low = kevin.animation.pose(kevin);
    kevin.rageMeter = 95;
    const high = kevin.animation.pose(kevin);
    expect(Math.abs(high.bodyLean)).toBeGreaterThan(Math.abs(low.bodyLean));
    expect(Math.abs(high.bodyRotation)).toBeGreaterThan(Math.abs(low.bodyRotation));
    expect(['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING'])
      .toContain(kevin.state);
  });

  it('keeps throw windup/release/follow-through deterministic and aligns release hand to spawn', () => {
    const kevin = new NeighborKevinNPC(790, 110);
    const windupKevin = new NeighborKevinNPC(790, 110);
    windupKevin.state = 'LEANING_OUT_RAGE';
    windupKevin.rageMeter = 80;
    windupKevin.throwTimer = KEVIN_ANIMATION_TUNING.THROW_WINDUP_SECONDS * 0.5;
    const windupPose = windupKevin.animation.pose(windupKevin);
    expect(windupKevin.state).toBe('LEANING_OUT_RAGE');
    expect(windupKevin.throwTimer).toBeGreaterThan(0);
    expect(windupKevin.throwTimer).toBeLessThanOrEqual(KEVIN_ANIMATION_TUNING.THROW_WINDUP_SECONDS);

    kevin.state = 'THROWING_PROJECTILE';
    kevin.animation.beginThrow();
    const releasePose = kevin.animation.pose(kevin);
    expect(releasePose.bodyRotation).toBe(0);
    const hand = getKevinProjectileHandWorldPosition(kevin, releasePose);
    expect(hand.x).toBeCloseTo(kevin.x + kevin.facing * 10, 6);
    expect(hand.y).toBeCloseTo(kevin.y + 12, 6);
    expect(windupPose.wristFront).not.toEqual(releasePose.wristFront);

    kevin.animation.throwElapsed = KEVIN_ANIMATION_TUNING.THROW_DURATION * 0.45;
    const followThrough = kevin.animation.pose(kevin);
    expectFiniteNumbers(followThrough);
    expect(followThrough.wristFront).not.toEqual(releasePose.wristFront);
    const repeated = kevin.animation.pose(kevin);
    expect(repeated).toEqual(followThrough);
  });

  it('aligns the exact production throw callback spawn with the rendered release hand in both facings', () => {
    const whoosh = vi.spyOn(sounds, 'playThrowWhoosh').mockImplementation(() => {});
    const voice = vi.spyOn(sounds, 'speakKevinVoice').mockImplementation(() => {});
    try {
      for (const facing of [-1, 1]) {
        const kevin = new NeighborKevinNPC(790, 110);
        kevin.facing = facing;
        let projectileSpawn;
        kevin.onThrow((spawn) => { projectileSpawn = spawn; });
        kevin.executeThrow(340);
        const hand = getKevinProjectileHandWorldPosition(kevin);
        expect(hand.x).toBeCloseTo(projectileSpawn.x, 6);
        expect(hand.y).toBeCloseTo(projectileSpawn.y, 6);
        expect(projectileSpawn).toEqual({ x: 790 + facing * 10, y: 122, targetX: 340 });
      }
    } finally {
      whoosh.mockRestore();
      voice.mockRestore();
    }
  });

  it('preserves the existing Kevin throw intervals for each rage band', () => {
    const whoosh = vi.spyOn(sounds, 'playThrowWhoosh').mockImplementation(() => {});
    const voice = vi.spyOn(sounds, 'speakKevinVoice').mockImplementation(() => {});
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      for (const [rage, expectedInterval] of [[40, 2.8], [60, 2.1], [80, 1.4]]) {
        const kevin = new NeighborKevinNPC();
        kevin.state = 'LEANING_OUT_RAGE';
        kevin.stateTimer = 3;
        kevin.rageMeter = rage;
        kevin.throwTimer = 0.001;
        kevin.update(0.002, 340, null, true);
        expect(kevin.throwTimer).toBe(expectedInterval);
        expect(kevin.state).toBe('THROWING_PROJECTILE');
      }
    } finally {
      whoosh.mockRestore();
      voice.mockRestore();
      random.mockRestore();
    }
  });

  it('cycles watchful breathing and repairing movement without frame-rate dependent time', () => {
    const watcher = new NeighborKevinNPC();
    const watchStart = watcher.animation.pose(watcher);
    watcher.animation.update(KEVIN_ANIMATION_TUNING.KEVIN_WATCH_CYCLE_SECONDS, watcher);
    const watchEnd = watcher.animation.pose(watcher);
    expect(watchEnd.head.y).toBeCloseTo(watchStart.head.y, 5);

    const left = new NeighborKevinNPC();
    const right = new NeighborKevinNPC();
    left.state = 'REPAIRING';
    right.state = 'REPAIRING';
    for (let index = 0; index < 60; index += 1) left.animation.update(1 / 60, left);
    for (let index = 0; index < 120; index += 1) right.animation.update(1 / 120, right);
    expect(left.animation.pose(left).wristFront.x).toBeCloseTo(right.animation.pose(right).wristFront.x, 5);
    expectFiniteNumbers(left.animation.pose(left));
  });

  it('emits high-rage steam on a deterministic simulation interval without per-frame randomness', () => {
    const kevin = new NeighborKevinNPC();
    kevin.state = 'LEANING_OUT_RAGE';
    kevin.stateTimer = 3;
    kevin.rageMeter = 80;
    const particles = { spawnDust: vi.fn() };
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('animation must not sample per-frame randomness');
    });
    try {
      kevin.update(KEVIN_ANIMATION_TUNING.STEAM_INTERVAL_SECONDS, 340, particles, false);
      expect(particles.spawnDust).toHaveBeenCalledTimes(2);
      kevin.update(KEVIN_ANIMATION_TUNING.STEAM_INTERVAL_SECONDS, 340, particles, false);
      expect(particles.spawnDust).toHaveBeenCalledTimes(4);
    } finally {
      random.mockRestore();
    }
  });

  it('keeps bonk and dizziness bounded and resets animation runtime with a new run', () => {
    const kevin = new NeighborKevinNPC();
    kevin.state = 'DIZZY_BONK';
    for (let index = 0; index < 800; index += 1) {
      kevin.animation.update(1 / 60, kevin);
      expectFiniteNumbers(kevin.animation.pose(kevin));
    }
    kevin.resetRunState();
    expect(kevin.animation.elapsed).toBe(0);
    expect(kevin.animation.throwElapsed).toBe(0);
    expectFiniteNumbers(kevin.animation.pose(kevin));
  });
});
