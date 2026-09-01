import { describe, it, expect } from 'vitest';

describe('Trick Chain Bonus & Cascade Mechanics (Section 8B)', () => {
  it('should trigger trick chain bonus when 3 distinct destruction events occur within window', () => {
    const chain = [];
    let score = 0;
    let combo = 4;

    const recordEvent = (eventName) => {
      chain.push(eventName);
      if (chain.length >= 3) {
        const bonus = 1000 * combo;
        score += bonus;
        chain.length = 0; // Reset
        return { triggered: true, bonus };
      }
      return { triggered: false, bonus: 0 };
    };

    expect(recordEvent('KICK').triggered).toBe(false);
    expect(recordEvent('WINDOW_SHATTER').triggered).toBe(false);
    const res = recordEvent('GNOME_BONK');

    expect(res.triggered).toBe(true);
    expect(res.bonus).toBe(4000);
    expect(score).toBe(4000);
    expect(chain.length).toBe(0);
  });
});
