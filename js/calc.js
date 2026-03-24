import { state, CLASS_KEYS, activeClassKeys } from './state.js';

// Formatting

export function formatBRL(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatQty(val) {
  if (Number.isInteger(val)) return val.toLocaleString('pt-BR');
  if (val < 1) return val.toFixed(8);
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCompact(val) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}

// Conversão para BRL:
// BR: preço direto. US: preço * câmbio USD/BRL.
// BTC: taxa BTC/BRL * qtd. Renda fixa e imóveis: amount já é o valor em BRL.

export function assetValueBRL(classKey, asset) {
  if (classKey === 'fixedIncome' || classKey === 'realEstate') return asset.amount;
  if (classKey === 'storeOfValue') return (state.rates.BTCBRL || 0) * asset.amount;

  const p = state.prices[asset.id];
  if (!p) return null;

  const isUSD = classKey === 'usStocks' || classKey === 'usReits';
  return (isUSD ? p.price * (state.rates.USDBRL || 0) : p.price) * asset.amount;
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
  for (const key of CLASS_KEYS) {
    const val = classTotalBRL(key);
    if (val !== null) total += val;
    else if ((state.portfolio[key] || []).length > 0) partial = true;
  }
  return { total, partial };
}

// Metas e rebalanceamento:
// classTargets[key] = % desejado do portfólio total.
// asset.target = % desejado dentro da classe. 0 = quarentena.
// O ativo/classe com maior diferença (meta - atual) é o candidato a aporte.

export function isQuarantined(asset) {
  return asset.target === 0;
}

export function classTargetPct(classKey) {
  const targets = state.portfolio.classTargets || {};
  if (targets[classKey] !== undefined) return targets[classKey];
  const active = activeClassKeys();
  return active.length > 0 ? 100 / active.length : 0;
}

export function classActualPct(classKey) {
  const val = classTotalBRL(classKey);
  const { total } = portfolioTotalBRL();
  return val !== null && total > 0 ? (val / total) * 100 : null;
}

export function assetTargetPct(classKey, asset) {
  if (asset.target !== undefined) return asset.target;
  const activeCount = (state.portfolio[classKey] || []).filter(a => !isQuarantined(a)).length;
  return activeCount > 0 ? 100 / activeCount : 0;
}

export function findMostDeficientClass() {
  let bestKey = null, bestGap = -Infinity;
  for (const key of activeClassKeys()) {
    const actual = classActualPct(key);
    if (actual === null) continue;
    const gap = classTargetPct(key) - actual;
    if (gap > bestGap) { bestGap = gap; bestKey = key; }
  }
  return bestKey;
}

export function findMostDeficientAsset(classKey) {
  const assets = state.portfolio[classKey] || [];
  const classTotal = classTotalBRL(classKey);
  if (!classTotal || classTotal <= 0 || assets.length < 2) return null;

  let bestId = null, bestGap = -Infinity;
  for (const asset of assets) {
    if (isQuarantined(asset)) continue;
    const val = assetValueBRL(classKey, asset);
    if (val === null) continue;
    const gap = assetTargetPct(classKey, asset) - (val / classTotal) * 100;
    if (gap > bestGap) { bestGap = gap; bestId = asset.id; }
  }
  return bestId;
}
