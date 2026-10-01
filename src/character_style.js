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
    else if (npc.dialogueEmotion === 'RAGE') expression = 'SHOUTING';
  }

  return { pose: KEVIN_POSE_BY_STATE[npc.state], expression };
}
