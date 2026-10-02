const VALID_SCREENS = new Set(['TITLE', 'PLAYING', 'PAUSED', 'SETTINGS', 'GARAGE', 'CHALLENGES', 'RESULTS']);

export function createUiState(screen = 'TITLE') {
  if (!VALID_SCREENS.has(screen)) throw new RangeError(`Unknown UI screen: ${screen}`);
  return { screen, settingsReturnTo: null, results: null };
}

export function transitionUiState(state, event) {
  switch (event?.type) {
    case 'START':
      return state.screen === 'TITLE' ? { ...state, screen: 'PLAYING' } : state;
    case 'PAUSE':
      return state.screen === 'PLAYING' ? { ...state, screen: 'PAUSED' } : state;
    case 'RESUME':
      return state.screen === 'PAUSED' ? { ...state, screen: 'PLAYING' } : state;
    case 'OPEN_SETTINGS':
      return ['TITLE', 'PAUSED'].includes(state.screen)
        ? { ...state, screen: 'SETTINGS', settingsReturnTo: state.screen }
        : state;
    case 'OPEN_GARAGE':
      return state.screen === 'TITLE' ? { ...state, screen: 'GARAGE' } : state;
    case 'CLOSE_GARAGE':
      return state.screen === 'GARAGE' ? { ...state, screen: 'TITLE' } : state;
    case 'OPEN_CHALLENGES':
      return state.screen === 'TITLE' ? { ...state, screen: 'CHALLENGES' } : state;
    case 'CLOSE_CHALLENGES':
      return state.screen === 'CHALLENGES' ? { ...state, screen: 'TITLE' } : state;
    case 'CLOSE_SETTINGS':
      return state.screen === 'SETTINGS'
        ? { ...state, screen: state.settingsReturnTo || 'TITLE', settingsReturnTo: null }
        : state;
    case 'GAME_OVER':
      return ['PLAYING', 'PAUSED'].includes(state.screen)
        ? { ...state, screen: 'RESULTS', settingsReturnTo: null, results: event.stats ?? null }
        : state;
    case 'RESTART':
      return ['PAUSED', 'RESULTS'].includes(state.screen)
        ? { ...state, screen: 'PLAYING', settingsReturnTo: null, results: null }
        : state;
    case 'MAIN_MENU':
      return { screen: 'TITLE', settingsReturnTo: null, results: null };
    default:
      return state;
  }
}
