import { describe, expect, it, vi } from 'vitest';
import { Player } from '../src/player.js';
import { NeighborKevinNPC } from '../src/npc.js';
import {
  KEVIN_VISUAL_STYLE,
  PLAYER_VISUAL_STYLE,
  getKevinPoseAnchors,
  getKevinVisualState,
  getPlayerPoseAnchors,
  getPlayerVisualState,
} from '../src/character_style.js';
import { drawKevinCharacter } from '../src/kevin_renderer.js';
import { drawPlayerCharacter } from '../src/player_renderer.js';

function makeCanvasContext() {
  let saveDepth = 0;
  const calls = [];
  const gradient = { addColorStop: (...args) => calls.push(['addColorStop', ...args]) };
  const context = new Proxy({ globalAlpha: 1 }, {
    get(target, property) {
      if (property in target) return target[property];
      if (property === 'createLinearGradient') {
        return (...args) => {
          calls.push([property, ...args]);
          return gradient;
        };
      }
      if (property === 'measureText') return (value) => ({ width: String(value).length * 6 });
      if (property === 'save') return () => { saveDepth += 1; calls.push([property]); };
      if (property === 'restore') return () => {
        saveDepth -= 1;
        calls.push([property]);
        if (saveDepth < 0) throw new Error('Canvas restore without a matching save');
      };
      return (...args) => calls.push([property, ...args]);
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
  return { context, calls, getSaveDepth: () => saveDepth };
}

function expectFiniteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(expectFiniteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(expectFiniteNumbers);
}

function snapshot(model) {
  return JSON.stringify(model);
}

describe('character art tokens and visual state contracts', () => {
  it('defines finite, named geometry, line weights and palette tokens', () => {
    expect(PLAYER_VISUAL_STYLE.palette.jersey).toBe('#E85F5C');
    expect(KEVIN_VISUAL_STYLE.palette.cardigan).toBe('#55465F');
    expectFiniteNumbers(PLAYER_VISUAL_STYLE.geometry);
    expectFiniteNumbers(PLAYER_VISUAL_STYLE.line);
    expectFiniteNumbers(KEVIN_VISUAL_STYLE.geometry);
    expectFiniteNumbers(KEVIN_VISUAL_STYLE.line);
    expect(PLAYER_VISUAL_STYLE.palette.outline).toMatch(/^#[0-9A-F]{6}$/i);
    expect(KEVIN_VISUAL_STYLE.palette.outline).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('maps every production player state and charge/hurt presentation explicitly', () => {
    const player = new Player();
    const expectedPoses = {
      IDLE: 'IDLE',
      RUNNING: 'RUNNING',
      KICKING: 'KICKING',
      HEADING: 'HEADING',
      HURT: 'HURT',
    };
    for (const [state, pose] of Object.entries(expectedPoses)) {
      player.state = state;
      expect(getPlayerVisualState(player).pose).toBe(pose);
    }
    player.state = 'IDLE';
    player.powerCharging = true;
    expect(getPlayerVisualState(player).expression).toBe('CHARGING');
    player.state = 'HURT';
    expect(getPlayerVisualState(player).expression).toBe('HURT');
  });

  it('rejects unsupported runtime states instead of silently choosing a pose', () => {
    const player = new Player();
    player.state = 'SHOUTING_OUT';
    expect(() => getPlayerVisualState(player)).toThrow(RangeError);

    const kevin = new NeighborKevinNPC();
    kevin.state = 'RAMPAGE';
    expect(() => getKevinVisualState(kevin)).toThrow(RangeError);
  });

  it('maps every production Kevin state and current dialogue emotion to a defined expression', () => {
    const kevin = new NeighborKevinNPC();
    const expectedPoses = {
      PEEKING_INSIDE: 'PEEKING_INSIDE',
      LEANING_OUT_RAGE: 'LEANING_OUT_RAGE',
      THROWING_PROJECTILE: 'THROWING_PROJECTILE',
      DIZZY_BONK: 'DIZZY_BONK',
      REPAIRING: 'REPAIRING',
    };
    for (const [state, pose] of Object.entries(expectedPoses)) {
      kevin.state = state;
      expect(getKevinVisualState(kevin).pose).toBe(pose);
      expect(getKevinVisualState(kevin).expression).toBeTruthy();
    }

    kevin.state = 'LEANING_OUT_RAGE';
    kevin.dialogueTimer = 0;
    kevin.dialogue = '';
    kevin.rageMeter = 35;
    expect(getKevinVisualState(kevin).expression).toBe('IRRITATED');
    kevin.rageMeter = 80;
    expect(getKevinVisualState(kevin).expression).toBe('ANGRY');
    kevin.dialogue = 'A current line';
    kevin.dialogueTimer = 1;
    kevin.dialogueEmotion = 'SARCASTIC';
    expect(getKevinVisualState(kevin).expression).toBe('SMUG');
    kevin.dialogueEmotion = 'PANIC';
    expect(getKevinVisualState(kevin).expression).toBe('SURPRISED');
    kevin.dialogueEmotion = 'CRYING';
    expect(getKevinVisualState(kevin).expression).toBe('HURT');
    kevin.state = 'THROWING_PROJECTILE';
    expect(getKevinVisualState(kevin).expression).toBe('SHOUTING');
    kevin.state = 'DIZZY_BONK';
    expect(getKevinVisualState(kevin).expression).toBe('BONKED');
    kevin.state = 'REPAIRING';
    expect(getKevinVisualState(kevin).expression).toBe('NEUTRAL');
  });

  it('keeps pose anchors finite across action extremes without changing gameplay anchors', () => {
    const player = new Player(340, 485);
    const kickContact = player.getKickPosition();
    const headerContact = player.getHeaderPosition();
    const playerStates = ['IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT'];
    for (const state of playerStates) {
      player.state = state;
      for (const progress of [0, 0.3, 0.5, 0.7, 1]) {
        player.kickProgress = progress;
        player.runCycle = Math.PI * 2;
        expectFiniteNumbers(getPlayerPoseAnchors(player));
      }
    }
    expect(player.getKickPosition()).toEqual(kickContact);
    expect(player.getHeaderPosition()).toEqual(headerContact);

    const kevin = new NeighborKevinNPC();
    for (const state of ['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING']) {
      kevin.state = state;
      kevin.fistShakeAngle = 0.45;
      kevin.pitchArmAngle = 1.8;
      kevin.dizzyAngle = Math.PI;
      expectFiniteNumbers(getKevinPoseAnchors(kevin));
    }
  });
});

describe('character renderers', () => {
  it('draws every player pose without mutating gameplay state or leaking context transforms', () => {
    const player = new Player();
    const { context, calls, getSaveDepth } = makeCanvasContext();
    for (const state of ['IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT']) {
      player.state = state;
      player.invulnerabilityTimer = 0;
      player.powerCharging = state === 'IDLE';
      player.runCycle = 0.9;
      player.kickProgress = 0.5;
      const before = snapshot(player);
      drawPlayerCharacter(context, player, 4);
      expect(snapshot(player)).toBe(before);
      expect(getSaveDepth()).toBe(0);
    }
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach(expectFiniteNumbers);
  });

  it('draws every Kevin pose without mutating runtime state or leaking context transforms', () => {
    const kevin = new NeighborKevinNPC();
    kevin.dialogue = 'A deterministic review line';
    kevin.dialogueTimer = 1;
    kevin.bubbleScale = 1;
    kevin.stars = [
      { angle: 0, dist: 22, size: 7, color: '#facc15' },
      { angle: 2, dist: 22, size: 8, color: '#38bdf8' },
      { angle: 4, dist: 22, size: 7, color: '#f43f5e' },
    ];
    const { context, calls, getSaveDepth } = makeCanvasContext();
    for (const state of ['PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING']) {
      kevin.state = state;
      kevin.visible = true;
      kevin.rageMeter = 75;
      const before = snapshot(kevin);
      drawKevinCharacter(context, kevin);
      expect(snapshot(kevin)).toBe(before);
      expect(getSaveDepth()).toBe(0);
    }
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach(expectFiniteNumbers);
  });

  it('keeps the model draw methods as safe rendering entry points', () => {
    const { context, getSaveDepth } = makeCanvasContext();
    const player = new Player();
    const kevin = new NeighborKevinNPC();
    player.invulnerabilityTimer = 0;
    player.draw(context);
    kevin.draw(context);
    expect(getSaveDepth()).toBe(0);
  });

  it('retains the existing timed invulnerability visibility blink', () => {
    const player = new Player();
    player.invulnerabilityTimer = 1;
    const { context, calls } = makeCanvasContext();
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(0);
      drawPlayerCharacter(context, player);
      expect(calls).toEqual([]);

      now.mockReturnValue(70);
      drawPlayerCharacter(context, player);
      expect(calls.length).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
