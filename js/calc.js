import { state, CLASS_KEYS, visibleClassKeys, isClassHidden } from './state.js';

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCompact(val) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}

export function assetValueBRL(classKey, asset) {
  if (classKey === 'fixedIncome' || classKey === 'assets') return asset.amount;
  const p = state.prices[asset.id];
  if (!p) return classKey === 'storeOfValue' ? asset.amount : null;
  if (p.currency === 'USD') return p.price * (state.rates.USDBRL || 0) * asset.amount;
  return p.price * asset.amount;
}

export function classTotalBRL(classKey) {
  let total = 0, hasPrices = false;
  for (const asset of state.portfolio[classKey] || []) {
    const val = assetValueBRL(classKey, asset);
    if (val !== null) { total += val; hasPrices = true; }
  }
  return hasPrices ? total : null;
}

export function portfolioTotalBRL() {
  let total = 0, partial = false;
  for (const key of visibleClassKeys()) {
    const val = classTotalBRL(key);
    if (val !== null) total += val;
    else if ((state.portfolio[key] || []).length > 0) partial = true;
  }
  return { total, partial };
}

export function isQuarantined(asset) {
  return asset.target === 0;
}

export function classTargetPct(classKey) {
  const targets = state.portfolio.classTargets || {};
  if (targets[classKey] !== undefined) return targets[classKey];
  const visible = visibleClassKeys();
  return visible.length > 0 ? 100 / visible.length : 0;
}

export function classActualPct(classKey) {
  const val = classTotalBRL(classKey);
  const { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

export function assetTargetPct(classKey, asset) {
  if (asset.target !== undefined) return asset.target;
  const active = (state.portfolio[classKey] || []).filter(a => !isQuarantined(a)).length;
  return active > 0 ? 100 / active : 0;
}

export function allocationWarning() {
  let sum = 0;
  for (const key of visibleClassKeys()) sum += classTargetPct(key);
  if (Math.abs(sum - 100) < 0.1) return null;
  return { sum: Math.round(sum) };
}

// Rebalancing

const THRESHOLD_MIN = 0.5;
const THRESHOLD_FACTOR = 0.1;

function classThreshold(classKey) {
  return Math.max(THRESHOLD_MIN, classTargetPct(classKey) * THRESHOLD_FACTOR);
}

function classDeficit(classKey) {
  const actual = classActualPct(classKey);
  return actual !== null ? Math.max(0, classTargetPct(classKey) - actual) : null;
}

function recLimit(count) {
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  return count >= 2 ? 1 : 0;
}

export function findMostDeficientClasses() {
  const results = [];
  for (const key of visibleClassKeys()) {
    if ((state.portfolio[key] || []).length === 0) continue;
    const gap = classDeficit(key);
    if (gap === null || gap < classThreshold(key)) continue;
    results.push({ key, gap });
  }
  results.sort((a, b) => b.gap - a.gap);
  const limit = results.length >= 4 ? 3 : results.length >= 2 ? 2 : 1;
  return results.slice(0, limit).map(r => r.key);
}

export function findMostDeficientAssets(classKey) {
  if (isClassHidden(classKey)) return [];
  const assets = (state.portfolio[classKey] || []).filter(a => !isQuarantined(a));
  const total = classTotalBRL(classKey);
  const gap = classDeficit(classKey);
  if (!total || total <= 0 || assets.length < 2 || !gap || gap < classThreshold(classKey)) return [];

  const scored = [];
  for (const asset of assets) {
    const val = assetValueBRL(classKey, asset);
    if (val === null) continue;
    const assetGap = Math.max(0, assetTargetPct(classKey, asset) - (val / total) * 100);
    if (assetGap > 0) scored.push({ id: asset.id, score: assetGap * gap, gap: assetGap });
  }

  scored.sort((a, b) => b.score - a.score || b.gap - a.gap);
  return scored.slice(0, recLimit(assets.length)).map(r => r.id);
}
