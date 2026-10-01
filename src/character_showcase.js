import { Player } from './player.js';
import { NeighborKevinNPC } from './npc.js';
import { KEVIN_ANIMATION_TUNING } from './kevin_animation.js';
import { drawPlayerCharacter } from './player_renderer.js';
import { drawKevinCharacter } from './kevin_renderer.js';

const WIDTH = 960;
const HEIGHT = 540;
const COLUMNS = 5;
const CARD_WIDTH = WIDTH / COLUMNS;
const CARD_HEIGHT = 247;

function drawCard(ctx, x, y, label, index, width = CARD_WIDTH, height = CARD_HEIGHT) {
  ctx.fillStyle = index % 2 === 0 ? '#F1F0E9' : '#E9ECEB';
  ctx.fillRect(x + 4, y + 3, width - 8, height - 6);
  ctx.strokeStyle = '#D2D5D2';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4.5, y + 3.5, width - 9, height - 7);
  ctx.fillStyle = '#293344';
  ctx.font = '700 11px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 10, y + 18, width - 20);
  ctx.strokeStyle = '#D5D8D5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + height - 18);
  ctx.lineTo(x + width - 10, y + height - 18);
  ctx.stroke();
}

function preparePlayer(state, { progress = 0, runPhase = 0, charge = 0, elapsed = 0.4 } = {}) {
  const player = new Player(0, 0);
  player.animation.elapsed = elapsed;
  player.animation.idleElapsed = elapsed;
  player.animation.runPhase = runPhase;
  player.animation.runBlend = state === 'RUNNING' ? 1 : 0;
  player.invulnerabilityTimer = 0;
  player.state = state === 'CHARGING' ? 'IDLE' : state;
  player.kickProgress = progress;
  player.vx = state === 'RUNNING' ? 140 : 0;
  player.keys.sprint = state === 'SPRINTING';
  player.powerCharging = state === 'CHARGING';
  player.powerCharge = charge;
  if (state === 'HURT') {
    player.hurtTimer = 0.2;
    player.animation.hurtElapsed = 0.08;
  }
  return player;
}

function prepareKevin(state, { throwElapsed = 0, throwTimer = 1.8, rage = 0, elapsed = 0.7 } = {}) {
  const kevin = new NeighborKevinNPC(0, 0);
  kevin.animation.elapsed = elapsed;
  kevin.visible = true;
  kevin.facing = -1;
  kevin.throwTimer = throwTimer;
  kevin.rageMeter = rage;
  if (state === 'WATCHFUL') {
    kevin.state = 'PEEKING_INSIDE';
  } else if (state === 'IRRITATED' || state === 'ANGRY' || state === 'WINDUP') {
    kevin.state = 'LEANING_OUT_RAGE';
    if (state === 'WINDUP') kevin.throwTimer = Math.min(throwTimer, KEVIN_ANIMATION_TUNING.THROW_WINDUP_SECONDS * 0.5);
  } else if (state === 'SHOUTING') {
    kevin.state = 'THROWING_PROJECTILE';
    kevin.rageMeter = Math.max(rage, 80);
    kevin.animation.beginThrow();
    kevin.animation.throwJustStarted = false;
    kevin.animation.throwElapsed = throwElapsed;
    kevin.dialogue = 'GET OFF MY LAWN!';
    kevin.dialogueEmotion = 'RAGE';
    kevin.dialogueTimer = 1.5;
    kevin.bubbleScale = 1;
  } else if (state === 'BONKED' || state === 'DIZZY') {
    kevin.state = 'DIZZY_BONK';
    kevin.rageMeter = 100;
    kevin.animation.bonkAge = elapsed;
    kevin.stars = [
      { angle: 0.4, dist: 24, size: 9, color: '#F4B94F' },
      { angle: 2.5, dist: 24, size: 8, color: '#6CB7D8' },
      { angle: 4.5, dist: 24, size: 9, color: '#E6655C' },
    ];
  } else {
    kevin.state = 'REPAIRING';
  }
  return kevin;
}

function renderPlayerSheet(ctx) {
  const cards = [
    ['IDLE', () => preparePlayer('IDLE', { elapsed: 0.55 })],
    ['RUN — CONTACT', () => preparePlayer('RUNNING', { runPhase: 0, elapsed: 0.6 })],
    ['RUN — PASSING', () => preparePlayer('RUNNING', { runPhase: Math.PI / 2, elapsed: 0.6 })],
    ['KICK — ANTICIPATION', () => preparePlayer('KICKING', { progress: 0.18 })],
    ['KICK — CONTACT', () => preparePlayer('KICKING', { progress: 0.5 })],
    ['KICK — FOLLOW-THROUGH', () => preparePlayer('KICKING', { progress: 0.78 })],
    ['HEADER — PREPARATION', () => preparePlayer('HEADING', { progress: 0.22 })],
    ['HEADER — CONTACT', () => preparePlayer('HEADING', { progress: 0.5 })],
    ['POWER CHARGE', () => preparePlayer('CHARGING', { charge: 0.85 })],
    ['HURT / RECOVERY', () => preparePlayer('HURT')],
  ];
  ctx.fillStyle = '#26344B';
  ctx.font = '800 16px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAYER — AUTHORED ANIMATION POSES', WIDTH / 2, 17);
  for (let index = 0; index < cards.length; index += 1) {
    const [label, create] = cards[index];
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const x = column * CARD_WIDTH;
    const y = 31 + row * CARD_HEIGHT;
    drawCard(ctx, x, y, label, index);
    const player = create();
    player.x = x + CARD_WIDTH / 2;
    player.y = y + 211;
    drawPlayerCharacter(ctx, player, 1);
  }
}

function renderKevinSheet(ctx) {
  const cards = [
    ['WATCHFUL', () => prepareKevin('WATCHFUL', { rage: 0 })],
    ['IRRITATED', () => prepareKevin('IRRITATED', { rage: 42 })],
    ['ANGRY', () => prepareKevin('ANGRY', { rage: 92 })],
    ['SHOUTING', () => prepareKevin('SHOUTING', { rage: 80, throwElapsed: 0.1 })],
    ['THROW — WINDUP', () => prepareKevin('WINDUP', { rage: 80 })],
    ['THROW — RELEASE', () => prepareKevin('SHOUTING', { rage: 80, throwElapsed: 0 })],
    ['THROW — FOLLOW-THROUGH', () => prepareKevin('SHOUTING', { rage: 80, throwElapsed: 0.32 })],
    ['BONK — IMPACT', () => prepareKevin('BONKED', { elapsed: 0.02 })],
    ['DIZZY', () => prepareKevin('DIZZY', { elapsed: 0.42 })],
    ['REPAIRING', () => prepareKevin('REPAIRING', { rage: 0, elapsed: 0.9 })],
  ];
  ctx.fillStyle = '#26344B';
  ctx.font = '800 16px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KEVIN — WINDOW ANIMATION POSES', WIDTH / 2, 17);
  for (let index = 0; index < cards.length; index += 1) {
    const [label, create] = cards[index];
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const x = column * CARD_WIDTH;
    const y = 31 + row * CARD_HEIGHT;
    drawCard(ctx, x, y, label, index);
    const kevin = create();
    kevin.x = x + CARD_WIDTH / 2;
    kevin.y = y + 129;
    drawKevinCharacter(ctx, kevin);
  }
}

function renderKickSequence(ctx) {
  const frames = [
    ['ANTICIPATION', 0.16],
    ['STRIKE / CONTACT', 0.5],
    ['FOLLOW-THROUGH', 0.78],
    ['RECOVERY', 0.95],
  ];
  ctx.fillStyle = '#26344B';
  ctx.font = '800 18px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAYER KICK — GAMEPLAY-SYNCHRONIZED SEQUENCE', WIDTH / 2, 28);
  frames.forEach(([label, progress], index) => {
    const x = index * WIDTH / frames.length;
    drawCard(ctx, x, 48, label, index, WIDTH / frames.length, 470);
    const player = preparePlayer('KICKING', { progress, elapsed: 0.5 });
    player.x = x + WIDTH / frames.length / 2;
    player.y = 384;
    drawPlayerCharacter(ctx, player, 1);
  });
}

function renderThrowSequence(ctx) {
  const frames = [
    ['WINDUP', 'WINDUP', 0],
    ['RELEASE', 'SHOUTING', 0],
    ['FOLLOW-THROUGH', 'SHOUTING', 0.24],
    ['RECOVERY', 'SHOUTING', 0.42],
    ['RETURN', 'SHOUTING', 0.6],
  ];
  const sampledStates = [];
  let windupProgress = 0;
  ctx.fillStyle = '#26344B';
  ctx.font = '800 18px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KEVIN THROW — RELEASE HAND MATCHES PROJECTILE SPAWN', WIDTH / 2, 28);
  frames.forEach(([label, state, age], index) => {
    const x = index * WIDTH / frames.length;
    drawCard(ctx, x, 48, label, index, WIDTH / frames.length, 470);
    const kevin = prepareKevin(state, { rage: 80, throwElapsed: age, elapsed: 0.7 });
    sampledStates.push(kevin.state);
    if (label === 'WINDUP') {
      windupProgress = 1 - kevin.throwTimer / KEVIN_ANIMATION_TUNING.THROW_WINDUP_SECONDS;
    }
    kevin.x = x + WIDTH / frames.length / 2;
    kevin.y = 360;
    drawKevinCharacter(ctx, kevin);
  });
  return {
    phases: frames.map(([label]) => label),
    states: sampledStates,
    windupProgress,
  };
}

export function renderCharacterShowcase(canvas, subject) {
  const supported = ['player', 'kevin', 'player-kick-sequence', 'kevin-throw-sequence'];
  if (!supported.includes(subject)) throw new RangeError(`Unknown character showcase: ${subject}`);
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#DFE4E3';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (subject === 'player') renderPlayerSheet(ctx);
  else if (subject === 'kevin') renderKevinSheet(ctx);
  else if (subject === 'player-kick-sequence') renderKickSequence(ctx);
  else {
    const sequence = renderThrowSequence(ctx);
    canvas.dataset.sequencePhases = sequence.phases.join('|');
    canvas.dataset.sequenceStates = sequence.states.join('|');
    canvas.dataset.sequenceWindupProgress = String(sequence.windupProgress);
  }
}
