import { DECLARED_CLASSES, portfolio, preferences, prices } from './state.js';

export function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Returns asset value in BRL. Declared classes use amount directly; others need price data. */
export function assetValueBRL(key, asset) {
  if (DECLARED_CLASSES.has(key)) return asset.amount;

  const priceData = prices.get(asset.id);
  if (!priceData) return key === 'storeOfValue' ? asset.amount : null;

  const price = priceData.currency === 'USD'
    ? priceData.price * prices.usdBrl
    : priceData.price;
  return price * asset.amount;
}

export function classTotalBRL(key) {
  let total = 0;
  let hasValue = false;

  for (const item of portfolio.items(key)) {
    const value = assetValueBRL(key, item);
    if (value !== null) {
      total += value;
      hasValue = true;
    }
  }

  return hasValue ? total : null;
}

/** Full portfolio value across all classes. */
export function portfolioTotalBRL() {
  let total = 0;
  let partial = false;

  for (const key of portfolio.allKeys()) {
    const value = classTotalBRL(key);
    if (value !== null) total += value;
    else if (portfolio.items(key).length) partial = true;
  }

  return { total, partial };
}

/** Portfolio value considering only classes visible in the chart. */
export function chartVisibleTotalBRL() {
  let total = 0;
  let partial = false;

  for (const key of portfolio.allKeys()) {
    if (preferences.isChartHidden(key)) continue;
    const value = classTotalBRL(key);
    if (value !== null) total += value;
    else if (portfolio.items(key).length) partial = true;
  }

  return { total, partial };
}

export const isSkippedAsset = item => item.target === 0;
export const classTargetPct = key => portfolio.target(key);

/**
 * A class with target = 0 does not participate in percentage rebalancing.
 * Emergency reserve remains active because it uses a BRL goal instead.
 */
export const isClassInactive = key =>
  key !== 'emergencyReserve' && portfolio.target(key) === 0;

export function classActualPct(key) {
  const value = classTotalBRL(key);
  const { total } = portfolioTotalBRL();
  return value !== null && total > 0 ? (value / total) * 100 : null;
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
  const activeCount = portfolio.items(key).filter(a => !isSkippedAsset(a)).length;
  return activeCount > 0 ? 100 / activeCount : 0;
}

/** Checks whether active-class targets sum to 100%. */
export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((total, key) => total + classTargetPct(key), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

// ---------------------------------------------------------------------------
// Rebalancing
//
// If the emergency reserve goal is unmet, every other recommendation is blocked.
//
// Otherwise, class-level shortfall (target% - actual%) is computed, filtered by
// a proportional threshold, and the top 1-3 classes are recommended. Within a
// recommended class, items are ranked by how far they are from their internal
// target.
// ---------------------------------------------------------------------------

const THRESHOLD_MIN = 0.5;
const THRESHOLD_FACTOR = 0.1;

function classThreshold(key) {
  return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR);
}

function classShortfall(key) {
  const actual = classActualPct(key);
  return actual !== null ? Math.max(0, classTargetPct(key) - actual) : null;
}

function recommendationLimit(count) {
  if (count >= 11) return 3;
  if (count >= 6) return 2;
  return count >= 1 ? 1 : 0;
}

/** Returns class keys prioritized for investment. ['emergencyReserve'] if goal is unmet. */
export function recommendedClasses() {
  if (portfolio.isEmergencyUnmet()) return ['emergencyReserve'];

  const ranked = portfolio.activeKeys()
    .filter(key => portfolio.items(key).length > 0)
    .map(key => ({ key, gap: classShortfall(key) }))
    .filter(({ key, gap }) => gap !== null && gap >= classThreshold(key))
    .toSorted((a, b) => b.gap - a.gap);

  const limit = ranked.length >= 8 ? 3 : ranked.length >= 3 ? 2 : 1;
  return ranked.slice(0, limit).map(item => item.key);
}

/** Returns asset IDs prioritized within a recommended class. */
export function recommendedItems(key) {
  if (portfolio.isEmergencyUnmet() || isClassInactive(key) || key === 'emergencyReserve') {
    return [];
  }

  if (!recommendedClasses().includes(key)) return [];

  const items = portfolio.items(key).filter(a => !isSkippedAsset(a));
  const total = classTotalBRL(key);
  const gap = classShortfall(key);

  if (!total || total <= 0 || !gap || gap < classThreshold(key)) return [];

  const ranked = items
    .map(item => {
      const value = assetValueBRL(key, item);
      if (value === null) return null;
      const itemGap = Math.max(0, itemTargetPct(key, item) - (value / total) * 100);
      return itemGap > 0 ? { id: item.id, score: itemGap * gap, gap: itemGap } : null;
    })
    .filter(Boolean)
    .toSorted((a, b) => b.score - a.score || b.gap - a.gap);

  return ranked.slice(0, recommendationLimit(items.length)).map(item => item.id);
}

/** All visible assets for the bubble chart. */
export function allAssetsWeighted() {
  const output = [];
  for (const key of portfolio.allKeys()) {
    if (preferences.isChartHidden(key)) continue;
    for (const item of portfolio.items(key)) {
      const value = assetValueBRL(key, item);
      if (value !== null && value > 0) {
        output.push({ id: item.id, value, classKey: key });
      }
    }
  }
  return output;
}
