import { createUiState, transitionUiState } from './ui_state.js';
import { createHudViewModel, createResultsViewModel } from './ui_formatters.js';

const PANEL_BY_SCREEN = Object.freeze({
  TITLE: 'title-screen',
  PAUSED: 'pause-screen',
  SETTINGS: 'settings-screen',
  GARAGE: 'garage-screen',
  CHALLENGES: 'challenges-screen',
  RESULTS: 'gameover-modal'
});

const FOCUS_BY_SCREEN = Object.freeze({
  TITLE: 'btn-start-game',
  PAUSED: 'btn-resume',
  SETTINGS: 'btn-settings-back',
  GARAGE: 'btn-garage-back',
  CHALLENGES: 'btn-challenges-back',
  RESULTS: 'btn-restart-run'
});

const LABEL_BY_SCREEN = Object.freeze({
  TITLE: 'title-heading',
  PAUSED: 'pause-heading',
  SETTINGS: 'settings-heading',
  GARAGE: 'garage-heading',
  CHALLENGES: 'challenges-heading',
  RESULTS: 'results-heading'
});

const setText = (element, value) => {
  if (element && element.textContent !== String(value)) element.textContent = String(value);
};

export class UiController {
  constructor({ documentRef = document, onStart, onPause, onResume, onRestart, onMainMenu, onSetMuted, onSetReducedMotion, onShare, getGarageItems, getChallenges, onEquipCosmetic, muted = false, reducedMotion = false } = {}) {
    this.document = documentRef;
    this.onStart = onStart || (() => true);
    this.onPause = onPause || (() => true);
    this.onResume = onResume || (() => true);
    this.onRestart = onRestart || (() => true);
    this.onMainMenu = onMainMenu || (() => true);
    this.onSetMuted = onSetMuted || (() => Boolean(muted));
    this.onSetReducedMotion = onSetReducedMotion || (() => Boolean(reducedMotion));
    this.onShare = onShare || (() => Promise.resolve(false));
    this.getGarageItems = getGarageItems || (() => []);
    this.getChallenges = getChallenges || (() => []);
    this.onEquipCosmetic = onEquipCosmetic || (() => false);
    this.state = createUiState();
    this.focusBeforeSettings = null;
    this.focusBeforeGarage = null;
    this.focusBeforeChallenges = null;
    this.elements = this.collectElements();
    this.shareFeedbackTimer = null;
    this.shareInProgress = false;
    this.shareGeneration = 0;
    this.shareDefaultLabel = this.elements.share?.textContent || 'SHARE SCORE';
    this.bindEvents();
    this.syncSettings({ muted, reducedMotion });
    this.applyState();
  }

  collectElements() {
    const byId = id => this.document.getElementById(id);
    return {
      overlay: byId('screen-overlay'),
      header: byId('game-header'),
      stage: byId('game-stage'),
      hud: byId('game-hud'),
      pauseButton: byId('btn-pause-game'),
      panels: Object.fromEntries(Object.values(PANEL_BY_SCREEN).map(id => [id, byId(id)])),
      score: byId('score-display'), health: byId('player-health-display'), combo: byId('combo-display'),
      comboFill: byId('combo-bar-fill'), kevin: byId('kevin-state-display'), havoc: byId('havoc-value-display'),
      havocFill: byId('havoc-bar-fill'), havocMode: byId('havoc-mode-display'), havocCard: byId('havoc-card'),
      resultScore: byId('go-score'), resultHighScore: byId('go-high-score'), resultTime: byId('go-time'),
      resultCombo: byId('go-combo'), resultYards: byId('go-yards'), share: byId('btn-share-score'),
      muteSetting: byId('setting-muted'), reducedMotionSetting: byId('setting-reduced-motion'),
      garageLists: {
        ball: byId('garage-ball-list'),
        trail: byId('garage-trail-list'),
        impact: byId('garage-impact-list')
      },
      challengeList: byId('challenge-list'),
      progressionSummary: byId('progression-summary'),
      progressionHeading: byId('progression-summary-heading'),
      progressionUpdates: byId('progression-updates')
    };
  }

  bindEvents() {
    const on = (id, handler) => this.document.getElementById(id)?.addEventListener('click', handler);
    on('btn-start-game', () => this.start());
    on('btn-title-garage', () => this.openGarage());
    on('btn-title-challenges', () => this.openChallenges());
    on('btn-garage-back', () => this.closeGarage());
    on('btn-challenges-back', () => this.closeChallenges());
    on('btn-title-settings', () => this.openSettings());
    on('btn-pause-game', () => this.pause());
    on('btn-resume', () => this.resume());
    on('btn-restart-paused', () => this.restart());
    on('btn-pause-settings', () => this.openSettings());
    on('btn-main-menu', () => this.mainMenu());
    on('btn-settings-back', () => this.closeSettings());
    on('btn-restart-run', () => this.restart());
    this.elements.share?.addEventListener('click', async () => {
      if (this.shareInProgress) return;
      this.clearShareFeedback();
      const requestGeneration = this.shareGeneration;
      this.shareInProgress = true;
      this.elements.share.disabled = true;
      let result = false;
      try {
        result = await this.onShare();
      } catch (_) {
        result = 'SHARING UNAVAILABLE';
      } finally {
        this.shareInProgress = false;
        this.elements.share.disabled = false;
      }
      if (result && this.state.screen === 'RESULTS' && requestGeneration === this.shareGeneration) {
        setText(this.elements.share, String(result));
        this.shareFeedbackTimer = setTimeout(() => {
          this.shareFeedbackTimer = null;
          if (this.state.screen === 'RESULTS' && requestGeneration === this.shareGeneration) {
            setText(this.elements.share, this.shareDefaultLabel);
          }
        }, 1800);
      }
    });
    this.elements.muteSetting?.addEventListener('change', event => {
      const muted = Boolean(this.onSetMuted(event.currentTarget.checked));
      this.syncSettings({ muted });
    });
    this.elements.reducedMotionSetting?.addEventListener('change', event => {
      const reducedMotion = Boolean(this.onSetReducedMotion(event.currentTarget.checked));
      this.syncSettings({ reducedMotion });
    });
    this.elements.overlay?.addEventListener('keydown', event => this.handleOverlayKeyDown(event));
    for (const list of Object.values(this.elements.garageLists)) {
      list?.addEventListener('click', event => this.handleGarageSelection(event));
    }
  }

  dispatch(event, { focus = true } = {}) {
    const next = transitionUiState(this.state, event);
    if (next === this.state) return false;
    this.state = next;
    this.applyState({ focus });
    return true;
  }

  start() {
    if (this.state.screen !== 'TITLE' || this.onStart() === false) return false;
    return this.dispatch({ type: 'START' }, { focus: false });
  }

  pause() {
    if (this.state.screen !== 'PLAYING' || this.onPause() === false) return false;
    return this.dispatch({ type: 'PAUSE' });
  }

  resume() {
    if (this.state.screen !== 'PAUSED' || this.onResume() === false) return false;
    return this.dispatch({ type: 'RESUME' }, { focus: false });
  }

  openGarage() {
    if (this.state.screen !== 'TITLE') return false;
    this.focusBeforeGarage = this.document.activeElement;
    this.renderGarage();
    return this.dispatch({ type: 'OPEN_GARAGE' });
  }

  closeGarage() {
    if (!this.dispatch({ type: 'CLOSE_GARAGE' }, { focus: false })) return false;
    this.restoreTitleFocus(this.focusBeforeGarage, 'btn-title-garage');
    return true;
  }

  openChallenges() {
    if (this.state.screen !== 'TITLE') return false;
    this.focusBeforeChallenges = this.document.activeElement;
    this.renderChallenges();
    return this.dispatch({ type: 'OPEN_CHALLENGES' });
  }

  closeChallenges() {
    if (!this.dispatch({ type: 'CLOSE_CHALLENGES' }, { focus: false })) return false;
    this.restoreTitleFocus(this.focusBeforeChallenges, 'btn-title-challenges');
    return true;
  }

  restoreTitleFocus(target, fallbackId) {
    if (target?.isConnected && !target.closest('[hidden]')) target.focus();
    else this.document.getElementById(fallbackId)?.focus();
  }

  renderGarage() {
    const groups = this.getGarageItems() || [];
    for (const group of groups) {
      const list = this.elements.garageLists[group.category];
      if (!list) continue;
      list.replaceChildren();
      for (const item of group.items || []) {
        const button = this.document.createElement('button');
        button.type = 'button';
        button.className = 'cosmetic-tile';
        button.dataset.category = item.category;
        button.dataset.cosmeticId = item.id;
        button.disabled = !item.owned;
        button.setAttribute('aria-pressed', String(Boolean(item.equipped)));
        const stateLabel = item.equipped ? 'EQUIPPED' : (item.owned ? 'OWNED' : 'LOCKED');
        button.setAttribute('aria-label', `${group.label} ${item.name}; ${stateLabel}${item.owned ? '' : `; ${item.requirement}`}`);
        button.style.setProperty('--cosmetic-swatch', item.swatch);

        const swatch = this.document.createElement('span');
        swatch.className = 'cosmetic-swatch';
        swatch.setAttribute('aria-hidden', 'true');
        const copy = this.document.createElement('span');
        copy.className = 'cosmetic-copy';
        const name = this.document.createElement('strong');
        name.textContent = item.name;
        const status = this.document.createElement('span');
        status.className = 'cosmetic-status';
        status.textContent = stateLabel;
        copy.append(name, status);
        if (!item.owned) {
          const requirement = this.document.createElement('span');
          requirement.className = 'cosmetic-requirement';
          requirement.textContent = item.requirement;
          copy.append(requirement);
        }
        button.append(swatch, copy);
        list.append(button);
      }
    }
  }

  handleGarageSelection(event) {
    const button = event.target?.closest?.('button[data-category][data-cosmetic-id]');
    if (!button || button.disabled) return;
    const category = button.dataset.category;
    const id = button.dataset.cosmeticId;
    if (this.onEquipCosmetic(category, id) === false) return;
    this.renderGarage();
    const replacement = this.elements.garageLists[category]
      ?.querySelector(`button[data-cosmetic-id="${id}"]`);
    replacement?.focus();
  }

  renderChallenges() {
    if (!this.elements.challengeList) return;
    this.elements.challengeList.replaceChildren();
    for (const challenge of this.getChallenges() || []) {
      const card = this.document.createElement('article');
      card.className = 'challenge-card';
      card.dataset.challengeId = challenge.id;
      card.dataset.completed = String(Boolean(challenge.completed));

      const titleRow = this.document.createElement('div');
      titleRow.className = 'challenge-title-row';
      const title = this.document.createElement('h3');
      title.textContent = challenge.name;
      const status = this.document.createElement('span');
      status.className = 'challenge-status';
      status.textContent = challenge.completed ? 'COMPLETE' : 'IN PROGRESS';
      titleRow.append(title, status);

      const description = this.document.createElement('p');
      description.textContent = challenge.description;
      const reward = this.document.createElement('span');
      reward.className = 'challenge-reward';
      reward.textContent = `Reward: ${challenge.reward}`;

      const progressWrap = this.document.createElement('div');
      progressWrap.className = 'challenge-progress-wrap';
      const progress = this.document.createElement('div');
      progress.className = 'challenge-progress';
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', `${challenge.name} progress`);
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(challenge.goal));
      progress.setAttribute('aria-valuenow', String(challenge.progress));
      const fill = this.document.createElement('span');
      fill.style.width = `${Math.round((challenge.progress / challenge.goal) * 100)}%`;
      progress.append(fill);
      const progressValue = this.document.createElement('span');
      progressValue.className = 'challenge-progress-value';
      progressValue.textContent = `${challenge.progress} / ${challenge.goal}`;
      progressWrap.append(progress, progressValue);
      card.append(titleRow, description, reward, progressWrap);
      this.elements.challengeList.append(card);
    }
  }

  renderProgressionSummary(summary = {}) {
    const completed = Array.isArray(summary.completedChallenges) ? summary.completedChallenges : [];
    const unlocks = Array.isArray(summary.newUnlocks) ? summary.newUnlocks : [];
    const hasUpdates = completed.length > 0 || unlocks.length > 0;
    this.elements.progressionSummary?.toggleAttribute('hidden', !hasUpdates);
    if (!hasUpdates || !this.elements.progressionUpdates) {
      this.elements.progressionUpdates?.replaceChildren();
      setText(this.elements.progressionHeading, '');
      return;
    }
    const heading = completed.length > 0 && unlocks.length > 0
      ? 'RUN PROGRESS + UNLOCKS'
      : completed.length > 0 ? 'CHALLENGE COMPLETE' : 'NEW LOOK UNLOCKED';
    setText(this.elements.progressionHeading, heading);
    this.elements.progressionUpdates.replaceChildren();
    if (completed.length > 0) {
      const row = this.document.createElement('li');
      row.textContent = `CHALLENGES — ${completed.map(challenge => challenge.name).join(' · ')}`;
      this.elements.progressionUpdates.append(row);
    }
    if (unlocks.length > 0) {
      const row = this.document.createElement('li');
      const categoryLabels = { ball: 'BALL SKIN', trail: 'TRAIL', impact: 'IMPACT' };
      row.textContent = `NEW LOOKS — ${unlocks.map(cosmetic => `${categoryLabels[cosmetic.category] || 'STYLE'}: ${cosmetic.name}`).join(' · ')}`;
      this.elements.progressionUpdates.append(row);
    }
  }

  restart() {
    if (!['PAUSED', 'RESULTS'].includes(this.state.screen) || this.onRestart() === false) return false;
    return this.dispatch({ type: 'RESTART' }, { focus: false });
  }

  mainMenu() {
    if (this.state.screen === 'SETTINGS' && this.state.settingsReturnTo === 'PAUSED') {
      this.closeSettings();
    }
    if (this.onMainMenu() === false) return false;
    return this.dispatch({ type: 'MAIN_MENU' });
  }

  openSettings() {
    if (this.state.screen === 'TITLE' || this.state.screen === 'PAUSED') {
      this.focusBeforeSettings = this.document.activeElement;
    }
    return this.dispatch({ type: 'OPEN_SETTINGS' });
  }

  closeSettings() {
    if (!this.dispatch({ type: 'CLOSE_SETTINGS' }, { focus: false })) return false;
    const returnTarget = this.focusBeforeSettings;
    if (returnTarget?.isConnected && !returnTarget.closest('[hidden]')) returnTarget.focus();
    else this.focusPrimaryAction();
    return true;
  }

  showResults(stats, progressionSummary = {}) {
    const resultView = createResultsViewModel(stats);
    setText(this.elements.resultScore, resultView.score);
    setText(this.elements.resultHighScore, resultView.highScore);
    setText(this.elements.resultTime, resultView.time);
    setText(this.elements.resultCombo, resultView.combo);
    setText(this.elements.resultYards, resultView.yards);
    this.renderProgressionSummary(progressionSummary);
    this.state = transitionUiState(this.state, { type: 'GAME_OVER', stats });
    this.applyState();
    return this.state.screen === 'RESULTS';
  }

  updateHud(snapshot) {
    const view = createHudViewModel(snapshot);
    setText(this.elements.score, view.score);
    setText(this.elements.combo, view.combo);
    setText(this.elements.health, view.health);
    this.elements.health?.setAttribute('aria-label', `Health: ${view.health}`);
    setText(this.elements.kevin, view.kevin);
    if (this.elements.kevin) this.elements.kevin.dataset.state = String(snapshot.kevinState || 'CALM').toLowerCase();
    setText(this.elements.havoc, view.havoc);
    if (this.elements.havocFill && this.elements.havocFill.style.width !== `${view.havocPercent}%`) {
      this.elements.havocFill.style.width = `${view.havocPercent}%`;
    }
    if (this.elements.havocFill?.parentElement?.getAttribute('aria-valuenow') !== String(view.havocPercent)) {
      this.elements.havocFill?.parentElement?.setAttribute('aria-valuenow', String(view.havocPercent));
    }
    if (this.elements.comboFill) {
      const fill = `${Math.min(100, Math.max(8, (Math.max(1, snapshot.combo) / 10) * 100))}%`;
      if (this.elements.comboFill.style.width !== fill) this.elements.comboFill.style.width = fill;
    }
    this.elements.combo?.classList.toggle('active-combo', snapshot.combo > 1);
    this.elements.havocMode?.toggleAttribute('hidden', !view.havocActive);
    this.elements.havocCard?.classList.toggle('havoc-active', view.havocActive);
  }

  syncSettings({ muted, reducedMotion } = {}) {
    if (typeof muted === 'boolean' && this.elements.muteSetting) this.elements.muteSetting.checked = muted;
    if (typeof reducedMotion === 'boolean' && this.elements.reducedMotionSetting) this.elements.reducedMotionSetting.checked = reducedMotion;
  }

  handleKeyDown(event) {
    if (event.code === 'Escape') {
      if (this.state.screen === 'PLAYING') this.pause();
      else if (this.state.screen === 'PAUSED') this.resume();
      else if (this.state.screen === 'SETTINGS') this.closeSettings();
      else if (this.state.screen === 'GARAGE') this.closeGarage();
      else if (this.state.screen === 'CHALLENGES') this.closeChallenges();
      else return false;
      event.preventDefault();
      return true;
    }
    if (this.state.screen === 'RESULTS' && ['Enter', 'Space'].includes(event.code) && !event.target?.closest('button, a, input')) {
      this.restart();
      event.preventDefault();
      return true;
    }
    return false;
  }

  handleOverlayKeyDown(event) {
    if (event.key !== 'Tab') return;
    const focusable = [...this.elements.overlay.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), summary')]
      .filter(element => !element.closest('[hidden]') && !element.hidden);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (this.document.activeElement === first || !this.elements.overlay.contains(this.document.activeElement))) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && (this.document.activeElement === last || !this.elements.overlay.contains(this.document.activeElement))) {
      first.focus();
      event.preventDefault();
    }
  }

  focusPrimaryAction() {
    const id = FOCUS_BY_SCREEN[this.state.screen];
    this.document.getElementById(id)?.focus();
  }

  clearShareFeedback() {
    if (this.shareFeedbackTimer !== null) {
      clearTimeout(this.shareFeedbackTimer);
      this.shareFeedbackTimer = null;
    }
    setText(this.elements.share, this.shareDefaultLabel);
  }

  applyState({ focus = true } = {}) {
    const screen = this.state.screen;
    if (screen !== 'RESULTS') {
      this.shareGeneration += 1;
      this.clearShareFeedback();
    }
    const overlayVisible = screen !== 'PLAYING';
    const activePanelId = PANEL_BY_SCREEN[screen];
    for (const [id, panel] of Object.entries(this.elements.panels)) {
      if (!panel) continue;
      const active = id === activePanelId;
      panel.hidden = !active;
      panel.classList.toggle('hidden', !active);
      panel.setAttribute('aria-hidden', String(!active));
    }
    if (this.elements.overlay) {
      this.elements.overlay.hidden = !overlayVisible;
      this.elements.overlay.classList.toggle('hidden', !overlayVisible);
      this.elements.overlay.setAttribute('aria-labelledby', LABEL_BY_SCREEN[screen] || 'title-heading');
    }
    const underlyingInert = overlayVisible;
    if (this.elements.header) this.elements.header.inert = underlyingInert;
    if (this.elements.stage) this.elements.stage.inert = underlyingInert;
    if (this.elements.hud) {
      const showHud = screen === 'PLAYING' || screen === 'PAUSED';
      this.elements.hud.hidden = !showHud;
      this.elements.hud.classList.toggle('hidden', !showHud);
    }
    if (this.elements.pauseButton) this.elements.pauseButton.hidden = screen !== 'PLAYING';
    this.document.body.dataset.uiState = screen.toLowerCase();
    if (overlayVisible && focus) this.focusPrimaryAction();
    else if (!overlayVisible) {
      const focusTarget = focus ? this.elements.pauseButton : this.document.getElementById('game-canvas');
      focusTarget?.focus();
    }
  }

  getState() {
    return { ...this.state };
  }
}
