import { VocalSoundBank } from './audio_assets.js';
import {
  AUDIO_MIX_TUNING,
  AUDIO_PRIORITY,
  clampAudioPan,
  createAudioBusGraph,
  decibelsToGain,
  resolveReactiveMusicProfile,
  resolveReactiveMusicState
} from './audio_mix.js';

export class EmotionalVoiceEngine {
  constructor(onSpeakingChange = null) {
    this.queue = [];
    this.isSpeaking = false;
    this.currentPriority = 999;
    this.availableVoices = [];
    this.cooldownTimer = 0;
    this.lastSpokenText = '';
    this.minCooldownMs = 2600;
    this.onSpeakingChange = typeof onSpeakingChange === 'function' ? onSpeakingChange : null;
    this.currentItem = null;
    this.clauseTimer = null;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.availableVoices = window.speechSynthesis.getVoices();
  }

  getPreferredVoice() {
    if (this.availableVoices.length === 0) this.loadVoices();

    const priorities = [
      v => v.lang.startsWith('en') && v.name.includes('Natural') && (v.name.includes('Guy') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Christopher')),
      v => v.lang.startsWith('en') && v.name.includes('Natural'),
      v => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Guy') || v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Mark')),
      v => v.lang.startsWith('en') && v.name.includes('Google') && !v.name.includes('Female'),
      v => v.lang.startsWith('en') && !v.name.includes('Female') && !v.name.includes('Zira') && !v.name.includes('Samantha'),
      v => v.lang.startsWith('en')
    ];

    for (const predicate of priorities) {
      const match = this.availableVoices.find(predicate);
      if (match) return match;
    }
    return null;
  }

  /**
   * Split sentence into emotional chunks at punctuation and parenthetical emotes
   */
  chunkSentence(text, emotion) {
    const emoteRegex = /\(([^)]+)\)/g;
    const emotes = [];
    const cleaned = text.replace(emoteRegex, (match, emote) => {
      emotes.push(emote.trim().toLowerCase());
      return '|||EMOTE|||';
    });

    const rawParts = cleaned.split(/(?<=[!?.;,—–])\s+|(?=\|\|\|EMOTE\|\|\|)/);
    const chunks = [];

    for (const part of rawParts) {
      const trimmed = part.replace(/\|\|\|EMOTE\|\|\|/g, '').trim();
      if (trimmed.length > 0) {
        chunks.push({ type: 'speech', text: trimmed });
      }
      if (part.includes('|||EMOTE|||') && emotes.length > 0) {
        const emote = emotes.shift();
        chunks.push({ type: 'pause', duration: this.getEmotePauseDuration(emote, emotion) });
      }
    }

    if (chunks.filter(c => c.type === 'speech').length === 0) {
      chunks.push({ type: 'speech', text: text.replace(emoteRegex, '').trim() });
    }

    return chunks;
  }

  /**
   * Phonetic Text Normalizer - prevents TTS engines from spelling out non-dictionary sounds (e.g. O-W-W-W)
   */
  normalizePhonetics(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      // Fix elongated "OWW" / "OWWW" -> "Ow! Ouch!"
      .replace(/\b[oO]+[wW]{2,}\b/g, 'Ow! Ouch!')
      .replace(/\b[oO]+[uU]+[cC]+[hH]+\b/gi, 'Ouch!')
      .replace(/\b[aA]+[rR]{2,}[gG]*[hH]*\b/gi, 'Argh!')
      .replace(/\b[nN]+[oO]{2,}\b/g, 'No! No!')
      .replace(/\b[aA]{2,}[hH]+\b/gi, 'Ah!')
      .replace(/\b[oO]{2,}[fF]+\b/gi, 'Oof!')
      // Strip parenthetical stage directions like (screams), (sobs), (gasp), (sigh)
      .replace(/\([^)]+\)/g, '')
      // Normalize excessive punctuation
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getEmotionParams(emotion, clauseIndex = 0, totalClauses = 1) {
    switch (emotion) {
      case 'RAGE':
        if (clauseIndex === 0 && totalClauses > 1) {
          return { pitch: 1.08, rate: 1.08, volume: 0.90 };
        }
        return { pitch: 0.94, rate: 1.04, volume: 0.88 };
      case 'CRYING':
        return { pitch: 1.04, rate: 0.94, volume: 0.85 };
      case 'PANIC':
        return { pitch: 1.10, rate: 1.08, volume: 0.90 };
      case 'SARCASTIC':
        return { pitch: 0.90, rate: 0.98, volume: 0.85 };
      case 'DESPAIRING':
        return { pitch: 0.92, rate: 0.92, volume: 0.85 };
      default:
        return { pitch: 0.96, rate: 1.02, volume: 0.88 };
    }
  }

  /**
   * Enqueue or preemptively speak dialogue.
   * Priority 0 = Critical Headshot / Parry (preempts and speaks instantly).
   * Priority > 0 = Dropped if already speaking or cooldown active (NO stale backlog).
   */
  enqueue(text, emotion = 'RAGE', priority = 2, soundEngine = null, onComplete = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    if (!text || typeof text !== 'string') return false;

    const now = Date.now();

    // Priority 0: Critical Headshot / Parry interrupts immediately
    if (priority === 0) {
      this.cancelCurrentSpeech();
      this.queue = [];
    } else {
      // Non-critical line: drop immediately if already speaking or within cooldown
      if (this.isSpeaking) return false;
      if (now - this.cooldownTimer < this.minCooldownMs) return false;
      if (this.lastSpokenText === text && now - this.cooldownTimer < 8000) return false;
    }

    this.queue = [{ text, emotion, priority, soundEngine, onComplete, timestamp: now }];
    this.processNext();
    return true;
  }

  cancelCurrentSpeech() {
    const cancelledItem = this.currentItem;
    this.clearClauseTimer();
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isSpeaking = false;
    this.currentPriority = 999;
    this.currentUtterance = null;
    this.currentItem = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (cancelledItem) this.onSpeakingChange?.(false, cancelledItem, { reason: 'cancelled' });
  }

  clearClauseTimer() {
    if (this.clauseTimer !== null) {
      clearTimeout(this.clauseTimer);
      this.clauseTimer = null;
    }
  }

  processNext() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    // Discard stale item if it was created more than 1.8s ago
    if (Date.now() - item.timestamp > 1800) return;

    this.isSpeaking = true;
    this.currentPriority = item.priority;
    this.currentItem = item;
    this.lastSpokenText = item.text;
    this.cooldownTimer = Date.now();
    this.onSpeakingChange?.(true, item, { reason: 'started' });

    // Phonetically sanitize text to prevent spelling letters like O-W-W-W
    const spokenText = this.normalizePhonetics(item.text);
    if (!spokenText) {
      this.clearClauseTimer();
      this.isSpeaking = false;
      this.currentPriority = 999;
      this.currentItem = null;
      this.onSpeakingChange?.(false, item, { reason: 'empty' });
      if (item.onComplete) item.onComplete();
      return;
    }

    let finished = false;
    const finishSpeech = (reason = 'finished') => {
      if (finished || this.currentItem !== item) return;
      finished = true;
      this.clearClauseTimer();
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      this.currentUtterance = null;
      this.isSpeaking = false;
      this.currentPriority = 999;
      this.currentItem = null;
      this.onSpeakingChange?.(false, item, { reason });
      if (item.onComplete) item.onComplete();
    };

    try {
      // Split into clauses to deliver dramatic pitch shift between exclamation and rant
      const clauses = spokenText.split(/(?<=[!?])\s+/).filter(c => c.trim().length > 0);
      const totalClauses = clauses.length;

      let clauseIdx = 0;
      const voice = this.getPreferredVoice();

      const speakClause = () => {
        if (!this.isSpeaking || this.currentItem !== item) return;
        if (clauseIdx >= totalClauses) {
          finishSpeech();
          return;
        }

        const clauseText = clauses[clauseIdx];
        const utterance = new SpeechSynthesisUtterance(clauseText);
        const params = this.getEmotionParams(item.emotion, clauseIdx, totalClauses);
        utterance.rate = params.rate;
        utterance.pitch = params.pitch;
        utterance.volume = params.volume;

        if (voice) utterance.voice = voice;
        this.currentUtterance = utterance;

        clauseIdx++;

        utterance.onend = () => {
          if (!this.isSpeaking || this.currentItem !== item) return;
          if (clauseIdx < totalClauses) {
            this.clearClauseTimer();
            this.clauseTimer = setTimeout(() => {
              this.clauseTimer = null;
              if (this.isSpeaking && this.currentItem === item) speakClause();
            }, 60);
          } else {
            finishSpeech();
          }
        };

        utterance.onerror = () => finishSpeech('error');
        window.speechSynthesis.speak(utterance);
      };

      this.watchdogTimer = setTimeout(() => {
        if (this.isSpeaking) finishSpeech();
      }, 5500);

      speakClause();
    } catch (err) {
      finishSpeech('error');
    }
  }

  clear() {
    this.cancelCurrentSpeech();
    this.queue = [];
  }
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    try {
      this.isMuted = typeof localStorage !== 'undefined' && localStorage.getItem('backyard_muted') === 'true';
    } catch (_) {
      this.isMuted = false;
    }
    this.pageVisible = true;
    this.voiceQueue = new EmotionalVoiceEngine((speaking, item) => this.onVoiceQueueChange(speaking, item));
    this.vocalBank = new VocalSoundBank(null);
    this.buses = {};
    this.audioGraph = null;
    this.musicFilter = null;
    this.musicPlaybackGain = null;
    this.musicDuckToken = null;
    this.musicDuckLeases = new Map();
    this.nextMusicDuckId = 1;
    this.sfxVoices = new Map();
    this.nextSfxVoiceId = 1;
    this.droppedSfxVoices = 0;
    this.audioFailures = 0;
    this.rateLimitTimes = new Map();
    this.chargeVoice = null;
    this.chargeStartCount = 0;
    this.chargeStopCount = 0;

    // Procedural Generative Music State
    this.musicPlaying = false;
    this.musicWanted = false;
    this.musicIntensity = 'CALM';
    this.musicTempo = AUDIO_MIX_TUNING.MUSIC_TEMPO_MIN;
    this.targetMusicTempo = this.musicTempo;
    this.musicCutoff = AUDIO_MIX_TUNING.MUSIC_PROFILES.CALM.cutoff;
    this.targetMusicCutoff = this.musicCutoff;
    this.percussionDensity = AUDIO_MIX_TUNING.MUSIC_PROFILES.CALM.percussion;
    this.targetPercussionDensity = this.percussionDensity;
    this.lastMusicUpdateTime = null;
    this.musicTransitions = [];
    this.nextNoteTime = 0;
    this.currentBeat = 0;
    this.musicTimer = null;
    this.masterMusicGain = null;
    this.compressor = null;
    this.masterGain = null;
    this.currentCombo = 1;
  }

  init() {
    if (this.initialized && this.ctx) {
      this.resumeContext();
      return true;
    }
    if (typeof window === 'undefined') return false;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (typeof AudioCtx !== 'function') return false;
      this.ctx = new AudioCtx();
      this.audioGraph = createAudioBusGraph(this.ctx, { muted: this.isMuted });
      if (!this.audioGraph) {
        this.ctx = null;
        return false;
      }
      this.buses = this.audioGraph.buses;
      this.compressor = this.audioGraph.compressor;
      this.masterGain = this.buses.MASTER;
      this.masterMusicGain = this.audioGraph.musicInputGain;
      this.musicPlaybackGain = this.audioGraph.musicInputGain;
      this.initialized = true;
      this.vocalBank.init(this.ctx);
      this.resumeContext();
      return true;
    } catch (_) {
      this.ctx = null;
      this.audioGraph = null;
      this.initialized = false;
      this.buses = {};
      return false;
    }
  }

  resumeContext() {
    if (this.ctx?.state === 'suspended' && typeof this.ctx.resume === 'function') {
      try { Promise.resolve(this.ctx.resume()).catch(() => {}); } catch (_) {}
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('backyard_muted', this.isMuted.toString());
    } catch (_) {}
    try {
      this.audioGraph?.setMasterMuted(this.isMuted);
    } catch (_) {
      this.audioFailures++;
    }
    if (this.isMuted) {
      this.voiceQueue.clear();
      this.stopPowerCharge(true);
      this.stopMusic({ preserveIntent: true, fadeSeconds: 0.025 });
      this.clearMusicDucking();
      this.stopAllSfx(0.01);
    } else if (this.musicWanted && this.pageVisible) {
      this.startGenerativeMusic();
    }
    return this.isMuted;
  }

  getDestination(busName = 'SFX') {
    return this.buses?.[busName] || (this.ctx ? this.ctx.destination : null);
  }

  speakKevinVoice(text, emotion = 'RAGE', priority = 2, onComplete = null) {
    if (this.isMuted) return false;
    const category = this.resolveVocalCategory(text, emotion);
    if (!this.isRateLimited(`voice:${category}`, priority === 0 ? 700 : 2400)) {
      this.playProceduralVocal(category, priority === 0
        ? AUDIO_PRIORITY.CRITICAL_VOICE : AUDIO_PRIORITY.PARRY);
    }
    return this.voiceQueue.enqueue(text, emotion, priority, this, onComplete);
  }

  resolveVocalCategory(text = '', emotion = 'RAGE') {
    const value = String(text).toLowerCase();
    if (/headshot|bonk|glasses|right in my nose/.test(value)) return 'HEADSHOT';
    if (/parry|return to sender/.test(value)) return 'PARRY_SHOCK';
    if (/rampage|frenzy|havoc/.test(value)) return 'RAMPAGE_FRENZY';
    if (/greenhouse|conservatory|gasp/.test(value)) return 'GREENHOUSE_PANIC';
    if (/grill|fire/.test(value)) return 'GRILL_FIRE';
    if (/window|orchid|rage/.test(value) || emotion === 'RAGE') return 'WINDOW_RAGE';
    if (emotion === 'CRYING' || emotion === 'DESPAIRING') return 'DEFEAT_WHIMPER';
    if (emotion === 'PANIC') return 'GREENHOUSE_PANIC';
    if (emotion === 'SARCASTIC') return 'GRUFF';
    return 'WINDOW_RAGE';
  }

  playProceduralVocal(category, priority = AUDIO_PRIORITY.CRITICAL_VOICE, pan = 0) {
    if (!this.vocalBank || !this.ctx) return false;
    const played = this.runManagedAudioVoice('VOICE', priority, pan, ({ destination, registerSource }) => {
      return this.vocalBank.playVocalClip(category, destination, registerSource);
    });
    if (played) {
      const durations = {
        HEADSHOT: 0.65, WINDOW_RAGE: 0.55, GRILL_FIRE: 0.6, GREENHOUSE_PANIC: 0.5,
        PARRY_SHOCK: 0.42, RAMPAGE_FRENZY: 0.7, VICTORY_LAUGH: 0.95, DEFEAT_WHIMPER: 0.75,
        INTRO_SHOUT: 0.65
      };
      this.requestMusicDuck({
        decibels: priority >= AUDIO_PRIORITY.CRITICAL_VOICE
          ? AUDIO_MIX_TUNING.MUSIC_DUCK_VOICE_DB : AUDIO_MIX_TUNING.MUSIC_DUCK_STANDARD_VOICE_DB,
        durationSeconds: durations[String(category).toUpperCase()] || 0.6
      });
    }
    return played;
  }

  onVoiceQueueChange(speaking, item) {
    if (speaking) {
      this.releaseMusicDuck(this.musicDuckToken);
      this.musicDuckToken = this.requestMusicDuck({
        decibels: item?.priority === 0
          ? AUDIO_MIX_TUNING.MUSIC_DUCK_VOICE_DB : AUDIO_MIX_TUNING.MUSIC_DUCK_STANDARD_VOICE_DB,
        attackSeconds: AUDIO_MIX_TUNING.MUSIC_DUCK_ATTACK_SECONDS
      });
    } else {
      this.releaseMusicDuck(this.musicDuckToken);
      this.musicDuckToken = null;
    }
  }

  requestMusicDuck({
    decibels = AUDIO_MIX_TUNING.MUSIC_DUCK_MAJOR_DB,
    durationSeconds = 0,
    attackSeconds = AUDIO_MIX_TUNING.MUSIC_DUCK_ATTACK_SECONDS,
    releaseSeconds = AUDIO_MIX_TUNING.MUSIC_DUCK_RELEASE_SECONDS
  } = {}) {
    if (!Number.isFinite(decibels) || decibels > 0) return null;
    const token = `duck-${this.nextMusicDuckId++}`;
    const lease = {
      gain: decibelsToGain(decibels),
      releaseSeconds: Number.isFinite(releaseSeconds) ? Math.max(0.005, releaseSeconds) : AUDIO_MIX_TUNING.MUSIC_DUCK_RELEASE_SECONDS,
      timer: null
    };
    this.musicDuckLeases.set(token, lease);
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      lease.timer = setTimeout(() => this.releaseMusicDuck(token), durationSeconds * 1000);
    }
    this.applyMusicDuck(attackSeconds);
    return token;
  }

  releaseMusicDuck(token, releaseSeconds = null) {
    if (!token) return false;
    const lease = this.musicDuckLeases.get(token);
    if (!lease) return false;
    if (lease.timer) clearTimeout(lease.timer);
    this.musicDuckLeases.delete(token);
    const attack = Number.isFinite(releaseSeconds) ? releaseSeconds : lease.releaseSeconds;
    this.applyMusicDuck(attack);
    return true;
  }

  applyMusicDuck(attackSeconds = AUDIO_MIX_TUNING.MUSIC_DUCK_RELEASE_SECONDS) {
    let gain = 1;
    for (const lease of this.musicDuckLeases.values()) gain = Math.min(gain, lease.gain);
    try {
      this.audioGraph?.setMusicDuck(gain, attackSeconds);
    } catch (_) {
      this.audioFailures++;
    }
  }

  clearMusicDucking() {
    for (const lease of this.musicDuckLeases.values()) {
      if (lease.timer) clearTimeout(lease.timer);
    }
    this.musicDuckLeases.clear();
    this.musicDuckToken = null;
    this.applyMusicDuck(AUDIO_MIX_TUNING.MUSIC_DUCK_RELEASE_SECONDS);
  }

  duckMusicForEvent(type) {
    const durations = {
      POWER_SHOT: 0.32,
      PARRY: 0.24,
      PERFECT_PARRY: 0.55,
      KEVIN_HIT: 0.5,
      PLAYER_DAMAGED: 0.48,
      TRICK_CHAIN: 0.58,
      HAVOC_STARTED: 0.65
    };
    if (!Object.hasOwn(durations, type)) return null;
    return this.requestMusicDuck({
      decibels: type === 'PARRY' ? AUDIO_MIX_TUNING.MUSIC_DUCK_LIGHT_DB : AUDIO_MIX_TUNING.MUSIC_DUCK_MAJOR_DB,
      durationSeconds: durations[type]
    });
  }

  setPageVisible(isVisible) {
    this.pageVisible = Boolean(isVisible);
    if (!this.pageVisible) {
      this.stopMusic();
      this.stopPowerCharge(true);
      this.voiceQueue.clear();
      this.clearMusicDucking();
      this.stopAllSfx(0.02);
    }
  }

  resetTransientAudio() {
    this.voiceQueue.clear();
    this.voiceQueue.lastSpokenText = '';
    this.voiceQueue.cooldownTimer = 0;
    this.stopPowerCharge(true);
    this.stopMusic();
    this.clearMusicDucking();
    this.stopAllSfx(0.02);
    this.rateLimitTimes.clear();
    this.currentCombo = 1;
    this.currentKevinState = 'CALM';
    this.musicIntensity = 'CALM';
    this.targetMusicTempo = AUDIO_MIX_TUNING.MUSIC_TEMPO_MIN;
    this.targetMusicCutoff = AUDIO_MIX_TUNING.MUSIC_PROFILES.CALM.cutoff;
    this.targetPercussionDensity = AUDIO_MIX_TUNING.MUSIC_PROFILES.CALM.percussion;
    this.musicTempo = AUDIO_MIX_TUNING.MUSIC_TEMPO_MIN;
    this.musicCutoff = this.targetMusicCutoff;
    this.percussionDensity = this.targetPercussionDensity;
    this.musicTransitions = [];
  }

  getAudioDiagnosticSnapshot() {
    return {
      initialized: this.initialized,
      muted: this.isMuted,
      musicPlaying: this.musicPlaying,
      musicIntensity: this.musicIntensity,
      currentTempo: Number.isFinite(this.musicTempo) ? this.musicTempo : AUDIO_MIX_TUNING.MUSIC_TEMPO_MIN,
      targetTempo: Number.isFinite(this.targetMusicTempo) ? this.targetMusicTempo : AUDIO_MIX_TUNING.MUSIC_TEMPO_MIN,
      activeSfxVoices: this.sfxVoices.size,
      droppedSfxVoices: this.droppedSfxVoices,
      audioFailures: this.audioFailures,
      chargeVoiceActive: Boolean(this.chargeVoice),
      chargeStartCount: this.chargeStartCount,
      chargeStopCount: this.chargeStopCount,
      musicDuck: this.getMusicDuckGain(),
      musicTransitions: this.musicTransitions.map(transition => ({ ...transition })),
      voiceSpeaking: Boolean(this.voiceQueue?.isSpeaking)
    };
  }

  getMusicDuckGain() {
    let gain = 1;
    for (const lease of this.musicDuckLeases.values()) gain = Math.min(gain, lease.gain);
    return gain;
  }

  // =========================================================================
  // GENERATIVE PROCEDURAL MUSIC LAYER
  // =========================================================================
  startGenerativeMusic() {
    this.musicWanted = true;
    if (!this.ctx || this.isMuted || !this.pageVisible || this.musicPlaying) return false;
    try {
      this.resumeContext();
      this.musicPlaying = true;
      this.lastMusicUpdateTime = this.ctx.currentTime;
      const now = this.ctx.currentTime;
      this.musicPlaybackGain?.gain.cancelScheduledValues?.(now);
      this.musicPlaybackGain?.gain.setTargetAtTime?.(1, now, 0.06);
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.currentBeat = 0;
      this.scheduleMusicStep();
      return this.musicPlaying;
    } catch (_) {
      this.audioFailures++;
      this.stopMusic();
      return false;
    }
  }

  updateMusicCombo(combo) {
    if (!Number.isFinite(combo)) return;
    this.updateReactiveMusic({ combo, kevinState: this.currentKevinState || 'CALM', havocActive: this.musicIntensity === 'HAVOC' });
  }

  updateReactiveMusic(snapshot = {}) {
    const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const state = resolveReactiveMusicState(safeSnapshot);
    const profile = resolveReactiveMusicProfile(state);
    if (Number.isFinite(safeSnapshot.combo)) this.currentCombo = Math.max(1, safeSnapshot.combo);
    this.currentKevinState = safeSnapshot.kevinState || this.currentKevinState || 'CALM';
    if (state !== this.musicIntensity) {
      this.musicIntensity = state;
      this.musicTransitions.push({
        state,
        tempo: profile.tempo,
        at: Number.isFinite(this.ctx?.currentTime) ? this.ctx.currentTime : 0
      });
      if (this.musicTransitions.length > 24) this.musicTransitions.shift();
    }
    this.targetMusicTempo = profile.tempo;
    this.targetMusicCutoff = profile.cutoff;
    this.targetPercussionDensity = profile.percussion;
  }

  advanceMusicTargets(now) {
    if (!Number.isFinite(now)) return;
    const previous = Number.isFinite(this.lastMusicUpdateTime) ? this.lastMusicUpdateTime : now;
    const dt = Math.max(0, Math.min(0.2, now - previous));
    const tempoDelta = 20 * dt;
    this.musicTempo += Math.max(-tempoDelta, Math.min(tempoDelta, this.targetMusicTempo - this.musicTempo));
    const blend = 1 - Math.exp(-5 * dt);
    this.musicCutoff += (this.targetMusicCutoff - this.musicCutoff) * blend;
    this.percussionDensity += (this.targetPercussionDensity - this.percussionDensity) * blend;
    this.lastMusicUpdateTime = now;
  }

  stopMusic({ preserveIntent = false, fadeSeconds = 0.12 } = {}) {
    if (!preserveIntent) this.musicWanted = false;
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    try {
      if (this.ctx && this.musicPlaybackGain?.gain) {
        const now = this.ctx.currentTime;
        const fade = Number.isFinite(fadeSeconds) ? Math.max(0.005, fadeSeconds) : 0.12;
        this.musicPlaybackGain.gain.cancelScheduledValues?.(now);
        this.musicPlaybackGain.gain.setTargetAtTime?.(0, now, fade / 3);
        if (!this.musicPlaybackGain.gain.setTargetAtTime) this.musicPlaybackGain.gain.setValueAtTime(0, now + fade);
      }
    } catch (_) {
      this.audioFailures++;
    }
    this.lastMusicUpdateTime = null;
  }

  scheduleMusicStep() {
    if (!this.musicPlaying || !this.ctx || this.isMuted || !this.pageVisible) return;
    try {
      this.advanceMusicTargets(this.ctx.currentTime);

      const secondsPerBeat = 60.0 / this.musicTempo;
      const stepDuration = secondsPerBeat * 0.5; // Eighth notes

      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        this.playGenerativeNote(this.nextNoteTime, this.currentBeat, this.currentCombo);
        this.nextNoteTime += stepDuration;
        this.currentBeat = (this.currentBeat + 1) % 16;
      }

      if (!this.musicTimer) {
        this.musicTimer = setTimeout(() => {
          this.musicTimer = null;
          this.scheduleMusicStep();
        }, 60);
      }
    } catch (_) {
      this.audioFailures++;
      this.stopMusic();
    }
  }

  playGenerativeNote(time, beat, combo) {
    if (this.isMuted || !this.ctx) return;
    const ctx = this.ctx;

    // Funk Bassline in C minor (C2, Eb2, F2, G2, Bb2)
    const scale = [65.41, 77.78, 87.31, 98.00, 116.54, 130.81]; // Hz
    const bassPattern = [0, -1, 2, -1, 3, -1, 1, 0, 0, -1, 4, -1, 3, 2, 1, 0];
    const noteIdx = bassPattern[beat];

    if (noteIdx >= 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Slap bass sound
      osc.type = 'sawtooth';
      const freq = scale[noteIdx % scale.length];
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      // Lowpass opens up with high combo
      const cutoff = Math.max(120, Math.min(2600, this.musicCutoff + Math.min(650, (combo - 1) * 45)));
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + 0.18);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterMusicGain);

      osc.start(time);
      osc.stop(time + 0.18);
    }

    // Hi-hat / Shaker noise on off-beats
    if (beat % 2 === 1 && (combo >= 2 || this.percussionDensity > 0.2)) {
      const densityGate = beat % 4 === 1 ? 0.12 : 0.42;
      if (this.percussionDensity >= densityGate) {
        this.playProceduralHiHat(time, 0.018 + this.percussionDensity * 0.018);
      }
    }

    // Kick punch on beat 0 and 8
    if ((beat === 0 || beat === 8) && (combo >= 4 || this.percussionDensity >= 0.68)) {
      this.playProceduralKickDrum(time);
    }
  }

  playProceduralHiHat(time, volume = 0.03) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Number.isFinite(volume) ? Math.max(0, Math.min(0.06, volume)) : 0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  playProceduralKickDrum(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.1);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  createManagedAudioVoice(busName = 'SFX', priority = AUDIO_PRIORITY.NORMAL, pan = 0) {
    if (!this.ctx || this.isMuted || !this.pageVisible || !this.buses?.[busName]) return null;
    if (this.sfxVoices.size >= AUDIO_MIX_TUNING.SFX_POLYPHONY_LIMIT) {
      const lowest = [...this.sfxVoices.values()]
        .sort((a, b) => a.priority - b.priority || a.id - b.id)[0];
      if (!lowest || priority <= lowest.priority) {
        this.droppedSfxVoices++;
        return null;
      }
      this.droppedSfxVoices++;
      this.stopManagedAudioVoice(lowest, 0.012);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    const safePan = clampAudioPan(pan);
    const panner = typeof this.ctx.createStereoPanner === 'function'
      ? this.ctx.createStereoPanner()
      : null;
    if (panner) {
      panner.pan.setValueAtTime(safePan, this.ctx.currentTime);
      gain.connect(panner);
      panner.connect(this.buses[busName]);
    } else {
      gain.connect(this.buses[busName]);
    }

    const voice = {
      id: this.nextSfxVoiceId++,
      priority,
      busName,
      pan: safePan,
      gain,
      panner,
      sources: new Set(),
      active: true
    };
    this.sfxVoices.set(voice.id, voice);
    return voice;
  }

  registerManagedAudioSource(voice, source) {
    if (!voice?.active || !source) return false;
    voice.sources.add(source);
    const priorOnEnded = source.onended;
    source.onended = event => {
      if (typeof priorOnEnded === 'function') priorOnEnded.call(source, event);
      voice.sources.delete(source);
      if (voice.sources.size === 0) this.finishManagedAudioVoice(voice);
    };
    return true;
  }

  finishManagedAudioVoice(voice) {
    if (!voice?.active) return;
    voice.active = false;
    this.sfxVoices.delete(voice.id);
  }

  stopManagedAudioVoice(voice, fadeSeconds = 0.02) {
    if (!voice?.active) return;
    const now = this.ctx?.currentTime || 0;
    const fade = Number.isFinite(fadeSeconds) ? Math.max(0.005, fadeSeconds) : 0.02;
    try {
      voice.gain.gain.cancelScheduledValues?.(now);
      voice.gain.gain.setTargetAtTime?.(0, now, fade / 3);
      if (!voice.gain.gain.setTargetAtTime) voice.gain.gain.setValueAtTime(0, now + fade);
    } catch (_) {}
    for (const source of voice.sources) {
      try { source.stop(now + fade); } catch (_) {}
    }
    this.finishManagedAudioVoice(voice);
  }

  runManagedAudioVoice(busName, priority, pan, play) {
    let voice = null;
    try {
      voice = this.createManagedAudioVoice(busName, priority, pan);
      if (!voice) return false;
      const result = play({
        ctx: this.ctx,
        destination: voice.gain,
        registerSource: source => this.registerManagedAudioSource(voice, source),
        startSource: (source, startAt = this.ctx.currentTime, duration = null) => {
          this.registerManagedAudioSource(voice, source);
          source.start(startAt);
          if (Number.isFinite(duration) && duration > 0) source.stop(startAt + duration);
        }
      });
      if (!voice.sources.size) this.finishManagedAudioVoice(voice);
      return result !== false;
    } catch (_) {
      this.audioFailures++;
      if (voice) this.stopManagedAudioVoice(voice, 0.005);
      return false;
    }
  }

  stopAllSfx(fadeSeconds = 0.02) {
    for (const voice of [...this.sfxVoices.values()]) this.stopManagedAudioVoice(voice, fadeSeconds);
  }

  isRateLimited(key, intervalMs) {
    if (!key || !Number.isFinite(intervalMs) || intervalMs <= 0) return false;
    const now = Number.isFinite(this.ctx?.currentTime) ? this.ctx.currentTime * 1000 : 0;
    const previous = this.rateLimitTimes.get(key);
    if (Number.isFinite(previous) && now - previous < intervalMs) return true;
    this.rateLimitTimes.set(key, now);
    return false;
  }

  startPowerCharge() {
    if (this.chargeVoice) return true;
    let voice = null;
    try {
      voice = this.createManagedAudioVoice('SFX', AUDIO_PRIORITY.NORMAL, 0);
      if (!voice) return false;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(220, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.045, this.ctx.currentTime);
      oscillator.connect(gain);
      gain.connect(voice.gain);
      this.registerManagedAudioSource(voice, oscillator);
      oscillator.start();
      this.chargeVoice = { voice, oscillator, gain };
      this.chargeStartCount++;
      return true;
    } catch (_) {
      this.audioFailures++;
      if (voice) this.stopManagedAudioVoice(voice, 0.005);
      return false;
    }
  }

  updatePowerCharge(charge) {
    if (!Number.isFinite(charge)) return false;
    if (!this.chargeVoice && !this.startPowerCharge()) return false;
    try {
      const value = Math.max(0, Math.min(1, charge));
      const now = this.ctx.currentTime;
      const { oscillator, gain } = this.chargeVoice;
      const frequency = 220 + value * 420;
      const level = 0.045 + value * 0.025;
      oscillator.frequency.setTargetAtTime?.(frequency, now, 0.035);
      if (!oscillator.frequency.setTargetAtTime) oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setTargetAtTime?.(level, now, 0.035);
      if (!gain.gain.setTargetAtTime) gain.gain.setValueAtTime(level, now);
      return true;
    } catch (_) {
      this.audioFailures++;
      this.stopPowerCharge(true);
      return false;
    }
  }

  stopPowerCharge(immediate = false) {
    const charge = this.chargeVoice;
    if (!charge) return false;
    this.chargeVoice = null;
    this.chargeStopCount++;
    this.stopManagedAudioVoice(charge.voice, immediate ? 0.005 : 0.035);
    return true;
  }

  playPowerShotCharge(charge) {
    return this.updatePowerCharge(Number.isFinite(charge) ? charge : 0);
  }

  playManagedSfx(priority, options, recipe) {
    const settings = options && typeof options === 'object' ? options : {};
    if (settings.rateLimitKey && this.isRateLimited(settings.rateLimitKey, settings.rateLimitMs || 0)) return false;
    return this.runManagedAudioVoice('SFX', priority, settings.pan, recipe);
  }

  addTone({ ctx, destination, registerSource }, {
    type = 'sine', frequency = 220, endFrequency = frequency, volume = 0.2,
    duration = 0.12, startOffset = 0, attack = 0.003, filterType = null,
    filterFrequency = 1000, filterQ = 1
  } = {}) {
    const start = ctx.currentTime + Math.max(0, startOffset);
    const length = Number.isFinite(duration) ? Math.max(0.012, Math.min(3, duration)) : 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, Math.min(18000, frequency)), start);
    if (Number.isFinite(endFrequency) && endFrequency > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, Math.min(18000, endFrequency)), start + length);
    }
    let output = gain;
    if (filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(Math.max(20, Math.min(18000, filterFrequency)), start);
      filter.Q.setValueAtTime(Math.max(0.1, Math.min(20, filterQ)), start);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, Math.min(0.7, volume)), start + Math.min(attack, length / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    output.connect(destination);
    registerSource(osc);
    osc.start(start);
    osc.stop(start + length);
    return osc;
  }

  addNoise({ ctx, destination, registerSource }, {
    duration = 0.08, volume = 0.1, filterType = 'highpass',
    filterFrequency = 1800, pan = 0, rate = null
  } = {}) {
    const start = ctx.currentTime;
    const length = Number.isFinite(duration) ? Math.max(0.012, Math.min(2, duration)) : 0.08;
    const size = Math.max(1, Math.floor(ctx.sampleRate * length));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size * 0.45);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (Number.isFinite(rate) && source.playbackRate?.setValueAtTime) {
      source.playbackRate.setValueAtTime(Math.max(0.25, Math.min(3, rate)), start);
    }
    let output = source;
    if (filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(Math.max(20, Math.min(18000, filterFrequency)), start);
      source.connect(filter);
      output = filter;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, Math.min(0.6, volume)), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    output.connect(gain);
    gain.connect(destination);
    registerSource(source);
    source.start(start);
    source.stop(start + length);
    return source;
  }

  // =========================================================================
  // MANAGED PROCEDURAL VOCAL CUES
  // =========================================================================
  playAngerShout() {
    return this.runManagedAudioVoice('VOICE', AUDIO_PRIORITY.PARRY, 0, voice => {
      this.addTone(voice, { type: 'sawtooth', frequency: 280, endFrequency: 120, volume: 0.18, duration: 0.22, filterType: 'bandpass', filterFrequency: 750 });
      this.addTone(voice, { type: 'sawtooth', frequency: 560, endFrequency: 240, volume: 0.12, duration: 0.22, filterType: 'bandpass', filterFrequency: 1800 });
    });
  }

  playSobWhimper() {
    return this.runManagedAudioVoice('VOICE', AUDIO_PRIORITY.PARRY, 0, voice => {
      this.addTone(voice, { type: 'sine', frequency: 540, endFrequency: 430, volume: 0.18, duration: 0.32 });
    });
  }

  playPanicGasp() {
    return this.runManagedAudioVoice('VOICE', AUDIO_PRIORITY.PARRY, 0, voice => {
      this.addTone(voice, { type: 'triangle', frequency: 320, endFrequency: 680, volume: 0.18, duration: 0.18 });
      this.addNoise(voice, { duration: 0.14, volume: 0.08, filterType: 'bandpass', filterFrequency: 2100 });
    });
  }

  playSarcasticSigh() {
    return this.runManagedAudioVoice('VOICE', AUDIO_PRIORITY.PARRY, 0, voice => {
      this.addNoise(voice, { duration: 0.45, volume: 0.13, filterType: 'bandpass', filterFrequency: 580 });
      this.addTone(voice, { type: 'sine', frequency: 180, endFrequency: 95, volume: 0.06, duration: 0.4 });
    });
  }

  playThrowGrunt() {
    return this.runManagedAudioVoice('VOICE', AUDIO_PRIORITY.NORMAL, 0, voice => {
      this.addTone(voice, { type: 'sine', frequency: 140, endFrequency: 65, volume: 0.08, duration: 0.12 });
    });
  }

  // =========================================================================
  // ARCADE SFX
  // =========================================================================
  playKick(combo = 1, options = {}) {
    const safeCombo = Number.isFinite(combo) ? Math.max(1, combo) : 1;
    return this.playManagedSfx(AUDIO_PRIORITY.NORMAL, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 112 + Math.min(96, (safeCombo - 1) * 4), endFrequency: 38, volume: 0.22, duration: 0.115 });
      this.addNoise(voice, { duration: 0.024, volume: 0.07, filterType: 'bandpass', filterFrequency: 900 });
    });
  }

  playHeader(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.PARRY, options, voice => {
      this.addTone(voice, { type: 'triangle', frequency: 430, endFrequency: 230, volume: 0.12, duration: 0.085 });
      this.addTone(voice, { type: 'square', frequency: 1450, endFrequency: 880, volume: 0.055, duration: 0.035 });
    });
  }

  playPerfectStrike({ pan = 0, header = false } = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, { pan }, voice => {
      this.addTone(voice, { type: 'sine', frequency: header ? 185 : 120, endFrequency: 34, volume: 0.26, duration: 0.13 });
      this.addNoise(voice, { duration: 0.038, volume: 0.15, filterType: 'highpass', filterFrequency: 2600 });
      this.addTone(voice, { type: 'sine', frequency: header ? 1046 : 880, endFrequency: header ? 1318 : 1174, volume: 0.12, duration: 0.22, startOffset: 0.018 });
    });
  }

  playPowerShotFire(charge = 1, options = {}) {
    const strength = Number.isFinite(charge) ? Math.max(0, Math.min(1, charge)) : 0;
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 92, endFrequency: 32, volume: 0.32, duration: 0.21 });
      this.addTone(voice, { type: 'sawtooth', frequency: 150 + strength * 120, endFrequency: 480 + strength * 520, volume: 0.2 + strength * 0.16, duration: 0.24 });
      this.addNoise(voice, { duration: 0.2, volume: 0.15 + strength * 0.08, filterType: 'bandpass', filterFrequency: 1200 + strength * 1500 });
    });
  }

  playPlayerHurt(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.PLAYER_DAMAGE, options, voice => {
      this.addTone(voice, { type: 'sawtooth', frequency: 170, endFrequency: 48, volume: 0.34, duration: 0.26, filterType: 'lowpass', filterFrequency: 1100 });
      this.addNoise(voice, { duration: 0.12, volume: 0.14, filterType: 'lowpass', filterFrequency: 700 });
    });
  }

  playBlock(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.PARRY, options, voice => {
      this.addTone(voice, { type: 'triangle', frequency: 125, endFrequency: 62, volume: 0.18, duration: 0.13 });
      this.addNoise(voice, { duration: 0.055, volume: 0.08, filterType: 'lowpass', filterFrequency: 850 });
    });
  }

  playParry(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.PARRY, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 690, endFrequency: 1320, volume: 0.19, duration: 0.15 });
      this.addNoise(voice, { duration: 0.045, volume: 0.09, filterType: 'highpass', filterFrequency: 2800 });
    });
  }

  playPerfectParry(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      this.addNoise(voice, { duration: 0.028, volume: 0.22, filterType: 'highpass', filterFrequency: 3500 });
      this.addTone(voice, { type: 'sine', frequency: 95, endFrequency: 42, volume: 0.22, duration: 0.16 });
      this.addTone(voice, { type: 'sine', frequency: 780, endFrequency: 1560, volume: 0.23, duration: 0.28 });
      this.addTone(voice, { type: 'triangle', frequency: 1850, endFrequency: 2400, volume: 0.08, duration: 0.12, startOffset: 0.035 });
    });
  }

  playThrowWhoosh(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.NORMAL, options, voice => {
      this.addNoise(voice, { duration: 0.18, volume: 0.09, filterType: 'bandpass', filterFrequency: 1100 });
    });
  }

  playMaterialBreak(material = 'GLASS', options = {}) {
    const kind = String(material || '').toUpperCase();
    const recipes = {
      GLASS: voice => {
        for (let i = 0; i < 5; i++) this.addTone(voice, { type: 'sawtooth', frequency: 1850 + i * 430, endFrequency: 260 + i * 42, volume: 0.13, duration: 0.16, startOffset: i * 0.012 });
        this.addNoise(voice, { duration: 0.12, volume: 0.14, filterType: 'highpass', filterFrequency: 3800 });
      },
      CERAMIC: voice => {
        this.addTone(voice, { type: 'square', frequency: 620, endFrequency: 185, volume: 0.2, duration: 0.16 });
        this.addTone(voice, { type: 'triangle', frequency: 920, endFrequency: 330, volume: 0.12, duration: 0.13, startOffset: 0.024 });
        this.addNoise(voice, { duration: 0.08, volume: 0.12, filterType: 'bandpass', filterFrequency: 1600 });
      },
      WOOD: voice => {
        this.addTone(voice, { type: 'triangle', frequency: 190, endFrequency: 74, volume: 0.25, duration: 0.19 });
        this.addTone(voice, { type: 'square', frequency: 360, endFrequency: 145, volume: 0.1, duration: 0.11, startOffset: 0.018 });
        this.addNoise(voice, { duration: 0.1, volume: 0.1, filterType: 'lowpass', filterFrequency: 1200 });
      },
      METAL: voice => {
        this.addTone(voice, { type: 'triangle', frequency: 740, endFrequency: 520, volume: 0.22, duration: 0.42 });
        this.addTone(voice, { type: 'sine', frequency: 1180, endFrequency: 830, volume: 0.12, duration: 0.34, startOffset: 0.012 });
      },
      PLASTIC: voice => {
        this.addTone(voice, { type: 'square', frequency: 460, endFrequency: 210, volume: 0.18, duration: 0.085, filterType: 'lowpass', filterFrequency: 1300 });
        this.addTone(voice, { type: 'triangle', frequency: 275, endFrequency: 135, volume: 0.12, duration: 0.12, startOffset: 0.03 });
      },
      FABRIC: voice => {
        this.addNoise(voice, { duration: 0.24, volume: 0.13, filterType: 'bandpass', filterFrequency: 720 });
        this.addNoise(voice, { duration: 0.16, volume: 0.07, filterType: 'highpass', filterFrequency: 2200, rate: 0.7 });
      },
      SOIL: voice => {
        this.addNoise(voice, { duration: 0.2, volume: 0.18, filterType: 'lowpass', filterFrequency: 390 });
        this.addTone(voice, { type: 'sine', frequency: 92, endFrequency: 38, volume: 0.2, duration: 0.2 });
      }
    };
    const recipe = recipes[kind];
    if (!recipe) return false;
    return this.playManagedSfx(AUDIO_PRIORITY.MATERIAL, options, voice => recipe(voice));
  }

  playShatter(isGlass = true, pitch = 100, options = {}) {
    return this.playMaterialBreak(isGlass ? 'GLASS' : 'CERAMIC', options);
  }

  playGlassShatter() {
    this.playShatter(true, 100);
  }

  playKevinHit(options = {}) {
    return this.playGnomeBonk({ ...options, priority: AUDIO_PRIORITY.KEVIN_HIT });
  }

  playReturnedProjectileReward(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 660, endFrequency: 990, volume: 0.14, duration: 0.18 });
      this.addTone(voice, { type: 'sine', frequency: 990, endFrequency: 1320, volume: 0.1, duration: 0.2, startOffset: 0.075 });
    });
  }

  playGnomeBonk(options = {}) {
    const priority = options?.priority ?? AUDIO_PRIORITY.KEVIN_HIT;
    return this.playManagedSfx(priority, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 490, endFrequency: 135, volume: 0.29, duration: 0.19 });
      this.addTone(voice, { type: 'triangle', frequency: 215, endFrequency: 105, volume: 0.16, duration: 0.12, startOffset: 0.012 });
    });
  }

  playExplosion(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.MATERIAL, options, voice => {
      this.addTone(voice, { type: 'sawtooth', frequency: 160, endFrequency: 28, volume: 0.38, duration: 0.46, filterType: 'lowpass', filterFrequency: 900 });
      this.addNoise(voice, { duration: 0.32, volume: 0.2, filterType: 'lowpass', filterFrequency: 650 });
    });
  }

  playThud(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.COSMETIC, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: 85, endFrequency: 25, volume: 0.17, duration: 0.09 });
    });
  }

  playChime(combo = 1, options = {}) {
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
    const index = Number.isFinite(combo) ? Math.max(0, Math.floor(combo - 1)) % notes.length : 0;
    return this.playManagedSfx(AUDIO_PRIORITY.NORMAL, options, voice => {
      this.addTone(voice, { type: 'sine', frequency: notes[index], endFrequency: notes[index] * 1.01, volume: 0.12, duration: 0.24 });
    });
  }

  playComboMilestoneFanfare(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.addTone(voice, { type: 'sine', frequency, endFrequency: frequency * 1.005, volume: 0.095, duration: 0.42, startOffset: index * 0.055 });
      });
    });
  }

  playTrickChain(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      [587.33, 739.99, 880, 1174.66].forEach((frequency, index) => {
        this.addTone(voice, { type: 'triangle', frequency, endFrequency: frequency * 1.035, volume: 0.12, duration: 0.29, startOffset: index * 0.065 });
      });
    });
  }

  playKevinEscalation(state, options = {}) {
    const notes = { ANGRY: [330, 494], FURIOUS: [262, 392, 587], RAMPAGE: [220, 330, 494, 659] }[String(state).toUpperCase()];
    if (!notes) return false;
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      notes.forEach((frequency, index) => this.addTone(voice, {
        type: 'sawtooth', frequency, endFrequency: frequency * 1.05, volume: 0.09, duration: 0.22, startOffset: index * 0.045, filterType: 'lowpass', filterFrequency: 1800
      }));
    });
  }

  playHavocStart(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      this.addNoise(voice, { duration: 0.07, volume: 0.17, filterType: 'highpass', filterFrequency: 2400 });
      [392, 587.33, 784, 1174.66].forEach((frequency, index) => this.addTone(voice, {
        type: 'sawtooth', frequency, endFrequency: frequency * 1.08, volume: 0.12, duration: 0.35, startOffset: index * 0.06, filterType: 'lowpass', filterFrequency: 3100
      }));
    });
  }

  playHavocEnd(options = {}) {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, options, voice => {
      this.addTone(voice, { type: 'triangle', frequency: 740, endFrequency: 370, volume: 0.12, duration: 0.36 });
      this.addTone(voice, { type: 'sine', frequency: 494, endFrequency: 247, volume: 0.1, duration: 0.3, startOffset: 0.04 });
    });
  }

  playWhistle() {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, {}, voice => {
      this.addTone(voice, { type: 'sine', frequency: 2650, endFrequency: 2680, volume: 0.16, duration: 0.38 });
      this.addTone(voice, { type: 'sine', frequency: 3120, endFrequency: 3150, volume: 0.13, duration: 0.38 });
    });
  }

  playDefeatHorn() {
    return this.playManagedSfx(AUDIO_PRIORITY.SIGNATURE, {}, voice => {
      [311.13, 293.66, 277.18, 261.63].forEach((frequency, index) => {
        this.addTone(voice, {
          type: 'sawtooth', frequency, endFrequency: frequency - 12,
          volume: 0.16, duration: 0.22, startOffset: index * 0.22,
          filterType: 'lowpass', filterFrequency: 1600
        });
      });
    });
  }
}

export const sounds = new SoundEngine();
