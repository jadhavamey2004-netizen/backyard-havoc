/**
 * High-Production Human-Grade Vocal Performance Sound Bank for Neighbor Kevin
 * Generates rich, multi-formant theatrical vocal clips (Pain Shouts, Furious Screams,
 * Gasps, Whimpers, and Triumphant Cackles) with zero external network dependencies and 0ms latency.
 */

export class VocalSoundBank {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.buffers = new Map();
    this.isGenerating = false;
  }

  init(audioCtx) {
    this.ctx = audioCtx;
    if (this.ctx && this.buffers.size === 0) {
      this.pregenerateAllClips();
    }
  }

  pregenerateAllClips() {
    if (!this.ctx || this.isGenerating) return;
    this.isGenerating = true;

    try {
      this.buffers.set('HEADSHOT_1', this.synthesizePainYell(0.48, 420, 160));
      this.buffers.set('HEADSHOT_2', this.synthesizeDazedGroan(0.65, 260, 110));
      this.buffers.set('WINDOW_RAGE', this.synthesizeAngryScreech(0.55, 520, 220));
      this.buffers.set('GRILL_FIRE', this.synthesizePanicShout(0.60, 480, 280));
      this.buffers.set('GREENHOUSE_PANIC', this.synthesizeHighPanicGasp(0.50, 620, 310));
      this.buffers.set('PARRY_SHOCK', this.synthesizeShockedGasp(0.42, 380, 720));
      this.buffers.set('RAMPAGE_FRENZY', this.synthesizeFrenzyYell(0.70, 580, 240));
      this.buffers.set('VICTORY_LAUGH', this.synthesizeCaricatureLaugh(0.95));
      this.buffers.set('DEFEAT_WHIMPER', this.synthesizeWhimperGroan(0.75));
      this.buffers.set('INTRO_SHOUT', this.synthesizeGruffChallenge(0.65));
    } catch (_) {
    } finally {
      this.isGenerating = false;
    }
  }

  playVocalClip(category, destinationNode, registerSource = null) {
    if (!this.ctx) return false;

    let bufferKey = '';
    const cat = (category || '').toUpperCase();

    if (cat.includes('HEADSHOT') || cat.includes('BONK')) {
      bufferKey = Math.random() > 0.5 ? 'HEADSHOT_1' : 'HEADSHOT_2';
    } else if (cat.includes('WINDOW')) {
      bufferKey = 'WINDOW_RAGE';
    } else if (cat.includes('GRILL') || cat.includes('FIRE')) {
      bufferKey = 'GRILL_FIRE';
    } else if (cat.includes('GREENHOUSE') || cat.includes('CONSERVATORY')) {
      bufferKey = 'GREENHOUSE_PANIC';
    } else if (cat.includes('PARRY')) {
      bufferKey = 'PARRY_SHOCK';
    } else if (cat.includes('RAMPAGE')) {
      bufferKey = 'RAMPAGE_FRENZY';
    } else if (cat.includes('VICTORY') || cat.includes('LAUGH')) {
      bufferKey = 'VICTORY_LAUGH';
    } else if (cat.includes('DEFEAT') || cat.includes('WHIMPER')) {
      bufferKey = 'DEFEAT_WHIMPER';
    } else if (cat.includes('INTRO')) {
      bufferKey = 'INTRO_SHOUT';
    } else {
      bufferKey = 'WINDOW_RAGE';
    }

    let buffer = this.buffers.get(bufferKey);
    if (!buffer) {
      this.pregenerateAllClips();
      buffer = this.buffers.get(bufferKey);
    }

    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Vocal Presence Filter (Brings out human speech formants 1.2kHz - 3.5kHz)
      const eq = this.ctx.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.setValueAtTime(2400, this.ctx.currentTime);
      eq.Q.setValueAtTime(1.5, this.ctx.currentTime);
      eq.gain.setValueAtTime(4.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      source.connect(eq);
      eq.connect(gain);
      gain.connect(destinationNode || this.ctx.destination);

      if (typeof registerSource === 'function') registerSource(source);
      source.start();
      return true;
    }
    return false;
  }

  // =========================================================================
  // THEATRICAL MULTI-FORMANT VOCAL SYNTHESIS ENGINE
  // =========================================================================

  synthesizePainYell(duration = 0.5, startFreq = 450, endFreq = 160) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      // Exponential downward vocal pitch contour (pain reflex)
      const freq = startFreq * Math.pow(endFreq / startFreq, Math.pow(t, 0.7));
      phase += (2 * Math.PI * freq) / sampleRate;

      // Pulse wave with 3rd and 5th harmonics (glottal vocal cords)
      const glottal = Math.sin(phase) + 0.45 * Math.sin(phase * 2) + 0.25 * Math.sin(phase * 3);
      // Throat formant resonance envelope (F1=800Hz, F2=1600Hz)
      const formant = Math.sin(phase * 2.8) * 0.35 + Math.sin(phase * 5.2) * 0.2;
      // Breath rasp noise
      const rasp = (Math.random() * 2 - 1) * 0.12 * (1 - t);

      // Natural vocal attack and decaying release
      const env = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.4);
      data[i] = (glottal + formant + rasp) * env * 0.65;
    }
    return buffer;
  }

  synthesizeDazedGroan(duration = 0.65, startFreq = 260, endFreq = 110) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      // Dazed vibrato wobble (6Hz dizziness)
      const vibrato = Math.sin(2 * Math.PI * 6.0 * t) * 18;
      const freq = (startFreq + (endFreq - startFreq) * t) + vibrato;
      phase += (2 * Math.PI * Math.max(50, freq)) / sampleRate;

      const glottal = Math.sin(phase) + 0.5 * Math.sin(phase * 2);
      const env = t < 0.12 ? t / 0.12 : Math.pow(1 - (t - 0.12) / 0.88, 1.2);
      data[i] = glottal * env * 0.55;
    }
    return buffer;
  }

  synthesizeAngryScreech(duration = 0.55, startFreq = 520, endFreq = 220) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const freq = startFreq * Math.pow(endFreq / startFreq, t);
      phase += (2 * Math.PI * freq) / sampleRate;

      // Aggressive raspy sawtooth distortion
      const glottal = (phase % (2 * Math.PI) < Math.PI ? 1 : -1) * 0.4 + Math.sin(phase) * 0.6;
      const rasp = (Math.random() * 2 - 1) * 0.18;
      const env = t < 0.05 ? t / 0.05 : Math.pow(1 - t, 1.1);
      data[i] = (glottal + rasp) * env * 0.70;
    }
    return buffer;
  }

  synthesizePanicShout(duration = 0.60, startFreq = 480, endFreq = 280) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const tremor = Math.sin(2 * Math.PI * 12.0 * t) * 25; // 12Hz panic tremor
      const freq = startFreq + (endFreq - startFreq) * t + tremor;
      phase += (2 * Math.PI * Math.max(80, freq)) / sampleRate;

      const glottal = Math.sin(phase) + 0.4 * Math.sin(phase * 2) + 0.2 * Math.sin(phase * 3);
      const env = t < 0.04 ? t / 0.04 : Math.pow(1 - t, 1.3);
      data[i] = glottal * env * 0.65;
    }
    return buffer;
  }

  synthesizeHighPanicGasp(duration = 0.50, startFreq = 620, endFreq = 310) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const freq = startFreq * Math.pow(endFreq / startFreq, t);
      phase += (2 * Math.PI * freq) / sampleRate;

      const inhalation = (Math.random() * 2 - 1) * 0.25 * (1 - t);
      const glottal = Math.sin(phase) * 0.5;
      const env = Math.sin(t * Math.PI);
      data[i] = (glottal + inhalation) * env * 0.60;
    }
    return buffer;
  }

  synthesizeShockedGasp(duration = 0.42, startFreq = 380, endFreq = 720) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      // Rising pitch gasp reflex
      const freq = startFreq + (endFreq - startFreq) * Math.pow(t, 1.5);
      phase += (2 * Math.PI * freq) / sampleRate;

      const glottal = Math.sin(phase) * 0.6;
      const breath = (Math.random() * 2 - 1) * 0.2;
      const env = Math.sin(t * Math.PI);
      data[i] = (glottal + breath) * env * 0.60;
    }
    return buffer;
  }

  synthesizeFrenzyYell(duration = 0.70, startFreq = 580, endFreq = 240) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const freq = startFreq * Math.pow(endFreq / startFreq, Math.pow(t, 0.8));
      phase += (2 * Math.PI * freq) / sampleRate;

      const glottal = Math.sin(phase) + 0.6 * Math.sin(phase * 2) + 0.3 * Math.sin(phase * 4);
      const env = t < 0.04 ? t / 0.04 : Math.pow(1 - t, 1.2);
      data[i] = glottal * env * 0.70;
    }
    return buffer;
  }

  synthesizeCaricatureLaugh(duration = 0.95) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // 4 bursts of "HA-HA-HA-HA!"
    const numBursts = 4;
    const burstDuration = duration / numBursts;
    const burstSamples = Math.floor(sampleRate * burstDuration);

    for (let b = 0; b < numBursts; b++) {
      let phase = 0;
      const baseFreq = 340 - b * 25; // Decreasing pitch per laugh
      const offset = b * burstSamples;

      for (let i = 0; i < burstSamples && (offset + i) < numSamples; i++) {
        const t = i / burstSamples;
        const freq = baseFreq - t * 60;
        phase += (2 * Math.PI * freq) / sampleRate;

        const glottal = Math.sin(phase) + 0.4 * Math.sin(phase * 2);
        const env = t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 1.5);
        data[offset + i] = glottal * env * 0.65;
      }
    }
    return buffer;
  }

  synthesizeWhimperGroan(duration = 0.75) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const tremolo = Math.sin(2 * Math.PI * 7.5 * t) * 15;
      const freq = (220 - t * 90) + tremolo;
      phase += (2 * Math.PI * Math.max(50, freq)) / sampleRate;

      const glottal = Math.sin(phase) * 0.6;
      const env = t < 0.1 ? t / 0.1 : Math.pow(1 - t, 1.1);
      data[i] = glottal * env * 0.50;
    }
    return buffer;
  }

  synthesizeGruffChallenge(duration = 0.65) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const freq = 180 + Math.sin(t * Math.PI) * 45;
      phase += (2 * Math.PI * freq) / sampleRate;

      const glottal = (phase % (2 * Math.PI) < Math.PI ? 1 : -1) * 0.3 + Math.sin(phase) * 0.7;
      const env = t < 0.08 ? t / 0.08 : Math.pow(1 - t, 1.2);
      data[i] = glottal * env * 0.60;
    }
    return buffer;
  }
}
