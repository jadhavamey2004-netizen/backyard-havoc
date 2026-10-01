import { getKevinPoseAnchors, getKevinVisualState, KEVIN_VISUAL_STYLE } from './character_style.js';

const { palette: colors, line, geometry: g } = KEVIN_VISUAL_STYLE;

function drawWindow(ctx, open) {
  const halfWidth = g.windowWidth / 2;
  const halfHeight = g.windowHeight / 2;
  ctx.fillStyle = open ? colors.interior : colors.windowGlass;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.outer;
  ctx.fillRect(-halfWidth, -halfHeight, g.windowWidth, g.windowHeight);
  ctx.strokeRect(-halfWidth, -halfHeight, g.windowWidth, g.windowHeight);

  if (!open) {
    ctx.fillStyle = colors.windowLight;
    ctx.fillRect(-halfWidth + 4, -halfHeight + 4, g.windowWidth - 8, g.windowHeight - 8);
    ctx.fillStyle = colors.curtain;
    ctx.fillRect(-halfWidth + 6, -halfHeight + 4, 7, g.windowHeight - 8);
    ctx.fillRect(halfWidth - 13, -halfHeight + 4, 7, g.windowHeight - 8);
  }

  ctx.fillStyle = colors.windowWood;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.structural;
  ctx.fillRect(-halfWidth - 4, g.windowSillY - 4, g.windowWidth + 8, 8);
  ctx.strokeRect(-halfWidth - 4, g.windowSillY - 4, g.windowWidth + 8, 8);

  ctx.fillStyle = colors.shutter;
  if (open) {
    ctx.fillRect(-halfWidth - 18, -halfHeight, 16, g.windowHeight);
    ctx.strokeRect(-halfWidth - 18, -halfHeight, 16, g.windowHeight);
    ctx.fillRect(halfWidth + 2, -halfHeight, 16, g.windowHeight);
    ctx.strokeRect(halfWidth + 2, -halfHeight, 16, g.windowHeight);
    ctx.strokeStyle = colors.shutterHighlight;
    ctx.lineWidth = 1;
    for (let y = -20; y < 22; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-halfWidth - 16, y);
      ctx.lineTo(-halfWidth - 4, y);
      ctx.moveTo(halfWidth + 4, y);
      ctx.lineTo(halfWidth + 16, y);
      ctx.stroke();
    }
  } else {
    ctx.fillRect(-halfWidth - 10, -halfHeight, 10, g.windowHeight);
    ctx.strokeRect(-halfWidth - 10, -halfHeight, 10, g.windowHeight);
    ctx.fillRect(halfWidth, -halfHeight, 10, g.windowHeight);
    ctx.strokeRect(halfWidth, -halfHeight, 10, g.windowHeight);
  }
}

function drawSegment(ctx, from, to, color, width, outlineWidth = line.outer) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = width + outlineWidth;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawJoint(ctx, point, radius, fill) {
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorso(ctx, anchor, expression, peeking) {
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(expression === 'BONKED' ? 0.07 : 0);
  if (peeking) ctx.globalAlpha = 0.82;

  const halfHeight = g.torso.height / 2;
  const topHalfWidth = g.torso.halfWidth;
  const bottomHalfWidth = g.torso.bottomHalfWidth;

  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.moveTo(-topHalfWidth, -halfHeight);
  ctx.quadraticCurveTo(-topHalfWidth - 5, -halfHeight + 1, -topHalfWidth - 4, -halfHeight + 11);
  ctx.lineTo(-bottomHalfWidth, halfHeight - 2);
  ctx.quadraticCurveTo(0, halfHeight + 3, bottomHalfWidth, halfHeight - 2);
  ctx.lineTo(topHalfWidth + 4, -halfHeight + 11);
  ctx.quadraticCurveTo(topHalfWidth + 5, -halfHeight + 1, topHalfWidth, -halfHeight);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.cardigan;
  ctx.beginPath();
  ctx.moveTo(-topHalfWidth + 3, -halfHeight + 2);
  ctx.quadraticCurveTo(-topHalfWidth - 1, -halfHeight + 3, -topHalfWidth + 2, -halfHeight + 11);
  ctx.lineTo(-bottomHalfWidth + 2, halfHeight - 5);
  ctx.quadraticCurveTo(0, halfHeight - 1, bottomHalfWidth - 2, halfHeight - 5);
  ctx.lineTo(topHalfWidth - 2, -halfHeight + 11);
  ctx.quadraticCurveTo(topHalfWidth + 1, -halfHeight + 3, topHalfWidth - 3, -halfHeight + 2);
  ctx.closePath();
  ctx.fill();

  // Open cardigan reveals a broad cream shirt and simple, readable collar.
  ctx.fillStyle = colors.shirt;
  ctx.beginPath();
  ctx.moveTo(-12, -17);
  ctx.lineTo(12, -17);
  ctx.lineTo(10, 16);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.cardiganShade;
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.lineTo(-4, -17);
  ctx.lineTo(0, -9);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -18);
  ctx.lineTo(4, -17);
  ctx.lineTo(0, -9);
  ctx.lineTo(8, -5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = colors.olive;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-31, -5);
  ctx.quadraticCurveTo(-20, -3, -14, 1);
  ctx.moveTo(31, -5);
  ctx.quadraticCurveTo(20, -3, 14, 1);
  ctx.stroke();

  ctx.fillStyle = colors.ochre;
  ctx.beginPath();
  ctx.roundRect(-24, 1, 13, 12, 2.5);
  ctx.fill();
  ctx.strokeStyle = colors.olive;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-22, 3, 9, 8);
  ctx.fillStyle = colors.cardiganShade;
  ctx.beginPath();
  ctx.arc(0, 1, 1.4, 0, Math.PI * 2);
  ctx.arc(0, 8, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArm(ctx, shoulder, elbow, wrist, front, pose, expression) {
  drawSegment(ctx, shoulder, elbow, colors.cardigan, 11, line.outer);
  drawJoint(ctx, shoulder, 6.5, colors.cardigan);
  drawSegment(ctx, elbow, wrist, colors.skin, 6.5, line.structural);
  drawJoint(ctx, elbow, 4.5, colors.skin);

  ctx.strokeStyle = colors.olive;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(elbow.x, elbow.y, 5.5, front ? -0.7 : Math.PI - 0.7, front ? 0.7 : Math.PI + 0.7);
  ctx.stroke();

  drawJoint(ctx, wrist, pose === 'THROWING_PROJECTILE' && front ? 5.4 : 5, colors.skin);
  if (expression === 'BONKED' || pose === 'PEEKING_INSIDE' || pose === 'REPAIRING') {
    ctx.strokeStyle = colors.skinShade;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wrist.x - 2, wrist.y);
    ctx.lineTo(wrist.x + 2, wrist.y);
    ctx.stroke();
  }
}

function drawHead(ctx, anchor, expression, facing) {
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  if (expression === 'BONKED') ctx.rotate(0.12);

  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.ellipse(0, 0, g.head.radiusX + 1.5, g.head.radiusY + 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = expression === 'BONKED' ? colors.bonkedSkin : colors.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, g.head.radiusX, g.head.radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bald crown and swept silver temple tufts form a distinct window silhouette.
  ctx.fillStyle = colors.hair;
  ctx.beginPath();
  ctx.moveTo(-18, -5);
  ctx.quadraticCurveTo(-23, -19, -10, -24);
  ctx.quadraticCurveTo(0, -29, 11, -23);
  ctx.quadraticCurveTo(20, -18, 18, -7);
  ctx.quadraticCurveTo(11, -13, 7, -14);
  ctx.quadraticCurveTo(-2, -18, -8, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.hairShade;
  ctx.beginPath();
  ctx.ellipse(-17, -2, 5, 10, -0.3, 0, Math.PI * 2);
  ctx.ellipse(17, -2, 5, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();

  const browY = -7;
  const eyeY = -1;
  const irritated = expression === 'IRRITATED';
  const angry = expression === 'ANGRY' || expression === 'SHOUTING';
  const hurt = expression === 'BONKED' || expression === 'HURT';
  const surprised = expression === 'SURPRISED';
  const watchful = expression === 'WATCHFUL';
  const smug = expression === 'SMUG';

  ctx.fillStyle = colors.hairShade;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (angry) {
    ctx.moveTo(-15, browY - 2); ctx.lineTo(-3, browY + 2); ctx.lineTo(-4, browY + 5); ctx.lineTo(-16, browY + 2);
    ctx.moveTo(15, browY - 2); ctx.lineTo(3, browY + 2); ctx.lineTo(4, browY + 5); ctx.lineTo(16, browY + 2);
  } else if (irritated) {
    ctx.moveTo(-15, browY - 1); ctx.lineTo(-3, browY + 1); ctx.lineTo(-4, browY + 3); ctx.lineTo(-15, browY + 2);
    ctx.moveTo(15, browY - 1); ctx.lineTo(3, browY + 1); ctx.lineTo(4, browY + 3); ctx.lineTo(15, browY + 2);
  } else if (surprised) {
    ctx.moveTo(-15, browY + 1); ctx.quadraticCurveTo(-9, browY - 5, -3, browY + 1);
    ctx.moveTo(15, browY + 1); ctx.quadraticCurveTo(9, browY - 5, 3, browY + 1);
  } else if (watchful) {
    ctx.moveTo(-15, browY); ctx.quadraticCurveTo(-9, browY - 5, -3, browY - 1);
    ctx.moveTo(15, browY); ctx.quadraticCurveTo(9, browY - 5, 3, browY - 1);
  } else {
    ctx.moveTo(-15, browY); ctx.quadraticCurveTo(-9, browY - 3, -3, browY);
    ctx.moveTo(15, browY); ctx.quadraticCurveTo(9, browY - 3, 3, browY);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colors.white;
  for (const eyeX of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 4.6, surprised || watchful ? 4.2 : 3.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = colors.outline;
      ctx.beginPath();
      ctx.arc(eyeX + 1.2 * (facing < 0 ? -1 : 1), eyeY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.white;
    }
  }

  // Big simple frames help the eyes survive the window-sized game view.
  ctx.strokeStyle = colors.glasses;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-15, -6, 13, 11, 3);
  ctx.roundRect(2, -6, 13, 11, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, -1);
  ctx.quadraticCurveTo(0, -3, 2, -1);
  ctx.stroke();

  if (expression === 'BONKED') {
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2;
    for (const eyeX of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(eyeX - 2, eyeY - 2);
      ctx.lineTo(eyeX + 2, eyeY + 2);
      ctx.moveTo(eyeX + 2, eyeY - 2);
      ctx.lineTo(eyeX - 2, eyeY + 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = hurt ? colors.flush : colors.skinShade;
  ctx.beginPath();
  ctx.ellipse(0, 3, surprised ? 4.2 : 4.8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Broad gray moustache is the primary facial identifier.
  ctx.fillStyle = colors.hair;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.quadraticCurveTo(-10, 1, -18, 7);
  ctx.quadraticCurveTo(-15, 15, -6, 12);
  ctx.quadraticCurveTo(0, 9, 1, 12);
  ctx.quadraticCurveTo(7, 16, 16, 11);
  ctx.quadraticCurveTo(19, 5, 11, 5);
  ctx.quadraticCurveTo(5, 5, 2, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (expression === 'SHOUTING') {
    ctx.fillStyle = colors.mouth;
    ctx.beginPath();
    ctx.ellipse(0, 16, 6.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.fillRect(-4, 10, 8, 2.8);
    ctx.fillStyle = colors.flush;
    ctx.beginPath();
    ctx.ellipse(1, 21, 3.5, 1.7, 0, 0, Math.PI);
    ctx.fill();
  } else if (expression === 'SURPRISED') {
    ctx.fillStyle = colors.mouth;
    ctx.beginPath();
    ctx.ellipse(0, 15, 3.2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hurt) {
    ctx.moveTo(-4, 17); ctx.quadraticCurveTo(0, 13, 5, 17);
    ctx.stroke();
  } else if (angry) {
    ctx.moveTo(-6, 17); ctx.lineTo(5, 16);
    ctx.stroke();
  } else if (smug) {
    ctx.moveTo(-4, 17); ctx.quadraticCurveTo(2, 20, 7, 15);
    ctx.stroke();
  } else {
    ctx.moveTo(-5, 16); ctx.quadraticCurveTo(1, 20, 6, 16);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRepairCloth(ctx, wrist) {
  ctx.save();
  ctx.translate(wrist.x, wrist.y - 2);
  ctx.rotate(-0.18);
  ctx.fillStyle = colors.ochre;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.facial;
  ctx.beginPath();
  ctx.roundRect(-8, -3, 16, 7, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRageMeter(ctx, rage) {
  if (rage < 10) return;
  const width = 48;
  const height = 5;
  const x = -width / 2;
  const y = -52;
  const fillWidth = width * Math.max(0.05, Math.min(100, rage)) / 100;
  ctx.fillStyle = colors.outline;
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
  ctx.fillStyle = rage >= 70 ? colors.rage : colors.ochre;
  ctx.fillRect(x, y, fillWidth, height);
  ctx.strokeStyle = colors.white;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

function drawSpeechBubble(ctx, npc) {
  if (!(npc.dialogueTimer > 0 && npc.dialogue && npc.bubbleScale > 0.05)) return;
  ctx.save();
  const fade = npc.dialogueTimer < 0.5 ? Math.max(0, npc.dialogueTimer / 0.5) : 1;
  ctx.globalAlpha = fade * npc.bubbleScale;
  const shakeX = npc.dialogueEmotion === 'RAGE' && npc.rageMeter >= 50
    ? Math.sin((Number.isFinite(npc.stateTimer) ? npc.stateTimer : 0) * 14) * 1.5
    : 0;
  ctx.translate(npc.x + shakeX, npc.y - 58);
  ctx.scale(npc.bubbleScale, npc.bubbleScale);
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = npc.dialogue.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > 240 && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  const count = Math.min(5, lines.length);
  const boxHeight = Math.max(34, count * 16 + 14);
  let widest = 0;
  for (let i = 0; i < count; i += 1) widest = Math.max(widest, ctx.measureText(lines[i]).width);
  const boxWidth = Math.min(270, Math.max(60, widest + 28));

  let border = colors.outline;
  if (npc.dialogueEmotion === 'RAGE') border = colors.rage;
  else if (npc.dialogueEmotion === 'CRYING' || npc.dialogueEmotion === 'DESPAIRING') border = colors.hurt;
  else if (npc.dialogueEmotion === 'PANIC') border = colors.panic;
  else if (npc.dialogueEmotion === 'SARCASTIC') border = colors.smug;

  ctx.fillStyle = colors.white;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-boxWidth / 2, -boxHeight, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(0, 9);
  ctx.lineTo(6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colors.outline;
  const top = -boxHeight + 10 + (boxHeight - count * 16) / 2;
  for (let i = 0; i < count; i += 1) ctx.fillText(lines[i], 0, top + i * 16);
  ctx.restore();
}

function drawDizzyStars(ctx, npc) {
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.facial;
  for (let i = 0; i < npc.stars.length; i += 1) {
    const star = npc.stars[i];
    const x = Math.cos(star.angle) * star.dist;
    const y = -55 + Math.sin(star.angle) * 6;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(x, y, star.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export function drawKevinCharacter(ctx, npc) {
  if (!npc.visible) return;
  const visual = getKevinVisualState(npc);
  const a = getKevinPoseAnchors(npc);
  const open = visual.pose !== 'PEEKING_INSIDE';
  const peeking = visual.pose === 'PEEKING_INSIDE';
  const repairing = visual.pose === 'REPAIRING';
  const dizzy = visual.pose === 'DIZZY_BONK';

  ctx.save();
  ctx.translate(Number.isFinite(npc.x) ? npc.x : 0, Number.isFinite(npc.y) ? npc.y : 0);
  drawWindow(ctx, open);
  ctx.save();
  ctx.scale(a.facing, 1);
  if (dizzy) ctx.rotate(Math.sin(Number.isFinite(npc.dizzyAngle) ? npc.dizzyAngle : 0) * 0.08);

  // Kevin remains anchored to the existing window. A compact interior shadow grounds his torso.
  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  ctx.ellipse(0, g.windowSillY - 1, g.shadowRadiusX, g.shadowRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  drawArm(ctx, a.shoulderBack, a.elbowBack, a.wristBack, false, visual.pose, visual.expression);
  drawTorso(ctx, a.torso, visual.expression, peeking);
  drawHead(ctx, a.head, visual.expression, a.facing);
  drawArm(ctx, a.shoulderFront, a.elbowFront, a.wristFront, true, visual.pose, visual.expression);
  if (repairing) drawRepairCloth(ctx, a.wristFront);
  if (dizzy) drawDizzyStars(ctx, npc);
  ctx.restore();

  drawRageMeter(ctx, Number.isFinite(npc.rageMeter) ? npc.rageMeter : 0);
  drawSpeechBubble(ctx, npc);
  ctx.restore();
}
