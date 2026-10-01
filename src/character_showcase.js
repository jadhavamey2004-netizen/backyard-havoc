import { Player } from './player.js';
import { NeighborKevinNPC } from './npc.js';

const WIDTH = 960;
const HEIGHT = 540;
const COLUMNS = 3;
const CARD_WIDTH = WIDTH / COLUMNS;
const CARD_HEIGHT = 247;

function drawCard(ctx, x, y, label, index) {
  ctx.fillStyle = index % 2 === 0 ? '#F1F0E9' : '#E9ECEB';
  ctx.fillRect(x + 4, y + 3, CARD_WIDTH - 8, CARD_HEIGHT - 6);
  ctx.strokeStyle = '#D2D5D2';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4.5, y + 3.5, CARD_WIDTH - 9, CARD_HEIGHT - 7);
  ctx.fillStyle = '#293344';
  ctx.font = '700 13px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 15, y + 20);
  ctx.strokeStyle = '#D5D8D5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 15, y + CARD_HEIGHT - 20);
  ctx.lineTo(x + CARD_WIDTH - 15, y + CARD_HEIGHT - 20);
  ctx.stroke();
}

function makePlayerPose(state, x, y) {
  const player = new Player(x, y);
  player.facing = 1;
  player.invulnerabilityTimer = 0;
  player.runCycle = 2.1;
  if (state === 'RUNNING') {
    player.state = 'RUNNING';
    player.vx = 140;
    player.keys.sprint = true;
  } else if (state === 'KICKING') {
    player.state = 'KICKING';
    player.kickProgress = 0.5;
  } else if (state === 'HEADING') {
    player.state = 'HEADING';
    player.kickProgress = 0.55;
  } else if (state === 'HURT') {
    player.state = 'HURT';
    player.hurtTimer = 0.35;
    player.squashY = 0.94;
  } else if (state === 'CHARGING') {
    player.state = 'IDLE';
    player.powerCharging = true;
    player.powerCharge = 0.78;
  } else {
    player.state = 'IDLE';
    player.idleTime = 0;
  }
  return player;
}

function makeKevinPose(state, x, y) {
  const kevin = new NeighborKevinNPC(x, y);
  kevin.visible = true;
  kevin.facing = -1;
  if (state === 'WATCHFUL') {
    kevin.state = 'PEEKING_INSIDE';
  } else if (state === 'IRRITATED') {
    kevin.state = 'LEANING_OUT_RAGE';
    kevin.rageMeter = 45;
  } else if (state === 'ANGRY') {
    kevin.state = 'LEANING_OUT_RAGE';
    kevin.rageMeter = 90;
  } else if (state === 'SHOUTING') {
    kevin.state = 'THROWING_PROJECTILE';
    kevin.rageMeter = 80;
    kevin.pitchArmAngle = 1.15;
  } else if (state === 'SMUG') {
    kevin.state = 'LEANING_OUT_RAGE';
    kevin.rageMeter = 40;
    kevin.dialogue = 'Oh, marvelous.';
    kevin.dialogueEmotion = 'SARCASTIC';
    kevin.dialogueTimer = 1.5;
    kevin.bubbleScale = 1;
  } else if (state === 'BONKED') {
    kevin.state = 'DIZZY_BONK';
    kevin.rageMeter = 100;
    kevin.dizzyAngle = 0.5;
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

export function renderCharacterShowcase(canvas, subject) {
  if (subject !== 'player' && subject !== 'kevin') throw new RangeError(`Unknown character showcase: ${subject}`);
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#DFE4E3';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#26344B';
  ctx.font = '800 16px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(subject === 'player' ? 'PLAYER — POSE & EXPRESSION SHEET' : 'KEVIN — WINDOW POSE & EXPRESSION SHEET', WIDTH / 2, 18);

  const states = subject === 'player'
    ? ['IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT', 'CHARGING']
    : ['REPAIRING', 'WATCHFUL', 'IRRITATED', 'ANGRY', 'SHOUTING', 'BONKED'];
  for (let index = 0; index < states.length; index += 1) {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const cardX = column * CARD_WIDTH;
    const cardY = 34 + row * CARD_HEIGHT;
    drawCard(ctx, cardX, cardY, states[index], index);
    const centerX = cardX + CARD_WIDTH / 2;
    if (subject === 'player') {
      makePlayerPose(states[index], centerX, cardY + CARD_HEIGHT - 30).draw(ctx, 1);
    } else {
      makeKevinPose(states[index], centerX, cardY + 139).draw(ctx);
    }
  }
}
