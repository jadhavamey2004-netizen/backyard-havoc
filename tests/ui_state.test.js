import { describe, expect, it } from 'vitest';
import { createUiState, transitionUiState } from '../src/ui/ui_state.js';
import { formatDuration, formatHealth, formatDistance, createHudViewModel } from '../src/ui/ui_formatters.js';

describe('UI presentation state', () => {
  it('keeps settings attached to the screen that opened them', () => {
    const titleSettings = transitionUiState(createUiState(), { type: 'OPEN_SETTINGS' });
    expect(titleSettings).toMatchObject({ screen: 'SETTINGS', settingsReturnTo: 'TITLE' });
    expect(transitionUiState(titleSettings, { type: 'CLOSE_SETTINGS' }).screen).toBe('TITLE');

    const paused = transitionUiState(createUiState('PLAYING'), { type: 'PAUSE' });
    const pauseSettings = transitionUiState(paused, { type: 'OPEN_SETTINGS' });
    expect(transitionUiState(pauseSettings, { type: 'CLOSE_SETTINGS' }).screen).toBe('PAUSED');
  });

  it('makes overlay transitions exclusive and retains canonical result data', () => {
    const playing = transitionUiState(createUiState(), { type: 'START' });
    const paused = transitionUiState(playing, { type: 'PAUSE' });
    const results = transitionUiState(paused, {
      type: 'GAME_OVER',
      stats: { score: 3200, highScore: 3200, peakCombo: 8, distanceMeters: 42, survivalSeconds: 19 }
    });
    expect(results).toMatchObject({ screen: 'RESULTS', results: { score: 3200, peakCombo: 8 } });
    expect(transitionUiState(results, { type: 'RESTART' }).screen).toBe('PLAYING');
    expect(transitionUiState(results, { type: 'MAIN_MENU' })).toMatchObject({ screen: 'TITLE', results: null });
  });

  it('ignores transitions that are invalid for the current presentation state', () => {
    const title = createUiState();
    expect(transitionUiState(title, { type: 'PAUSE' })).toBe(title);
    expect(transitionUiState(title, { type: 'CLOSE_SETTINGS' })).toBe(title);
  });
});

describe('UI presentation formatters', () => {
  it('formats health, duration, and distance for compact results and HUD values', () => {
    expect(formatHealth(2, 3)).toBe('2/3');
    expect(formatDuration(19.8)).toBe('19s');
    expect(formatDistance(42.9)).toBe('42m');
  });

  it('derives gameplay HUD labels from canonical engine values', () => {
    expect(createHudViewModel({
      score: 1200,
      combo: 5,
      playerHealth: 2,
      maxHealth: 3,
      kevinState: 'ANGRY',
      havocMeter: 72,
      havocActive: false
    })).toMatchObject({
      score: '1,200', combo: '5x', health: '2/3', kevin: 'KEVIN: ANGRY',
      havoc: '72%', havocActive: false, havocPercent: 72
    });
  });
});
