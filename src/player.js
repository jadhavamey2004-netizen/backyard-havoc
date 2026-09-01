/**
 * Street Footballer Player Model for Backyard Havoc
 * Features dual animated arms, 3-pose kick follow-through sequence, sprint forward-lean,
 * landing squash & stretch, dynamic drop-shadow, Power Shot charging states, and invulnerability flashing.
 */

export class Player {
  constructor(x = 340, y = 485) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.vx = 0;
    this.speed = 480;
    this.facing = 1;
    this.state = 'IDLE'; // 'IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT'
    this.kickTimer = 0;
    this.kickDuration = 0.24;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;

    // Power Shot Charging (Spacebar)
    this.powerCharging = false;
    this.powerCharge = 0; // 0 to 1.0

    // Squash & Stretch
    this.squashY = 1.0;
    this.squashTimer = 0;

    // Health & Survival Mechanics
    this.health = 3;
    this.maxHealth = 3;
    this.invulnerabilityTimer = 0;
    this.hurtTimer = 0;

    // Movement Key States
    this.keys = {
      left: false,
      right: false,
      sprint: false,
      charge: false
    };

    this.targetX = null;
    this.runCycle = 0;
    this.dustTimer = 0;
    this.idleTime = 0;
  }

  takeDamage(amount = 1) {
    if (this.invulnerabilityTimer > 0 || this.health <= 0) return false;

    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = 1.2; // 1.2s invulnerability window
    this.hurtTimer = 0.35;
    this.state = 'HURT';
    return true;
  }

  isDead() {
    return this.health <= 0;
  }

  handleKeyDown(code) {
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.keys.left = true;
    } else if (code === 'KeyD' || code === 'ArrowRight') {
      this.keys.right = true;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.keys.sprint = true;
    }
  }

  handleKeyUp(code) {
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.keys.left = false;
    } else if (code === 'KeyD' || code === 'ArrowRight') {
      this.keys.right = false;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.keys.sprint = false;
    }
  }


  triggerKick() {
    this.state = 'KICKING';
    this.kickDuration = 0.38;
    this.kickTimer = 0.38;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;
  }

  triggerHeader() {
    this.state = 'HEADING';
    this.kickDuration = 0.38;
    this.kickTimer = 0.38;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;
  }

  triggerSquash(amount = 0.75) {
    this.squashY = amount;
    this.squashTimer = 0.12;
  }

  update(dt, boundsWidth = 960, particles = null, combo = 1) {
    this.idleTime += dt;

    // Squash decay
    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
      this.squashY += (1.0 - this.squashY) * dt * 16;
    } else {
      this.squashY = 1.0;
    }

    // Invulnerability cooldown
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0 && this.state === 'HURT') {
        this.state = 'IDLE';
      }
    }

    let moveDir = 0;

    if (this.keys.left && !this.keys.right) {
      moveDir = -1;
      this.facing = -1;
    } else if (this.keys.right && !this.keys.left) {
      moveDir = 1;
      this.facing = 1;
    }

    if (moveDir !== 0) {
      const sprintMultiplier = this.keys.sprint ? 1.6 : 1.0;
      this.vx = moveDir * this.speed * sprintMultiplier;
      if (this.state !== 'KICKING' && this.state !== 'HEADING' && this.state !== 'HURT') {
        this.state = 'RUNNING';
        this.runCycle += dt * (this.keys.sprint ? 24 : 16);

        this.dustTimer += dt;
        if (this.dustTimer > (this.keys.sprint ? 0.05 : 0.09) && particles) {
          this.dustTimer = 0;
          const dustX = this.x - this.facing * 16;
          particles.spawnDust(dustX, this.y + 4, this.keys.sprint ? 3 : 2);
        }
      }
    } else {
      this.vx = 0;
      if (this.state !== 'KICKING' && this.state !== 'HEADING' && this.state !== 'HURT') {
        this.state = 'IDLE';
        this.runCycle = 0;
      }
    }

    this.x += this.vx * dt;

    if (this.state === 'KICKING' || this.state === 'HEADING') {
      this.kickTimer -= dt;
      this.kickProgress = 1 - Math.max(0, this.kickTimer / this.kickDuration);

      if (this.kickTimer <= 0) {
        this.state = moveDir !== 0 ? 'RUNNING' : 'IDLE';
        this.kickProgress = 0;
      }
    }
  }

  getKickPosition() {
    const forwardOffset = this.facing * 32;
    const verticalOffset = -22;
    return {
      x: this.x + forwardOffset,
      y: this.y + verticalOffset
    };
  }

  getHeaderPosition() {
    return {
      x: this.x + this.facing * 10,
      y: this.y - 70
    };
  }

  canKickBall(ballPos) {
    if ((this.state !== 'KICKING' && this.state !== 'HEADING') || this.hasHitBallThisKick) {
      return false;
    }
    const kickPos = this.state === 'HEADING' ? this.getHeaderPosition() : this.getKickPosition();
    const dx = ballPos.x - kickPos.x;
    const dy = ballPos.y - kickPos.y;
    const dist = Math.hypot(dx, dy);
    return dist < 95;
  }

  draw(ctx, combo = 1) {
    // Flashing effect during invulnerability
    if (this.invulnerabilityTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Dynamic drop shadow that stretches horizontally with velocity
    const shadowStretch = 22 + Math.min(16, Math.abs(this.vx) * 0.025);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, shadowStretch, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // High Combo Glow
    if (combo >= 4) {
      ctx.shadowBlur = Math.min(25, combo * 4);
      ctx.shadowColor = combo >= 8 ? '#ef4444' : '#facc15';
    }

    ctx.scale(this.facing, this.squashY);

    // Sprint lean-forward angle
    if (this.keys.sprint && this.state === 'RUNNING') {
      ctx.rotate(-0.16);
    }

    // Gentle idle breathing bob
    if (this.state === 'IDLE') {
      const breathBob = Math.sin(this.idleTime * 3) * 1.5;
      ctx.translate(0, breathBob);
    }

    // Back Arm (drawn behind torso)
    this.drawArm(ctx, -1);

    // Legs & Shorts
    this.drawLegsAndFeet(ctx);

    // Torso & Jersey
    this.drawTorsoAndJersey(ctx);

    // Head & Headband
      this.drawHeadAndFace(ctx);

    // Front Arm (drawn in front of torso)
    this.drawArm(ctx, 1);

    ctx.restore();
  }


  drawLegsAndFeet(ctx) {
    const isKicking = this.state === 'KICKING';
    const isRunning = this.state === 'RUNNING';

    let backLegAngle = 0;
    let frontThighAngle = 0;
    let frontShinAngle = 0;

    if (isRunning) {
      backLegAngle = Math.sin(this.runCycle) * 0.72;
      frontThighAngle = -Math.sin(this.runCycle) * 0.72;
      frontShinAngle = Math.max(0, Math.sin(this.runCycle) * 0.6);
    } else if (isKicking) {
      const p = this.kickProgress;
      // 4-Phase Dynamic Kicking Arc: Anticipation Chamber -> Explosive Snap -> Extension -> Recovery
      if (p < 0.25) {
        const windP = p / 0.25;
        frontThighAngle = -0.9 * windP;
        frontShinAngle = -1.3 * windP;
        backLegAngle = 0.3;
      } else if (p < 0.65) {
        const strikeP = (p - 0.25) / 0.40;
        frontThighAngle = -0.9 + strikeP * 2.3;
        frontShinAngle = -1.3 + strikeP * 1.6;
        backLegAngle = 0.35;
      } else {
        const recoveryP = (p - 0.65) / 0.35;
        frontThighAngle = 1.4 - recoveryP * 1.4;
        frontShinAngle = 0.3 - recoveryP * 0.3;
        backLegAngle = 0.15;
      }
    }

    // Athletic Shorts with Curved Contour & Gold Stripe
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-15, -34);
    ctx.lineTo(15, -34);
    ctx.quadraticCurveTo(16, -18, 12, -16);
    ctx.lineTo(-12, -16);
    ctx.quadraticCurveTo(-16, -18, -15, -34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold Athletic Side Stripe
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-15, -34, 30, 3.5);

    // Back Support Leg
    ctx.save();
    ctx.translate(-6, -16);
    ctx.rotate(backLegAngle);

    // Thigh & Calf Contour
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-4.5, 0, 9, 15, 3);
    ctx.fill();
    ctx.stroke();

    // Red Soccer Cleat (Back)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-5, 12);
    ctx.lineTo(10, 12);
    ctx.quadraticCurveTo(13, 15, 10, 18);
    ctx.lineTo(-5, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cleat Studs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3, 18, 3, 2.5);
    ctx.fillRect(5, 18, 3, 2.5);
    ctx.restore();

    // Front Kicking Leg (Articulated Organic 2-Joint Knee Rig)
    ctx.save();
    ctx.translate(6, -16);
    ctx.rotate(frontThighAngle);

    // Sculpted Thigh
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(4.5, 0);
    ctx.quadraticCurveTo(5.5, 6, 4, 11);
    ctx.lineTo(-4, 11);
    ctx.quadraticCurveTo(-5.5, 6, -4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Knee & Tapered Calf
    ctx.translate(0, 10);
    ctx.rotate(frontShinAngle);
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.quadraticCurveTo(4.5, 6, 3.5, 11);
    ctx.lineTo(-3.5, 11);
    ctx.quadraticCurveTo(-4.5, 6, -4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Soccer Cleat with Streamlined Speed Stripe
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-5, 9);
    ctx.lineTo(11, 9);
    ctx.quadraticCurveTo(16, 13, 12, 17);
    ctx.lineTo(-5, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold Swoosh / Speed Stripe on Cleat
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, 13);
    ctx.quadraticCurveTo(4, 14, 9, 11);
    ctx.stroke();

    // White Laces
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 10);
    ctx.lineTo(5, 10);
    ctx.moveTo(2, 12);
    ctx.lineTo(6, 12);
    ctx.stroke();

    // Cleat Studs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3, 17, 3, 2.5);
    ctx.fillRect(7, 17, 3, 2.5);

    ctx.restore();

    // Dynamic High-Velocity Kicking Wind Slash Arc
    if (isKicking && this.kickProgress >= 0.15 && this.kickProgress <= 0.85) {
      ctx.save();
      const alpha = Math.sin((this.kickProgress - 0.15) / 0.70 * Math.PI);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(8, -12, 42, -0.65, 0.95);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(8, -12, 38, -0.35, 0.8);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTorsoAndJersey(ctx) {
    const isKicking = this.state === 'KICKING';
    const isHurt = this.state === 'HURT';

    ctx.save();
    if (isKicking) {
      ctx.rotate(-0.22 * Math.sin(this.kickProgress * Math.PI));
    }

    const jerseyGrad = ctx.createLinearGradient(-15, -62, 15, -30);
    if (isHurt) {
      jerseyGrad.addColorStop(0, '#f87171');
      jerseyGrad.addColorStop(1, '#dc2626');
    } else if (this.powerCharging) {
      jerseyGrad.addColorStop(0, '#fed7aa');
      jerseyGrad.addColorStop(0.5, '#ea580c');
      jerseyGrad.addColorStop(1, '#c2410c');
    } else {
      jerseyGrad.addColorStop(0, '#fef08a');
      jerseyGrad.addColorStop(0.5, '#facc15');
      jerseyGrad.addColorStop(1, '#eab308');
    }

    // Contoured Athletic Jersey with Tapered Waist
    ctx.fillStyle = jerseyGrad;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-14, -62);
    ctx.lineTo(14, -62);
    ctx.quadraticCurveTo(16, -46, 13, -34);
    ctx.lineTo(-13, -34);
    ctx.quadraticCurveTo(-16, -46, -14, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cyan V-Neck Athletic Collar Trim
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(-7, -62);
    ctx.lineTo(0, -53);
    ctx.lineTo(7, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jersey Number #10 Crest
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10', 0, -45);
    ctx.restore();
  }

  drawHeadAndFace(ctx) {
    const isHeading = this.state === 'HEADING';
    const isHurt = this.state === 'HURT';
    const isKicking = this.state === 'KICKING';
    const isRunning = this.state === 'RUNNING';

    let headTilt = 0;
    let headOffsetY = -70;
    let headOffsetX = 0;

    if (isHeading) {
      headTilt = 0.35;
      headOffsetX = 6;
    } else if (isHurt) {
      headTilt = -0.3;
      headOffsetY = -66;
    } else if (isKicking) {
      // Dynamic kicking head motion: Lean back during windup, snap forward aggressively on follow-through!
      const kickPhase = this.kickProgress;
      if (kickPhase < 0.45) {
        headTilt = -0.35 * Math.sin((kickPhase / 0.45) * (Math.PI / 2)); // Windup back-lean
        headOffsetX = -5 * Math.sin((kickPhase / 0.45) * (Math.PI / 2));
      } else {
        const snap = (kickPhase - 0.45) / 0.55;
        headTilt = 0.30 * Math.sin(snap * Math.PI); // Forward follow-through snap
        headOffsetX = 6 * Math.sin(snap * Math.PI);
        headOffsetY = -68 + 2 * Math.sin(snap * Math.PI);
      }
    } else if (isRunning) {
      headTilt = Math.sin(this.runCycle * 2) * 0.08 + 0.05;
      headOffsetY = -70 + Math.abs(Math.sin(this.runCycle * 2)) * 2;
    }

    ctx.save();
    ctx.translate(headOffsetX, headOffsetY);
    ctx.rotate(headTilt);

    // Head / Skin with Shaded Jaw
    ctx.fillStyle = isHurt ? '#fca5a5' : '#fed7aa';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Layered Spiky Anime Hair (Base Dark Brown + Highlighted Tips)
    ctx.fillStyle = '#381d09';
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.quadraticCurveTo(-17, -16, -8, -20);
    ctx.lineTo(-4, -24);
    ctx.lineTo(2, -18);
    ctx.lineTo(8, -23);
    ctx.lineTo(13, -16);
    ctx.quadraticCurveTo(17, -8, 15, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hair Highlights
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-6, -18);
    ctx.lineTo(-3, -22);
    ctx.lineTo(1, -16);
    ctx.lineTo(6, -21);
    ctx.lineTo(10, -15);
    ctx.closePath();
    ctx.fill();

    // Red Headband Band
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-15, -6, 30, 7, 2);
    ctx.fill();
    ctx.stroke();

    // Fluttering Headband Ribbon Tails (Dynamic Secondary Motion)
    const ribbonWave1 = Math.sin(Date.now() * 0.008) * 4 - this.vx * 0.4;
    const ribbonWave2 = Math.cos(Date.now() * 0.008 + 1) * 3 - this.vx * 0.5;

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-14, -3);
    ctx.quadraticCurveTo(-22, -6 + ribbonWave1, -30, -3 + ribbonWave1);
    ctx.lineTo(-28, 2 + ribbonWave1);
    ctx.quadraticCurveTo(-20, 0 + ribbonWave1, -14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-13, -1);
    ctx.quadraticCurveTo(-20, 3 + ribbonWave2, -28, 7 + ribbonWave2);
    ctx.lineTo(-26, 12 + ribbonWave2);
    ctx.quadraticCurveTo(-18, 7 + ribbonWave2, -13, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isHurt) {
      // Cartoon Dizzy X Eye
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(3, -1); ctx.lineTo(9, 5);
      ctx.moveTo(9, -1); ctx.lineTo(3, 5);
      ctx.stroke();

      // Drooping dazed mouth
      ctx.beginPath();
      ctx.arc(6, 10, 4, Math.PI + 0.3, -0.3);
      ctx.stroke();

      // Orbiting Dizzy Yellow Stars
      const starTime = Date.now() * 0.006;
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      for (let s = 0; s < 3; s++) {
        const sa = starTime + (s * Math.PI * 2) / 3;
        const sx = Math.cos(sa) * 18;
        const sy = Math.sin(sa) * 7 - 16;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Expressive Eye (White Sclera + Dark Iris + Specular Shine)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(5, 2, 4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(6, 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlight Glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6.8, 1.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Determined Eyebrow
      ctx.strokeStyle = '#381d09';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.lineTo(9, 0);
      ctx.stroke();

      // Confident Street Grin / Grit
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.powerCharging) {
        ctx.moveTo(2, 7);
        ctx.lineTo(8, 7);
      } else {
        ctx.arc(4, 6, 4.5, 0.2, Math.PI - 0.2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  drawArm(ctx, side = 1) {
    const isRunning = this.state === 'RUNNING';
    const isKicking = this.state === 'KICKING';

    let armAngle = 0.15;
    if (isRunning) {
      armAngle = Math.sin(this.runCycle) * (side === 1 ? -0.75 : 0.75);
    } else if (isKicking) {
      armAngle = (side === 1 ? -0.9 : 0.6) * (1 - this.kickProgress);
    }

    ctx.save();
    ctx.translate(side * 8 - 1, -56);
    ctx.rotate(armAngle);

    // Athletic Arm & Bicep Contour
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-3.5, 0, 7, 16, 3);
    ctx.fill();
    ctx.stroke();

    // Red Athletic Wristband
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-3.5, 12, 7, 3);

    // Clenched Athletic Fist
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, 18, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
