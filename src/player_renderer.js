import { getPlayerVisualState, PLAYER_VISUAL_STYLE } from './character_style.js';

const { palette: colors, line, geometry: g } = PLAYER_VISUAL_STYLE;

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

function drawJoint(ctx, point, radius, color) {
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius + line.structural / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawArm(ctx, shoulder, elbow, wrist, isFront, player) {
  drawSegment(ctx, shoulder, elbow, colors.jersey, 8.5);
  drawJoint(ctx, shoulder, 6.2, colors.jersey);
  drawSegment(ctx, elbow, wrist, colors.skin, 5.7, line.structural);
  drawJoint(ctx, elbow, 4.2, colors.skin);

  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.skin;
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, 3.8, 0, Math.PI * 2);
  ctx.fill();

  if (isFront) {
    ctx.strokeStyle = colors.mint;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(elbow.x, elbow.y, 4.6, -0.4, Math.PI * 0.65);
    ctx.stroke();
  }
  if (player.powerCharging && isFront) {
    ctx.fillStyle = colors.charge;
    ctx.beginPath();
    ctx.arc(wrist.x + 1.5, wrist.y - 1.5, 1.5 + player.powerCharge * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCleat(ctx, ankle, isFront) {
  const x = ankle.x - (isFront ? 5 : 9);
  const y = ankle.y - 2;
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.roundRect(x - 1, y - 1, 23, 11, 4);
  ctx.fill();
  ctx.fillStyle = colors.mint;
  ctx.beginPath();
  ctx.roundRect(x, y - 1, 21, 8, 3.5);
  ctx.fill();
  ctx.fillStyle = colors.jersey;
  ctx.beginPath();
  ctx.moveTo(x + 12, y - 1);
  ctx.quadraticCurveTo(x + 22, y, x + 20, y + 5);
  ctx.lineTo(x + 13, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.cream;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 7);
  ctx.lineTo(x + 17, y + 7);
  ctx.stroke();
}

function drawLegs(ctx, a) {
  const pelvis = a.pelvis;
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.roundRect(pelvis.x - 17, pelvis.y - 1, 34, 17, 5);
  ctx.fill();
  ctx.fillStyle = colors.shorts;
  ctx.beginPath();
  ctx.roundRect(pelvis.x - 15, pelvis.y, 30, 13, 4);
  ctx.fill();
  ctx.fillStyle = colors.mint;
  ctx.fillRect(pelvis.x - 13, pelvis.y + 9, 26, 2.4);

  drawSegment(ctx, a.hipBack, a.kneeBack, colors.skin, g.limbWidth - 1, line.structural);
  drawSegment(ctx, a.kneeBack, a.ankleBack, colors.skin, g.limbWidth - 1, line.structural);
  drawJoint(ctx, a.kneeBack, 3.8, colors.skin);
  ctx.fillStyle = colors.cream;
  ctx.beginPath();
  ctx.roundRect(a.ankleBack.x - 3.4, a.ankleBack.y - 2, 7, 7, 2);
  ctx.fill();
  drawCleat(ctx, a.ankleBack, false);

  drawSegment(ctx, a.hipFront, a.kneeFront, colors.skin, g.limbWidth, line.structural);
  drawSegment(ctx, a.kneeFront, a.ankleFront, colors.skin, g.limbWidth, line.structural);
  drawJoint(ctx, a.kneeFront, 4, colors.skin);
  ctx.fillStyle = colors.cream;
  ctx.beginPath();
  ctx.roundRect(a.ankleFront.x - 3.5, a.ankleFront.y - 2, 7.5, 8, 2);
  ctx.fill();
  drawCleat(ctx, a.ankleFront, true);
}

function drawTorso(ctx, anchor, visual, player, combo, torsoLean, animationPose) {
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(animationPose.torsoRotation || torsoLean);
  const accentScale = 1 + (animationPose.strikeAccent || 0) * 0.025;
  ctx.scale(accentScale, 1 / accentScale);
  if (combo >= 4) {
    ctx.shadowBlur = Math.min(18, combo * 2.7);
    ctx.shadowColor = combo >= 8 ? colors.comboGlowPeak : colors.comboGlow;
  }

  const topY = -g.torso.height / 2;
  const bottomY = g.torso.height / 2;
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.moveTo(-g.torso.halfWidthTop, topY);
  ctx.quadraticCurveTo(-g.torso.halfWidthTop - 2, topY + 2, -g.torso.halfWidthTop, topY + 9);
  ctx.lineTo(-g.torso.halfWidthBottom, bottomY - 2);
  ctx.quadraticCurveTo(0, bottomY + 2, g.torso.halfWidthBottom, bottomY - 2);
  ctx.lineTo(g.torso.halfWidthTop, topY + 9);
  ctx.quadraticCurveTo(g.torso.halfWidthTop + 2, topY + 2, g.torso.halfWidthTop, topY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.jersey;
  ctx.beginPath();
  ctx.moveTo(-g.torso.halfWidthTop + 2, topY + 1);
  ctx.quadraticCurveTo(-g.torso.halfWidthTop, topY + 3, -g.torso.halfWidthTop + 2, topY + 9);
  ctx.lineTo(-g.torso.halfWidthBottom + 1.5, bottomY - 3);
  ctx.quadraticCurveTo(0, bottomY - 1, g.torso.halfWidthBottom - 1.5, bottomY - 3);
  ctx.lineTo(g.torso.halfWidthTop - 2, topY + 9);
  ctx.quadraticCurveTo(g.torso.halfWidthTop, topY + 3, g.torso.halfWidthTop - 2, topY + 1);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.cream;
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(-4, -14);
  ctx.lineTo(9, 11);
  ctx.lineTo(3, 12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = colors.mint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -7);
  ctx.quadraticCurveTo(-11, 0, -12, 9);
  ctx.moveTo(14, -7);
  ctx.quadraticCurveTo(11, 0, 12, 9);
  ctx.stroke();

  ctx.fillStyle = animationPose.charge > 0 ? colors.charge : colors.mint;
  ctx.beginPath();
  ctx.arc(9, -4, 3.2 + animationPose.charge * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHead(ctx, anchor, expression, player, pose, animationPose) {
  const radius = g.head.radius;
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(animationPose.headRotation || (expression === 'HURT' ? -0.25 : pose === 'HEADING' ? 0.22 : expression === 'EFFORT' ? 0.03 : 0));

  // Neck and jaw sit over the jersey, under the swept hair.
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.roundRect(-6, radius - 3, 12, 12, 4);
  ctx.fill();
  ctx.fillStyle = colors.skin;
  ctx.beginPath();
  ctx.roundRect(-4.8, radius - 2, 9.6, 10, 3);
  ctx.fill();

  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius + 1.6, radius + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = expression === 'HURT' ? '#D99173' : colors.skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius - 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Three broad swept locks and a slim sweatband create the player silhouette.
  ctx.fillStyle = colors.outline;
  ctx.beginPath();
  ctx.moveTo(-15, -5);
  ctx.quadraticCurveTo(-20, -18, -10, -23);
  ctx.quadraticCurveTo(-5, -30, 2, -22);
  ctx.quadraticCurveTo(10, -29, 16, -19);
  ctx.quadraticCurveTo(19, -10, 15, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.hair;
  ctx.beginPath();
  ctx.moveTo(-14, -7);
  ctx.quadraticCurveTo(-17, -17, -9, -21);
  ctx.quadraticCurveTo(-4, -27, 2, -20);
  ctx.quadraticCurveTo(10, -26, 14, -18);
  ctx.quadraticCurveTo(17, -11, 14, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.hairHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -20);
  ctx.quadraticCurveTo(-2, -24, 2, -19);
  ctx.stroke();

  ctx.fillStyle = colors.mint;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.structural;
  ctx.beginPath();
  ctx.roundRect(-15, -11, 30, 5, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-13, -8);
  ctx.quadraticCurveTo(-23, -7, -25, -1);
  ctx.lineTo(-21, 1);
  ctx.quadraticCurveTo(-16, -3 + animationPose.headbandSwing, -12, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const hurt = expression === 'HURT';
  const effort = expression === 'EFFORT';
  const charging = expression === 'CHARGING';
  const eyeY = -1;
  const eyeHeight = hurt ? 1.5 : Math.max(0.45, 3.2 * (1 - (animationPose.blink || 0)));
  ctx.fillStyle = colors.outline;
  for (const x of [-6, 6]) {
    ctx.beginPath();
    ctx.ellipse(x, eyeY, hurt ? 3 : 3.8, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      ctx.fillStyle = colors.white;
      ctx.beginPath();
      ctx.arc(x + 0.8 + animationPose.gazeX, eyeY, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.outline;
      ctx.beginPath();
      ctx.arc(x + 1.6 + animationPose.gazeX, eyeY + 0.3, 1.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = colors.hair;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (hurt) {
    ctx.moveTo(-10, -6); ctx.lineTo(-3, -4);
    ctx.moveTo(3, -4); ctx.lineTo(10, -6);
  } else if (effort || charging) {
    ctx.moveTo(-10, -6); ctx.lineTo(-3, -8);
    ctx.moveTo(3, -8); ctx.lineTo(10, -6);
  } else {
    ctx.moveTo(-10, -5); ctx.lineTo(-3, -6);
    ctx.moveTo(3, -6); ctx.lineTo(10, -5);
  }
  ctx.stroke();

  ctx.fillStyle = colors.skinShade;
  ctx.beginPath();
  ctx.arc(1, 3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = line.facial;
  ctx.beginPath();
  if (hurt) {
    ctx.moveTo(-3, 8); ctx.quadraticCurveTo(1, 4, 6, 8);
  } else if (effort) {
    ctx.ellipse(2, 8, 3, 4, 0, 0, Math.PI * 2);
  } else if (charging) {
    ctx.moveTo(-2, 8); ctx.quadraticCurveTo(2, 10, 6, 7);
  } else {
    ctx.moveTo(-4, 7); ctx.quadraticCurveTo(1, 12, 7, 7);
  }
  ctx.stroke();

  if (hurt) {
    ctx.fillStyle = colors.charge;
    ctx.beginPath();
    ctx.arc(14, -18, 2.8, 0, Math.PI * 2);
    ctx.arc(18, -13, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (player.powerCharging && !hurt) {
    ctx.strokeStyle = colors.charge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3 + player.powerCharge * 1.5, -2.3, -0.7);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlayerCharacter(ctx, player, combo = 1) {
  const animationPose = player.animation.pose(player);
  if (player.invulnerabilityTimer > 0 && Math.floor(player.animation.elapsed / 0.07) % 2 === 0) return;

  const visual = getPlayerVisualState(player);
  const a = animationPose;
  const squash = Number.isFinite(player.squashY) ? player.squashY : 1;

  ctx.save();
  ctx.translate(a.root.x, a.root.y);
  ctx.scale(a.facing, squash);

  const speed = Number.isFinite(player.vx) ? Math.abs(player.vx) : 0;
  const shadowX = Math.min(29, g.shadowRadiusX + speed * 0.008);
  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  ctx.ellipse(0, g.shadowY, shadowX, g.shadowRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rear arm, legs and footwear stay behind the jersey silhouette.
  drawArm(ctx, a.shoulderBack, a.elbowBack, a.wristBack, false, player);
  drawLegs(ctx, a);
  drawTorso(ctx, a.torso, visual, player, combo, a.torsoLean, animationPose);
  drawHead(ctx, a.head, visual.expression, player, visual.pose, animationPose);
  drawArm(ctx, a.shoulderFront, a.elbowFront, a.wristFront, true, player);

  ctx.restore();
}
