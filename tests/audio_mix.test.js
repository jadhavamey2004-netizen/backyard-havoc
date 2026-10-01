import { describe, expect, it } from 'vitest';
import {
  AUDIO_MIX_TUNING,
  clampAudioPan,
  createAudioBusGraph,
  resolveReactiveMusicState,
  resolveReactiveMusicProfile
} from '../src/audio_mix.js';

class FakeParam {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['ramp', value, time]); }
}

class FakeNode {
  constructor() {
    this.connections = [];
    this.gain = new FakeParam();
    this.threshold = new FakeParam();
    this.knee = new FakeParam();
    this.ratio = new FakeParam();
    this.attack = new FakeParam();
    this.release = new FakeParam();
  }
  connect(node) { this.connections.push(node); }
}

class FakeAudioContext {
  constructor() { this.currentTime = 3; this.destination = new FakeNode(); }
  createGain() { return new FakeNode(); }
  createDynamicsCompressor() { return new FakeNode(); }
}

describe('audio mix graph', () => {
  it('routes the required gain buses through one compressor and master output', () => {
    const ctx = new FakeAudioContext();
    const graph = createAudioBusGraph(ctx, { muted: false });

    expect(graph.buses.MASTER.connections).toEqual([ctx.destination]);
    expect(graph.compressor.connections).toEqual([graph.buses.MASTER]);
    expect(graph.buses.MUSIC.connections).toEqual([graph.compressor]);
    expect(graph.buses.SFX.connections).toEqual([graph.compressor]);
    expect(graph.buses.VOICE.connections).toEqual([graph.compressor]);
    expect(graph.buses.AMBIENCE.connections).toEqual([graph.compressor]);
    expect(graph.musicDuckGain.connections).toEqual([graph.buses.MUSIC]);
    expect(graph.compressor.ratio.value).toBeGreaterThan(1);
  });

  it('mutes the final mix and smoothly changes music duck gain', () => {
    const graph = createAudioBusGraph(new FakeAudioContext());
    graph.setMasterMuted(true);
    graph.setMasterMuted(false);
    graph.setMusicDuck(0.5, 0.04);
    graph.setMusicDuck(1, 0.3);

    expect(graph.buses.MASTER.gain.events.filter(event => event[0] === 'set').slice(-2).map(event => event[1]))
      .toEqual([0, AUDIO_MIX_TUNING.MASTER_GAIN]);
    expect(graph.musicDuckGain.gain.value).toBe(1);
    expect(graph.musicDuckGain.gain.events.some(event => event[0] === 'target' && event[1] === 0.5)).toBe(true);
    expect(graph.musicDuckGain.gain.events.some(event => event[0] === 'target' && event[1] === 1)).toBe(true);
  });
});

describe('reactive music state', () => {
  it.each([
    [{ kevinState: 'CALM', combo: 1 }, 'CALM'],
    [{ kevinState: 'ANNOYED', combo: 1 }, 'BUILD'],
    [{ kevinState: 'SUSPICIOUS', combo: 4 }, 'BUILD'],
    [{ kevinState: 'ANGRY', combo: 1 }, 'HEAT'],
    [{ kevinState: 'FURIOUS', combo: 1 }, 'FURY'],
    [{ kevinState: 'RAMPAGE', combo: 1 }, 'FURY'],
    [{ kevinState: 'CALM', combo: 1, havocActive: true }, 'HAVOC']
  ])('resolves %j to %s', (snapshot, expected) => {
    expect(resolveReactiveMusicState(snapshot)).toBe(expected);
  });

  it('keeps every reactive music tempo in the bounded procedural range', () => {
    const tempos = ['CALM', 'BUILD', 'HEAT', 'FURY', 'HAVOC']
      .map(state => resolveReactiveMusicProfile(state).tempo);
    expect(tempos).toHaveLength(5);
    expect(tempos.every(tempo => tempo >= 88 && tempo <= 150)).toBe(true);
    expect(tempos).toEqual([...tempos].sort((a, b) => a - b));
    expect(AUDIO_MIX_TUNING.SFX_POLYPHONY_LIMIT).toBe(24);
  });

  it('clamps stereo pan to the supported world-effect range', () => {
    expect(clampAudioPan(-4)).toBe(-0.7);
    expect(clampAudioPan(0)).toBe(0);
    expect(clampAudioPan(2)).toBe(0.7);
    expect(Number.isFinite(clampAudioPan(Number.NaN))).toBe(true);
  });
});
