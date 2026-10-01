const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const AUDIO_MIX_TUNING = Object.freeze({
  MASTER_GAIN: 0.86,
  MUSIC_GAIN: 0.18,
  SFX_GAIN: 0.72,
  VOICE_GAIN: 0.58,
  AMBIENCE_GAIN: 0.18,
  MUSIC_DUCK_MAJOR_DB: -3,
  MUSIC_DUCK_LIGHT_DB: -2.2,
  MUSIC_DUCK_VOICE_DB: -6,
  MUSIC_DUCK_STANDARD_VOICE_DB: -5,
  MUSIC_DUCK_ATTACK_SECONDS: 0.035,
  MUSIC_DUCK_RELEASE_SECONDS: 0.24,
  SFX_POLYPHONY_LIMIT: 24,
  PAN_LIMIT: 0.7,
  MUSIC_TEMPO_MIN: 88,
  MUSIC_TEMPO_MAX: 150,
  MUSIC_PROFILES: Object.freeze({
    CALM: Object.freeze({ tempo: 88, cutoff: 700, percussion: 0.15 }),
    BUILD: Object.freeze({ tempo: 104, cutoff: 950, percussion: 0.3 }),
    HEAT: Object.freeze({ tempo: 120, cutoff: 1250, percussion: 0.48 }),
    FURY: Object.freeze({ tempo: 138, cutoff: 1650, percussion: 0.7 }),
    HAVOC: Object.freeze({ tempo: 150, cutoff: 2050, percussion: 0.82 })
  })
});

export const AUDIO_PRIORITY = Object.freeze({
  COSMETIC: 5,
  NORMAL: 20,
  MATERIAL: 40,
  PARRY: 65,
  SIGNATURE: 80,
  KEVIN_HIT: 90,
  PLAYER_DAMAGE: 95,
  CRITICAL_VOICE: 100
});

export function clampAudioPan(value) {
  return clamp(Number.isFinite(value) ? value : 0,
    -AUDIO_MIX_TUNING.PAN_LIMIT, AUDIO_MIX_TUNING.PAN_LIMIT);
}

export function decibelsToGain(decibels) {
  return Number.isFinite(decibels) ? Math.pow(10, clamp(decibels, -24, 0) / 20) : 1;
}

export function resolveReactiveMusicState({
  combo = 1,
  kevinState = 'CALM',
  havocActive = false
} = {}) {
  if (havocActive) return 'HAVOC';
  const state = String(kevinState || '').toUpperCase();
  if (state === 'FURIOUS' || state === 'RAMPAGE') return 'FURY';
  if (state === 'ANGRY' || combo >= 6) return 'HEAT';
  if (state === 'ANNOYED' || combo >= 3) return 'BUILD';
  return 'CALM';
}

export function resolveReactiveMusicProfile(state) {
  return AUDIO_MIX_TUNING.MUSIC_PROFILES[state]
    || AUDIO_MIX_TUNING.MUSIC_PROFILES.CALM;
}

export function createAudioBusGraph(ctx, { muted = false } = {}) {
  if (!ctx || typeof ctx.createGain !== 'function'
    || typeof ctx.createDynamicsCompressor !== 'function') return null;

  const compressor = ctx.createDynamicsCompressor();
  const master = ctx.createGain();
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  const voice = ctx.createGain();
  const ambience = ctx.createGain();
  const musicInputGain = ctx.createGain();
  const musicDuckGain = ctx.createGain();
  const now = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;

  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(12, now);
  compressor.ratio.setValueAtTime(8, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.25, now);

  master.gain.setValueAtTime(muted ? 0 : AUDIO_MIX_TUNING.MASTER_GAIN, now);
  music.gain.setValueAtTime(AUDIO_MIX_TUNING.MUSIC_GAIN, now);
  sfx.gain.setValueAtTime(AUDIO_MIX_TUNING.SFX_GAIN, now);
  voice.gain.setValueAtTime(AUDIO_MIX_TUNING.VOICE_GAIN, now);
  ambience.gain.setValueAtTime(AUDIO_MIX_TUNING.AMBIENCE_GAIN, now);
  musicInputGain.gain.setValueAtTime(1, now);
  musicDuckGain.gain.setValueAtTime(1, now);

  musicInputGain.connect(musicDuckGain);
  musicDuckGain.connect(music);
  music.connect(compressor);
  sfx.connect(compressor);
  voice.connect(compressor);
  ambience.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);

  return {
    ctx,
    compressor,
    musicInputGain,
    musicDuckGain,
    buses: Object.freeze({ MASTER: master, MUSIC: music, SFX: sfx, VOICE: voice, AMBIENCE: ambience }),
    setMasterMuted(nextMuted) {
      const time = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
      const target = nextMuted ? 0 : AUDIO_MIX_TUNING.MASTER_GAIN;
      master.gain.cancelScheduledValues?.(time);
      master.gain.setValueAtTime(target, time);
    },
    setMusicDuck(gain, attackSeconds = AUDIO_MIX_TUNING.MUSIC_DUCK_ATTACK_SECONDS) {
      const safeGain = clamp(Number.isFinite(gain) ? gain : 1, 0, 1);
      const safeAttack = clamp(Number.isFinite(attackSeconds) ? attackSeconds : 0.04, 0.005, 1);
      const time = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
      musicDuckGain.gain.cancelScheduledValues?.(time);
      if (typeof musicDuckGain.gain.setTargetAtTime === 'function') {
        musicDuckGain.gain.setTargetAtTime(safeGain, time, safeAttack);
      } else {
        musicDuckGain.gain.setValueAtTime(safeGain, time);
      }
    }
  };
}
