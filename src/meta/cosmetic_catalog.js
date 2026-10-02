const freezeItem = item => Object.freeze({
  ...item,
  palette: item.palette ? Object.freeze(item.palette) : undefined
});

export const DEFAULT_EQUIPMENT = Object.freeze({
  ball: 'CLASSIC',
  trail: 'CLASSIC',
  impact: 'CLASSIC'
});

const catalog = {
  ball: [
    { id: 'CLASSIC', name: 'Backyard Classic', description: 'The match ball that started it all.', swatch: '#f8fafc', palette: { highlight: '#ffffff', mid: '#f8fafc', shadow: '#94a3b8', outline: '#0f172a', seam: '#0f172a' } },
    { id: 'NEON', name: 'Night League', description: 'A bright after-dark match look.', swatch: '#22d3ee', palette: { highlight: '#ecfeff', mid: '#67e8f9', shadow: '#155e75', outline: '#083344', seam: '#cffafe' } },
    { id: 'CARBON', name: 'Carbon Five', description: 'A dark street-ball finish.', swatch: '#64748b', palette: { highlight: '#cbd5e1', mid: '#475569', shadow: '#0f172a', outline: '#020617', seam: '#cbd5e1' } },
    { id: 'SUNSET', name: 'Last Light', description: 'Warm colors from one more backyard run.', swatch: '#fb923c', palette: { highlight: '#fff7ed', mid: '#fb923c', shadow: '#9f1239', outline: '#431407', seam: '#ffedd5' } }
  ].map(freezeItem),
  trail: [
    { id: 'CLASSIC', name: 'Clean Touch', description: 'The familiar cool-blue ball trail.', swatch: '#38bdf8', color: '#38bdf8', specialColor: '#fb923c' },
    { id: 'NEON', name: 'Night League', description: 'A crisp cyan trail.', swatch: '#22d3ee', color: '#22d3ee', specialColor: '#a5f3fc' },
    { id: 'EMBER', name: 'Hot Streak', description: 'A warm orange streak.', swatch: '#f97316', color: '#f97316', specialColor: '#fdba74' },
    { id: 'ELECTRIC', name: 'Live Wire', description: 'A bright lime-green trail.', swatch: '#a3e635', color: '#a3e635', specialColor: '#ecfccb' }
  ].map(freezeItem),
  impact: [
    { id: 'CLASSIC', name: 'Backyard Impact', description: 'The original impact colors.', swatch: '#facc15', palette: { ringColor: '#facc15', shockwaveColor: '#facc15', burstColor: '#fbbf24' } },
    { id: 'COMIC', name: 'Comic Pop', description: 'A punchy gold impact palette.', swatch: '#fde047', palette: { ringColor: '#fde047', shockwaveColor: '#fb7185', burstColor: '#fff7ad' } },
    { id: 'ELECTRIC', name: 'Live Wire', description: 'A bright cyan impact palette.', swatch: '#22d3ee', palette: { ringColor: '#22d3ee', shockwaveColor: '#a5f3fc', burstColor: '#67e8f9' } },
    { id: 'HEAVY', name: 'Big Bonk', description: 'A bold violet impact palette.', swatch: '#c084fc', palette: { ringColor: '#c084fc', shockwaveColor: '#e9d5ff', burstColor: '#a78bfa' } }
  ].map(freezeItem)
};

export const COSMETIC_CATALOG = Object.freeze(Object.fromEntries(
  Object.entries(catalog).map(([category, items]) => [category, Object.freeze(items)])
));

export function cosmeticUnlockId(category, id) {
  return COSMETIC_CATALOG[category]?.some(item => item.id === id) ? `${category}:${id}` : null;
}

export function getCosmetic(category, id) {
  const items = COSMETIC_CATALOG[category];
  if (!items) return null;
  return items.find(item => item.id === id) || items.find(item => item.id === DEFAULT_EQUIPMENT[category]);
}

export function getCosmeticByUnlockId(unlockId) {
  if (typeof unlockId !== 'string') return null;
  const separator = unlockId.indexOf(':');
  if (separator < 0) return null;
  const category = unlockId.slice(0, separator);
  const item = COSMETIC_CATALOG[category]?.find(candidate => candidate.id === unlockId.slice(separator + 1));
  return item ? { category, ...item } : null;
}

export function isKnownCosmeticUnlockId(unlockId) {
  if (typeof unlockId !== 'string') return false;
  const separator = unlockId.indexOf(':');
  if (separator < 0) return false;
  return Boolean(COSMETIC_CATALOG[unlockId.slice(0, separator)]
    ?.some(item => item.id === unlockId.slice(separator + 1)));
}
