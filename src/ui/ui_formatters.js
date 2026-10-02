const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function formatNumber(value) {
  return Math.max(0, safeNumber(value)).toLocaleString('en-US');
}

export function formatHealth(health, maxHealth) {
  const max = Math.max(0, Math.floor(safeNumber(maxHealth)));
  const current = Math.min(max, Math.max(0, Math.floor(safeNumber(health))));
  return `${current}/${max}`;
}

export function formatDuration(seconds) {
  return `${Math.max(0, Math.floor(safeNumber(seconds)))}s`;
}

export function formatDistance(meters) {
  return `${Math.max(0, Math.floor(safeNumber(meters)))}m`;
}

export function formatCombo(combo) {
  return `${Math.max(1, Math.floor(safeNumber(combo)))}x`;
}

export function getKevinLabel(state) {
  const normalized = String(state || 'CALM').trim().replaceAll('_', ' ');
  return `KEVIN: ${normalized || 'CALM'}`;
}

export function createHudViewModel(snapshot) {
  const havocPercent = Math.max(0, Math.min(100, Math.round(safeNumber(snapshot.havocMeter))));
  return {
    score: formatNumber(snapshot.score),
    combo: formatCombo(snapshot.combo),
    health: formatHealth(snapshot.playerHealth, snapshot.maxHealth),
    kevin: getKevinLabel(snapshot.kevinState),
    havoc: `${havocPercent}%`,
    havocPercent,
    havocActive: Boolean(snapshot.havocActive)
  };
}

export function createResultsViewModel(stats = {}) {
  return {
    score: formatNumber(stats.score),
    highScore: formatNumber(stats.highScore),
    time: formatDuration(stats.survivalSeconds),
    combo: formatCombo(stats.peakCombo),
    yards: formatDistance(stats.distanceMeters)
  };
}
