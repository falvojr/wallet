import { state, CLASS_KEYS, visibleClassKeys, isClassHidden, classItems, classTarget as getClassTarget } from './state.js';

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCompact(val) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}

export function assetValueBRL(key, asset) {
  if (key === 'fixedIncome' || key === 'assets') return asset.amount;
  const p = state.prices[asset.id];
  if (!p) return key === 'storeOfValue' ? asset.amount : null;
  if (p.currency === 'USD') return p.price * (state.rates.USDBRL || 0) * asset.amount;
  return p.price * asset.amount;
}

export function classTotalBRL(key) {
  let total = 0, has = false;
  for (const item of classItems(key)) {
    const val = assetValueBRL(key, item);
    if (val !== null) { total += val; has = true; }
  }
  return has ? total : null;
}

export function portfolioTotalBRL() {
  let total = 0, partial = false;
  for (const key of visibleClassKeys()) {
    const val = classTotalBRL(key);
    if (val !== null) total += val;
    else if (classItems(key).length > 0) partial = true;
  }
  return { total, partial };
}

export function isQuarantined(item) {
  return item.target === 0;
}

export function classTargetPct(key) {
  return getClassTarget(key);
}

export function classActualPct(key) {
  const val = classTotalBRL(key);
  const { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

export function itemTargetPct(key, item) {
  if (item.target !== undefined) return item.target;
  const active = classItems(key).filter(a => !isQuarantined(a)).length;
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

function classThreshold(key) {
  return Math.max(THRESHOLD_MIN, classTargetPct(key) * THRESHOLD_FACTOR);
}

function classDeficit(key) {
  const actual = classActualPct(key);
  return actual !== null ? Math.max(0, classTargetPct(key) - actual) : null;
}

function recLimit(count) {
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  return count >= 2 ? 1 : 0;
}

export function deficientClasses() {
  const results = [];
  for (const key of visibleClassKeys()) {
    if (classItems(key).length === 0) continue;
    const gap = classDeficit(key);
    if (gap === null || gap < classThreshold(key)) continue;
    results.push({ key, gap });
  }
  results.sort((a, b) => b.gap - a.gap);
  const limit = results.length >= 4 ? 3 : results.length >= 2 ? 2 : 1;
  return results.slice(0, limit).map(r => r.key);
}

export function deficientItems(key) {
  if (isClassHidden(key)) return [];
  const items = classItems(key).filter(a => !isQuarantined(a));
  const total = classTotalBRL(key);
  const gap = classDeficit(key);
  if (!total || total <= 0 || items.length < 2 || !gap || gap < classThreshold(key)) return [];

  const scored = [];
  for (const item of items) {
    const val = assetValueBRL(key, item);
    if (val === null) continue;
    const itemGap = Math.max(0, itemTargetPct(key, item) - (val / total) * 100);
    if (itemGap > 0) scored.push({ id: item.id, score: itemGap * gap, gap: itemGap });
  }

  scored.sort((a, b) => b.score - a.score || b.gap - a.gap);
  return scored.slice(0, recLimit(items.length)).map(r => r.id);
}
