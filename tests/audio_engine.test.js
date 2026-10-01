import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundEngine } from '../src/audio.js';

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;

class FakeAudioParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}

class FakeAudioNode {
  constructor(kind) {
    this.kind = kind;
    this.connections = [];
    this.gain = new FakeAudioParam();
    this.frequency = new FakeAudioParam(440);
    this.detune = new FakeAudioParam();
    this.pan = new FakeAudioParam();
    this.Q = new FakeAudioParam();
    this.threshold = new FakeAudioParam();
    this.knee = new FakeAudioParam();
    this.ratio = new FakeAudioParam();
    this.attack = new FakeAudioParam();
    this.release = new FakeAudioParam();
    this.type = 'sine';
    this.started = [];
    this.stopped = [];
    this.onended = null;
  }
  connect(node) { this.connections.push(node); }
  start(time = 0) { this.started.push(time); }
  stop(time = 0) { this.stopped.push(time); }
  end() { this.onended?.(); }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.destination = new FakeAudioNode('destination');
    this.state = 'running';
    this.nodes = [];
  }
  createNode(kind) { const node = new FakeAudioNode(kind); this.nodes.push(node); return node; }
  createGain() { return this.createNode('gain'); }
  createDynamicsCompressor() { return this.createNode('compressor'); }
  createStereoPanner() { return this.createNode('panner'); }
  createBiquadFilter() { return this.createNode('filter'); }
  createOscillator() { return this.createNode('oscillator'); }
  createBufferSource() { return this.createNode('bufferSource'); }
  createBuffer(channels, length, rate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { duration: length / rate, getChannelData: channel => data[channel] };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

function createEngine() {
  globalThis.window = { AudioContext: FakeAudioContext };
  const engine = new SoundEngine();
  engine.vocalBank.init = vi.fn();
  expect(engine.init()).toBe(true);
  return engine;
}

afterEach(() => {
  vi.useRealTimers();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
  if (originalSpeechSynthesisUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
  else globalThis.SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
});

describe('SoundEngine runtime safety', () => {
  it('treats missing browser audio as a silent fallback without console warnings', () => {
    delete globalThis.window;
    const warn = vi.spyOn(console, 'warn');
    const engine = new SoundEngine();

    expect(engine.init()).toBe(false);
    expect(engine.ctx).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('creates explicit music, SFX, voice and master buses once', () => {
    const engine = createEngine();

    expect(engine.buses.MASTER.kind).toBe('gain');
    expect(engine.buses.MUSIC.kind).toBe('gain');
    expect(engine.buses.SFX.kind).toBe('gain');
    expect(engine.buses.VOICE.kind).toBe('gain');
    expect(engine.buses.AMBIENCE.kind).toBe('gain');
    expect(engine.compressor.connections).toContain(engine.buses.MASTER);
    expect(engine.buses.MUSIC.connections).toContain(engine.compressor);
    expect(engine.buses.SFX.connections).toContain(engine.compressor);
    expect(engine.buses.VOICE.connections).toContain(engine.compressor);
    expect(engine.buses.AMBIENCE.connections).toContain(engine.compressor);
    expect(engine.ctx.destination.connections).toEqual([]);
    expect(engine.buses.MASTER.connections).toContain(engine.ctx.destination);
  });

  it('keeps exactly one rising charge oscillator and releases it on stop', () => {
    const engine = createEngine();
    const initialOscillators = engine.ctx.nodes.filter(node => node.kind === 'oscillator').length;

    engine.startPowerCharge();
    const oscillator = engine.chargeVoice?.oscillator;
    engine.updatePowerCharge(0.2);
    engine.updatePowerCharge(0.55);
    engine.updatePowerCharge(0.9);

    expect(engine.ctx.nodes.filter(node => node.kind === 'oscillator')).toHaveLength(initialOscillators + 1);
    expect(oscillator.frequency.value).toBeGreaterThan(440);
    expect(engine.getAudioDiagnosticSnapshot().chargeVoiceActive).toBe(true);

    engine.stopPowerCharge();
    engine.stopPowerCharge();
    expect(oscillator.stopped).toHaveLength(1);
    expect(engine.getAudioDiagnosticSnapshot().chargeVoiceActive).toBe(false);
  });

  it('bounds low-priority procedural SFX while allowing a critical sound to displace one', () => {
    const engine = createEngine();
    for (let i = 0; i < 30; i++) engine.playThud();
    expect(engine.getAudioDiagnosticSnapshot().activeSfxVoices).toBe(24);

    engine.playPlayerHurt({ pan: 0.3 });
    expect(engine.getAudioDiagnosticSnapshot().activeSfxVoices).toBe(24);
    expect(engine.getAudioDiagnosticSnapshot().droppedSfxVoices).toBeGreaterThan(0);
    expect(engine.ctx.nodes.filter(node => node.kind === 'panner').at(-1).pan.value).toBe(0.3);
  });

  it('gives all seven material breaks structurally distinct procedural recipes', () => {
    const engine = createEngine();
    const materials = ['GLASS', 'CERAMIC', 'WOOD', 'METAL', 'PLASTIC', 'FABRIC', 'SOIL'];
    const signatures = materials.map(material => {
      const before = engine.ctx.nodes.length;
      engine.playMaterialBreak(material);
      return engine.ctx.nodes.slice(before)
        .filter(node => node.kind === 'oscillator' || node.kind === 'bufferSource')
        .map(node => `${node.kind}:${node.type}:${node.buffer ? 'buffer' : ''}`)
        .join('|');
    });
    expect(signatures.every(Boolean)).toBe(true);
    expect(new Set(signatures).size).toBe(7);
  });

  it('gives Block, Parry and Perfect Parry distinct managed sound structures', () => {
    const engine = createEngine();
    const signature = method => {
      const before = engine.ctx.nodes.length;
      engine[method]();
      return engine.ctx.nodes.slice(before)
        .filter(node => node.kind === 'oscillator' || node.kind === 'bufferSource')
        .map(node => `${node.kind}:${node.type}`).join('|');
    };

    const defenses = ['playBlock', 'playParry', 'playPerfectParry'].map(signature);
    expect(new Set(defenses).size).toBe(3);
  });

  it('clamps world pan to the supported stereo range and centers missing pan', () => {
    const engine = createEngine();
    engine.playThud({ pan: -2 });
    expect(engine.ctx.nodes.filter(node => node.kind === 'panner').at(-1).pan.value).toBe(-0.7);
    engine.playThud();
    expect(engine.ctx.nodes.filter(node => node.kind === 'panner').at(-1).pan.value).toBe(0);
    engine.playThud({ pan: 2 });
    expect(engine.ctx.nodes.filter(node => node.kind === 'panner').at(-1).pan.value).toBe(0.7);
  });

  it('plays centered when StereoPannerNode is unavailable', () => {
    const engine = createEngine();
    engine.ctx.createStereoPanner = undefined;
    expect(engine.playThud({ pan: -0.5 })).toBe(true);
    expect(engine.ctx.nodes.filter(node => node.kind === 'panner')).toHaveLength(0);
    expect(engine.getAudioDiagnosticSnapshot().activeSfxVoices).toBe(1);
  });

  it('rate-limits noisy event families independently without suppressing another cue', () => {
    const engine = createEngine();
    engine.playThud({ rateLimitKey: 'ball-ground', rateLimitMs: 50 });
    engine.playThud({ rateLimitKey: 'ball-ground', rateLimitMs: 50 });
    engine.playThud({ rateLimitKey: 'projectile-ground', rateLimitMs: 50 });
    engine.playKick(1);

    expect(engine.getAudioDiagnosticSnapshot().activeSfxVoices).toBe(3);
  });

  it('restores dialogue ducking after cancellation and speech failure', () => {
    const utterances = [];
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
    globalThis.window = {
      AudioContext: FakeAudioContext,
      speechSynthesis: {
        getVoices: () => [],
        speak: utterance => utterances.push(utterance),
        cancel: vi.fn()
      }
    };
    const engine = new SoundEngine();
    expect(engine.init()).toBe(true);
    engine.vocalBank.playVocalClip = vi.fn(() => false);

    expect(engine.speakKevinVoice('First line!', 'RAGE', 0)).toBe(true);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.501, 2);
    engine.voiceQueue.cancelCurrentSpeech();
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);

    expect(engine.speakKevinVoice('Second line!', 'RAGE', 0)).toBe(true);
    utterances.at(-1).onerror();
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
  });

  it('cancels stale clause cadence when priority speech interrupts and preserves the new duck', () => {
    vi.useFakeTimers();
    const utterances = [];
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
    globalThis.window = {
      AudioContext: FakeAudioContext,
      speechSynthesis: {
        getVoices: () => [],
        speak: utterance => utterances.push(utterance),
        cancel: vi.fn(() => utterances.at(-1)?.onend?.())
      }
    };
    const engine = new SoundEngine();
    expect(engine.init()).toBe(true);
    engine.vocalBank.playVocalClip = vi.fn(() => false);

    expect(engine.speakKevinVoice('A1! A2!', 'RAGE', 0)).toBe(true);
    expect(utterances.map(({ text }) => text)).toEqual(['A1!']);
    const oldItem = engine.voiceQueue.currentItem;
    utterances[0].onend();

    expect(engine.voiceQueue.clauseTimer).not.toBeNull();
    expect(engine.speakKevinVoice('B!', 'RAGE', 0)).toBe(true);
    expect(engine.voiceQueue.currentItem.text).toBe('B!');
    expect(engine.voiceQueue.clauseTimer).toBeNull();
    expect(utterances.map(({ text }) => text)).toEqual(['A1!', 'B!']);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.501, 2);

    vi.advanceTimersByTime(100);
    expect(utterances.map(({ text }) => text)).toEqual(['A1!', 'B!']);
    expect(engine.voiceQueue.currentItem.text).toBe('B!');
    expect(engine.voiceQueue.isSpeaking).toBe(true);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.501, 2);
    expect(engine.voiceQueue.currentItem).not.toBe(oldItem);

    utterances[1].onend();
    expect(engine.voiceQueue.isSpeaking).toBe(false);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
  });

  it('clears a pending clause cadence and restores ducking when the voice queue is cleared', () => {
    vi.useFakeTimers();
    const utterances = [];
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
    globalThis.window = {
      AudioContext: FakeAudioContext,
      speechSynthesis: {
        getVoices: () => [],
        speak: utterance => utterances.push(utterance),
        cancel: vi.fn(() => utterances.at(-1)?.onend?.())
      }
    };
    const engine = new SoundEngine();
    expect(engine.init()).toBe(true);
    engine.vocalBank.playVocalClip = vi.fn(() => false);

    expect(engine.speakKevinVoice('Clear A1! Clear A2!', 'RAGE', 0)).toBe(true);
    utterances[0].onend();
    expect(engine.voiceQueue.clauseTimer).not.toBeNull();

    engine.voiceQueue.clear();
    expect(engine.voiceQueue.clauseTimer).toBeNull();
    expect(engine.voiceQueue.isSpeaking).toBe(false);
    expect(engine.voiceQueue.queue).toEqual([]);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
    vi.advanceTimersByTime(100);

    expect(utterances.map(({ text }) => text)).toEqual(['Clear A1!']);
    expect(engine.voiceQueue.isSpeaking).toBe(false);
    expect(engine.voiceQueue.queue).toEqual([]);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
  });

  it('ducks and restores a procedural voice when SpeechSynthesis is unavailable', () => {
    vi.useFakeTimers();
    const engine = createEngine();
    let source;
    engine.vocalBank.playVocalClip = vi.fn((category, destination, registerSource) => {
      source = engine.ctx.createBufferSource();
      registerSource(source);
      return true;
    });

    expect(engine.playProceduralVocal('PARRY_SHOCK')).toBe(true);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.501, 2);
    source.onended();
    vi.advanceTimersByTime(500);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
  });

  it('changes reactive music targets without restarting its active scheduler', () => {
    const engine = createEngine();
    const schedule = vi.spyOn(engine, 'scheduleMusicStep');
    engine.startGenerativeMusic();
    engine.updateReactiveMusic({ combo: 3, kevinState: 'ANNOYED' });
    engine.updateReactiveMusic({ combo: 8, kevinState: 'FURIOUS' });

    expect(engine.musicPlaying).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(engine.musicIntensity).toBe('FURY');
    expect(engine.targetMusicTempo).toBe(138);
    expect(engine.musicTempo).toBeLessThan(138);
  });

  it('contains Web Audio scheduler and charge-parameter failures outside gameplay', () => {
    const engine = createEngine();
    vi.spyOn(engine.ctx, 'createOscillator').mockImplementation(() => {
      throw new Error('simulated scheduler audio failure');
    });

    expect(() => engine.startGenerativeMusic()).not.toThrow();
    expect(engine.musicPlaying).toBe(false);
    expect(engine.musicTimer).toBeNull();

    engine.ctx.createOscillator.mockRestore();
    engine.startPowerCharge();
    vi.spyOn(engine.chargeVoice.oscillator.frequency, 'setTargetAtTime').mockImplementation(() => {
      throw new Error('simulated charge audio failure');
    });

    expect(() => engine.updatePowerCharge(0.7)).not.toThrow();
    expect(engine.getAudioDiagnosticSnapshot()).toMatchObject({
      chargeVoiceActive: false,
      audioFailures: expect.any(Number)
    });
    expect(engine.getAudioDiagnosticSnapshot().audioFailures).toBeGreaterThanOrEqual(2);
  });

  it('combines overlapping music ducks and restores after release or reset', () => {
    const engine = createEngine();
    const first = engine.requestMusicDuck({ decibels: -3 });
    const second = engine.requestMusicDuck({ decibels: -6 });
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.501, 2);

    engine.releaseMusicDuck(second);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBeCloseTo(0.708, 2);
    engine.releaseMusicDuck(first);
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);

    engine.requestMusicDuck({ decibels: -6 });
    engine.resetTransientAudio();
    expect(engine.getAudioDiagnosticSnapshot().musicDuck).toBe(1);
  });

  it('clears charge, queued speech, music and active voice bookkeeping on mute and visibility loss', () => {
    const engine = createEngine();
    engine.startPowerCharge();
    engine.startGenerativeMusic();
    engine.voiceQueue.queue.push({ text: 'stale line' });
    engine.toggleMute();
    expect(engine.getAudioDiagnosticSnapshot().muted).toBe(true);
    expect(engine.getAudioDiagnosticSnapshot().chargeVoiceActive).toBe(false);
    expect(engine.voiceQueue.queue).toEqual([]);
    expect(engine.buses.MASTER.gain.value).toBe(0);

    engine.toggleMute();
    engine.startPowerCharge();
    engine.voiceQueue.queue.push({ text: 'hidden line' });
    engine.setPageVisible(false);
    expect(engine.getAudioDiagnosticSnapshot().chargeVoiceActive).toBe(false);
    expect(engine.getAudioDiagnosticSnapshot().musicPlaying).toBe(false);
    expect(engine.voiceQueue.queue).toEqual([]);
  });

  it('preserves the persisted mute preference while clearing transient state on reset', () => {
    const values = new Map();
    globalThis.localStorage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    };
    const engine = createEngine();
    engine.startPowerCharge();
    engine.requestMusicDuck({ decibels: -6 });
    engine.toggleMute();
    engine.resetTransientAudio();

    expect(engine.isMuted).toBe(true);
    expect(values.get('backyard_muted')).toBe('true');
    expect(engine.getAudioDiagnosticSnapshot()).toMatchObject({
      chargeVoiceActive: false,
      activeSfxVoices: 0,
      musicPlaying: false,
      musicDuck: 1
    });
  });

  it('stops managed one-shots and charge bookkeeping on run reset', () => {
    const engine = createEngine();
    engine.playKevinHit();
    engine.startPowerCharge();
    engine.voiceQueue.lastSpokenText = 'stale line';
    engine.voiceQueue.cooldownTimer = Date.now();
    engine.requestMusicDuck({ decibels: -6 });
    expect(engine.getAudioDiagnosticSnapshot().activeSfxVoices).toBe(2);

    engine.resetTransientAudio();

    expect(engine.getAudioDiagnosticSnapshot()).toMatchObject({
      activeSfxVoices: 0,
      chargeVoiceActive: false,
      musicPlaying: false,
      musicDuck: 1
    });
    expect(engine.currentKevinState).toBe('CALM');
    expect(engine.voiceQueue.lastSpokenText).toBe('');
    expect(engine.voiceQueue.cooldownTimer).toBe(0);
  });
});
