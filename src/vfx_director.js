import { GAMEPLAY_FEEL_TUNING } from './gameplay_feel.js';
import { GAMEPLAY_TUNING } from './gameplay_rules.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const profiles = {
  NORMAL_CONTACT: {
    intensity: 0.2,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_NORMAL_KICK_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_NORMAL_KICK_ZOOM,
    ringCount: 2,
    ringColor: '#facc15',
    burstCount: 8,
    burstColor: '#facc15',
    burstSpeed: 4
  },
  HEADER: {
    intensity: 0.14,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_HEADER_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_HEADER_ZOOM,
    ringCount: 1,
    ringColor: '#93c5fd',
    burstCount: 4,
    burstColor: '#bfdbfe',
    burstSpeed: 2.8
  },
  PERFECT_STRIKE: {
    intensity: 0.62,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_STRIKE_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_STRIKE_ZOOM,
    ringCount: 4,
    ringColor: '#38bdf8',
    shockwaveRadius: 76,
    shockwaveColor: '#38bdf8',
    shockwaveWidth: 5,
    burstCount: 14,
    burstColor: '#bae6fd',
    burstSpeed: 5.5,
    impulseX: 4,
    impulseY: -1
  },
  POWER_SHOT: {
    intensity: 0.65,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_TRAUMA_BASE,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_ZOOM_BASE,
    ringColor: '#f97316',
    shockwaveColor: '#f97316',
    shockwaveWidth: GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_BASE_WIDTH,
    burstColor: '#fb923c',
    burstSpeed: 7,
    impulseX: 5,
    impulseY: -1.5
  },
  BLOCK: {
    intensity: 0.3,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_BLOCK_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_BLOCK_ZOOM,
    ringCount: GAMEPLAY_FEEL_TUNING.BLOCK_IMPACT_RING_COUNT,
    ringColor: '#93c5fd',
    burstCount: 3,
    burstColor: '#bfdbfe',
    burstSpeed: 2.5
  },
  PARRY: {
    intensity: 0.56,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_PARRY_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_PARRY_ZOOM,
    ringCount: GAMEPLAY_FEEL_TUNING.PARRY_IMPACT_RING_COUNT,
    ringColor: '#facc15',
    shockwaveRadius: 68,
    shockwaveColor: '#facc15',
    shockwaveWidth: 4.5,
    burstCount: 8,
    burstColor: '#fbbf24',
    burstSpeed: 5.5,
    impulseX: 5,
    impulseY: -0.5
  },
  PERFECT_PARRY: {
    intensity: 0.92,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_PARRY_TRAUMA,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_PERFECT_PARRY_ZOOM,
    chromatic: 6,
    ringCount: GAMEPLAY_FEEL_TUNING.PERFECT_PARRY_IMPACT_RING_COUNT,
    ringColor: '#f97316',
    shockwaveRadius: 105,
    shockwaveColor: '#f97316',
    shockwaveWidth: 7,
    lightningCount: 4,
    vignette: { color: 'rgba(249, 115, 22, 0.22)', duration: 0.2 },
    burstCount: 12,
    burstColor: '#fb923c',
    burstSpeed: 7,
    impulseX: 9,
    impulseY: -1.5
  },
  KEVIN_HIT: {
    intensity: 1,
    cameraTrauma: 0.72,
    zoomPunch: 0.045,
    chromatic: 7,
    ringCount: 4,
    ringColor: '#f43f5e',
    shockwaveRadius: 72,
    shockwaveColor: '#f43f5e',
    shockwaveWidth: 6,
    burstCount: 16,
    burstColor: '#fb7185',
    burstSpeed: 7,
    impulseX: 8,
    impulseY: -2.5
  },
  OBJECT_DESTROYED: {
    intensity: 0.28,
    cameraTrauma: 0.28,
    zoomPunch: 0.006,
    ringCount: 1,
    ringColor: '#94a3b8',
    materialAccent: true
  },
  TRICK_CHAIN: {
    intensity: 1.03,
    cameraTrauma: 0.42,
    zoomPunch: 0.025,
    ringCount: 5,
    ringColor: '#c084fc',
    shockwaveRadius: 90,
    shockwaveColor: '#facc15',
    shockwaveWidth: 5.5,
    burstCount: 12,
    burstColor: '#c084fc',
    burstSpeed: 6,
    impulseX: 6,
    impulseY: -1.5
  },
  HAVOC_STARTED: {
    intensity: 1.12,
    cameraTrauma: 0.5,
    zoomPunch: 0.035,
    chromatic: 8,
    ringCount: 6,
    ringColor: '#f97316',
    shockwaveRadius: 110,
    shockwaveColor: '#fb923c',
    shockwaveWidth: 6,
    vignette: { color: 'rgba(249, 115, 22, 0.2)', duration: 0.28 },
    burstCount: 16,
    burstColor: '#fb923c',
    burstSpeed: 6.5,
    impulseX: 7,
    impulseY: -1
  },
  HAVOC_ENDED: {
    intensity: 0.24,
    vignette: { color: 'rgba(249, 115, 22, 0.12)', duration: 0.24 }
  },
  PLAYER_DAMAGED: {
    intensity: 0.72,
    cameraTrauma: 0.7,
    zoomPunch: 0.02,
    ringCount: 1,
    ringColor: '#ef4444',
    vignette: { color: 'rgba(239, 68, 68, 0.28)', duration: 0.35 },
    burstCount: 12,
    burstColor: '#ef4444',
    burstSpeed: 6,
    impulseX: 6,
    impulseY: -1.5
  },
  KEVIN_ESCALATION: {
    intensity: 0.48,
    cameraTrauma: 0.14,
    zoomPunch: 0.008,
    ringCount: 1,
    ringColor: '#fb7185',
    burstCount: 4,
    burstColor: '#fb7185',
    burstSpeed: 2.5
  }
};

export const VFX_FEEDBACK_PROFILES = Object.freeze(Object.fromEntries(
  Object.entries(profiles).map(([name, profile]) => [name, Object.freeze(profile)])
));

const MATERIAL_COLORS = Object.freeze({
  GLASS: '#dbeafe',
  CERAMIC: '#cbd5e1',
  WOOD: '#d6a066',
  METAL: '#cbd5e1',
  PLASTIC: '#7dd3fc',
  FABRIC: '#e2e8f0',
  SOIL: '#a16207'
});

export function resolveVfxProfile(name, options = {}) {
  const profile = VFX_FEEDBACK_PROFILES[name];
  if (!profile) return null;
  if (name !== 'POWER_SHOT') return profile;

  const charge = clamp(Number.isFinite(options.charge) ? options.charge : 0, 0, 1);
  const chargeProgress = clamp(
    (charge - GAMEPLAY_TUNING.POWER_SHOT_MIN_CHARGE)
      / (1 - GAMEPLAY_TUNING.POWER_SHOT_MIN_CHARGE),
    0,
    1
  );
  return {
    ...profile,
    charge,
    chargeProgress,
    intensity: 0.68 + chargeProgress * 0.2,
    cameraTrauma: GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_TRAUMA_BASE
      + charge * GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_TRAUMA_CHARGE,
    zoomPunch: GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_ZOOM_BASE
      + charge * GAMEPLAY_FEEL_TUNING.CAMERA_POWER_SHOT_ZOOM_CHARGE,
    ringCount: GAMEPLAY_FEEL_TUNING.POWER_SHOT_RING_BASE_COUNT
      + Math.round(charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_RING_CHARGE_COUNT),
    shockwaveRadius: GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_BASE_RADIUS
      + charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_CHARGE_RADIUS,
    shockwaveWidth: GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_BASE_WIDTH
      + charge * GAMEPLAY_FEEL_TUNING.POWER_SHOT_SHOCKWAVE_CHARGE_WIDTH,
    beamWidth: Math.max(12, charge * 34),
    burstCount: 8 + Math.round(chargeProgress * 8)
  };
}

export class VfxDirector {
  constructor({ camera, particles }) {
    this.camera = camera;
    this.particles = particles;
    this.impactPalette = null;
  }

  setImpactPalette(palette) {
    const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    this.impactPalette = palette && validColor(palette.ringColor)
      && validColor(palette.shockwaveColor) && validColor(palette.burstColor)
      ? {
          ringColor: palette.ringColor,
          shockwaveColor: palette.shockwaveColor,
          burstColor: palette.burstColor
        }
      : null;
  }

  present(name, options = {}) {
    const sourceProfile = resolveVfxProfile(name, options);
    if (!sourceProfile) return null;
    const paletteCanApply = name !== 'OBJECT_DESTROYED';
    const profile = this.impactPalette && paletteCanApply
      ? { ...sourceProfile, ...this.impactPalette }
      : sourceProfile;

    const x = Number.isFinite(options.x) ? options.x : 0;
    const y = Number.isFinite(options.y) ? options.y : 0;
    const direction = options.direction < 0 ? -1 : 1;
    const trauma = Number.isFinite(profile.cameraTrauma) ? profile.cameraTrauma : 0;
    const zoom = Number.isFinite(profile.zoomPunch) ? profile.zoomPunch : 0;
    const chromatic = Number.isFinite(profile.chromatic) ? profile.chromatic : 0;

    this.camera.addTrauma(trauma, zoom, chromatic);
    if (profile.impulseX || profile.impulseY) {
      this.camera.addImpulse((profile.impulseX || 0) * direction, profile.impulseY || 0);
    }
    if (profile.ringCount) {
      const ringColor = name === 'OBJECT_DESTROYED'
        ? (MATERIAL_COLORS[options.material] || profile.ringColor)
        : profile.ringColor;
      this.particles.spawnImpactRings(x, y, profile.ringCount, ringColor);
    }
    if (profile.shockwaveRadius) {
      this.particles.spawnShockwave(x, y, profile.shockwaveRadius,
        profile.shockwaveColor || profile.ringColor, profile.shockwaveWidth || 4);
    }
    if (profile.lightningCount) {
      this.particles.spawnLightningArc(x, y, 34, profile.lightningCount);
    }
    if (profile.vignette) {
      this.particles.spawnVignetteFlash(profile.vignette.color, profile.vignette.duration);
    }
    if (profile.beamWidth) this.particles.spawnPowerBeam(x, y, profile.charge);
    if (profile.materialAccent) {
      this.particles.spawnMaterialAccent(x, y, options.material, direction);
    } else if (profile.burstCount) {
      this.particles.spawnDirectionalBurst(x, y, direction, profile.burstCount,
        profile.burstColor, profile.burstSpeed);
    }
    return profile;
  }

  handleGameplayEvent(event, context = {}) {
    if (!event || typeof event.type !== 'string') return null;
    const options = { ...context };
    switch (event.type) {
      case 'BALL_CONTACT':
        if (event.contactType === 'POWER_SHOT') return null;
        return this.present(event.perfectStrike
          ? 'PERFECT_STRIKE'
          : (event.contactType === 'HEADER' ? 'HEADER' : 'NORMAL_CONTACT'), options);
      case 'POWER_SHOT':
        return this.present('POWER_SHOT', { ...options, charge: event.charge });
      case 'BLOCK':
      case 'PARRY':
      case 'PERFECT_PARRY':
      case 'KEVIN_HIT':
      case 'PLAYER_DAMAGED':
      case 'TRICK_CHAIN_COMPLETED':
      case 'HAVOC_STARTED':
      case 'HAVOC_ENDED':
        return this.present(event.type === 'TRICK_CHAIN_COMPLETED' ? 'TRICK_CHAIN' : event.type, options);
      case 'OBJECT_DESTROYED':
        return this.present('OBJECT_DESTROYED', { ...options, material: event.material });
      case 'KEVIN_ESCALATION_CHANGED':
        if (['ANGRY', 'FURIOUS', 'RAMPAGE'].includes(event.current)) {
          return this.present('KEVIN_ESCALATION', options);
        }
        return null;
      default:
        return null;
    }
  }

  drawHavocEdge(ctx, width, height, active) {
    if (!active || !ctx || width <= 0 || height <= 0) return;
    const alpha = 0.11 * this.particles.motionMultiplier;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.2,
      width / 2, height / 2, Math.max(width, height) * 0.72
    );
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
