/**
 * Core GameEngine for Backyard Havoc
 * Features 240Hz physics sub-stepping, 2nd-story window reach, contextual power shots,
 * Trick Chain Cascades, Trampoline Mega-Launches, Ball Speed Power Bars, Chromatic Trauma,
 * High-Visibility Projectile Parries, and Metagame Progression.
 */

import Matter from 'matter-js';
import { CameraTrauma } from './camera.js';
import { ParticleSystem } from './particles.js';
import { MapRenderer } from './map_renderer.js';
import { Player } from './player.js';
import { NeighborKevinNPC } from './npc.js';
import { ProceduralWorld } from './procedural_world.js';
import { COLLISION_CATEGORIES } from './destructibles.js';
import { breakObjectIntoFragments, createResidueRecord } from './destruction_system.js';
import { getMaterialProfile } from './destruction_materials.js';
import { calculateSubStepDt } from './physics.js';
import { clampBallVelocity, computeBallContactResponse, GAMEPLAY_FEEL_TUNING } from './gameplay_feel.js';
import { sounds } from './audio.js';
import { aiService } from './ai.js';
import { KevinDirector } from './kevin_director.js';
import { HavocSystem, computeHavocScoreBonus } from './havoc_system.js';
import {
  GAMEPLAY_TUNING,
  classifyDefense,
  getPowerCharge,
  getProjectileThreat,
  selectEarliestThreat
} from './gameplay_rules.js';

const { Engine, Bodies, Body, Composite, Events } = Matter;
const FIXED_STEP_SECONDS = 1 / 60;
const MAX_PHYSICS_TICKS_PER_UPDATE = 3;
const MAX_SIMULATION_DT = FIXED_STEP_SECONDS * MAX_PHYSICS_TICKS_PER_UPDATE;

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 960;
    this.height = 540;

    // Sub-stepping setup (60Hz / 4 = 240Hz physics)
    this.nSub = 4;
    this.dt = FIXED_STEP_SECONDS;
    this.subDt = calculateSubStepDt(this.dt, this.nSub);

    // Systems
    this.camera = new CameraTrauma(1.0, 20, 0.05, 20);
    this.particles = new ParticleSystem(400);
    this.mapRenderer = new MapRenderer(this.width, this.height, 960);
    this.player = new Player(340, this.height - 55);
    this.npc = new NeighborKevinNPC(790, 110);
    this.kevinDirector = new KevinDirector();
    this.havocSystem = new HavocSystem();

    // Thrown Projectiles Array & Physics Shards
    this.thrownProjectiles = [];
    this.activeShards = [];
    this.accumulator = 0;

    // Dynamic Ball Squash & Stretch Deformation Physics
    this.ballDeform = {
      scaleX: 1.0,
      scaleY: 1.0,
      angle: 0
    };
    this.ballFeedbackTier = 'NORMAL';
    this.ballFeedbackStrength = 0;

    // Mouse Aim Tracking in Screen Space
    this.mouseScreenPos = { x: this.width * 0.5, y: 160 };

    // Game State
    this.isGameOver = false;
    this.pageVisible = true;
    this.ignoreNextPointerUp = false;
    this.survivalSeconds = 0;
    this.combo = 1;
    this.peakCombo = 1;
    this.ballGroundedDuration = 0;
    this.pendingPrimaryAction = null;
    this.score = 0;
    this.juggleCount = 0;
    this.ballIdleTime = 0;
    this.distanceTraveledMeters = 0;
    this.startX = 340;
    this.kevinBonkTimer = 0;  // 1.2s cooldown to prevent headshot bounce exploit

    // Trick Chain Bonus System
    this.trickChain = [];
    this.trickChainTimer = 0;

    // Local High Scores
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    this.highScore = parseInt((storage && storage.getItem('backyard_high_score')) || '0', 10);
    this.bestCombo = parseInt((storage && storage.getItem('backyard_best_combo')) || '1', 10);

    // Cinematic Cutscenes & Game State
    this.gameState = 'IDLE'; // 'IDLE', 'INTRO_CUTSCENE', 'PLAYING', 'ENDING_CUTSCENE', 'GAME_OVER'
    this.cutsceneTimer = 0;
    this.cutsceneDuration = 3.6;
    this.letterboxProgress = 0.0; // 0.0 to 1.0
    this.kickoffBannerTimer = 0;

    // Callbacks
    this.onGameOverCallback = null;
    this.onGameplayEvent = null;

    this.initPhysics();
    this.initProceduralWorld();
    this.initBall();
    this.setupCollisionHandlers();
    this.setupNpcThrowAttack();
    this.setupNpcDialogueRelay();
  }

  // Wire local dialogue responses to Kevin's presentation-only bubble and voice.
  setupNpcDialogueRelay() {
    aiService.onDialogue((text, emotion, priority) => {
      this.npc.showDialogue(text, emotion, priority);
    });
  }

  setupNpcThrowAttack() {
    this.npc.onThrow((data) => {
      if (this.isGameOver) return;

      const types = [
        { name: 'Clay Pot', color: '#c2410c', radius: 14, shape: 'pot' },
        { name: 'Heavy Boot', color: '#451a03', radius: 16, shape: 'boot' },
        { name: 'Steel Wrench', color: '#64748b', radius: 12, shape: 'wrench' }
      ];
      const projectileName = this.kevinDirector.nextProjectileType();
      const picked = types.find(type => type.name === projectileName);
      if (!picked) return;

      const projectile = Bodies.circle(data.x, data.y, picked.radius, {
        density: 0.003,
        restitution: 0.5,
        friction: 0.3,
        label: 'thrown_projectile',
        projectileType: picked.shape,
        projectileColor: picked.color,
        projectileName: picked.name,
        collisionFilter: {
          category: COLLISION_CATEGORIES.DESTRUCTIBLE,
          mask: COLLISION_CATEGORIES.STATIC | COLLISION_CATEGORIES.BALL
        }
      });

      // Realistic lobbing trajectory from 2nd story
      const dx = data.targetX - data.x;
      const dy = (this.player.y - 20) - data.y;
      const dist = Math.max(1, Math.hypot(dx, dy));

      const horizSpeed = Math.min(3.2, Math.abs(dx / dist) * 3.5);
      const vertSpeed = -1.2;

      Body.setVelocity(projectile, {
        x: Math.sign(dx) * horizSpeed,
        y: vertSpeed
      });
      Body.setAngularVelocity(projectile, (Math.random() - 0.5) * 0.15);

      Composite.add(this.world, projectile);
      this.thrownProjectiles.push(projectile);
      this.particles.spawnShockwave(data.x, data.y, 25, '#ef4444');
    });
  }

  initPhysics() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 0.80, scale: 0.00095 },
      positionIterations: 6,
      velocityIterations: 4,
      constraintIterations: 2
    });
    this.world = this.engine.world;

    const thickness = 60;
    const staticFilter = {
      category: COLLISION_CATEGORIES.STATIC,
      mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.DESTRUCTIBLE | COLLISION_CATEGORIES.SHARDS
    };

    // Ground: y = 490 (player stands at y=485)
    this.ground = Bodies.rectangle(this.width / 2, this.height - 20, 20000, thickness, {
      isStatic: true,
      label: 'boundary_ground',
      friction: 0.8,
      restitution: 0.5,
      collisionFilter: staticFilter
    });

    // Elevated Sky Barrier at y = -500 (Allows high vertical arcs to hit 2nd-story windows at y=80-175)
    this.ceiling = Bodies.rectangle(this.width / 2, -500, 20000, thickness, {
      isStatic: true,
      label: 'boundary_ceiling',
      restitution: 0.6,
      collisionFilter: staticFilter
    });

    Composite.add(this.world, [this.ground, this.ceiling]);
  }

  initProceduralWorld() {
    this.proceduralWorld = new ProceduralWorld(this.world, 960);
    this.proceduralWorld.loadChunk(0);
    this.proceduralWorld.loadChunk(1);
    this.proceduralWorld.loadChunk(-1);
  }

  initBall() {
    const startX = this.player.x + 30;
    const startY = this.player.y - 120;

    this.ball = Bodies.circle(startX, startY, 14, {
      density: 0.0012,
      restitution: 0.68,
      friction: 0.2,
      frictionAir: 0.0025,
      label: 'player_ball',
      collisionFilter: {
        category: COLLISION_CATEGORIES.BALL,
        mask: COLLISION_CATEGORIES.STATIC | COLLISION_CATEGORIES.DESTRUCTIBLE
      }
    });

    Body.setVelocity(this.ball, { x: 0.5, y: -4.5 });
    Composite.add(this.world, this.ball);
  }

  triggerBallDeform(vx, vy, force = 1.0) {
    const spd = Math.hypot(vx, vy);
    if (spd < 1.5) return;
    const angle = Math.atan2(vy, vx);
    this.ballDeform = {
      scaleX: Math.max(0.55, 1.0 - Math.min(0.42, (spd / 16) * 0.42 * force)),
      scaleY: Math.min(1.58, 1.0 + Math.min(0.55, (spd / 16) * 0.55 * force)),
      angle: angle + Math.PI / 2
    };
  }

  resetTransientFeelState() {
    this.particles.clearHitStop();
    this.camera.reset();
    this.ballDeform = { scaleX: 1, scaleY: 1, angle: 0 };
    this.ballFeedbackTier = 'NORMAL';
    this.ballFeedbackStrength = 0;
  }

  setupCollisionHandlers() {
    this.collisionHandler = (event) => {
      const pairs = event.pairs;

      for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];
        // Thrown projectile hit ground
        const isProjA = bodyA.label === 'thrown_projectile';
        const isProjB = bodyB.label === 'thrown_projectile';
        if (isProjA || isProjB) {
          const proj = isProjA ? bodyA : bodyB;
          const other = isProjA ? bodyB : bodyA;
          if (other.label === 'boundary_ground') {
            sounds.playThud();
            this.particles.spawnDebris(proj.position.x, proj.position.y, 14, proj.projectileColor || '#c2410c', 6);
            Composite.remove(this.world, proj);
            const idx = this.thrownProjectiles.indexOf(proj);
            if (idx !== -1) this.thrownProjectiles.splice(idx, 1);
            continue;
          }
        }

        const isBallA = bodyA.label === 'player_ball';
        const isBallB = bodyB.label === 'player_ball';

        if (!isBallA && !isBallB) continue;

        const ball = isBallA ? bodyA : bodyB;
        const target = isBallA ? bodyB : bodyA;

        this.triggerBallDeform(ball.velocity.x, ball.velocity.y);

        // A ground collision begins a grounded interval; bounces preserve combo.
        if (target.label === 'boundary_ground') {
          this.ballGroundedDuration = 0;
          if (this.combo > 2) {
            this.particles.spawnPopText(ball.position.x, ball.position.y - 25, 'SAVE IT!', '#facc15', 16);
          }
          sounds.playThud();
          continue;
        }

        // Trampoline Spring Mega-Launch (Launches ball straight up to 2nd-story windows)
        if (target.isTrampoline) {
          Body.setVelocity(ball, { x: ball.velocity.x * 0.75, y: -18.0 });
          this.triggerBallDeform(ball.velocity.x, -18.0, 1.4);
          sounds.playKick(6);
          this.particles.spawnShockwave(ball.position.x, ball.position.y, 65, '#3b82f6');
          this.particles.spawnImpactRings(ball.position.x, ball.position.y, 3, '#38bdf8');
          this.particles.spawnPopText(ball.position.x, ball.position.y - 30, '🚀 MEGA TRAMPOLINE LAUNCH!', '#38bdf8', 22);
          this.recordTrickEvent('TRAMPOLINE_LAUNCH');
          continue;
        }

        // DIRECT HIT ON NEIGHBOR KEVIN IN 2ND-STORY WINDOW
        if (target.label === 'destructible_kevin') {
          // Outward ejection velocity into yard (prevents juggling/resting on head)
          const ejectDir = this.getKevinEjectionDirection(ball, target.position.x);
          const launchVx = ejectDir * (7.5 + Math.random() * 2.5);
          const launchVy = -4.0 - Math.random() * 2.0;

          if (this.kevinBonkTimer > 0) {
            // Already scored recently - deflect away without repeating points
            Body.setVelocity(ball, { x: launchVx, y: launchVy });
            this.triggerBallDeform(launchVx, launchVy, 1.2);
            continue;
          }

          this.kevinBonkTimer = 1.2; // 1.2s cooldown prevents multi-juggle cheat

          const impactVel = { x: ball.velocity.x, y: ball.velocity.y };
          this.npc.takeDirectHit(impactVel);

          this.camera.addTrauma(0.72, 0.045);
          this.particles.triggerHitStop(GAMEPLAY_FEEL_TUNING.HIT_STOP_KEVIN_HIT_SECONDS);
          sounds.playKevinHit();
          sounds.playGlassShatter();
          this.particles.spawnDebris(target.position.x, target.position.y, 28, '#0284c7', 9);
          this.particles.spawnImpactRings(target.position.x, target.position.y, 3, '#f43f5e');

          const pts = 500 * this.combo;
          this.score += pts;
          this.emitGameplayEvent('KEVIN_HIT', { score: pts, combo: this.combo, targetId: target.id });
          this.particles.spawnPopText(target.position.x, target.position.y - 45, `🎯 BONKED KEVIN! +${pts}`, '#f43f5e', 26);

          // Eject ball decisively out of the window frame into the yard
          Body.setVelocity(ball, { x: launchVx, y: launchVy });
          this.triggerBallDeform(launchVx, launchVy, 1.4);
          this.recordTrickEvent('KEVIN_BONK');

          aiService.dispatchTelemetry({
            npc_id: 'grumpy_neighbor_kevin',
            impact_object: 'Neighbor Kevin (2nd-Story Window)',
            combo_multiplier: this.combo,
            ball_type: 'Standard Match Ball',
            ball_velocity: Math.round(Math.hypot(impactVel.x, impactVel.y) * 10) / 10,
            environmental_tags: ['NPC_BONK', 'HEADSHOT', 'PISSED_MAX'],
            npcRage: this.npc.rageMeter
          });
          continue;
        }

        // Destructibles
        if (target.isDestructible) {
          if (target.isDestroyed) continue;
          target.isDestroyed = true;

          const isGlass = target.isGlass;
          const isGrill = target.isGrill;
          const isPot = target.label === 'destructible_flowerpot';
          const isWindow = target.label === 'destructible_window';
          const isGreenhouse = target.label === 'destructible_greenhouse';
          const isGnome = target.label === 'destructible_gnome';

          const impactVel = { x: ball.velocity.x, y: ball.velocity.y };
          const material = target.material || (isGlass ? 'GLASS' : (isGrill ? 'METAL' : (target.isWood ? 'WOOD' : 'CERAMIC')));
          const profile = getMaterialProfile(material);
          const propKey = target.propKey || `${target.chunkIndex ?? 0}:${target.theme || 'UNKNOWN'}:body-${target.id}`;
          const theme = target.theme || this.proceduralWorld.activeChunks.get(target.chunkIndex)?.theme || 'UNKNOWN';

          this.proceduralWorld.totalPropsSmashed++;
          this.proceduralWorld.markPropDestroyed(propKey, createResidueRecord(target, profile));
          breakObjectIntoFragments(this.world, target, impactVel, {
            activeFragments: this.activeShards,
            propKey
          });

          if (isGlass) {
            this.particles.triggerHitStop(GAMEPLAY_FEEL_TUNING.HIT_STOP_WORLD_IMPACT_SECONDS);
          }

          if (isGrill) {
            sounds.playExplosion();
            this.particles.spawnFire(target.position.x, target.position.y, 40);
            this.particles.spawnVignetteFlash('rgba(249, 115, 22, 0.4)', 0.4);
            this.camera.addTrauma(0.65);
            this.recordTrickEvent('GRILL_BLAST');
          } else if (isGnome) {
            sounds.playGnomeBonk();
            this.camera.addTrauma(0.35);
            this.recordTrickEvent('GNOME_BONK');
          } else {
            sounds.playShatter(isGlass, 100);
            this.camera.addTrauma(target.traumaContribution || 0.35);
            if (isWindow) this.recordTrickEvent('WINDOW_SHATTER');
            else if (isGreenhouse) this.recordTrickEvent('GREENHOUSE_SHATTER');
            else if (isPot) this.recordTrickEvent('POT_SMASH');
          }

          const shardColor = target.color || '#94a3b8';
          this.particles.spawnDebris(target.position.x, target.position.y, profile.particleCount, shardColor, 7, isGlass);

          let popText = 'SMASH!';
          if (isWindow) {
            popText = 'WINDOW SHATTERED!';
          } else if (isGreenhouse) {
            popText = 'ROOF GLASS SHATTERED!';
          } else if (isPot) {
            popText = 'POT BROKEN!';
          } else if (isGrill) {
            popText = 'BBQ EXPLODED!';
          } else if (isGnome) {
            popText = 'GNOME BONKED!';
          } else if (material === 'WOOD') {
            popText = 'WOOD SPLINTERED!';
          } else if (material === 'CERAMIC') {
            popText = 'CERAMIC CRACKED!';
          } else if (material === 'METAL') {
            popText = 'METAL BROKEN!';
          } else if (material === 'PLASTIC') {
            popText = 'PLASTIC SNAPPED!';
          } else if (material === 'FABRIC') {
            popText = 'FABRIC TORN!';
          } else if (material === 'SOIL') {
            popText = 'SOIL SCATTERED!';
          }

          const pts = (target.pointValue || 100) * this.combo;
          this.score += pts;
          const distanceToKevin = Math.hypot(target.position.x - this.npc.x, target.position.y - this.npc.y);
          this.emitGameplayEvent('OBJECT_DESTROYED', {
            score: pts,
            combo: this.combo,
            targetId: target.id,
            material,
            theme,
            propKey,
            objectName: target.objectName || target.label,
            distanceToKevin,
            nearKevin: distanceToKevin < 280
          });
          this.particles.spawnPopText(target.position.x, target.position.y - 20, `${popText} +${pts}`, '#fbbf24', 22);

          Body.setVelocity(ball, {
            x: Math.max(-5.5, Math.min(5.5, impactVel.x * 0.75)),
            y: Math.max(-8.5, Math.min(8.5, impactVel.y * 0.75))
          });

          this.triggerBallDeform(ball.velocity.x, ball.velocity.y, 1.2);
          this.proceduralWorld.checkChunkClearStates();

          // Proximity-based NPC dialogue: only trigger Kevin when destruction is near him (within 280px)
          if (distanceToKevin < 280) {
            aiService.dispatchTelemetry({
              npc_id: target.associatedNpcId || 'grumpy_neighbor_kevin',
              impact_object: target.objectName || 'Prop',
              combo_multiplier: this.combo,
              ball_type: 'Standard Match Ball',
              ball_velocity: Math.round(Math.hypot(impactVel.x, impactVel.y) * 10) / 10,
              environmental_tags: isGrill ? ['ON_FIRE', 'BBQ_EXPLODED'] : ['DESTRUCTION', isGlass ? 'GLASS' : 'POTTERY'],
              npcRage: this.npc.rageMeter
            });
          }
        }
      }
    };

    Events.on(this.engine, 'collisionStart', this.collisionHandler);
  }

  getKevinEjectionDirection(ball, kevinX = this.npc.x) {
    const dxFromKevin = ball.position.x - kevinX;
    return Math.abs(dxFromKevin) > 1e-6
      ? Math.sign(dxFromKevin)
      : (Math.sign(ball.velocity.x) || -this.player.facing);
  }

  emitGameplayEvent(type, payload = {}) {
    const event = { ...payload, type };
    const wasHavocActive = this.havocSystem.active;
    const scoreBonus = computeHavocScoreBonus(event, wasHavocActive, this.combo);
    const systemEvents = [];

    if (scoreBonus) {
      this.score += scoreBonus.bonus;
      systemEvents.push(scoreBonus);
    }

    const escalation = this.kevinDirector.processEvent(event);
    if (escalation.provoked || escalation.rage !== this.npc.rageMeter) {
      this.npc.applyGameplayRage(escalation.rage, { provoked: escalation.provoked });
    }
    if (escalation.transition) {
      systemEvents.push({ type: 'KEVIN_ESCALATION_CHANGED', ...escalation.transition });
    }

    const havoc = this.havocSystem.processEvent(event);
    systemEvents.push(...havoc.events);
    if (havoc.started) {
      const reaction = this.kevinDirector.processEvent({ type: 'HAVOC_STARTED' });
      if (reaction.provoked || reaction.rage !== this.npc.rageMeter) {
        this.npc.applyGameplayRage(reaction.rage, { provoked: reaction.provoked });
      }
      if (reaction.transition) {
        systemEvents.push({ type: 'KEVIN_ESCALATION_CHANGED', ...reaction.transition });
      }
      this.camera.addTrauma(0.25);
      this.particles.spawnShockwave(this.player.x, this.player.y - 40, 70, '#f97316', 4);
      this.particles.spawnPopText(this.player.x, this.player.y - 90, '🔥 HAVOC MODE!', '#fb923c', 26);
    }

    this.publishGameplayEvent(event);
    for (const systemEvent of systemEvents) this.publishGameplayEvent(systemEvent);
    return event;
  }

  publishGameplayEvent(event) {
    if (typeof this.onGameplayEvent === 'function') {
      this.onGameplayEvent(event);
    }
  }

  setCombo(value, reason = 'UNKNOWN', { silent = false } = {}) {
    const previous = this.combo;
    const current = Math.max(1, Math.floor(value));
    if (current === previous) return false;
    this.combo = current;
    this.peakCombo = Math.max(this.peakCombo, current);
    sounds.updateMusicCombo(current);
    if (!silent) {
      this.emitGameplayEvent('COMBO_CHANGED', {
        previous,
        current,
        delta: current - previous,
        reason
      });
    }
    return true;
  }

  getProjectileThreats() {
    const gravity = this.engine.gravity;
    const acceleration = {
      x: gravity.x * gravity.scale * GAMEPLAY_TUNING.MATTER_GRAVITY_MILLISECONDS_TO_SECONDS,
      y: gravity.y * gravity.scale * GAMEPLAY_TUNING.MATTER_GRAVITY_MILLISECONDS_TO_SECONDS
    };
    const playerPosition = { x: this.player.x, y: this.player.y - 30 };
    const playerVelocity = { x: this.player.vx, y: 0 };

    return this.thrownProjectiles
      .filter(projectile => !projectile.isParried)
      .map(body => {
        const threat = getProjectileThreat(
          body.position,
          {
            x: body.velocity.x * GAMEPLAY_TUNING.MATTER_BASE_HZ,
            y: body.velocity.y * GAMEPLAY_TUNING.MATTER_BASE_HZ
          },
          acceleration,
          playerPosition,
          playerVelocity
        );
        return threat ? { ...threat, body } : null;
      })
      .filter(Boolean);
  }

  resolveDefenseAtRelease() {
    const threat = selectEarliestThreat(this.getProjectileThreats());
    if (!threat) return false;
    const tier = classifyDefense(threat.timeToContact);
    if (tier === 'MISS') return false;

    const projectile = threat.body;
    const comboAtResolution = this.combo;
    const reward = {
      BLOCK: GAMEPLAY_TUNING.BLOCK_REWARD,
      PARRY: GAMEPLAY_TUNING.PARRY_REWARD,
      PERFECT_PARRY: GAMEPLAY_TUNING.PERFECT_PARRY_REWARD
    }[tier];
    const points = reward * comboAtResolution;
    this.score += points;

    if (tier === 'BLOCK') {
      let dx = projectile.position.x - this.player.x;
      let dy = projectile.position.y - (this.player.y - 30);
      let length = Math.hypot(dx, dy);
      if (length === 0) {
        dx = -this.player.facing;
        dy = 0;
        length = 1;
      }
      Body.setVelocity(projectile, {
        x: (dx / length) * GAMEPLAY_TUNING.PROJECTILE_BLOCK_DEFLECTION_SPEED,
        y: (dy / length) * GAMEPLAY_TUNING.PROJECTILE_BLOCK_DEFLECTION_SPEED
      });
      sounds.playParry();
      this.particles.triggerHitStop(GAMEPLAY_FEEL_TUNING.HIT_STOP_BLOCK_SECONDS);
      this.particles.spawnImpactRings(projectile.position.x, projectile.position.y,
        GAMEPLAY_FEEL_TUNING.BLOCK_IMPACT_RING_COUNT, '#93c5fd');
      this.particles.spawnPopText(projectile.position.x, projectile.position.y - 30, `BLOCK! +${points}`, '#93c5fd', 22);
    } else {
      let dx = this.npc.x - projectile.position.x;
      let dy = this.npc.y - projectile.position.y;
      let length = Math.hypot(dx, dy);
      if (length === 0) {
        dx = -this.player.facing;
        dy = -1;
        length = Math.hypot(dx, dy);
      }
      Body.setVelocity(projectile, {
        x: (dx / length) * GAMEPLAY_TUNING.PROJECTILE_RETURN_SPEED,
        y: (dy / length) * GAMEPLAY_TUNING.PROJECTILE_RETURN_SPEED
      });
      projectile.isParried = true;
      sounds.playParry();
      const isPerfectParry = tier === 'PERFECT_PARRY';
      this.particles.triggerHitStop(isPerfectParry
        ? GAMEPLAY_FEEL_TUNING.HIT_STOP_PERFECT_PARRY_SECONDS
        : GAMEPLAY_FEEL_TUNING.HIT_STOP_PARRY_SECONDS);
      this.particles.spawnImpactRings(projectile.position.x, projectile.position.y,
        isPerfectParry ? GAMEPLAY_FEEL_TUNING.PERFECT_PARRY_IMPACT_RING_COUNT
          : GAMEPLAY_FEEL_TUNING.PARRY_IMPACT_RING_COUNT,
        isPerfectParry ? '#f97316' : '#facc15');
      if (isPerfectParry) {
        this.particles.spawnShockwave(projectile.position.x, projectile.position.y, 105, '#f97316', 7);
        this.particles.spawnLightningArc(projectile.position.x, projectile.position.y, 34, 4);
        this.particles.spawnVignetteFlash('rgba(249, 115, 22, 0.22)', 0.2);
      } else {
        this.particles.spawnShockwave(projectile.position.x, projectile.position.y, 68, '#facc15', 4.5);
      }
      this.particles.spawnPopText(projectile.position.x, projectile.position.y - 30,
        `${tier === 'PERFECT_PARRY' ? 'PERFECT PARRY' : 'PARRY'}! +${points}`,
        tier === 'PERFECT_PARRY' ? '#fb923c' : '#facc15', isPerfectParry ? 30 : 24);
      this.recordTrickEvent(tier);
    }

    const feedback = {
      BLOCK: [GAMEPLAY_FEEL_TUNING.CAMERA_BLOCK_TRAUMA, GAMEPLAY_FEEL_TUNING.CAMERA_BLOCK_ZOOM],
      PARRY: [GAMEPLAY_FEEL_TUNING.CAMERA_PARRY_TRAUMA, GAMEPLAY_FEEL_TUNING.CAMERA_PARRY_ZOOM],
      PERFECT_PARRY: [GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_PARRY_TRAUMA,
        GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_PARRY_ZOOM]
    }[tier];
    this.camera.addTrauma(...feedback);
    this.emitGameplayEvent(tier, {
      score: points,
      combo: comboAtResolution,
      projectileId: projectile.id,
      timeToContact: threat.timeToContact
    });
    if (tier === 'PARRY') this.setCombo(comboAtResolution + 1, 'PARRY');
    if (tier === 'PERFECT_PARRY') this.setCombo(comboAtResolution + 2, 'PERFECT_PARRY');

    aiService.dispatchTelemetry({
      npc_id: 'grumpy_neighbor_kevin',
      impact_object: 'Parried Projectile',
      combo_multiplier: comboAtResolution,
      environmental_tags: [tier],
      npcRage: this.npc.rageMeter
    });
    return true;
  }

  resolvePendingPrimaryAction() {
    const action = this.pendingPrimaryAction;
    if (!action) return;
    if (this.ball) {
      const contactType = this.player.getContactCandidate(this.ball.position);
      if (contactType) {
        if (contactType === 'HEADER') this.player.triggerHeader();
        if (action.powerShot) {
          this.executePowerShot(action.charge, action.aim.x, action.aim.y, contactType);
        } else {
          this.executePlayerKick(action.aim.x, action.aim.y, contactType);
        }
        this.pendingPrimaryAction = null;
        return;
      }
    }
    if (this.player.state !== 'KICKING' && this.player.state !== 'HEADING') {
      this.pendingPrimaryAction = null;
    }
  }

  isBallGrounded() {
    if (!this.ball || !this.ground) return false;
    return this.ball.bounds.max.y >= this.ground.bounds.min.y - 1
      && Math.abs(this.ball.velocity.y) <= 1.25;
  }

  updateComboGroundGrace(dt) {
    if (this.isBallGrounded()) {
      this.ballGroundedDuration += dt;
      if (this.combo > 1 && this.ballGroundedDuration >= GAMEPLAY_TUNING.COMBO_GROUND_GRACE_SECONDS) {
        this.particles.spawnPopText(this.ball.position.x, this.ball.position.y - 30,
          'COMBO DROPPED!', '#ef4444', 18);
        this.setCombo(1, 'GROUNDED_TIMEOUT');
        this.juggleCount = 0;
      }
    } else {
      this.ballGroundedDuration = 0;
    }
  }

  recordTrickEvent(event) {
    this.trickChain.push(event);
    this.trickChainTimer = 3.0; // 3 seconds window

    // Check for Trick Chain Bonus (3+ events)
    if (this.trickChain.length >= 3) {
      const completedEvents = [...this.trickChain];
      const bonusPts = 1000 * this.combo;
      this.score += bonusPts;
      this.particles.spawnImpactRings(this.player.x, this.player.y - 60, 4, '#a855f7');
      this.particles.spawnPopText(this.player.x, this.player.y - 80, `✨ TRICK CHAIN! +${bonusPts} BONUS!`, '#c084fc', 28);
      sounds.playComboMilestoneFanfare();
      this.trickChain = []; // Reset chain
      this.emitGameplayEvent('TRICK_CHAIN_COMPLETED', {
        completedEvents,
        combo: this.combo,
        score: bonusPts,
        bonusScore: bonusPts
      });
    }
  }

  executePowerShot(charge = 1.0, targetX = this.camera.x + this.mouseScreenPos.x,
    targetY = this.mouseScreenPos.y, contactType = null) {
    if (!this.ball || this.isGameOver) return false;
    const contactCandidate = this.player.getContactCandidate(this.ball.position);
    if (!contactCandidate || (contactType && contactType !== contactCandidate)) return false;
    contactType = contactCandidate;
    if (!contactType || !this.player.consumeKickContact()) return false;
    this.player.animation.triggerActionAccent('POWER_SHOT');
    charge = Number.isFinite(charge) ? Math.max(0, Math.min(1, charge)) : 0;
    this.player.powerCharging = false;
    this.player.powerCharge = 0;
    this.ballIdleTime = 0;

    const ballPos = { x: this.ball.position.x, y: this.ball.position.y };
    let aimDx = targetX - ballPos.x;
    let aimDy = targetY - ballPos.y;
    let aimDist = Math.hypot(aimDx, aimDy);

    if (aimDist <= 5) {
      aimDx = this.player.facing * 80;
      aimDy = -260;
      aimDist = Math.hypot(aimDx, aimDy);
    }

    const response = computeBallContactResponse({
      contactType,
      aim: { x: aimDx, y: aimDy },
      charge,
      powerShot: true,
      facing: this.player.facing
    });
    const { x: launchVx, y: launchVy } = response.velocity;
    Body.setVelocity(this.ball, response.velocity);
    Body.setAngularVelocity(this.ball, response.angularVelocity);
    this.triggerBallDeform(launchVx, launchVy, GAMEPLAY_FEEL_TUNING.BALL_DEFORM_POWER_BASE
      + charge * GAMEPLAY_FEEL_TUNING.BALL_DEFORM_POWER_CHARGE);
    this.ballFeedbackTier = response.tier;
    this.ballFeedbackStrength = Math.max(0, Math.min(1, charge));

    sounds.playPowerShotFire();
    this.camera.addTrauma(
      GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_TRAUMA_BASE
        + charge * GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_TRAUMA_CHARGE,
      GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_ZOOM_BASE
        + charge * GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_ZOOM_CHARGE
    );
    this.particles.spawnPowerBeam(this.player.x, this.player.y, charge);
    this.particles.triggerHitStop(GAMEPLAY_FEEL_TUNING.HIT_STOP_POWER_SHOT_BASE_SECONDS
      + charge * GAMEPLAY_FEEL_TUNING.HIT_STOP_POWER_SHOT_CHARGE_SECONDS);
    this.particles.spawnImpactRings(ballPos.x, ballPos.y,
      GAMEPLAY_FEEL_TUNING.POWER_SHOT_RING_BASE_COUNT
        + Math.round(charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_RING_CHARGE_COUNT), '#f97316');
    this.particles.spawnShockwave(ballPos.x, ballPos.y,
      GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_BASE_RADIUS
        + charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_CHARGE_RADIUS,
      '#f97316', GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_BASE_WIDTH
        + charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_CHARGE_WIDTH);
    this.particles.spawnPopText(ballPos.x, ballPos.y - 40, `💥 POWER SHOT! (${Math.round(charge * 100)}%)`, '#f97316', 26);

    this.ballGroundedDuration = 0;
    this.setCombo(this.combo + 1, 'BALL_CONTACT');
    this.juggleCount++;
    const points = GAMEPLAY_TUNING.NORMAL_CONTACT_REWARD * this.combo;
    this.score += points;
    this.emitGameplayEvent('BALL_CONTACT', {
      contactType: 'POWER_SHOT',
      footballContactType: contactType,
      score: points,
      combo: this.combo
    });
    this.emitGameplayEvent('POWER_SHOT', { charge, score: points, combo: this.combo });
    this.recordTrickEvent('POWER_SHOT');
    return true;
  }

  handleKeyDown(code) {
    if (this.gameState === 'INTRO_CUTSCENE') {
      if (code === 'Space') this.skipOrEndIntroCutscene();
      return;
    }
    if (this.gameState !== 'PLAYING' || !this.pageVisible) return;
    sounds.init();
    this.player.handleKeyDown(code);
    sounds.startGenerativeMusic();
  }

  handleKeyUp(code) {
    if (this.gameState === 'PLAYING') this.player.handleKeyUp(code);
  }

  startIntroCutscene() {
    this.resetTransientFeelState();
    this.kevinDirector.reset();
    this.havocSystem.reset();
    this.npc.resetRunState();
    this.player.animation.reset();
    this.npc.animation.reset();
    this.gameState = 'INTRO_CUTSCENE';
    this.cutsceneTimer = 3.6;
    this.cutsceneDuration = 3.6;
    this.letterboxProgress = 1.0;
    this.isPointerDown = false;
    this.pendingPrimaryAction = null;
    this.player.powerCharging = false;
    this.player.powerCharge = 0;
    this.player.keys.left = false;
    this.player.keys.right = false;
    this.player.keys.sprint = false;
    this.player.keys.charge = false;
    this.player.x = 180;
    this.player.state = 'RUNNING';
    this.player.facing = 1;
    this.npc.state = 'LEANING_OUT_RAGE';
    this.npc.stateTimer = this.cutsceneDuration;
    this.npc.dialogue = "HEY YOU! Keep that filthy football away from my yard!";
    this.npc.dialogueEmotion = 'RAGE';
    this.npc.dialogueTimer = 3.6;
    sounds.init();
    sounds.speakKevinVoice("Hey you! Keep that filthy football away from my yard!", 'RAGE', 0);
  }

  skipOrEndIntroCutscene() {
    if (this.gameState === 'INTRO_CUTSCENE') {
      this.gameState = 'PLAYING';
      this.cutsceneTimer = 0;
      this.player.x = this.startX;
      this.player.state = 'IDLE';
      this.kickoffBannerTimer = 1.5;
      sounds.playWhistle();
      if (this.pageVisible) sounds.startGenerativeMusic();
    }
  }

  startEndingCutscene() {
    this.resetTransientFeelState();
    this.gameState = 'ENDING_CUTSCENE';
    this.cutsceneTimer = 3.2;
    this.cutsceneDuration = 3.2;
    this.letterboxProgress = 1.0;
    this.isPointerDown = false;
    this.pendingPrimaryAction = null;
    this.player.powerCharging = false;
    this.player.powerCharge = 0;
    this.player.keys.left = false;
    this.player.keys.right = false;
    this.player.keys.sprint = false;
    this.player.keys.charge = false;
    sounds.stopMusic();
    sounds.playDefeatHorn();
    this.player.state = 'HURT';
    this.player.animation.triggerHurt();
    this.npc.state = 'LEANING_OUT_RAGE';
    this.npc.stateTimer = this.cutsceneDuration;
    this.npc.dialogue = "HA! That'll teach you! Now get off my lawn!";
    this.npc.dialogueEmotion = 'SARCASTIC';
    this.npc.dialogueTimer = 3.5;
    sounds.speakKevinVoice("HA! That'll teach you! Now get off my lawn!", 'SARCASTIC', 0);
  }

  handlePointerMove(screenX, screenY) {
    this.mouseScreenPos = { x: screenX, y: screenY };
  }

  handlePointerDown(screenX, screenY) {
    if (!this.pageVisible) return;
    this.ignoreNextPointerUp = false;
    if (this.gameState === 'INTRO_CUTSCENE') {
      this.skipOrEndIntroCutscene();
      return;
    }
    if (this.isGameOver || this.gameState !== 'PLAYING') return;
    if (this.pendingPrimaryAction || this.player.state === 'KICKING' || this.player.state === 'HEADING') return;
    sounds.init();
    sounds.startGenerativeMusic();
    this.mouseScreenPos = { x: screenX, y: screenY };
    this.isPointerDown = true;
    this.pointerDownTime = performance.now();
    this.player.powerCharging = false;
    this.player.powerCharge = 0;
  }

  setPageVisibility(isVisible) {
    this.pageVisible = Boolean(isVisible);
    this.accumulator = 0;
    if (!this.pageVisible) {
      this.resetTransientFeelState();
      sounds.stopMusic();
      if (this.isPointerDown) this.ignoreNextPointerUp = true;
      this.isPointerDown = false;
      this.pointerDownTime = 0;
      this.pendingPrimaryAction = null;
      this.player.powerCharging = false;
      this.player.powerCharge = 0;
      this.player.keys.left = false;
      this.player.keys.right = false;
      this.player.keys.sprint = false;
      this.player.keys.charge = false;
      this.player.vx = 0;
    } else if (this.gameState === 'PLAYING' && !this.isGameOver) {
      sounds.startGenerativeMusic();
    }
  }

  handlePointerUp(screenX, screenY) {
    if (this.isGameOver || this.gameState !== 'PLAYING' || !this.pageVisible) return;
    if (this.ignoreNextPointerUp) {
      this.ignoreNextPointerUp = false;
      return;
    }
    this.mouseScreenPos = { x: screenX, y: screenY };
    if (!this.isPointerDown) return;

    const elapsedHold = Math.max(0, (performance.now() - this.pointerDownTime) / 1000);
    const finalCharge = getPowerCharge(elapsedHold);
    const aim = { x: this.camera.x + screenX, y: screenY };

    this.isPointerDown = false;
    this.pointerDownTime = 0;
    this.player.powerCharging = false;
    this.player.powerCharge = 0;

    // Defensive outcomes are resolved at the release-time state, before any football action begins.
    if (this.resolveDefenseAtRelease()) {
      this.pendingPrimaryAction = null;
      this.player.triggerKick();
      return;
    }

    this.player.triggerKick();
    this.pendingPrimaryAction = {
      charge: finalCharge,
      powerShot: finalCharge >= GAMEPLAY_TUNING.POWER_SHOT_MIN_CHARGE,
      aim
    };
  }

  executePlayerKick(targetX, targetY, contactType = null) {
    if (!this.ball || this.isGameOver) return false;
    const contactCandidate = this.player.getContactCandidate(this.ball.position);
    if (!contactCandidate || (contactType && contactType !== contactCandidate)) return false;
    contactType = contactCandidate;
    if (!contactType || !this.player.consumeKickContact()) return false;
    this.ballIdleTime = 0;

    const ballPos = { x: this.ball.position.x, y: this.ball.position.y };

    let aimDx = targetX - ballPos.x;
    let aimDy = targetY - ballPos.y;
    let aimDist = Math.hypot(aimDx, aimDy);

    if (aimDist === 0) {
      aimDx = this.player.facing * 80;
      aimDy = -240;
      aimDist = Math.hypot(aimDx, aimDy);
    }

    const foot = this.player.getKickPosition();
    const measuredFootDistance = Math.hypot(ballPos.x - foot.x, ballPos.y - foot.y);
    const isPerfect = contactType === 'KICK'
      && measuredFootDistance < GAMEPLAY_TUNING.PERFECT_STRIKE_RADIUS;
    if (isPerfect) this.player.animation.triggerActionAccent('PERFECT_STRIKE');
    const response = computeBallContactResponse({
      contactType,
      aim: { x: aimDx, y: aimDy },
      perfectStrike: isPerfect,
      facing: this.player.facing
    });
    const { x: launchVx, y: launchVy } = response.velocity;
    Body.setVelocity(this.ball, response.velocity);

    // Dynamic Ball Squash & Stretch Deformation along kick vector
    this.triggerBallDeform(launchVx, launchVy, isPerfect
      ? GAMEPLAY_FEEL_TUNING.BALL_DEFORM_PERFECT_STRIKE
      : (contactType === 'HEADER' ? GAMEPLAY_FEEL_TUNING.BALL_DEFORM_HEADER
        : GAMEPLAY_FEEL_TUNING.BALL_DEFORM_NORMAL));
    Body.setAngularVelocity(this.ball, response.angularVelocity);
    this.ballFeedbackTier = response.tier;
    this.ballFeedbackStrength = isPerfect ? GAMEPLAY_FEEL_TUNING.BALL_FEEDBACK_PERFECT_STRIKE
      : (contactType === 'HEADER' ? GAMEPLAY_FEEL_TUNING.BALL_FEEDBACK_HEADER
        : GAMEPLAY_FEEL_TUNING.BALL_FEEDBACK_NORMAL);
    this.particles.triggerHitStop(isPerfect
      ? GAMEPLAY_FEEL_TUNING.HIT_STOP_PERFECT_STRIKE_SECONDS
      : (contactType === 'HEADER' ? GAMEPLAY_FEEL_TUNING.HIT_STOP_HEADER_SECONDS
        : GAMEPLAY_FEEL_TUNING.HIT_STOP_CONTACT_SECONDS));

    this.ballGroundedDuration = 0;
    this.setCombo(this.combo + 1, 'BALL_CONTACT');
    this.juggleCount++;

    const contactBase = isPerfect
      ? GAMEPLAY_TUNING.PERFECT_STRIKE_REWARD
      : GAMEPLAY_TUNING.NORMAL_CONTACT_REWARD;
    const kickPts = contactBase * this.combo;
    this.score += kickPts;
    this.emitGameplayEvent('BALL_CONTACT', {
      contactType,
      score: kickPts,
      combo: this.combo,
      perfectStrike: isPerfect
    });

    sounds.playKick(this.combo);
    sounds.playChime(this.combo);
    if (this.combo === 5 || this.combo === 10 || this.combo === 15) {
      sounds.playComboMilestoneFanfare();
    }

    this.camera.addTrauma(
      isPerfect ? GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_STRIKE_TRAUMA
        : (contactType === 'HEADER' ? GAMEPLAY_FEEL_TUNING.CAMERA_HEADER_TRAUMA
          : GAMEPLAY_FEEL_TUNING.CAMERA_NORMAL_KICK_TRAUMA),
      isPerfect ? GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_STRIKE_ZOOM
        : (contactType === 'HEADER' ? GAMEPLAY_FEEL_TUNING.CAMERA_HEADER_ZOOM
          : GAMEPLAY_FEEL_TUNING.CAMERA_NORMAL_KICK_ZOOM)
    );

    const kickPos = contactType === 'HEADER'
      ? this.player.getHeaderPosition()
      : this.player.getKickPosition();
    const impactCount = isPerfect ? 4 : (contactType === 'HEADER' ? 1 : 2);
    const impactColor = isPerfect ? '#38bdf8' : (contactType === 'HEADER' ? '#93c5fd' : '#facc15');
    this.particles.spawnImpactRings(kickPos.x, kickPos.y, impactCount, impactColor);
    if (isPerfect) this.particles.spawnShockwave(kickPos.x, kickPos.y, 76, '#38bdf8', 5);
    this.particles.spawnDebris(kickPos.x, kickPos.y, isPerfect ? 16 : (contactType === 'HEADER' ? 5 : 8), impactColor, 6);

    const banner = isPerfect ? `⚡ PERFECT STRIKE! ${this.combo}x (+${kickPts})` : (this.combo > 1 ? `KICK! ${this.combo}x (+${kickPts})` : `KICK! (+${kickPts})`);
    this.particles.spawnPopText(
      ballPos.x,
      ballPos.y - 30,
      banner,
      isPerfect ? '#38bdf8' : '#facc15',
      Math.min(28, 16 + this.combo * 2)
    );

    this.recordTrickEvent(contactType);
    return true;
  }

  update(frameDt = FIXED_STEP_SECONDS) {
    if (this.pageVisible === false || this.isGameOver || !['PLAYING', 'INTRO_CUTSCENE', 'ENDING_CUTSCENE'].includes(this.gameState)) return;
    // Keep variable-step gameplay clocks within the same per-frame time budget as capped physics.
    let dt = Math.min(Math.max(frameDt, 0), MAX_SIMULATION_DT);
    dt = this.particles.consumeHitStop(dt);
    if (dt <= 1e-9) return;
    this.camera.decay(dt);

    // 1. INTRO CUTSCENE UPDATE
    if (this.gameState === 'INTRO_CUTSCENE') {
      this.cutsceneTimer -= dt;
      this.letterboxProgress = Math.min(1.0, this.letterboxProgress + dt * 4.0);

      const progress = Math.max(0, Math.min(1.0, 1.0 - (this.cutsceneTimer / this.cutsceneDuration)));

      // Cinematic Camera Motion: Look at Kevin for first 45%, then glide back to Player
      if (progress < 0.45) {
        const targetCamX = this.npc.x - this.width * 0.5 - 60;
        this.camera.setTargetX(targetCamX, dt, GAMEPLAY_FEEL_TUNING.CAMERA_CUTSCENE_TRACKING_RATE);
      } else {
        const targetCamX = this.player.x - this.width * 0.5;
        this.camera.setTargetX(targetCamX, dt, GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE);
      }

      // Player entrance slide
      if (progress >= 0.40 && this.player.x < this.startX) {
        this.player.state = 'RUNNING';
        this.player.facing = 1;
        this.player.x = Math.min(this.startX, this.player.x + dt * 280);
      } else if (this.player.x >= this.startX) {
        this.player.state = 'IDLE';
      }

      this.player.animation.update(dt, this.player);

      this.mapRenderer.update(dt, this.survivalSeconds);
      this.npc.update(dt, this.player.x, this.particles, false, null, false);
      this.particles.update(dt);

      if (this.cutsceneTimer <= 0) {
        this.skipOrEndIntroCutscene();
      }
      return;
    }

    // 2. ENDING CUTSCENE UPDATE
    if (this.gameState === 'ENDING_CUTSCENE') {
      this.cutsceneTimer -= dt;
      this.letterboxProgress = Math.min(1.0, this.letterboxProgress + dt * 3.5);

      this.camera.setTargetX(this.player.x - this.width * 0.5, dt, GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE);
      this.player.state = 'HURT';
      this.player.animation.update(dt, this.player);

      this.mapRenderer.update(dt, this.survivalSeconds);
      this.npc.update(dt, this.player.x, this.particles, false, null, false);
      this.particles.update(dt);

      if (this.cutsceneTimer <= 0) {
        this.triggerGameOver();
      }
      return;
    }

    // Decay kickoff banner & letterbox
    if (this.kickoffBannerTimer > 0) {
      this.kickoffBannerTimer -= dt;
      this.letterboxProgress = Math.max(0.0, this.letterboxProgress - dt * 2.5);
    }

    const havocEvents = this.havocSystem.update(dt);
    this.kevinDirector.update(dt);
    for (const event of havocEvents) this.publishGameplayEvent(event);

    this.survivalSeconds += dt;
    // Damped elastic spring recovery for ball squash & stretch with NaN protection
    if (this.ballDeform) {
      if (!Number.isFinite(this.ballDeform.scaleX)) this.ballDeform.scaleX = 1.0;
      if (!Number.isFinite(this.ballDeform.scaleY)) this.ballDeform.scaleY = 1.0;
      if (!Number.isFinite(this.ballDeform.angle)) this.ballDeform.angle = 0;
      const springRate = Math.min(1.0, dt * 16);
      this.ballDeform.scaleX += (1.0 - this.ballDeform.scaleX) * springRate;
      this.ballDeform.scaleY += (1.0 - this.ballDeform.scaleY) * springRate;
    }
    if (this.ballFeedbackStrength > 0) {
      this.ballFeedbackStrength = Math.max(0, this.ballFeedbackStrength - dt * 4);
      if (this.ballFeedbackStrength === 0) this.ballFeedbackTier = 'NORMAL';
    }

    // Trick chain decay
    if (this.trickChainTimer > 0) {
      this.trickChainTimer -= dt;
      if (this.trickChainTimer <= 0) {
        this.trickChain = [];
      }
    }

    this.proceduralWorld.updateActiveChunks(this.player.x);
    this.camera.setTargetX(this.player.x - this.width * 0.5, dt, GAMEPLAY_FEEL_TUNING.CAMERA_TRACKING_RATE);

    // Throttled static boundary positioning
    if (Math.abs(this.player.x - this.ground.position.x) > 3000) {
      Body.setPosition(this.ground, { x: this.player.x, y: this.ground.position.y });
      Body.setPosition(this.ceiling, { x: this.player.x, y: this.ceiling.position.y });
    }

    this.mapRenderer.update(dt, this.survivalSeconds);
    this.player.update(dt, this.width, this.particles, this.combo);
    this.resolvePendingPrimaryAction();
    if (this.particles.hitStopRemainingSeconds > 0) {
      // Contact-created hit-stop discards this frame's unspent simulation budget.
      this.accumulator = 0;
      return;
    }

    const playerChunk = this.proceduralWorld.getChunkIndexForX(this.player.x);
    this.npc.x = playerChunk * 960 + 790;
    this.npc.y = 110;
    this.npc.update(dt, this.player.x, this.particles, true, rage => {
      const transition = this.kevinDirector.syncRage(rage, 'RAGE_DECAY');
      if (transition) {
        this.publishGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', ...transition });
      }
      return this.kevinDirector.getAttackProfile();
    });
    aiService.setNpcRage(this.npc.rageMeter);

    if (this.kevinBonkTimer > 0) {
      this.kevinBonkTimer -= dt;
    }

    // Safety Anti-Stuck & Anti-Juggle: Eject ball if hovering over Kevin's window sill
    if (this.ball) {
      const kdx = this.ball.position.x - this.npc.x;
      const kdy = this.ball.position.y - this.npc.y;
      if (Math.abs(kdx) < 42 && Math.abs(kdy) < 38) {
        const spd = Math.hypot(this.ball.velocity.x, this.ball.velocity.y);
        if (spd < 3.5 || this.ball.position.y < this.npc.y) {
          const ejectDir = this.getKevinEjectionDirection(this.ball, this.npc.x);
          Body.setVelocity(this.ball, { x: ejectDir * 8.0, y: -2.5 });
        }
      }
    }

    this.distanceTraveledMeters = Math.floor(Math.abs(this.player.x - this.startX) / 10);

    // =========================================================================
    // THROWN PROJECTILES VS PLAYER & PARRY RETURN CHECK
    // =========================================================================
    for (let i = this.thrownProjectiles.length - 1; i >= 0; i--) {
      const proj = this.thrownProjectiles[i];

      // Check if Parried Projectile Strikes Kevin's 2nd-Story Window
      if (proj.isParried && proj.position.y <= 135 && Math.abs(proj.position.x - this.npc.x) < 45) {
        sounds.playGnomeBonk();
        sounds.playComboMilestoneFanfare();
        this.camera.addTrauma(0.85);
        this.particles.triggerHitStop(GAMEPLAY_FEEL_TUNING.HIT_STOP_KEVIN_HIT_SECONDS);
        this.particles.spawnImpactRings(this.npc.x, this.npc.y, 4, '#facc15');
        this.particles.spawnPopText(this.npc.x, this.npc.y - 45, '💥 RETURN TO SENDER BONK! +1,000', '#facc15', 28);
        this.npc.takeDirectHit({ x: 0, y: -10 });
        const points = 1000 * this.combo;
        this.score += points;
        this.emitGameplayEvent('KEVIN_HIT', { score: points, combo: this.combo, source: 'PARRIED_PROJECTILE' });
        Composite.remove(this.world, proj);
        this.thrownProjectiles.splice(i, 1);
        continue;
      }

      const pdx = proj.position.x - this.player.x;
      const pdy = proj.position.y - (this.player.y - 30);
      const pdist = Math.hypot(pdx, pdy);

      // Hit Player Body (only if not parried)
      if (!proj.isParried && pdist < GAMEPLAY_TUNING.PROJECTILE_PLAYER_CONTACT_RADIUS) {
        const tookDamage = this.player.takeDamage(1);
        if (tookDamage) {
          sounds.playPlayerHurt();
          this.camera.addTrauma(0.7);
          this.setCombo(1, 'PLAYER_DAMAGED');
          this.emitGameplayEvent('PLAYER_DAMAGED', { health: this.player.health, damage: 1 });
          this.particles.spawnVignetteFlash('rgba(239, 68, 68, 0.5)', 0.45);
          this.particles.spawnDebris(this.player.x, this.player.y - 30, 25, '#ef4444', 9);
          this.particles.spawnPopText(this.player.x, this.player.y - 65, '💥 DIRECT HIT! -1 ❤️', '#ef4444', 26);

          if (this.player.isDead()) {
            this.startEndingCutscene();
          }
        }
        Composite.remove(this.world, proj);
        this.thrownProjectiles.splice(i, 1);
        continue;
      }

      // Hit Ground / Out of bounds -> Shatter
      if (proj.position.y >= this.height - 72 || proj.position.y > this.height + 50 || Math.abs(proj.position.x - this.player.x) > 2500) {
        sounds.playThud();
        this.particles.spawnDebris(proj.position.x, proj.position.y, 12, proj.projectileColor, 5);
        Composite.remove(this.world, proj);
        this.thrownProjectiles.splice(i, 1);
      }
    }

    if (this.particles.hitStopRemainingSeconds > 0) {
      // Pre-physics impacts discard this frame's remaining simulation budget.
      this.accumulator = 0;
      return;
    }

    // Update Mouse Hold -> Power Shot Charge Progress
    if (this.isPointerDown && !this.isGameOver) {
      const holdSec = (performance.now() - this.pointerDownTime) / 1000;
      if (holdSec >= GAMEPLAY_TUNING.POWER_CHARGE_START_DELAY) {
        this.player.powerCharging = true;
        this.player.powerCharge = Math.min(1.0, (holdSec - GAMEPLAY_TUNING.POWER_CHARGE_START_DELAY) / GAMEPLAY_TUNING.POWER_CHARGE_RAMP_DURATION);
      } else {
        this.player.powerCharging = false;
        this.player.powerCharge = 0;
      }
    } else {
      this.player.powerCharging = false;
      this.player.powerCharge = 0;
    }

    // Fixed-Timestep Physics Accumulator (1/60s with 4 sub-steps, max 3 ticks/frame)
    this.accumulator = (this.accumulator || 0) + dt;
    let physicsTicks = 0;
    let hitStopTriggeredDuringPhysics = false;
    while (this.accumulator >= FIXED_STEP_SECONDS && physicsTicks < MAX_PHYSICS_TICKS_PER_UPDATE) {
      for (let s = 0; s < this.nSub; s++) {
        Engine.update(this.engine, this.subDt * 1000);
        if (this.particles.hitStopRemainingSeconds > 0) {
          hitStopTriggeredDuringPhysics = true;
          break;
        }
      }
      if (hitStopTriggeredDuringPhysics) break;
      this.accumulator -= FIXED_STEP_SECONDS;
      physicsTicks++;
    }
    if (hitStopTriggeredDuringPhysics) {
      // Drop the partial tick and remaining frame budget; never replay it after hit-stop.
      this.accumulator = 0;
      return;
    }
    if (this.accumulator >= FIXED_STEP_SECONDS) {
      this.accumulator = 0;
    }

    // Zero-allocation active shards lifecycle
    for (let i = this.activeShards.length - 1; i >= 0; i--) {
      const body = this.activeShards[i];
      body.lifeTime = (body.lifeTime || 2.2) - dt;
      if (body.lifeTime <= 0) {
        Composite.remove(this.world, body);
        this.activeShards.splice(i, 1);
      }
    }

    if (this.ball) {
      const pos = this.ball.position;
      const vel = this.ball.velocity;

      // Out-of-bounds safety rescue (below map, into space, or NaN/non-finite)
      const isNonFinite = !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(vel.x) || !Number.isFinite(vel.y);
      if (isNonFinite || pos.y > this.height + 140 || pos.y < -3500 || Math.abs(pos.x - this.player.x) > 2500) {
        const safeX = Number.isFinite(this.player.x) ? this.player.x + this.player.facing * 30 : 210;
        const safeY = this.height - 120;
        this.ball.position.x = safeX;
        this.ball.position.y = safeY;
        this.ball.positionPrev.x = safeX;
        this.ball.positionPrev.y = safeY;
        Body.setPosition(this.ball, { x: safeX, y: safeY });
        Body.setVelocity(this.ball, { x: 0.5, y: -4.5 });
        this.particles.spawnPopText(safeX, safeY - 40, '⚽ BALL RESCUED!', '#38bdf8', 20);
        sounds.playChime(3);
      }

      const boundedVelocity = clampBallVelocity(vel);
      if (boundedVelocity !== vel) Body.setVelocity(this.ball, boundedVelocity);

      if (pos.y > this.height - 75 && Math.abs(vel.x) < 0.2 && Math.abs(vel.y) < 0.2) {
        this.ballIdleTime += dt;
        // Auto-hop nudge after 3.5s ground idle
        if (this.ballIdleTime > 3.5) {
          Body.setVelocity(this.ball, { x: this.player.facing * 1.5, y: -7.0 });
          this.ballIdleTime = 0;
          this.particles.spawnPopText(pos.x, pos.y - 30, '⚽ AUTO-HOP!', '#facc15', 18);
          sounds.playKick(1);
        }
      } else {
        this.ballIdleTime = 0;
      }
    }

    this.updateComboGroundGrace(dt);

    if (this.ball) {
      const trailColor = this.combo >= 8 ? '#f97316' : (this.combo >= 5 ? '#facc15' : '#38bdf8');
      const speedRatio = Math.min(1, Math.hypot(this.ball.velocity.x, this.ball.velocity.y)
        / GAMEPLAY_FEEL_TUNING.BALL_MAX_SPEED);
      this.particles.addTrailPoint(
        this.ball.position,
        trailColor,
        4 + speedRatio * 8 + this.ballFeedbackStrength * 2,
        this.combo
      );

      if (this.combo >= 8 && Math.random() < 0.4) {
        this.particles.spawnFire(this.ball.position.x, this.ball.position.y, 2);
      }
    }

    this.particles.update(dt);
  }

  triggerGameOver() {
    if (this.gameState === 'GAME_OVER') return;
    this.isGameOver = true;
    this.gameState = 'GAME_OVER';
    this.resetTransientFeelState();
    sounds.playExplosion();
    sounds.stopMusic();
    sounds.speakKevinVoice("THAT'LL TEACH YA! Call the ambulance!", 'RAGE', 0);

    // Save High Scores
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      if (storage) storage.setItem('backyard_high_score', this.highScore.toString());
    }
    if (this.peakCombo > this.bestCombo) {
      this.bestCombo = this.peakCombo;
      if (storage) storage.setItem('backyard_best_combo', this.bestCombo.toString());
    }

    if (this.onGameOverCallback) {
      this.onGameOverCallback({
        score: this.score,
        peakCombo: this.peakCombo,
        distanceMeters: this.distanceTraveledMeters,
        survivalSeconds: Math.floor(this.survivalSeconds),
        highScore: this.highScore,
        bestCombo: this.bestCombo
      });
    }
  }

  resetEnvironment() {
    sounds.stopMusic();
    this.camera.x = 0;
    this.isGameOver = false;
    this.gameState = 'IDLE';
    this.survivalSeconds = 0;
    this.setCombo(1, 'RUN_RESET', { silent: true });
    this.peakCombo = 1;
    this.score = 0;
    this.juggleCount = 0;
    this.ballIdleTime = 0;
    this.distanceTraveledMeters = 0;
    this.startX = 340;
    this.ballGroundedDuration = 0;
    this.pendingPrimaryAction = null;
    this.kevinBonkTimer = 0;
    this.trickChain = [];
    this.trickChainTimer = 0;
    this.kevinDirector.reset();
    this.havocSystem.reset();
    this.accumulator = 0;
    this.cutsceneTimer = 0;
    this.cutsceneDuration = 3.6;
    this.letterboxProgress = 0;
    this.kickoffBannerTimer = 0;
    this.pointerDownTime = 0;
    this.ignoreNextPointerUp = false;
    this.mouseScreenPos = { x: this.width * 0.5, y: 160 };
    this.ballDeform = { scaleX: 1, scaleY: 1, angle: 0 };
    this.resetTransientFeelState();

    // Clear thrown projectiles & active shards
    for (const proj of this.thrownProjectiles) {
      Composite.remove(this.world, proj);
    }
    this.thrownProjectiles = [];

    for (const shard of this.activeShards) {
      Composite.remove(this.world, shard);
    }
    this.activeShards = [];

    // Reset input and player state
    this.isPointerDown = false;
    this.particles.clear();

    this.player.resetRunState(this.startX, this.height - 55);
    this.mapRenderer.resetRunState();

    // Reset NPC
    this.npc.resetRunState();

    // Reset Ball
    if (this.ball) {
      Composite.remove(this.world, this.ball);
    }
    this.initBall();

    // Reset procedural world chunks
    this.proceduralWorld.reset();
    this.initProceduralWorld();

    aiService.resetSession();
  }

  render(currentTime) {
    const ctx = this.ctx;
    const dpr = Math.max(1, Math.min(2.5, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    const shake = this.camera.getTransform(currentTime / 1000);
    const camX = this.camera.x;

    this.mapRenderer.drawSkyAndSun(ctx, camX);

    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.rotate(shake.angle);
    ctx.translate(-camX, 0);

    const playerChunk = this.proceduralWorld.getChunkIndexForX(this.player.x);
    const startChunk = playerChunk - 1;
    const endChunk = playerChunk + 1;

    this.mapRenderer.drawWorldLayers(ctx, camX, startChunk, endChunk);

    // Draw 2nd-Story Window Kevin NPC
    this.npc.draw(ctx);

    const activeProps = this.proceduralWorld.getAllActiveProps();
    this.mapRenderer.drawProps(ctx, activeProps);
    this.mapRenderer.drawResidues(ctx, this.proceduralWorld.getActiveResidues());

    // Draw Thrown Flying Projectiles
    this.drawThrownProjectiles(ctx);

    this.drawEnvironmentShards(ctx);
    this.particles.draw(ctx);
    this.player.draw(ctx, this.combo);
    this.drawBall(ctx);
    this.drawAimGuide(ctx, camX);
    this.drawBallIndicators(ctx, camX);
    this.drawPowerMeterInCanvas(ctx);

    ctx.restore();

    // Screen-space Vignette effects
    this.particles.drawScreenVignettes(ctx, this.width, this.height);

    // Screen-space Cinematic Cutscene Letterbox Bars & Titles
    this.drawCutsceneOverlays(ctx);
  }

  drawCutsceneOverlays(ctx) {
    const maxBarHeight = 52;
    const barHeight = maxBarHeight * this.letterboxProgress;

    // Cinematic Top and Bottom Widescreen Bars
    if (barHeight > 0.5) {
      ctx.save();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, this.width, barHeight);
      ctx.fillRect(0, this.height - barHeight, this.width, barHeight);

      // Gold Accent Line on Border
      ctx.fillStyle = '#facc15';
      ctx.fillRect(0, barHeight - 2, this.width, 2);
      ctx.fillRect(0, this.height - barHeight, this.width, 2);
      ctx.restore();
    }

    // "SPACE / CLICK TO SKIP" Prompt during Intro Cutscene
    if (this.gameState === 'INTRO_CUTSCENE') {
      const pulseAlpha = Math.sin(Date.now() * 0.006) * 0.25 + 0.75;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('PRESS SPACE OR CLICK TO SKIP ▶▶', this.width - 24, this.height - 18);

      // Intro Comic Title
      ctx.fillStyle = '#facc15';
      ctx.font = '900 15px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🎬 BACKYARD HAVOC - SUBURBAN SHOWDOWN', 24, 32);
      ctx.restore();
    }

    // Dynamic Kickoff Banner: "READY... GO!"
    if (this.kickoffBannerTimer > 0) {
      const p = this.kickoffBannerTimer / 1.5;
      const scale = Math.sin((1.0 - p) * Math.PI * 0.5);
      const alpha = Math.min(1.0, this.kickoffBannerTimer * 2);

      ctx.save();
      ctx.translate(this.width / 2, this.height / 2 - 40);
      ctx.scale(Math.max(0.3, scale), Math.max(0.3, scale));
      ctx.globalAlpha = alpha;

      ctx.font = '900 46px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText(p > 0.55 ? 'READY...' : '⚡ GO! KICK!', 3, 3);

      ctx.fillStyle = p > 0.55 ? '#38bdf8' : '#facc15';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 6;
      ctx.strokeText(p > 0.55 ? 'READY...' : '⚡ GO! KICK!', 0, 0);
      ctx.fillText(p > 0.55 ? 'READY...' : '⚡ GO! KICK!', 0, 0);
      ctx.restore();
    }

    // Defeat Banner during Ending Cutscene
    if (this.gameState === 'ENDING_CUTSCENE') {
      const pulse = Math.sin(Date.now() * 0.008) * 0.05 + 1.0;
      ctx.save();
      ctx.translate(this.width / 2, 36);
      ctx.scale(pulse, pulse);
      ctx.font = '900 22px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 4;
      ctx.strokeText('💥 BUSTED! OUT OF HEARTS', 0, 0);
      ctx.fillText('💥 BUSTED! OUT OF HEARTS', 0, 0);
      ctx.restore();
    }
  }

  drawPowerMeterInCanvas(ctx) {
    if (!this.player.powerCharging) return;
    const px = this.player.x - 28;
    const py = this.player.y - 65;
    const barW = 10;
    const barH = 50;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, barW, barH);
    ctx.strokeRect(px, py, barW, barH);

    const charge = this.player.powerCharge;
    const fillH = barH * charge;
    const grad = ctx.createLinearGradient(px, py + barH, px, py);
    grad.addColorStop(0, '#facc15');
    grad.addColorStop(0.6, '#f97316');
    grad.addColorStop(1, '#ef4444');

    ctx.fillStyle = grad;
    ctx.fillRect(px + 2, py + barH - fillH + 2, barW - 4, fillH - 4);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PWR', px + barW / 2, py - 4);
    ctx.restore();
  }

  drawThrownProjectiles(ctx) {
    for (let i = 0; i < this.thrownProjectiles.length; i++) {
      const proj = this.thrownProjectiles[i];
      ctx.save();
      ctx.translate(proj.position.x, proj.position.y);

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
      ctx.rotate(proj.angle);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;

      if (proj.projectileType === 'pot') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-12, -10);
        ctx.lineTo(12, -10);
        ctx.lineTo(8, 12);
        ctx.lineTo(-8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(-4, -14, 5, 0, Math.PI * 2);
        ctx.arc(4, -14, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.projectileType === 'boot') {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.roundRect(-14, -8, 28, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#451a03';
        ctx.fillRect(-14, 4, 28, 5);
      } else {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-14, -5, 28, 10);
        ctx.strokeRect(-14, -5, 28, 10);

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-14, 0, 7, 0, Math.PI * 2);
        ctx.arc(14, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // Pulsing drawn indicator (Red Danger when incoming, Gold Spark when parried)
      ctx.save();
      const pulse = 0.6 + Math.sin(Date.now() * 0.012) * 0.4;
      ctx.globalAlpha = pulse;
      if (proj.isParried) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(proj.position.x, proj.position.y - 22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(proj.position.x, proj.position.y - 22, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(proj.position.x, proj.position.y - 25);
        ctx.lineTo(proj.position.x, proj.position.y - 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(proj.position.x, proj.position.y - 17, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawAimGuide(ctx, camX) {
    if (!this.ball || this.isGameOver) return;
    const playerFoot = this.player.getKickPosition();
    const dx = this.ball.position.x - playerFoot.x;
    const dy = this.ball.position.y - playerFoot.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 150) {
      const mouseWorldX = camX + this.mouseScreenPos.x;
      const mouseWorldY = this.mouseScreenPos.y;
      const aimDx = mouseWorldX - this.ball.position.x;
      const aimDy = mouseWorldY - this.ball.position.y;
      const aimDist = Math.hypot(aimDx, aimDy);
      if (aimDist < 5) return;

      const facing = this.player.facing || 1;
      let effectiveAimDx = aimDx;
      if (Math.abs(effectiveAimDx) < 6) {
        effectiveAimDx = facing * 6;
      }

      const isRight = effectiveAimDx >= 0;
      const normHypot = Math.hypot(effectiveAimDx, aimDy);
      const unitX = effectiveAimDx / normHypot;
      const unitY = aimDy / normHypot;

      // Calculate angle in degrees relative to the horizon
      let angleDeg = Math.min(88, Math.max(8, Math.round(Math.atan2(-aimDy, Math.abs(effectiveAimDx)) * (180 / Math.PI))));

      ctx.save();

      // 1. Sleek Glowing Aim Protractor Arc (No radial seam lines)
      const arcRadius = 38;
      const startAngle = isRight ? 0 : Math.PI;
      const currentAngle = Math.atan2(aimDy, effectiveAimDx);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(this.ball.position.x, this.ball.position.y, arcRadius, startAngle, currentAngle, isRight);
      ctx.stroke();

      // Glowing Arrow Tip at end of Arc
      const tipX = this.ball.position.x + Math.cos(currentAngle) * (arcRadius + 2);
      const tipY = this.ball.position.y + Math.sin(currentAngle) * (arcRadius + 2);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Glowing Dotted Physics Parabola Trajectory
      const safeUnitX = Math.abs(unitX) < 0.12 ? (facing * 0.16) : unitX;
      const launchSpeed = Math.min(18.0, 10.5 + (this.combo - 1) * 0.3);
      const launchVx = safeUnitX * launchSpeed;
      const launchVy = Math.min(-3.5, unitY * launchSpeed);

      const numDots = 12;
      for (let i = 1; i <= numDots; i++) {
        const t = i * 0.05;
        const px = this.ball.position.x + launchVx * 58 * t;
        const py = this.ball.position.y + launchVy * 58 * t + 0.5 * 720 * t * t;
        const dotAlpha = 1.0 - (i / numDots) * 0.65;
        const dotSize = Math.max(2.5, 5.5 - (i / numDots) * 3);

        ctx.fillStyle = `rgba(250, 204, 21, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Live Angle Degree Badge (Floating Pill HUD)
      const badgeX = this.ball.position.x + (isRight ? 42 : -106);
      const badgeY = this.ball.position.y - 28;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 64, 22, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = '900 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`📐 ${angleDeg}°`, badgeX + 32, badgeY + 11);

      // 4. Target Crosshair Ring at Mouse Position (clean circular target)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouseWorldX, mouseWorldY, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mouseWorldX, mouseWorldY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();

      ctx.restore();
    }
  }

  drawBallIndicators(ctx, camX) {
    if (!this.ball) return;
    const pos = this.ball.position;

    // Vertical Sky Ball Indicator
    if (pos.y < 35) {
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(pos.x, 14);
      ctx.lineTo(pos.x - 10, 2);
      ctx.lineTo(pos.x + 10, 2);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SKY BALL (${Math.round(-pos.y)}m)`, pos.x, 26);
      ctx.restore();
    }

    // Horizontal Off-Screen Indicators
    const screenLeft = camX;
    const screenRight = camX + this.width;
    if (pos.x < screenLeft) {
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(screenLeft + 12, pos.y);
      ctx.lineTo(screenLeft + 26, pos.y - 8);
      ctx.lineTo(screenLeft + 26, pos.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (pos.x > screenRight) {
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(screenRight - 12, pos.y);
      ctx.lineTo(screenRight - 26, pos.y - 8);
      ctx.lineTo(screenRight - 26, pos.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (this.ballIdleTime > 2.0 && !this.isGameOver) {
      const pulse = Math.sin(Date.now() * 0.006) * 4;
      ctx.save();
      ctx.fillStyle = '#facc15';
      ctx.font = '900 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚽ KICK ME!', pos.x, pos.y - 32 + pulse);
      ctx.restore();
    }
  }

  drawBall(ctx) {
    if (!this.ball) return;
    const pos = this.ball.position;
    const radius = 14;
    const vx = Number.isFinite(this.ball.velocity.x) ? this.ball.velocity.x : 0;
    const vy = Number.isFinite(this.ball.velocity.y) ? this.ball.velocity.y : 0;
    const speed = Math.hypot(vx, vy);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Stable, smooth aerodynamic elongation
    let scaleX = 1.0;
    let scaleY = 1.0;
    let deformAngle = 0;

    if (speed > 2.0) {
      deformAngle = Math.atan2(vy, vx);
      const speedStretch = Math.min(1.42, 1.0 + (speed / GAMEPLAY_FEEL_TUNING.BALL_MAX_SPEED) * 0.42
        + this.ballFeedbackStrength * 0.06);
      const speedSquash = Math.max(0.72, 1.0 / Math.sqrt(speedStretch));
      scaleX = speedStretch;
      scaleY = speedSquash;
    }

    if (this.ballDeform && (Math.abs(this.ballDeform.scaleX - 1.0) > 0.05 || Math.abs(this.ballDeform.scaleY - 1.0) > 0.05)) {
      scaleX *= Math.max(0.65, Math.min(1.4, this.ballDeform.scaleX));
      scaleY *= Math.max(0.65, Math.min(1.4, this.ballDeform.scaleY));
      if (speed <= 2.0) deformAngle = this.ballDeform.angle;
    }

    if (Math.abs(scaleX - 1.0) > 0.01 || Math.abs(scaleY - 1.0) > 0.01) {
      ctx.rotate(deformAngle);
      ctx.scale(scaleX, scaleY);
      ctx.rotate(-deformAngle);
    }

    ctx.rotate(this.ball.angle);

    // 3D Spherical Light Gradient
    const sphereGrad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.1, 0, 0, radius);
    sphereGrad.addColorStop(0, '#ffffff');
    sphereGrad.addColorStop(0.65, '#f8fafc');
    sphereGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = sphereGrad;
    ctx.strokeStyle = this.ballFeedbackTier === 'POWER_SHOT'
      ? '#f97316'
      : (this.ballFeedbackTier === 'PERFECT_STRIKE' ? '#38bdf8' : '#0f172a');
    ctx.lineWidth = 2.5 + this.ballFeedbackStrength;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center Black Pentagon
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = Math.cos(a) * (radius * 0.42);
      const py = Math.sin(a) * (radius * 0.42);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Surrounding Hexagonal Stitched Seams
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px1 = Math.cos(a) * (radius * 0.42);
      const py1 = Math.sin(a) * (radius * 0.42);
      const px2 = Math.cos(a) * radius;
      const py2 = Math.sin(a) * radius;

      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawEnvironmentShards(ctx) {
    for (let i = 0; i < this.activeShards.length; i++) {
      const body = this.activeShards[i];

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      const bounds = body.bounds;
      const w = bounds.max.x - bounds.min.x;
      const h = bounds.max.y - bounds.min.y;

      const alpha = Math.min(1.0, (body.lifeTime || 2.0) / 1.0);
      ctx.globalAlpha = alpha;

      if (body.isGlass) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = body.color || '#94a3b8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        if (body.fragmentShape === 'clod') {
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (body.fragmentShape === 'splinter') {
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.moveTo(-w / 3, 0);
          ctx.lineTo(w / 3, 0);
          ctx.stroke();
        } else if (body.fragmentShape === 'fabric-strip') {
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.moveTo(-w / 3, -h / 2);
          ctx.lineTo(-w / 3, h / 2);
          ctx.moveTo(w / 3, -h / 2);
          ctx.lineTo(w / 3, h / 2);
          ctx.stroke();
        } else {
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          if (body.material === 'METAL' || body.material === 'PLASTIC') {
            ctx.strokeStyle = 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-w / 3, -h / 4);
            ctx.lineTo(w / 3, -h / 4);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }
  }
}
