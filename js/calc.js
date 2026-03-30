import { portfolio, preferences, prices } from './state.js';

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Returns asset value in BRL. Declared classes use amount directly; others need price data. */
export function assetValueBRL(key, asset) {
  if (key === 'fixedIncome' || key === 'assets' || key === 'emergencyReserve') {
    return asset.amount;
  }

  const p = prices.get(asset.id);
  if (!p) return key === 'storeOfValue' ? asset.amount : null;

  const price = p.currency === 'USD' ? p.price * prices.usdBrl : p.price;
  return price * asset.amount;
}

export function classTotalBRL(key) {
  let total = 0;
  let hasValue = false;

  for (const item of portfolio.items(key)) {
    const val = assetValueBRL(key, item);
    if (val !== null) {
      total += val;
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
    const val = classTotalBRL(key);
    if (val !== null) total += val;
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
    const val = classTotalBRL(key);
    if (val !== null) total += val;
    else if (portfolio.items(key).length) partial = true;
  }

  return { total, partial };
}

export const isSkippedAsset = item => item.target === 0;
export const classTargetPct = key => portfolio.target(key);

/**
 * A class with target=0 that does NOT participate in percentage rebalancing.
 * Emergency reserve is NOT inactive (it uses goal-based rebalancing).
 */
export const isClassInactive = key => {
  return key !== 'emergencyReserve' && portfolio.target(key) === 0;
};

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
  const active = portfolio.items(key).filter(a => !isSkippedAsset(a)).length;
  return active > 0 ? 100 / active : 0;
}

/** Checks whether active-class targets sum to 100%. */
export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((s, k) => s + classTargetPct(k), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

// ---------------------------------------------------------------------------
// Rebalancing
//
// If emergency reserve goal is unmet, ALL recommendations are blocked
// (both class-level and asset-level). This follows the principle that an
// emergency fund is a prerequisite before investing elsewhere.
//
// Otherwise: each class shortfall (target% - actual%) is computed, filtered
// by a proportional threshold, and the most relevant 1-3 classes are recommended.
// Within a recommended class, assets are ranked by their gap from within-class target.
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
  if (count >= 10) return 3;
  if (count >= 6) return 2;
  return count >= 2 ? 1 : 0;
}

/** Returns class keys that deserve fresh contributions. ['emergencyReserve'] if goal unmet. */
export function recommendedClasses() {
  if (portfolio.isEmergencyUnmet()) {
    return ['emergencyReserve'];
  }

  const ranked = portfolio.activeKeys()
    .filter(key => portfolio.items(key).length > 0)
    .map(key => ({ key, gap: classShortfall(key) }))
    .filter(({ key, gap }) => gap !== null && gap >= classThreshold(key))
    .toSorted((a, b) => b.gap - a.gap);

  const limit = ranked.length >= 7 ? 3 : ranked.length >= 3 ? 2 : 1;
  return ranked.slice(0, limit).map(r => r.key);
}

/** Returns asset IDs within a recommended class that are most underweight. */
export function recommendedItems(key) {
  if (portfolio.isEmergencyUnmet() || isClassInactive(key) || key === 'emergencyReserve') {
    return [];
  }

  const items = portfolio.items(key).filter(a => !isSkippedAsset(a));
  const total = classTotalBRL(key);
  const gap = classShortfall(key);

  if (!recommendedClasses().includes(key) || !total || total <= 0 || items.length < 2 || !gap || gap < classThreshold(key)) {
    return [];
  }

  const ranked = items.map(item => {
    const val = assetValueBRL(key, item);
    if (val === null) return null;
    const itemGap = Math.max(0, itemTargetPct(key, item) - (val / total) * 100);
    return itemGap > 0 ? { id: item.id, score: itemGap * gap, gap: itemGap } : null;
  })
    .filter(Boolean)
    .toSorted((a, b) => b.score - a.score || b.gap - a.gap);

  return ranked.slice(0, recommendationLimit(items.length)).map(r => r.id);
}

/** All visible assets for the bubble chart. Color is resolved at render time via getClassColor(). */
export function allAssetsWeighted() {
  const out = [];
  for (const key of portfolio.allKeys()) {
    if (preferences.isChartHidden(key)) continue;
    for (const item of portfolio.items(key)) {
      const value = assetValueBRL(key, item);
      if (value !== null && value > 0) {
        out.push({ id: item.id, value, classKey: key });
      }
    }
  }
  return out;
}
