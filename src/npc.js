/**
 * Live Animated 2nd-Story Window-Dwelling Neighbor Kevin NPC
 * Features responsive projectile throwing attacks, emotional voice integration,
 * dynamic pitching animations, multi-line auto-wrapped speech bubbles, emotion-styled borders,
 * per-category cooldowns, and post-bonk 3D elliptical dizzy stars.
 */

import { sounds } from './audio.js';

export class NeighborKevinNPC {
  constructor(x = 790, y = 110) {
    this.x = x;
    this.y = y;
    this.state = 'PEEKING_INSIDE'; // 'PEEKING_INSIDE', 'LEANING_OUT_RAGE', 'THROWING_PROJECTILE', 'DIZZY_BONK', 'REPAIRING'
    this.stateTimer = 0;
    this.facing = -1;
    this.fistShakeAngle = 0;
    this.pitchArmAngle = 0;
    this.rageMeter = 0; // 0 to 100%
    this.throwTimer = 1.8;
    this.dizzyAngle = 0;
    this.stars = [];
    this.dialogue = '';
    this.dialogueEmotion = 'RAGE';
    this.dialogueTimer = 0;
    this.dialogueDuration = 4.2;
    this.bubbleScale = 0;
    this.visible = true;
    this.onThrowCallback = null;
    this.calmTimer = 0;
    this.repairTimer = 0;

    // Per-Category Cooldown Timers (ms timestamps)
    this.lastDialogueTimestamps = {
      HEADSHOT: 0,
      WINDOW: 0,
      GREENHOUSE: 0,
      GRILL: 0,
      GARDEN: 0,
      RAMPAGE: 0,
      DEFAULT: 0
    };
    this.cooldownDurations = {
      HEADSHOT: 0,    // Always immediate
      RAMPAGE: 1800,
      WINDOW: 3500,
      GREENHOUSE: 3500,
      GRILL: 3000,
      GARDEN: 4500,
      DEFAULT: 5000
    };
  }

  onThrow(callback) {
    this.onThrowCallback = callback;
  }

  takeDirectHit(impactVel = { x: 0, y: 0 }) {
    this.state = 'DIZZY_BONK';
    this.stateTimer = 4.0;
    this.rageMeter = 100;
    this.calmTimer = 0;
    this.dizzyAngle = 0;

    this.stars = [
      { angle: 0, dist: 22, size: 7, color: '#facc15' },
      { angle: (Math.PI * 2) / 3, dist: 22, size: 8, color: '#38bdf8' },
      { angle: (Math.PI * 4) / 3, dist: 22, size: 7, color: '#f43f5e' }
    ];

    const lines = [
      "OWWW! Right in my nose! You will pay for this medical bill!",
      "MY GLASSES! I'm calling the police and your mother right now!",
      "THAT DOES IT! Take this flowerpot straight to the dome!"
    ];
    const pickedLine = lines[Math.floor(Math.random() * lines.length)];
    this.dialogue = pickedLine;
    this.dialogueEmotion = 'RAGE';
    this.dialogueTimer = this.dialogueDuration;
    this.bubbleScale = 0;

    // Priority 0 = Critical Interrupt
    sounds.speakKevinVoice(pickedLine, 'RAGE', 0);
    sounds.playGnomeBonk();
  }

  triggerRage(dialogueText = '', emotion = 'RAGE', priority = 2, category = 'DEFAULT') {
    if (this.state === 'DIZZY_BONK' && priority > 0) return;

    const now = Date.now();
    const cooldown = this.cooldownDurations[category] || this.cooldownDurations.DEFAULT;
    const lastTime = this.lastDialogueTimestamps[category] || 0;

    // Headshots and high priority bypass normal cooldowns
    if (priority > 0 && (now - lastTime < cooldown)) return;
    this.lastDialogueTimestamps[category] = now;

    this.rageMeter = Math.min(100, this.rageMeter + (priority <= 1 ? 55 : 35));
    this.calmTimer = 0;
    this.dialogue = dialogueText || "HEY! Watch the windows, you delinquent!";
    this.dialogueEmotion = emotion;
    this.dialogueTimer = this.dialogueDuration;
    this.bubbleScale = 0;
    this.state = 'LEANING_OUT_RAGE';
    this.stateTimer = 4.0;

    sounds.speakKevinVoice(this.dialogue, emotion, priority);
  }

  update(dt, playerX, particles, allowAttacks = true) {
    this.facing = playerX < this.x ? -1 : 1;

    // Smooth spring bounce-in for speech bubble
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      this.bubbleScale = Math.min(1.0, this.bubbleScale + dt * 7.5);
    } else {
      this.bubbleScale = 0;
      this.dialogue = '';
    }

    // Rage decay after calm period
    this.calmTimer += dt;
    if (this.calmTimer > 6.0 && this.rageMeter > 0 && this.state !== 'DIZZY_BONK') {
      const oldRage = this.rageMeter;
      this.rageMeter = Math.max(0, this.rageMeter - dt * 3.5);

      // Trigger brief windowsill cleaning animation when fully cooled down
      if (oldRage > 0 && this.rageMeter === 0) {
        this.state = 'REPAIRING';
        this.repairTimer = 2.0;
      }
    }

    if (this.state === 'REPAIRING') {
      this.repairTimer -= dt;
      if (this.repairTimer <= 0) {
        this.state = 'PEEKING_INSIDE';
      }
    }

    // Responsive projectile throwing when rage >= 35%
    if (allowAttacks && this.rageMeter >= 35 && this.state !== 'DIZZY_BONK' && this.state !== 'REPAIRING') {
      this.throwTimer -= dt;
      const currentInterval = this.rageMeter >= 75 ? 1.4 : (this.rageMeter >= 50 ? 2.1 : 2.8);

      if (this.throwTimer <= 0) {
        this.throwTimer = currentInterval;
        this.executeThrow(playerX);
      }
    }

    // State machine updates
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;

      if (this.state === 'DIZZY_BONK') {
        this.dizzyAngle += dt * 7;
        for (let i = 0; i < this.stars.length; i++) {
          this.stars[i].angle += dt * 5.5;
        }
        if (this.stateTimer <= 0) {
          this.state = 'LEANING_OUT_RAGE';
          this.stateTimer = 3.5;
        }
      } else if (this.state === 'LEANING_OUT_RAGE') {
        this.fistShakeAngle = Math.sin(Date.now() * 0.025) * 0.45;

        // Puff steam from ears when furious (rage >= 60%)
        if (this.rageMeter >= 60 && particles && Math.random() < 0.25) {
          particles.spawnDust(this.x - 14, this.y - 30, 2);
          particles.spawnDust(this.x + 14, this.y - 30, 2);
        }

        if (this.stateTimer <= 0) {
          this.state = this.rageMeter >= 35 ? 'LEANING_OUT_RAGE' : 'PEEKING_INSIDE';
          this.fistShakeAngle = 0;
        }
      } else if (this.state === 'THROWING_PROJECTILE') {
        this.pitchArmAngle = Math.sin(Date.now() * 0.035) * 1.8;
        if (this.stateTimer <= 0) {
          this.state = 'LEANING_OUT_RAGE';
          this.stateTimer = 2.0;
        }
      }
    } else if (this.rageMeter >= 35 && this.state !== 'REPAIRING') {
      this.state = 'LEANING_OUT_RAGE';
      this.stateTimer = 3.0;
    } else if (this.state !== 'REPAIRING') {
      this.state = 'PEEKING_INSIDE';
      this.fistShakeAngle = 0;
    }
  }

  resetRunState() {
    this.state = 'PEEKING_INSIDE';
    this.stateTimer = 0;
    this.facing = -1;
    this.fistShakeAngle = 0;
    this.pitchArmAngle = 0;
    this.rageMeter = 0;
    this.throwTimer = 1.8;
    this.dizzyAngle = 0;
    this.stars = [];
    this.dialogue = '';
    this.dialogueEmotion = 'RAGE';
    this.dialogueTimer = 0;
    this.bubbleScale = 0;
    this.calmTimer = 0;
    this.repairTimer = 0;
    Object.keys(this.lastDialogueTimestamps).forEach((category) => {
      this.lastDialogueTimestamps[category] = 0;
    });
  }

  executeThrow(targetX) {
    this.state = 'THROWING_PROJECTILE';
    this.stateTimer = 0.65;
    sounds.playThrowWhoosh();

    const lines = [
      "DODGE THIS, YOU MENACE!",
      "HAVE A FLOWERPOT, DELINQUENT!",
      "GET OFF MY LAWN!",
      "EAT HEAVY POTTERY, PUNK!",
      "RETURN TO SENDER THIS STEEL WRENCH!"
    ];
    const shout = lines[Math.floor(Math.random() * lines.length)];
    this.dialogue = shout;
    this.dialogueEmotion = 'RAGE';
    this.dialogueTimer = 2.4;
    this.bubbleScale = 0;

    sounds.speakKevinVoice(shout, 'RAGE', 2);

    if (this.onThrowCallback) {
      this.onThrowCallback({
        x: this.x + this.facing * 10,
        y: this.y + 12,
        targetX: targetX
      });
    }
  }

  draw(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Live Rage Meter Bar above Window
    this.drawRageMeter(ctx);

    const isLeaning = this.state === 'LEANING_OUT_RAGE' || this.state === 'THROWING_PROJECTILE' || this.state === 'DIZZY_BONK';
    const isDizzy = this.state === 'DIZZY_BONK';
    const isThrowing = this.state === 'THROWING_PROJECTILE';
    const isRepairing = this.state === 'REPAIRING';

    // 2. 2nd-Story Window Frame & Open Wooden Shutters
    this.drawWindowFrameAndShutters(ctx, isLeaning || isRepairing);

    // 3. Neighbor Kevin Body inside / leaning out
    ctx.save();
    ctx.scale(this.facing, 1);

    if (isRepairing) {
      // Dusting / wiping windowsill animation
      const wipeX = Math.sin(Date.now() * 0.01) * 12;
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Yellow dusting rag
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wipeX - 6, 16, 12, 8);
    } else if (isLeaning) {
      ctx.save();
      if (isDizzy) {
        ctx.rotate(Math.sin(this.dizzyAngle) * 0.22);
      }

      // Torso with Flannel Collar & Buttons
      ctx.fillStyle = this.rageMeter >= 70 ? '#dc2626' : '#1e3a8a';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-16, -10, 32, 24, 4);
      ctx.fill();
      ctx.stroke();

      // White Undershirt Collar V-neck
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(0, -3);
      ctx.lineTo(6, -10);
      ctx.closePath();
      ctx.fill();

      // Balding Head Cranium with Liver Spots
      ctx.fillStyle = isDizzy ? '#fca5a5' : (this.rageMeter >= 50 ? '#f87171' : '#fed7aa');
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Liver Spots on Balding Cranium
      ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
      ctx.beginPath();
      ctx.arc(-4, -31, 1.2, 0, Math.PI * 2);
      ctx.arc(2, -33, 1.4, 0, Math.PI * 2);
      ctx.arc(6, -30, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Furrowed Forehead Wrinkles
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -29);
      ctx.lineTo(5, -29);
      ctx.moveTo(-7, -27);
      ctx.lineTo(7, -27);
      ctx.stroke();

      // Wispy Gray Sideburns
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-14, -20, 4.5, 0, Math.PI * 2);
      ctx.arc(14, -20, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isDizzy) {
        // Swollen Throbbing Bump on Head with Cross Bandage
        const bumpThrobbing = 7 + Math.sin(Date.now() * 0.015) * 1.5;
        ctx.fillStyle = '#f87171';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(6, -36, bumpThrobbing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White Cross Bandage
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -38, 8, 3);
        ctx.fillRect(4.5, -41, 3, 8);

        // X_X Dizzy Eyes
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Left Eye X
        ctx.moveTo(-7, -22); ctx.lineTo(-3, -18);
        ctx.moveTo(-3, -22); ctx.lineTo(-7, -18);
        // Right Eye X
        ctx.moveTo(3, -22); ctx.lineTo(7, -18);
        ctx.moveTo(7, -22); ctx.lineTo(3, -18);
        ctx.stroke();

        // Woozy Drooping Mouth
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -9, 4, Math.PI + 0.3, -0.3);
        ctx.stroke();
      } else {
        // Bushy Gray Angled Eyebrows
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -28);
        ctx.lineTo(-2, -24);
        ctx.lineTo(-2, -27);
        ctx.lineTo(-12, -31);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(12, -28);
        ctx.lineTo(2, -24);
        ctx.lineTo(2, -27);
        ctx.lineTo(12, -31);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Round Tortoiseshell Spectacles with Specular Glass Glint
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-5, -20, 5, 0, Math.PI * 2);
        ctx.arc(5, -20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bridge of Glasses
        ctx.beginPath();
        ctx.moveTo(-1, -20);
        ctx.lineTo(1, -20);
        ctx.stroke();

        // Glint Reflection on Lenses
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-6.5, -22, 1.2, 0, Math.PI * 2);
        ctx.arc(3.5, -22, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Angry Beady Pupils
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-5, -20, 1.8, 0, Math.PI * 2);
        ctx.arc(5, -20, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Cartoon Bulbous Red Schnoz
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -17, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Wide Screaming Rage Mouth with Tongue & Teeth
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -10, 6.5, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // White Top Teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4.5, -10, 9, 2.8);
      }

      ctx.restore();

      // Dynamic Arm Actions (Overhand Pitching vs Shaking Fists vs Slumped)
      if (isDizzy) {
        // Slumped noodle arm over window sill
        ctx.save();
        ctx.translate(8, 2);
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(0, 0, 8, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(4, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (isThrowing) {
        // Realistic 3-Stage Overhand Pitching Arm Rig
        ctx.save();
        ctx.translate(14, -10);
        ctx.rotate(this.pitchArmAngle);
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(0, -5, 20, 9, 3);
        ctx.fill();
        ctx.stroke();

        // Forearm & Hand holding projectile (Clay Pot)
        ctx.fillStyle = '#c2410c'; // Clay Terracotta Pot
        ctx.strokeStyle = '#7c2d12';
        ctx.beginPath();
        ctx.moveTo(20, -8);
        ctx.lineTo(32, -12);
        ctx.lineTo(34, 4);
        ctx.lineTo(20, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // Furious Dual-Fist Shaking with Knobby Knuckles
        ctx.save();
        ctx.translate(15, -4);
        ctx.rotate(this.fistShakeAngle);
        ctx.fillStyle = this.rageMeter >= 70 ? '#dc2626' : '#1e3a8a';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(0, -4.5, 15, 8, 3);
        ctx.fill();
        ctx.stroke();

        // Knobby Clenched Fist
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(17, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(-15, -4);
        ctx.rotate(-this.fistShakeAngle);
        ctx.fillStyle = this.rageMeter >= 70 ? '#dc2626' : '#1e3a8a';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-15, -4.5, 15, 8, 3);
        ctx.fill();
        ctx.stroke();

        // Knobby Clenched Fist
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(-17, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 3D Elliptical Dizzy Stars
      if (isDizzy) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < this.stars.length; i++) {
          const s = this.stars[i];
          const sx = Math.cos(s.angle) * s.dist;
          const sy = -38 + Math.sin(s.angle) * 8; // 3D ellipse height
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else {
      // Peeking Silhouette inside the window with gentle idle breathing
      const breathBob = Math.sin(Date.now() * 0.003) * 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.arc(0, -10 + breathBob, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-12, 2 + breathBob, 24, 16, 4);
      ctx.fill();

      // Peeking Eyes
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-4, -10 + breathBob, 2, 0, Math.PI * 2);
      ctx.arc(4, -10 + breathBob, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();

    // 4. Comic Speech Bubble with spring bounce-in, emotion border, and word wrap
    if (this.dialogueTimer > 0 && this.dialogue && this.bubbleScale > 0.05) {
      this.drawSpeechBubble(ctx, this.x, this.y - 58, this.dialogue, this.dialogueEmotion);
    }
  }

  drawWindowFrameAndShutters(ctx, isOpen) {
    const w = 56;
    const h = 52;

    ctx.fillStyle = isOpen ? '#0f172a' : 'rgba(56, 189, 248, 0.65)';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Warm Interior Curtains
    if (!isOpen) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    }

    // Timber Windowsill
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-w / 2 - 4, h / 2 - 4, w + 8, 8);
    ctx.strokeRect(-w / 2 - 4, h / 2 - 4, w + 8, 8);

    // Wooden Shutters with Slat Shadows
    ctx.fillStyle = '#d97706';
    if (isOpen) {
      ctx.fillRect(-w / 2 - 18, -h / 2, 16, h);
      ctx.strokeRect(-w / 2 - 18, -h / 2, 16, h);
      ctx.fillRect(w / 2 + 2, -h / 2, 16, h);
      ctx.strokeRect(w / 2 + 2, -h / 2, 16, h);
    } else {
      ctx.fillRect(-w / 2 - 10, -h / 2, 10, h);
      ctx.strokeRect(-w / 2 - 10, -h / 2, 10, h);
      ctx.fillRect(w / 2, -h / 2, 10, h);
      ctx.strokeRect(w / 2, -h / 2, 10, h);
    }
  }

  drawRageMeter(ctx) {
    const barW = 48;
    const barH = 5;
    const x = -barW / 2;
    const y = -40;

    if (this.rageMeter < 10) return;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);

    const fillPercent = Math.min(100, Math.max(5, this.rageMeter)) / 100;
    const rageGrad = ctx.createLinearGradient(x, 0, x + barW, 0);
    rageGrad.addColorStop(0, '#facc15');
    rageGrad.addColorStop(0.5, '#f97316');
    rageGrad.addColorStop(1, '#ef4444');

    ctx.fillStyle = rageGrad;
    ctx.fillRect(x, y, barW * fillPercent, barH);
    ctx.restore();
  }

  drawSpeechBubble(ctx, x, y, text, emotion) {
    ctx.save();

    // Fade-out on last 0.5s of dialogue
    const fadeAlpha = this.dialogueTimer < 0.5 ? Math.max(0, this.dialogueTimer / 0.5) : 1.0;
    ctx.globalAlpha = fadeAlpha * this.bubbleScale;

    // RAGE shake offset
    let shakeX = 0;
    if (emotion === 'RAGE' && this.rageMeter >= 50) {
      shakeX = Math.sin(Date.now() * 0.04) * 2;
    }

    ctx.translate(x + shakeX, y);
    ctx.scale(this.bubbleScale, this.bubbleScale);

    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word Wrap text using ctx.measureText (max line width 240px)
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxTextWidth = 240;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine.length === 0 ? words[i] : `${currentLine} ${words[i]}`;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxTextWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    const paddingX = 14;
    const lineHeight = 16;
    const boxH = Math.max(34, lines.length * lineHeight + 14);
    let maxLineW = 0;
    lines.forEach(l => {
      maxLineW = Math.max(maxLineW, ctx.measureText(l).width);
    });
    const boxW = Math.min(270, Math.max(60, maxLineW + paddingX * 2));

    // Emotion border color
    let borderColor = '#0f172a';
    if (emotion === 'RAGE') borderColor = '#ef4444';
    else if (emotion === 'CRYING' || emotion === 'DESPAIRING') borderColor = '#38bdf8';
    else if (emotion === 'PANIC') borderColor = '#facc15';
    else if (emotion === 'SARCASTIC') borderColor = '#94a3b8';

    // Bubble Body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Tail pointing down to Kevin's window
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Render multi-line text
    ctx.fillStyle = '#0f172a';
    const startY = -boxH + 12 + (boxH - lines.length * lineHeight) / 2;
    lines.forEach((l, idx) => {
      ctx.fillText(l, 0, startY + idx * lineHeight);
    });

    ctx.restore();
  }
}
