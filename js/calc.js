import { portfolio, prices, CLASS_META } from './state.js';

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Returns asset value in BRL, or null if no price is available. */
export function assetValueBRL(key, asset) {
  if (key === 'fixedIncome' || key === 'assets' || key === 'emergencyReserve') return asset.amount;
  const p = prices.get(asset.id);
  if (!p) return key === 'storeOfValue' ? asset.amount : null;
  if (p.currency === 'USD') return p.price * prices.usdBrl * asset.amount;
  return p.price * asset.amount;
}

export function classTotalBRL(key) {
  let total = 0, hasValue = false;
  for (const item of portfolio.items(key)) {
    const val = assetValueBRL(key, item);
    if (val !== null) { total += val; hasValue = true; }
  }
  return hasValue ? total : null;
}

/** Full portfolio value across all classes (active and inactive). */
export function portfolioTotalBRL() {
  let total = 0, partial = false;
  for (const key of portfolio.allKeys()) {
    const val = classTotalBRL(key);
    if (val !== null) total += val;
    else if (portfolio.items(key).length > 0) partial = true;
  }
  return { total, partial };
}

export const isQuarantined  = item => item.target === 0;
export const classTargetPct = key  => portfolio.target(key);

/** A class does not participate in percentage-based rebalancing. */
export const isClassInactive = key => key === 'emergencyReserve' || portfolio.target(key) === 0;

export function classActualPct(key) {
  const val = classTotalBRL(key);
  const { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

/** Progress of emergency reserve toward its BRL goal (0-100). */
export function emergencyProgress() {
  const goal = portfolio.goal('emergencyReserve');
  if (goal <= 0) return null;
  const total = classTotalBRL('emergencyReserve') ?? 0;
  return Math.min((total / goal) * 100, 100);
}

export function itemTargetPct(key, item) {
  if (item.target !== undefined) return item.target;
  const activeCount = portfolio.items(key).filter(a => !isQuarantined(a)).length;
  return activeCount > 0 ? 100 / activeCount : 0;
}

/** Checks if active class targets sum to 100%. Returns null if OK. */
export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((acc, key) => acc + classTargetPct(key), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

// Rebalancing
//
// The algorithm follows a two-level greedy approach:
//
// 1. Emergency reserve check: if the reserve has a goal set and the
//    current amount is below it, the algorithm recommends ONLY the
//    emergency reserve. This reflects the financial principle that an
//    emergency fund is a prerequisite before investing elsewhere.
//
// 2. Class level: for each active class (target > 0), compute the
//    deficit (target% - actual%). Filter out classes where the deficit
//    is below a proportional threshold (10% of target, min 0.5pp).
//    Return the top 1-2 most underweight classes.
//
// 3. Asset level: within a recommended class, rank assets by their
//    gap from their within-class target, weighted by the class deficit.
//    Return the top 1-3 assets depending on class size.

const THRESHOLD_MIN    = 0.5;
const THRESHOLD_FACTOR = 0.1;

function classThreshold(key) {
  return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR);
}

function classDeficit(key) {
  const actual = classActualPct(key);
  return actual !== null ? Math.max(0, classTargetPct(key) - actual) : null;
}

/**
 * Returns max number of recommendations based on item count.
 * Avoids overwhelming the user with suggestions in small sets.
 */
function recLimit(count) {
  if (count >= 10) return 3;
  if (count >= 5)  return 2;
  return count >= 2 ? 1 : 0;
}

/**
 * Returns the keys of classes that need the most investment.
 *
 * If the emergency reserve goal is set but not met, returns only
 * ['emergencyReserve'] to enforce the "safety net first" principle.
 */
export function deficientClasses() {
  if (portfolio.isEmergencyUnmet()) return ['emergencyReserve'];

  const ranked = portfolio.activeKeys()
    .filter(key => portfolio.items(key).length > 0)
    .map(key => ({ key, gap: classDeficit(key) }))
    .filter(({ key, gap }) => gap !== null && gap >= classThreshold(key))
    .toSorted((a, b) => b.gap - a.gap);

  // Cap at 2 for typical portfolios (6-8 classes); 3 only for 10+
  const limit = ranked.length >= 8 ? 3 : ranked.length >= 3 ? 2 : 1;
  return ranked.slice(0, limit).map(r => r.key);
}

/** Returns asset IDs within a class that are most underweight. */
export function deficientItems(key) {
  if (isClassInactive(key)) return [];

  const items = portfolio.items(key).filter(a => !isQuarantined(a));
  const total = classTotalBRL(key);
  const gap   = classDeficit(key);

  if (!total || total <= 0 || items.length < 2 || !gap || gap < classThreshold(key)) return [];

  const ranked = items
    .map(item => {
      const val = assetValueBRL(key, item);
      if (val === null) return null;
      const itemGap = Math.max(0, itemTargetPct(key, item) - (val / total) * 100);
      return itemGap > 0 ? { id: item.id, score: itemGap * gap, gap: itemGap } : null;
    })
    .filter(Boolean)
    .toSorted((a, b) => b.score - a.score || b.gap - a.gap);

  return ranked.slice(0, recLimit(items.length)).map(r => r.id);
}

/** Returns all visible assets for the bubble chart (respects chart-only hide toggle). */
export function allAssetsWeighted() {
  const assets = [];
  for (const key of portfolio.allKeys()) {
    if (portfolio.isChartHidden(key)) continue;
    const color = CLASS_META[key].color;
    for (const item of portfolio.items(key)) {
      const value = assetValueBRL(key, item);
      if (value !== null && value > 0) assets.push({ id: item.id, value, color, classKey: key });
    }
  }
  return assets;
}
