/**
 * Live Animated 2nd-Story Window-Dwelling Neighbor Kevin NPC
 * Features responsive projectile throwing attacks, emotional voice integration,
 * dynamic pitching animations, multi-line auto-wrapped speech bubbles, emotion-styled borders,
 * per-category cooldowns, and post-bonk 3D elliptical dizzy stars.
 */

import { sounds } from './audio.js';
import { drawKevinCharacter } from './kevin_renderer.js';

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
    drawKevinCharacter(ctx, this);
  }
}
