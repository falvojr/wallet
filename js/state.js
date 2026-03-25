const STORAGE_KEY = 'holding_portfolio';
const SETTINGS_KEY = 'holding_settings';
const PRICES_KEY = 'holding_prices';
const PRICES_TTL = 5 * 60 * 1000;

export const CLASS_META = {
  brStocks:     { label: 'Ações BR',         color: '#34d399', icon: 'trending-up' },
  brFiis:       { label: 'FIIs',             color: '#22d3ee', icon: 'building-2' },
  usStocks:     { label: 'Ações US',         color: '#818cf8', icon: 'globe' },
  usReits:      { label: 'REITs',            color: '#c084fc', icon: 'landmark' },
  fixedIncome:  { label: 'Renda Fixa',       color: '#fbbf24', icon: 'shield' },
  storeOfValue: { label: 'Reserva de Valor', color: '#f97316', icon: 'bitcoin' },
  realEstate:   { label: 'Imóveis',          color: '#fb7185', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

// Tickers cotados via brapi.dev (B3)
const BR_QUOTED = new Set();
// Tickers cotados via Finnhub
const US_QUOTED = new Set();

export function markBrQuoted(ticker) { BR_QUOTED.add(ticker); }
export function markUsQuoted(ticker) { US_QUOTED.add(ticker); }
export function isBrQuoted(ticker) { return BR_QUOTED.has(ticker); }
export function isUsQuoted(ticker) { return US_QUOTED.has(ticker); }

export const state = {
  portfolio: null,
  settings: { brapiToken: '', finnhubToken: '' },
  prices: {},
  rates: {},
  editMode: false,
  activeTab: 'overview',
};

export function loadPortfolio() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) state.portfolio = JSON.parse(stored);
  } catch { state.portfolio = null; }
}

export function savePortfolio() {
  state.portfolio.syncedAt = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.portfolio));
}

export function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) state.settings = JSON.parse(stored);
  } catch {}
}

export function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

export function loadCachedPrices() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(PRICES_KEY));
    if (stored && Date.now() - stored.ts < PRICES_TTL) {
      state.prices = stored.prices || {};
      state.rates = stored.rates || {};
    }
  } catch {}
}

export function cachePrices() {
  sessionStorage.setItem(PRICES_KEY, JSON.stringify({
    ts: Date.now(), prices: state.prices, rates: state.rates,
  }));
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

export function activeClassKeys() {
  return CLASS_KEYS;
}

// Classes visíveis (não ocultas) para cálculos de patrimônio e rebalanceamento
export function visibleClassKeys() {
  return CLASS_KEYS.filter(k => !isClassHidden(k));
}

export function hasApiTokens() {
  return !!(state.settings.brapiToken || state.settings.finnhubToken);
}

export function hasCachedPrices() {
  return Object.keys(state.prices).length > 0;
}

const THEME_KEY = 'holding_theme';

export function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.dataset.theme = theme;
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}
