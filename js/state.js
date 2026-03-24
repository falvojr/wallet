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

export function activeClassKeys() {
  return CLASS_KEYS;
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
