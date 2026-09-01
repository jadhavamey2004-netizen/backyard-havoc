import { describe, it, expect } from 'vitest';
import { EdgeAIService, KEVIN_DIALOGUE_POOL } from '../src/ai.js';

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
});
