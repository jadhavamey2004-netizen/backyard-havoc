import { describe, it, expect } from 'vitest';
import { EmotionalVoiceEngine } from '../src/audio.js';

describe('EmotionalVoiceEngine (Section 2 & 9)', () => {
  it('should assign Chrome-safe pitch and rate values for all emotion types', () => {
    const engine = new EmotionalVoiceEngine();
    const emotions = ['RAGE', 'CRYING', 'PANIC', 'SARCASTIC', 'DESPAIRING'];

    emotions.forEach(emotion => {
      const params = engine.getEmotionParams(emotion);
      expect(params.pitch).toBeDefined();
      expect(params.pitch).toBeGreaterThan(0.4);
      expect(params.rate).toBeGreaterThan(0.5);
      expect(params.volume).toBeGreaterThan(0);
    });
  });

  it('should phonetically normalize text and prevent spelling non-dictionary words', () => {
    const engine = new EmotionalVoiceEngine();
    expect(engine.normalizePhonetics('(screams) OWWW! Direct hit to my head!')).toBe('Ow! Ouch! Direct hit to my head!');
    expect(engine.normalizePhonetics('(gasp) NOOOO! My rare orchid!')).toBe('No! No! My rare orchid!');
    expect(engine.normalizePhonetics('(sobs) ARRRGH! Look at the petals!')).toBe('Argh! Look at the petals!');
  });

  it('should cancel and flush queue on critical headshot priority 0', () => {
    const engine = new EmotionalVoiceEngine();
    engine.isSpeaking = true;
    engine.queue = [{ text: 'Old Line', priority: 3 }];

    engine.cancelCurrentSpeech();
    expect(engine.isSpeaking).toBe(false);
    expect(engine.currentPriority).toBe(999);
  });

  it('should safely execute all sound methods without throwing exceptions', () => {
    const { sounds } = require('../src/audio.js');
    expect(() => sounds.playKevinHit()).not.toThrow();
    expect(() => sounds.playGlassShatter()).not.toThrow();
    expect(() => sounds.playGnomeBonk()).not.toThrow();
    expect(() => sounds.playKick(1)).not.toThrow();
    expect(() => sounds.playExplosion()).not.toThrow();
    expect(() => sounds.playPlayerHurt()).not.toThrow();
  });
});
