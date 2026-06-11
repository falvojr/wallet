import { CLASS_KEYS, DECLARED_CLASSES, portfolio, preferences, prices, settings } from './state.js';

export function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Returns asset value in BRL. Declared classes use amount directly; others need price data.
export function assetValueBRL(key, asset) {
  if (DECLARED_CLASSES.has(key)) return asset.amount;

  const priceData = prices.get(asset.id);
  if (!priceData) return key === 'storeOfValue' ? asset.amount : null;

  if (priceData.currency === 'USD') {
    // Without an exchange rate the value is unknown, not zero.
    return prices.usdBrl > 0 ? priceData.price * prices.usdBrl * asset.amount : null;
  }
  return priceData.price * asset.amount;
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

// Full portfolio value across all classes.
export function portfolioTotalBRL() {
  let total = 0;
  let partial = false;

  for (const key of CLASS_KEYS) {
    const value = classTotalBRL(key);
    if (value !== null) total += value;
    else if (portfolio.items(key).length) partial = true;
  }

  return { total, partial };
}

// Portfolio value considering only classes visible in the chart.
export function chartVisibleTotalBRL() {
  let total = 0;
  let partial = false;

  for (const key of CLASS_KEYS) {
    if (preferences.isChartHidden(key)) continue;
    const value = classTotalBRL(key);
    if (value !== null) total += value;
    else if (portfolio.items(key).length) partial = true;
  }

  return { total, partial };
}

export const isSkippedAsset = item => item.target === 0;
export const classTargetPct = key => portfolio.target(key);

// A class with target = 0 does not participate in rebalancing; the emergency reserve stays active because it uses a BRL goal instead.
export const isClassInactive = key => key !== 'emergencyReserve' && portfolio.target(key) === 0;

export function classActualPct(key) {
  const value = classTotalBRL(key);
  const { total } = portfolioTotalBRL();
  return value !== null && total > 0 ? (value / total) * 100 : null;
}

// Progress of emergency reserve toward its BRL goal (0-100).
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

// Checks whether active-class targets sum to 100%.
export function allocationWarning() {
  const sum = portfolio.activeKeys().reduce((total, key) => total + classTargetPct(key), 0);
  return Math.abs(sum - 100) < 0.1 ? null : { sum: Math.round(sum) };
}

/*
 * Rebalancing. While the emergency reserve goal is unmet, it is the only recommendation.
 * Otherwise each class gets a shortfall (target% minus actual%); the classes above a proportional noise
 * threshold are ranked by shortfall and the most lagging are recommended, up to the configured limit.
 * Within a class, items are ranked the same way, by how far each sits below its own target.
 */

const THRESHOLD_MIN = 0.5;
const THRESHOLD_FACTOR = 0.1;

// Minimum shortfall, in percentage points, for a class to deserve a contribution: the larger of 0.5pp and 10% of its target.
function classThreshold(key) {
  return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR);
}

// Returns class keys prioritized for investment. ['emergencyReserve'] while its goal is unmet.
export function recommendedClasses() {
  if (portfolio.isEmergencyUnmet()) return ['emergencyReserve'];

  const { total } = portfolioTotalBRL();
  if (total <= 0) return [];

  return portfolio.activeKeys()
    .filter(key => portfolio.items(key).length > 0)
    .map(key => {
      const value = classTotalBRL(key);
      const shortfall = value !== null ? classTargetPct(key) - (value / total) * 100 : null;
      return { key, shortfall };
    })
    .filter(({ key, shortfall }) => shortfall !== null && shortfall >= classThreshold(key))
    .toSorted((a, b) => b.shortfall - a.shortfall)
    .slice(0, settings.recommendedClassCount)
    .map(entry => entry.key);
}

// Returns asset IDs prioritized within a recommended class, by how far each sits below its own target.
export function recommendedItems(key) {
  if (portfolio.isEmergencyUnmet() || isClassInactive(key) || key === 'emergencyReserve') return [];
  if (!recommendedClasses().includes(key)) return [];

  const total = classTotalBRL(key);
  if (!total) return [];

  return portfolio.items(key)
    .filter(item => !isSkippedAsset(item))
    .map(item => {
      const value = assetValueBRL(key, item);
      if (value === null) return null;
      const shortfall = itemTargetPct(key, item) - (value / total) * 100;
      return shortfall > 0 ? { id: item.id, shortfall } : null;
    })
    .filter(Boolean)
    .toSorted((a, b) => b.shortfall - a.shortfall)
    .slice(0, settings.recommendedAssetCount)
    .map(entry => entry.id);
}

// All visible assets for the bubble chart.
export function allAssetsWeighted() {
  const output = [];
  for (const key of CLASS_KEYS) {
    if (preferences.isChartHidden(key)) continue;
    for (const item of portfolio.items(key)) {
      const value = assetValueBRL(key, item);
      if (value !== null && value > 0) output.push({ id: item.id, value, classKey: key });
    }
  }
  return output;
}
