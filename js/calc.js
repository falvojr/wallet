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

// Renda fixa e imóveis: amount é o valor declarado em BRL.
// Reserva de valor sem cotação (ex: dinheiro em espécie): amount é o valor declarado em BRL.
// Demais classes: preço * quantidade, convertido via câmbio se necessário.
export function assetValueBRL(classKey, asset) {
  if (classKey === 'fixedIncome' || classKey === 'realEstate') return asset.amount;

  const p = state.prices[asset.id];

  if (!p) {
    return classKey === 'storeOfValue' ? asset.amount : null;
  }

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
// Heurística: threshold-based greedy rebalancing.
// 1) só recomenda classes abaixo da meta por uma banda mínima
// 2) dentro da classe, prioriza ativos mais subalocados
// 3) limita a quantidade de sugestões por classe para evitar ruído visual

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

const CLASS_THRESHOLD_MIN = 0.5;
const CLASS_THRESHOLD_FACTOR = 0.1;

function classThresholdPct(classKey) {
  return Math.max(CLASS_THRESHOLD_MIN, classTargetPct(classKey) * CLASS_THRESHOLD_FACTOR);
}

function actionableAssets(classKey) {
  return (state.portfolio[classKey] || []).filter(asset => !isQuarantined(asset));
}

function recommendationLimit(count) {
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  return count >= 2 ? 1 : 0;
}

function classDeficitPct(classKey) {
  const actual = classActualPct(classKey);
  if (actual === null) return null;
  return Math.max(0, classTargetPct(classKey) - actual);
}

export function findMostDeficientClasses() {
  const results = [];
  for (const key of activeClassKeys()) {
    if ((state.portfolio[key] || []).length === 0) continue;
    const gap = classDeficitPct(key);
    if (gap === null || gap < classThresholdPct(key)) continue;
    results.push({ key, gap });
  }
  results.sort((a, b) => b.gap - a.gap);
  const limit = results.length >= 4 ? 3 : results.length >= 2 ? 2 : 1;
  return results.slice(0, limit).map(r => r.key);
}

export function findMostDeficientAssets(classKey) {
  const assets = actionableAssets(classKey);
  const classTotal = classTotalBRL(classKey);
  const classGap = classDeficitPct(classKey);
  if (!classTotal || classTotal <= 0 || assets.length < 2 || !classGap || classGap < classThresholdPct(classKey)) return [];

  const results = [];
  for (const asset of assets) {
    const val = assetValueBRL(classKey, asset);
    if (val === null) continue;

    const actualPct = (val / classTotal) * 100;
    const targetPct = assetTargetPct(classKey, asset);
    const gap = Math.max(0, targetPct - actualPct);
    if (gap <= 0) continue;

    results.push({ id: asset.id, score: gap * classGap, gap });
  }

  results.sort((a, b) => b.score - a.score || b.gap - a.gap);
  return results.slice(0, recommendationLimit(assets.length)).map(r => r.id);
}
