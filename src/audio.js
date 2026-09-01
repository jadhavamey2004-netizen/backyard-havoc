import { VocalSoundBank } from './audio_assets.js';

export class EmotionalVoiceEngine {
  constructor() {
    this.queue = [];
    this.isSpeaking = false;
    this.currentPriority = 999;
    this.availableVoices = [];
    this.cooldownTimer = 0;
    this.lastSpokenText = '';
    this.minCooldownMs = 2600;

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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || typeof text !== 'string') return;

    const now = Date.now();

    // Priority 0: Critical Headshot / Parry interrupts immediately
    if (priority === 0) {
      this.cancelCurrentSpeech();
      this.queue = [];
    } else {
      // Non-critical line: drop immediately if already speaking or within cooldown
      if (this.isSpeaking) return;
      if (now - this.cooldownTimer < this.minCooldownMs) return;
      if (this.lastSpokenText === text && now - this.cooldownTimer < 8000) return;
    }

    this.queue = [{ text, emotion, priority, soundEngine, onComplete, timestamp: now }];
    this.processNext();
  }

  cancelCurrentSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isSpeaking = false;
    this.currentPriority = 999;
    this.currentUtterance = null;
  }

  processNext() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    // Discard stale item if it was created more than 1.8s ago
    if (Date.now() - item.timestamp > 1800) return;

    this.isSpeaking = true;
    this.currentPriority = item.priority;
    this.lastSpokenText = item.text;
    this.cooldownTimer = Date.now();

    // Trigger vocal sound cue
    if (item.soundEngine) {
      const txt = item.text.toLowerCase();
      if (item.emotion === 'RAGE' || txt.includes('scream')) item.soundEngine.playAngerShout();
      else if (item.emotion === 'CRYING' || item.emotion === 'DESPAIRING' || txt.includes('sob')) item.soundEngine.playSobWhimper();
      else if (item.emotion === 'PANIC' || txt.includes('gasp')) item.soundEngine.playPanicGasp();
      else if (item.emotion === 'SARCASTIC' || txt.includes('sigh')) item.soundEngine.playSarcasticSigh();
    }

    // Phonetically sanitize text to prevent spelling letters like O-W-W-W
    const spokenText = this.normalizePhonetics(item.text);
    if (!spokenText) {
      this.isSpeaking = false;
      this.currentPriority = 999;
      if (item.onComplete) item.onComplete();
      return;
    }

    try {
      // Split into clauses to deliver dramatic pitch shift between exclamation and rant
      const clauses = spokenText.split(/(?<=[!?])\s+/).filter(c => c.trim().length > 0);
      const totalClauses = clauses.length;

      let clauseIdx = 0;
      const voice = this.getPreferredVoice();

      const speakClause = () => {
        if (!this.isSpeaking || clauseIdx >= totalClauses) {
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
          if (clauseIdx < totalClauses) {
            // Short dramatic cadence pause between clauses (60ms)
            setTimeout(() => {
              if (this.isSpeaking) speakClause();
            }, 60);
          } else {
            finishSpeech();
          }
        };

        utterance.onerror = finishSpeech;
        window.speechSynthesis.speak(utterance);
      };

      const finishSpeech = () => {
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
        this.currentUtterance = null;
        this.isSpeaking = false;
        this.currentPriority = 999;
        if (item.onComplete) item.onComplete();
      };

      this.watchdogTimer = setTimeout(() => {
        if (this.isSpeaking) {
          finishSpeech();
        }
      }, 5500);

      speakClause();
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
      this.isSpeaking = false;
      this.currentPriority = 999;
      if (item.onComplete) item.onComplete();
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
    this.isMuted = (typeof localStorage !== 'undefined' && localStorage.getItem('backyard_muted') === 'true');
    this.voiceQueue = new EmotionalVoiceEngine();
    this.vocalBank = new VocalSoundBank(null);

    // Procedural Generative Music State
    this.musicPlaying = false;
    this.musicTempo = 88; // BPM base
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
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
        this.vocalBank.init(this.ctx);

        // 1. Studio-grade Master Dynamics Compressor (Eliminates digital clipping)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        // 2. Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 3. Dedicated Music Sub-bus
        this.masterMusicGain = this.ctx.createGain();
        this.masterMusicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.masterMusicGain.connect(this.compressor);
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('backyard_muted', this.isMuted.toString());
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
    }
    if (this.isMuted) {
      this.voiceQueue.clear();
    }
    return this.isMuted;
  }

  getDestination() {
    return this.compressor || (this.ctx ? this.ctx.destination : null);
  }

  speakKevinVoice(text, emotion = 'RAGE', priority = 2, onComplete = null) {
    if (this.isMuted) return;
    // 1. Play subtle human cartoon vocal cue
    if (this.vocalBank) {
      this.vocalBank.playVocalClip(emotion, this.getDestination());
    }
    // 2. Play clear, pleasant character voice lines
    this.voiceQueue.enqueue(text, emotion, priority, this, onComplete);
  }

  // =========================================================================
  // GENERATIVE PROCEDURAL MUSIC LAYER (Scales BPM & Pitch with Combo)
  // =========================================================================
  startGenerativeMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.currentBeat = 0;
    this.scheduleMusicStep();
  }

  updateMusicCombo(combo) {
    this.currentCombo = combo;
    // Scale tempo: 88 BPM base -> 150 BPM at 12x combo
    this.musicTempo = Math.min(150, 88 + (combo - 1) * 5.5);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusicStep() {
    if (!this.musicPlaying || !this.ctx) return;

    const secondsPerBeat = 60.0 / this.musicTempo;
    const stepDuration = secondsPerBeat * 0.5; // Eighth notes

    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this.playGenerativeNote(this.nextNoteTime, this.currentBeat, this.currentCombo);
      this.nextNoteTime += stepDuration;
      this.currentBeat = (this.currentBeat + 1) % 16;
    }

    this.musicTimer = setTimeout(() => this.scheduleMusicStep(), 60);
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
      const cutoff = 350 + Math.min(1400, (combo - 1) * 120);
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
    if (beat % 2 === 1 && combo >= 2) {
      this.playProceduralHiHat(time);
    }

    // Kick punch on beat 0 and 8
    if ((beat === 0 || beat === 8) && combo >= 4) {
      this.playProceduralKickDrum(time);
    }
  }

  playProceduralHiHat(time) {
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
    gain.gain.setValueAtTime(0.03, time);
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

  // =========================================================================
  // ENHANCED EMOTIONAL VOCAL CUES (Formants, Tremolo, Breath Injections)
  // =========================================================================
  playAngerShout() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Dual-formant vocal scream synthesis (F1 = 750Hz, F2 = 1800Hz human throat resonance)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter1 = ctx.createBiquadFilter();
    const filter2 = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(280, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.22);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(560, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.22);

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(750, ctx.currentTime);
    filter1.Q.setValueAtTime(3.0, ctx.currentTime);

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1800, ctx.currentTime);
    filter2.Q.setValueAtTime(4.0, ctx.currentTime);

    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(filter1);
    osc2.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(this.getDestination());

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.22);
    osc2.stop(ctx.currentTime + 0.22);
  }

  playSobWhimper() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Tremolo LFO for wavering crying vocal chord
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(430, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(510, ctx.currentTime + 0.32);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(7.5, ctx.currentTime); // 7.5 Hz crying tremolo
    lfoGain.gain.setValueAtTime(0.12, ctx.currentTime);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

    lfo.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.getDestination());

    lfo.start();
    osc.start();
    lfo.stop(ctx.currentTime + 0.32);
    osc.stop(ctx.currentTime + 0.32);
  }

  playPanicGasp() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Filtered breath inhalation noise + rising pitch whistle
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.18);

    oscGain.gain.setValueAtTime(0.24, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  playSarcasticSigh() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Bandpass filtered pinkish exhale noise
    const bufferSize = ctx.sampleRate * 0.45;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(580, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.45);
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    noise.start();
    noise.stop(ctx.currentTime + 0.45);
  }

  playThrowGrunt() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Soft, subtle breath puff
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // =========================================================================
  // ARCADE SFX
  // =========================================================================
  playKick(combo = 1) {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Warm, rounded acoustic soccer kick thud
    const baseFreq = 110 + Math.min(180, (combo - 1) * 12);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(36, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  playPowerShotFire() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  playPowerShotCharge(charge) {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 + charge * 440, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  playPlayerHurt() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.52, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  playParry() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1840, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.48, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  playThrowWhoosh() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Soothing, soft aerodynamic wind flutter (filtered noise)
    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.18);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    noise.start();
    noise.stop(ctx.currentTime + 0.18);
  }

  playShatter(isGlass = true, pitch = 100) {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const count = isGlass ? 5 : 3;

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isGlass ? 'sawtooth' : 'square';
      const freq = isGlass ? 1800 + Math.random() * 2400 : 350 + Math.random() * 400;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.02);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + i * 0.02 + 0.15);

      gain.gain.setValueAtTime(0.28 / count, ctx.currentTime + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.02 + 0.15);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(ctx.currentTime + i * 0.02);
      osc.stop(ctx.currentTime + i * 0.02 + 0.15);
    }
  }

  playGlassShatter() {
    this.playShatter(true, 100);
  }

  playKevinHit() {
    this.playGnomeBonk();
  }

  playGnomeBonk() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.38, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + 0.48);

    gain.gain.setValueAtTime(0.55, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.48);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.48);
  }

  playThud() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  playChime(combo = 1) {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
    const note = notes[(combo - 1) % notes.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, ctx.currentTime);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(this.getDestination());

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  }

  playComboMilestoneFanfare() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major Triad + Octave

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.45);
    });
  }

  playWhistle() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Dual-tone high pitch referee kickoff whistle with rapid trill
    [2650, 3120].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const trill = ctx.createOscillator();
      const trillGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      trill.type = 'sine';
      trill.frequency.setValueAtTime(28, ctx.currentTime); // 28 Hz trill modulation
      trillGain.gain.setValueAtTime(45, ctx.currentTime);

      trill.connect(osc.frequency);
      gain.gain.setValueAtTime(0.24, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(this.getDestination());

      trill.start();
      osc.start();
      trill.stop(ctx.currentTime + 0.38);
      osc.stop(ctx.currentTime + 0.38);
    });
  }

  playDefeatHorn() {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;

    // Sad trombone slide down
    const notes = [311.13, 293.66, 277.18, 261.63]; // Eb4 -> D4 -> Db4 -> C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const startTime = ctx.currentTime + i * 0.22;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq - 12, startTime + 0.20);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }
}

export const sounds = new SoundEngine();
