import { afterEach, describe, it, expect, vi } from 'vitest';
import { EdgeAIService, KEVIN_DIALOGUE_POOL } from '../src/ai.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Edge AI Dialogue & Telemetry Service (Section 9)', () => {
  it('should contain rich dialogue pools across multiple categories', () => {
    expect(KEVIN_DIALOGUE_POOL.WINDOW.length).toBeGreaterThanOrEqual(6);
    expect(KEVIN_DIALOGUE_POOL.GARDEN.length).toBeGreaterThanOrEqual(6);
    expect(KEVIN_DIALOGUE_POOL.GRILL.length).toBeGreaterThanOrEqual(5);
    expect(KEVIN_DIALOGUE_POOL.HEADSHOT.length).toBeGreaterThanOrEqual(5);
    expect(KEVIN_DIALOGUE_POOL.RAMPAGE.length).toBeGreaterThanOrEqual(3);
    expect(KEVIN_DIALOGUE_POOL.FIREBALL.length).toBeGreaterThanOrEqual(3);
  });

  it('should track destruction counts and rampage events within 4 seconds', () => {
    const ai = new EdgeAIService();
    ai.dispatchTelemetry({ impact_object: '2nd-Story Window' });
    ai.dispatchTelemetry({ impact_object: '2nd-Story Window' });
    ai.dispatchTelemetry({ impact_object: '2nd-Story Window' });

    expect(ai.destructionCounts.window).toBe(3);
    expect(ai.destructionCounts.total).toBe(3);
    expect(ai.recentDestructions.length).toBe(3);
  });

  it('should filter pool lines based on rage thresholds', () => {
    const ai = new EdgeAIService();
    ai.setNpcRage(85);

    let receivedEmotion = '';
    let receivedPriority = -1;
    ai.onDialogue((text, emotion, priority) => {
      receivedEmotion = emotion;
      receivedPriority = priority;
    });

    ai.handleEdgeResponse({
      impact_object: 'Weber Charcoal BBQ Grill',
      combo_multiplier: 5,
      npcRage: 85,
      isHeadshot: false
    });

    expect(receivedEmotion).toBeDefined();
    expect(receivedPriority).toBe(2); // MED priority for grill
  });

  it('does not emit a delayed response from a previous session after reset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const ai = new EdgeAIService();
    const dialogue = vi.fn();
    ai.onDialogue(dialogue);
    ai.setNpcRage(70);
    ai.hasWarnedEscalation = true;
    ai.dispatchTelemetry({ impact_object: '2nd-Story Bedroom Window' });

    expect(ai.recentDestructions).toHaveLength(1);
    expect(ai.destructionCounts.window).toBe(1);
    ai.resetSession();
    vi.advanceTimersByTime(100);

    expect(dialogue).not.toHaveBeenCalled();
    expect(ai.recentDestructions).toEqual([]);
    expect(ai.destructionCounts).toEqual({
      window: 0,
      greenhouse: 0,
      grill: 0,
      garden: 0,
      gnome: 0,
      trashcan: 0,
      bicycle: 0,
      total: 0
    });
    expect(ai.hasFirstHitHappened).toBe(false);
    expect(ai.hasWarnedEscalation).toBe(false);
    expect(ai.currentNpcRage).toBe(0);
  });

  it('allows a fresh session response after invalidating old delayed work', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const ai = new EdgeAIService();
    const dialogue = vi.fn();
    ai.onDialogue(dialogue);
    ai.dispatchTelemetry({ impact_object: '2nd-Story Bedroom Window' });
    ai.resetSession();
    ai.dispatchTelemetry({ impact_object: '2nd-Story Bedroom Window' });

    vi.advanceTimersByTime(100);

    expect(dialogue).toHaveBeenCalledTimes(1);
    expect(ai.destructionCounts.window).toBe(1);
  });

  it('does not carry a previous session dialogue rate limit into the next run', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const ai = new EdgeAIService();
    const dialogue = vi.fn();
    ai.onDialogue(dialogue);
    ai.dispatchTelemetry({ impact_object: '2nd-Story Bedroom Window' });
    vi.advanceTimersByTime(100);
    expect(dialogue).toHaveBeenCalledTimes(1);

    ai.resetSession();
    ai.dispatchTelemetry({ impact_object: '2nd-Story Bedroom Window' });
    vi.advanceTimersByTime(100);

    expect(dialogue).toHaveBeenCalledTimes(2);
  });
});
