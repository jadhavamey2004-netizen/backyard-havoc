const freeze = Object.freeze;

export const PLAYER_VISUAL_STYLE = freeze({
  scale: 1,
  palette: freeze({
    jersey: '#E85F5C',
    jerseyShade: '#B83D49',
    cream: '#FFF1D5',
    mint: '#62D8B7',
    shorts: '#26344B',
    skin: '#C98258',
    skinShade: '#A95E45',
    hair: '#292536',
    hairHighlight: '#514155',
    outline: '#202334',
    shadow: 'rgba(20, 28, 42, 0.30)',
    charge: '#F7B844',
    comboGlow: '#FACC15',
    comboGlowPeak: '#EF4444',
    white: '#FFFDF8',
  }),
  line: freeze({ outer: 3.2, structural: 2, facial: 1.5 }),
  geometry: freeze({
    totalHeight: 132,
    head: freeze({ x: 0, y: -77, radius: 16 }),
    torso: freeze({ centerY: -51, halfWidthTop: 17, halfWidthBottom: 14, height: 34 }),
    pelvisY: -35,
    shoulderY: -60,
    hipOffsetX: 7,
    kneeY: -17,
    ankleY: 1,
    footY: 18,
    armReach: 30,
    limbWidth: 8,
    shadowY: 9,
    shadowRadiusX: 21,
    shadowRadiusY: 5,
  }),
});

export const KEVIN_VISUAL_STYLE = freeze({
  scale: 1,
  palette: freeze({
    cardigan: '#55465F',
    cardiganShade: '#3F3548',
    shirt: '#F1E5C8',
    olive: '#87935C',
    ochre: '#D9A34D',
    skin: '#D29A70',
    skinShade: '#AB7459',
    flush: '#D96A63',
    hair: '#D8D4C6',
    hairShade: '#96969B',
    glasses: '#362C35',
    outline: '#242433',
    interior: '#27283A',
    windowGlass: 'rgba(82, 155, 179, 0.76)',
    curtain: '#D7A84F',
    windowWood: '#A9612C',
    shutter: '#C57A3A',
    shutterHighlight: '#E0A157',
    windowLight: '#F5D77A',
    bonkedSkin: '#DFAD88',
    mouth: '#552F36',
    shadow: 'rgba(25, 28, 39, 0.36)',
    white: '#FFFDF8',
    black: '#242433',
    rage: '#E6655C',
    panic: '#F4B94F',
    hurt: '#6CB7D8',
    smug: '#78825D',
  }),
  line: freeze({ outer: 3.2, structural: 2, facial: 1.55 }),
  geometry: freeze({
    totalHeight: 104,
    shoulderSpan: 68,
    head: freeze({ x: 0, y: -31, radiusX: 21, radiusY: 20 }),
    torso: freeze({ centerY: 13, halfWidth: 34, bottomHalfWidth: 27, height: 42 }),
    armReach: 29,
    windowWidth: 56,
    windowHeight: 52,
    windowSillY: 22,
    shadowRadiusX: 29,
    shadowRadiusY: 4,
  }),
});

export const PLAYER_RUNTIME_STATES = freeze(['IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT']);
export const KEVIN_RUNTIME_STATES = freeze([
  'PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING',
]);

const PLAYER_POSE_BY_STATE = freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  KICKING: 'KICKING',
  HEADING: 'HEADING',
  HURT: 'HURT',
});

const PLAYER_EXPRESSION_BY_STATE = freeze({
  IDLE: 'FOCUSED',
  RUNNING: 'EFFORT',
  KICKING: 'EFFORT',
  HEADING: 'EFFORT',
  HURT: 'HURT',
});

const KEVIN_POSE_BY_STATE = freeze({
  PEEKING_INSIDE: 'PEEKING_INSIDE',
  LEANING_OUT_RAGE: 'LEANING_OUT_RAGE',
  THROWING_PROJECTILE: 'THROWING_PROJECTILE',
  DIZZY_BONK: 'DIZZY_BONK',
  REPAIRING: 'REPAIRING',
});

function assertKnownState(state, states, characterName) {
  if (!states.includes(state)) {
    throw new RangeError(`Unsupported ${characterName} visual state: ${state}`);
  }
}

export function getPlayerVisualState(player) {
  assertKnownState(player.state, PLAYER_RUNTIME_STATES, 'player');
  return {
    pose: PLAYER_POSE_BY_STATE[player.state],
    expression: player.state === 'HURT'
      ? 'HURT'
      : (player.powerCharging ? 'CHARGING' : PLAYER_EXPRESSION_BY_STATE[player.state]),
  };
}

export function getKevinVisualState(npc) {
  assertKnownState(npc.state, KEVIN_RUNTIME_STATES, 'Kevin');
  let expression;
  switch (npc.state) {
    case 'PEEKING_INSIDE':
      expression = 'WATCHFUL';
      break;
    case 'LEANING_OUT_RAGE':
      expression = npc.rageMeter >= 70 ? 'ANGRY' : 'IRRITATED';
      break;
    case 'THROWING_PROJECTILE':
      expression = 'SHOUTING';
      break;
    case 'DIZZY_BONK':
      expression = 'BONKED';
      break;
    case 'REPAIRING':
      expression = 'NEUTRAL';
      break;
    default:
      assertKnownState(npc.state, KEVIN_RUNTIME_STATES, 'Kevin');
  }

  const hasCurrentDialogue = npc.dialogueTimer > 0 && Boolean(npc.dialogue);
  if (hasCurrentDialogue && npc.state !== 'DIZZY_BONK' && npc.state !== 'THROWING_PROJECTILE'
    && npc.state !== 'REPAIRING') {
    if (npc.dialogueEmotion === 'SARCASTIC') expression = 'SMUG';
    else if (npc.dialogueEmotion === 'PANIC') expression = 'SURPRISED';
    else if (npc.dialogueEmotion === 'CRYING' || npc.dialogueEmotion === 'DESPAIRING') expression = 'HURT';
    else if (npc.dialogueEmotion === 'RAGE') expression = npc.rageMeter >= 70 ? 'ANGRY' : 'SHOUTING';
  }

  return { pose: KEVIN_POSE_BY_STATE[npc.state], expression };
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function signOrOne(value) {
  return value < 0 ? -1 : 1;
}

export function getPlayerPoseAnchors(player) {
  assertKnownState(player.state, PLAYER_RUNTIME_STATES, 'player');
  const g = PLAYER_VISUAL_STYLE.geometry;
  const run = Math.sin(Number.isFinite(player.runCycle) ? player.runCycle : 0);
  const progress = clampUnit(player.kickProgress);
  const idleBob = player.state === 'IDLE'
    ? Math.sin((Number.isFinite(player.idleTime) ? player.idleTime : 0) * 3) * 1.2
    : 0;
  const running = player.state === 'RUNNING';
  const kicking = player.state === 'KICKING';
  const heading = player.state === 'HEADING';

  let frontFootX = g.hipOffsetX + 1;
  let frontFootY = g.footY;
  if (running) {
    frontFootX += run * 12;
    frontFootY -= Math.max(0, run) * 3;
  } else if (kicking && progress < 0.3) {
    const anticipation = progress / 0.3;
    frontFootX = 8 + anticipation * 16;
    frontFootY = 3 - anticipation * 20;
  } else if (kicking && progress <= 0.7) {
    const strike = (progress - 0.3) / 0.4;
    frontFootX = 24 + strike * 16;
    frontFootY = -17 - Math.sin(strike * Math.PI) * 5;
  } else if (kicking) {
    const recovery = (progress - 0.7) / 0.3;
    frontFootX = 40 - recovery * 32;
    frontFootY = -17 + recovery * 35;
  }

  const headX = heading ? 8 : (kicking ? -3 * (1 - progress) : 0);
  const headY = g.head.y + idleBob + (running ? Math.abs(run) * 1.5 : 0)
    + (heading ? 3 : 0) + (player.state === 'HURT' ? 4 : 0);
  const runArm = running ? run * 8 : 0;
  const kickArm = kicking ? 8 + progress * 4 : 0;
  const hurt = player.state === 'HURT';

  return {
    root: { x: Number.isFinite(player.x) ? player.x : 0, y: Number.isFinite(player.y) ? player.y : 0 },
    pelvis: { x: 0, y: g.pelvisY + idleBob },
    torso: { x: heading ? 3 : (hurt ? -2 : 0), y: g.torso.centerY + idleBob },
    neck: { x: headX * 0.4, y: -67 + idleBob + (hurt ? 3 : 0) },
    head: { x: headX, y: headY },
    shoulderBack: { x: -14, y: g.shoulderY + idleBob + (heading ? -2 : 0) },
    shoulderFront: { x: 14, y: g.shoulderY + idleBob + (heading ? -2 : 0) },
    elbowBack: { x: (heading ? -28 : -23) + runArm, y: (heading ? -48 : -43) + (hurt ? 3 : 0) },
    wristBack: { x: (heading ? -34 : -17) + runArm * 1.2, y: (heading ? -35 : -29) + (hurt ? 5 : 0) },
    elbowFront: {
      x: (heading ? 29 : 23) - runArm + kickArm,
      y: (heading ? -49 : -44) - (kicking ? 3 : 0) + (hurt ? 4 : 0),
    },
    wristFront: {
      x: (heading ? 37 : 17) - runArm + kickArm,
      y: (heading ? -43 : -30) - (kicking ? 7 : 0) + (hurt ? 6 : 0),
    },
    hipBack: { x: -g.hipOffsetX, y: g.pelvisY },
    hipFront: { x: g.hipOffsetX, y: g.pelvisY },
    kneeBack: { x: -g.hipOffsetX - (running ? run * 9 : 0), y: g.kneeY + (running ? Math.abs(run) * 2 : 0) },
    ankleBack: { x: -g.hipOffsetX - (running ? run * 12 : 0), y: g.ankleY - (running ? Math.max(0, -run) * 4 : 0) },
    kneeFront: {
      x: g.hipOffsetX + (running ? run * 9 : (kicking ? (frontFootX - g.hipOffsetX) * 0.52 : 0)),
      y: g.kneeY + (running ? Math.max(0, -run) * 2 : (kicking ? (frontFootY - g.footY) * 0.52 : 0)),
    },
    ankleFront: { x: frontFootX, y: frontFootY },
    torsoLean: heading ? 0.24 : (running ? 0.12 : (kicking ? -0.08 * Math.sin(progress * Math.PI) : 0)),
    facing: signOrOne(player.facing),
  };
}

export function getKevinPoseAnchors(npc) {
  assertKnownState(npc.state, KEVIN_RUNTIME_STATES, 'Kevin');
  const g = KEVIN_VISUAL_STYLE.geometry;
  const pose = KEVIN_POSE_BY_STATE[npc.state];
  const peeking = pose === 'PEEKING_INSIDE';
  const repairing = pose === 'REPAIRING';
  const bonked = pose === 'DIZZY_BONK';
  const throwing = pose === 'THROWING_PROJECTILE';
  const leaned = !peeking;
  const throwAngle = Number.isFinite(npc.pitchArmAngle) ? npc.pitchArmAngle : 0;
  const headX = leaned ? (bonked ? 2 : 4) : 0;
  const headY = peeking ? -16 : (repairing ? -21 : -31);
  const backHand = peeking || repairing
    ? { x: -25, y: g.windowSillY - 1 }
    : (bonked ? { x: -31, y: 4 } : { x: -38, y: -11 });
  const frontHand = peeking || repairing
    ? { x: 25, y: g.windowSillY - 1 }
    : (throwing
      ? { x: 34 + Math.cos(throwAngle) * 8, y: -21 + Math.sin(throwAngle) * 12 }
      : (bonked ? { x: 29, y: 5 } : { x: 39, y: -12 }));

  return {
    windowCenter: { x: 0, y: 0 },
    sill: { x: 0, y: g.windowSillY },
    torso: { x: 0, y: g.torso.centerY + (peeking ? 5 : 0) },
    neck: { x: headX, y: headY + 17 },
    head: { x: headX, y: headY },
    shoulderBack: { x: -g.shoulderSpan / 2 + 4, y: -6 },
    shoulderFront: { x: g.shoulderSpan / 2 - 4, y: -6 },
    elbowBack: { x: -31, y: peeking || repairing ? 9 : -16 },
    wristBack: backHand,
    elbowFront: { x: throwing ? 24 : 31, y: throwing ? -22 : (peeking || repairing ? 9 : -17) },
    wristFront: frontHand,
    gaze: { x: signOrOne(npc.facing), y: 0 },
    facing: signOrOne(npc.facing),
    bodyLean: peeking ? 0 : (bonked ? Math.sin(Number.isFinite(npc.dizzyAngle) ? npc.dizzyAngle : 0) * 0.09 : 0.06),
  };
}
