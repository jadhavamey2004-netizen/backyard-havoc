/**
 * Street Footballer Player Model for Backyard Havoc
 * Features dual animated arms, 3-pose kick follow-through sequence, sprint forward-lean,
 * landing squash & stretch, dynamic drop-shadow, Power Shot charging states, and invulnerability flashing.
 */

import { GAMEPLAY_TUNING, getContactPhase } from './gameplay_rules.js';
import { GAMEPLAY_FEEL_TUNING, moveToward } from './gameplay_feel.js';
import { drawPlayerCharacter } from './player_renderer.js';
import { PlayerAnimationController } from './player_animation.js';

export class Player {
  constructor(x = 340, y = 485) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.vx = 0;
    this.speed = GAMEPLAY_FEEL_TUNING.PLAYER_MAX_SPEED;
    this.facing = 1;
    this.state = 'IDLE'; // 'IDLE', 'RUNNING', 'KICKING', 'HEADING', 'HURT'
    this.kickTimer = 0;
    this.kickDuration = GAMEPLAY_TUNING.KICK_ACTION_DURATION;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;

    // Power shot charging state is driven by the contextual pointer action.
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
    this.dustTimer = 0;
    this.animation = new PlayerAnimationController();
  }

  takeDamage(amount = 1) {
    if (this.invulnerabilityTimer > 0 || this.health <= 0) return false;

    this.health = Math.max(0, this.health - amount);
    this.invulnerabilityTimer = 1.2; // 1.2s invulnerability window
    this.hurtTimer = 0.35;
    this.state = 'HURT';
    this.animation.triggerHurt();
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
    this.kickDuration = GAMEPLAY_TUNING.KICK_ACTION_DURATION;
    this.kickTimer = GAMEPLAY_TUNING.KICK_ACTION_DURATION;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;
  }

  triggerHeader() {
    if (this.state !== 'KICKING' && this.state !== 'HEADING') this.triggerKick();
    this.state = 'HEADING';
  }

  triggerSquash(amount = 0.75) {
    this.squashY = amount;
    this.squashTimer = 0.12;
  }

  resetRunState(x = 340, y = 485) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.vx = 0;
    this.facing = 1;
    this.state = 'IDLE';
    this.kickTimer = 0;
    this.kickDuration = GAMEPLAY_TUNING.KICK_ACTION_DURATION;
    this.kickProgress = 0;
    this.hasHitBallThisKick = false;
    this.powerCharging = false;
    this.powerCharge = 0;
    this.squashY = 1;
    this.squashTimer = 0;
    this.health = this.maxHealth;
    this.invulnerabilityTimer = 0;
    this.hurtTimer = 0;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.keys.charge = false;
    this.targetX = null;
    this.dustTimer = 0;
    this.animation.reset();
  }

  update(dt, boundsWidth = 960, particles = null, combo = 1) {
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

    const previousVx = this.vx;
    const sprintMultiplier = this.keys.sprint ? GAMEPLAY_FEEL_TUNING.PLAYER_SPRINT_MULTIPLIER : 1;
    const targetVx = moveDir * this.speed * sprintMultiplier;
    const isReversing = targetVx !== 0 && previousVx * targetVx < 0;
    const isSlowing = targetVx === 0 || Math.abs(targetVx) < Math.abs(previousVx);
    const acceleration = isReversing
      ? GAMEPLAY_FEEL_TUNING.PLAYER_REVERSAL_ACCELERATION
      : (isSlowing ? GAMEPLAY_FEEL_TUNING.PLAYER_DECELERATION : GAMEPLAY_FEEL_TUNING.PLAYER_ACCELERATION);
    this.vx = moveToward(previousVx, targetVx, acceleration * dt);
    // Average endpoint velocity integrates the constant-acceleration step consistently
    // when the same elapsed time arrives in smaller browser updates.
    this.x += (previousVx + this.vx) * 0.5 * dt;

    if (this.state !== 'KICKING' && this.state !== 'HEADING' && this.state !== 'HURT') {
      if (Math.abs(this.vx) > 1) {
        this.state = 'RUNNING';
        if (moveDir !== 0) {
          this.dustTimer += dt;
          if (this.dustTimer > (this.keys.sprint ? 0.05 : 0.09) && particles) {
            this.dustTimer = 0;
            const dustX = this.x - this.facing * 16;
            particles.spawnDust(dustX, this.y + 4, this.keys.sprint ? 3 : 2);
          }
        }
      } else {
        this.state = 'IDLE';
      }
    }

    if (this.state === 'KICKING' || this.state === 'HEADING') {
      this.kickTimer -= dt;
      this.kickProgress = 1 - Math.max(0, this.kickTimer / this.kickDuration);

      if (this.kickTimer <= 1e-9) {
        this.state = Math.abs(this.vx) > 1 ? 'RUNNING' : 'IDLE';
        this.kickProgress = 0;
      }
    }

    this.animation.update(dt, this);
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

  getContactCandidate(ballPos) {
    if ((this.state !== 'KICKING' && this.state !== 'HEADING')
      || this.hasHitBallThisKick || !getContactPhase(this.kickProgress)) return null;

    const head = this.getHeaderPosition();
    if (Math.hypot(ballPos.x - head.x, ballPos.y - head.y) <= GAMEPLAY_TUNING.HEADER_CONTACT_RADIUS) {
      return 'HEADER';
    }

    const foot = this.getKickPosition();
    if (Math.hypot(ballPos.x - foot.x, ballPos.y - foot.y) <= GAMEPLAY_TUNING.FOOT_CONTACT_RADIUS) {
      return 'KICK';
    }
    return null;
  }

  consumeKickContact() {
    if (this.hasHitBallThisKick) return false;
    this.hasHitBallThisKick = true;
    return true;
  }

  canKickBall(ballPos) {
    return this.getContactCandidate(ballPos) !== null;
  }

  draw(ctx, combo = 1) {
    drawPlayerCharacter(ctx, this, combo);
  }
}
