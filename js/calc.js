import { portfolio, prices, CLASS_META } from './state.js';

export function formatBRL(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

/** Returns asset value in BRL. Fixed-income, emergency and assets use declared amount; others need price data. */
export function assetValueBRL(key, asset) {
  if (key === 'fixedIncome' || key === 'assets' || key === 'emergencyReserve') return asset.amount;
  const p = prices.get(asset.id);
  if (!p) return key === 'storeOfValue' ? asset.amount : null;
  return (p.currency === 'USD' ? p.price * prices.usdBrl : p.price) * asset.amount;
}

export function classTotalBRL(key) {
  let total = 0, has = false;
  for (const item of portfolio.items(key)) { const v = assetValueBRL(key, item); if (v !== null) { total += v; has = true; } }
  return has ? total : null;
}

/** Full portfolio value across all classes. */
export function portfolioTotalBRL() {
  let total = 0, partial = false;
  for (const key of portfolio.allKeys()) { const v = classTotalBRL(key); if (v !== null) total += v; else if (portfolio.items(key).length) partial = true; }
  return { total, partial };
}

/** Portfolio value considering only classes visible in the chart (not chart-hidden). */
export function chartVisibleTotalBRL() {
  let total = 0, partial = false;
  for (const key of portfolio.allKeys()) {
    if (portfolio.isChartHidden(key)) continue;
    const v = classTotalBRL(key); if (v !== null) total += v; else if (portfolio.items(key).length) partial = true;
  }
  return { total, partial };
}

export const isQuarantined = item => item.target === 0;
export const classTargetPct = key => portfolio.target(key);

/** A class with target=0 that does NOT participate in percentage rebalancing. Emergency reserve is NOT inactive (it uses goal-based rebalancing). */
export const isClassInactive = key => key !== 'emergencyReserve' && portfolio.target(key) === 0;

export function classActualPct(key) {
  const val = classTotalBRL(key), { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

/** Progress of emergency reserve toward its BRL goal (0-100), or null if no goal set. */
export function emergencyProgress() {
  const goal = portfolio.goal('emergencyReserve');
  if (goal <= 0) return null;
  return Math.min(((classTotalBRL('emergencyReserve') ?? 0) / goal) * 100, 100);
}

export function itemTargetPct(key, item) {
  if (item.target !== undefined) return item.target;
  const active = portfolio.items(key).filter(a => !isQuarantined(a)).length;
  return active > 0 ? 100 / active : 0;
}

/** Checks whether active-class targets sum to 100%. Returns null when OK, otherwise { sum }. */
export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((s, k) => s + classTargetPct(k), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

// Rebalancing
// If emergency reserve goal is unmet, ALL recommendations are blocked (classes AND assets).
// Otherwise, class-level deficit (target% - actual%) is used, capped at 2 recommendations (3 for 8+ classes).
// Asset-level: within a deficient class, top 1-3 most underweight assets are suggested.

const THRESHOLD_MIN = 0.5, THRESHOLD_FACTOR = 0.1;
function classThreshold(key) { return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR); }
function classDeficit(key) { const a = classActualPct(key); return a !== null ? Math.max(0, classTargetPct(key) - a) : null; }
function recLimit(n) { return n >= 10 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0; }

/** Returns class keys needing investment. If emergency is unmet, returns only ['emergencyReserve']. */
export function deficientClasses() {
  if (portfolio.isEmergencyUnmet()) return ['emergencyReserve'];
  const ranked = portfolio.activeKeys().filter(k => portfolio.items(k).length > 0)
    .map(k => ({ key: k, gap: classDeficit(k) })).filter(({ key, gap }) => gap !== null && gap >= classThreshold(key))
    .toSorted((a, b) => b.gap - a.gap);
  return ranked.slice(0, ranked.length >= 8 ? 3 : ranked.length >= 3 ? 2 : 1).map(r => r.key);
}

/** Returns asset IDs within a class that are most underweight. Returns [] when emergency is unmet. */
export function deficientItems(key) {
  if (portfolio.isEmergencyUnmet() || isClassInactive(key) || key === 'emergencyReserve') return [];
  const items = portfolio.items(key).filter(a => !isQuarantined(a));
  const total = classTotalBRL(key), gap = classDeficit(key);
  if (!total || total <= 0 || items.length < 2 || !gap || gap < classThreshold(key)) return [];
  const ranked = items.map(item => {
    const val = assetValueBRL(key, item); if (val === null) return null;
    const g = Math.max(0, itemTargetPct(key, item) - (val / total) * 100);
    return g > 0 ? { id: item.id, score: g * gap, gap: g } : null;
  }).filter(Boolean).toSorted((a, b) => b.score - a.score || b.gap - a.gap);
  return ranked.slice(0, recLimit(items.length)).map(r => r.id);
}

/** All visible assets for the bubble chart (respects chart-only hide toggle). */
export function allAssetsWeighted() {
  const out = [];
  for (const key of portfolio.allKeys()) {
    if (portfolio.isChartHidden(key)) continue;
    const color = CLASS_META[key].color;
    for (const item of portfolio.items(key)) { const v = assetValueBRL(key, item); if (v !== null && v > 0) out.push({ id: item.id, value: v, color, classKey: key }); }
  }
  return out;
}
