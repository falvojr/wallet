const STORAGE_KEY = 'holding_portfolio';
const SETTINGS_KEY = 'holding_settings';
const PRICES_KEY = 'holding_prices';
const PRICES_TTL = 24 * 60 * 60 * 1000;

export const CLASS_META = {
  brStocks:     { label: 'Ações',            color: '#34d399', icon: 'trending-up' },
  brFiis:       { label: 'FIIs',             color: '#22d3ee', icon: 'building-2' },
  usStocks:     { label: 'Stocks',           color: '#818cf8', icon: 'globe' },
  usReits:      { label: 'REITs',            color: '#c084fc', icon: 'landmark' },
  fixedIncome:  { label: 'Renda Fixa',       color: '#fbbf24', icon: 'shield' },
  storeOfValue: { label: 'Reserva de Valor', color: '#f97316', icon: 'bitcoin' },
  assets:       { label: 'Bens',             color: '#fb7185', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

const BR_QUOTED = new Set();
export function markBrQuoted(ticker) { BR_QUOTED.add(ticker); }
export function isBrQuoted(ticker) { return BR_QUOTED.has(ticker); }

export const state = {
  portfolio: null,
  settings: { brapiToken: '', finnhubToken: '' },
  prices: {},
  rates: {},
  pricesTimestamp: null,
  activeTab: 'overview',
};

export function loadPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.portfolio = JSON.parse(raw);
  } catch { state.portfolio = null; }
}

export function savePortfolio() {
  state.portfolio.syncedAt = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.portfolio));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) state.settings = JSON.parse(raw);
  } catch {}
}

export function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

export function loadCachedPrices() {
  try {
    const data = JSON.parse(localStorage.getItem(PRICES_KEY));
    if (data) {
      state.prices = data.prices || {};
      state.rates = data.rates || {};
      state.pricesTimestamp = data.ts || null;
    }
  } catch {}
}

export function cachePrices() {
  state.pricesTimestamp = Date.now();
  localStorage.setItem(PRICES_KEY, JSON.stringify({
    ts: state.pricesTimestamp, prices: state.prices, rates: state.rates,
  }));
}

export function pricesStale() {
  return state.pricesTimestamp ? Date.now() - state.pricesTimestamp > PRICES_TTL : false;
}

export function pricesDateStr() {
  if (!state.pricesTimestamp) return null;
  return new Date(state.pricesTimestamp).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function isClassHidden(classKey) {
  return !!(state.portfolio?.hiddenClasses?.[classKey]);
}

export function toggleClassHidden(classKey) {
  if (!state.portfolio) return;
  if (!state.portfolio.hiddenClasses) state.portfolio.hiddenClasses = {};
  state.portfolio.hiddenClasses[classKey] = !state.portfolio.hiddenClasses[classKey];
  if (!state.portfolio.hiddenClasses[classKey]) delete state.portfolio.hiddenClasses[classKey];
  savePortfolio();
}

export function visibleClassKeys() {
  return CLASS_KEYS.filter(k => !isClassHidden(k));
}

export function hasApiTokens() {
  return !!(state.settings.brapiToken || state.settings.finnhubToken);
}

export function hasCachedPrices() {
  return Object.keys(state.prices).length > 0;
}

export function setAssetNote(classKey, assetId, note) {
  const asset = state.portfolio?.[classKey]?.find(a => a.id === assetId);
  if (!asset) return;
  if (note.trim()) asset.note = note.trim();
  else delete asset.note;
  savePortfolio();
}

const THEME_KEY = 'holding_theme';

export function loadTheme() {
  document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'dark';
}

export function toggleTheme() {
  const next = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}
