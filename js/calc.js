import { portfolio, prices, CLASS_META } from './state.js';

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Returns asset value in BRL, or null if price is unavailable. */
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

/** Full patrimônio — includes ALL classes (active + inactive). */
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
export const isClassInactive = key => portfolio.target(key) === 0;

export function classActualPct(key) {
  const val       = classTotalBRL(key);
  const { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

export function itemTargetPct(key, item) {
  if (item.target !== undefined) return item.target;
  const activeCount = portfolio.items(key).filter(a => !isQuarantined(a)).length;
  return activeCount > 0 ? 100 / activeCount : 0;
}

export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((acc, key) => acc + classTargetPct(key), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

/**
 * Threshold-based greedy rebalancing algorithm.
 *
 * Only considers active classes (target > 0).
 *
 * Two-level approach:
 * 1. Class level: deficit = target% − actual%, filtered by threshold.
 * 2. Asset level: within-class gap × class deficit, sorted by score.
 */

const THRESHOLD_MIN    = 0.5;
const THRESHOLD_FACTOR = 0.1;

function classThreshold(key) {
  return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR);
}

function classDeficit(key) {
  const actual = classActualPct(key);
  return actual !== null ? Math.max(0, classTargetPct(key) - actual) : null;
}

function recLimit(count) {
  if (count >= 10) return 3;
  if (count >= 5)  return 2;
  return count >= 2 ? 1 : 0;
}

/** Returns the keys of active classes with the largest allocation deficit (up to 3). */
export function deficientClasses() {
  const ranked = portfolio.activeKeys()
    .filter(key => portfolio.items(key).length > 0)
    .map(key => ({ key, gap: classDeficit(key) }))
    .filter(({ key, gap }) => gap !== null && gap >= classThreshold(key))
    .toSorted((a, b) => b.gap - a.gap);

  const limit = ranked.length >= 4 ? 3 : ranked.length >= 2 ? 2 : 1;
  return ranked.slice(0, limit).map(r => r.key);
}

/** Returns the IDs of assets within a class that have the largest allocation deficit. */
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

/** Returns all assets with their BRL value and class metadata, for the bubble chart. */
export function allAssetsWeighted() {
  const assets = [];
  for (const key of portfolio.allKeys()) {
    const color = CLASS_META[key].color;
    for (const item of portfolio.items(key)) {
      const value = assetValueBRL(key, item);
      if (value !== null && value > 0) assets.push({ id: item.id, value, color, classKey: key });
    }
  }
  return assets;
}
