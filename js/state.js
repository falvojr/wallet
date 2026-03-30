import { tn } from './i18n.js';

const STORAGE = 'holding_portfolio';
const SETTINGS = 'holding_settings';
const PRICES = 'holding_prices';
const PREFS = 'holding_prefs';
const THEME = 'holding_theme';
const PRICES_TTL = 24 * 60 * 60 * 1000;

/**
 * Visual metadata for each asset class.
 * Used as a fallback before theme-aware CSS values are available.
 */
export const CLASS_META = {
  brStocks: { color: '#4fd8c8', icon: 'trending-up' },
  brFiis: { color: '#9ccc65', icon: 'building-2' },
  usStocks: { color: '#a5b4fc', icon: 'globe' },
  usReits: { color: '#60a5fa', icon: 'landmark' },
  fixedIncome: { color: '#facc15', icon: 'shield' },
  emergencyReserve: { color: '#fb7185', icon: 'life-buoy' },
  storeOfValue: { color: '#fb923c', icon: 'bitcoin' },
  assets: { color: '#90a4ae', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

export function classLabel(key) {
  return tn('classLabels', key);
}

export class Portfolio {
  #data = null;

  get loaded() {
    return this.#data !== null;
  }

  items(key) {
    return this.#data?.[key]?.items ?? [];
  }

  #isPercentageActive(key) {
    if (key === 'emergencyReserve') return false;

    const storedTarget = this.#data?.[key]?.target;
    return storedTarget !== undefined ? storedTarget > 0 : key !== 'assets';
  }

  target(key) {
    if (key === 'emergencyReserve' || key === 'assets') {
      return 0;
    }

    const storedTarget = this.#data?.[key]?.target;
    if (storedTarget !== undefined) return storedTarget;

    const activeClassCount = this.activeKeys().length;
    return activeClassCount > 0 ? 100 / activeClassCount : 0;
  }

  setTarget(key, value) {
    this.#ensureClass(key);
    this.#data[key].target = value;
  }

  activeKeys() {
    return CLASS_KEYS.filter(key => this.#isPercentageActive(key));
  }

  allKeys() {
    return CLASS_KEYS;
  }

  goal(key) {
    return this.#data?.[key]?.goal ?? 0;
  }

  setGoal(key, value) {
    this.#ensureClass(key);
    this.#data[key].goal = value;
  }

  isEmergencyUnmet() {
    const goal = this.goal('emergencyReserve');
    if (goal <= 0) return false;

    const currentTotal = this.items('emergencyReserve').reduce((sum, asset) => sum + asset.amount, 0);
    return currentTotal < goal;
  }

  addItem(key, item) {
    this.#ensureClass(key);
    this.#data[key].items.push(item);
  }

  setItemNote(key, id, note) {
    const item = this.items(key).find(asset => asset.id === id);
    if (!item) return;

    const trimmedNote = note.trim();
    if (trimmedNote) item.note = trimmedNote;
    else delete item.note;

    this.save();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) this.#data = JSON.parse(raw);
    } catch {
      this.#data = null;
    }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE, JSON.stringify(this.#data));
  }

  import(data) {
    this.#data = data;
    this.save();
  }

  export() {
    const output = { syncedAt: this.#data.syncedAt };

    CLASS_KEYS.forEach(key => {
      if (this.#data[key]) output[key] = this.#data[key];
    });

    return output;
  }

  #ensureClass(key) {
    this.#data[key] ??= { items: [] };
  }
}

export class Preferences {
  #data = {};

  order(key) {
    return this.#data.order?.[key] ?? CLASS_KEYS.indexOf(key) + 1;
  }

  setOrder(key, value) {
    this.#data.order ??= {};
    this.#data.order[key] = value;
    this.save();
  }

  swapOrder(firstKey, secondKey) {
    const firstOrder = this.order(firstKey);
    const secondOrder = this.order(secondKey);

    this.#data.order ??= {};
    this.#data.order[firstKey] = secondOrder;
    this.#data.order[secondKey] = firstOrder;
    this.save();
  }

  displayOrder() {
    return [...CLASS_KEYS].sort((left, right) => {
      return this.order(left) - this.order(right) || CLASS_KEYS.indexOf(left) - CLASS_KEYS.indexOf(right);
    });
  }

  isChartHidden(key) {
    return Boolean(this.#data.chartHidden?.[key]);
  }

  toggleChartHidden(key) {
    this.#data.chartHidden ??= {};

    if (this.#data.chartHidden[key]) delete this.#data.chartHidden[key];
    else this.#data.chartHidden[key] = true;

    this.save();
  }

  get sortCol() {
    return this.#data.sortCol ?? null;
  }

  get sortDir() {
    return this.#data.sortDir ?? 'asc';
  }

  setSort(column, direction) {
    this.#data.sortCol = column;
    this.#data.sortDir = direction;
    this.save();
  }

  load() {
    try {
      const raw = localStorage.getItem(PREFS);
      if (raw) this.#data = JSON.parse(raw);
    } catch {
      this.#data = {};
    }
  }

  save() {
    localStorage.setItem(PREFS, JSON.stringify(this.#data));
  }
}

export class PriceCache {
  #prices = {};
  #rates = {};
  #timestamp = null;
  #brQuoted = new Set();

  get(id) {
    return this.#prices[id] ?? null;
  }

  set(id, data) {
    this.#prices[id] = data;
  }

  get usdBrl() {
    return this.#rates.USDBRL ?? 0;
  }

  set usdBrl(value) {
    this.#rates.USDBRL = value;
  }

  markBrQuoted(ticker) {
    this.#brQuoted.add(ticker);
  }

  isBrQuoted(ticker) {
    return this.#brQuoted.has(ticker);
  }

  get hasData() {
    return Object.keys(this.#prices).length > 0;
  }

  get stale() {
    return this.#timestamp ? Date.now() - this.#timestamp > PRICES_TTL : false;
  }

  get dateStr() {
    if (!this.#timestamp) return null;

    return new Date(this.#timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(PRICES));
      if (!data) return;

      this.#prices = data.prices ?? {};
      this.#rates = data.rates ?? {};
      this.#timestamp = data.ts ?? null;
    } catch {
      // Keep empty cache on parse errors.
    }
  }

  save() {
    this.#timestamp = Date.now();
    localStorage.setItem(
      PRICES,
      JSON.stringify({
        ts: this.#timestamp,
        prices: this.#prices,
        rates: this.#rates,
      }),
    );
  }
}

export class Settings {
  brapiToken = '';
  finnhubToken = '';

  get hasTokens() {
    return Boolean(this.brapiToken || this.finnhubToken);
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS);
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch {
      // Keep defaults.
    }
  }

  save() {
    localStorage.setItem(
      SETTINGS,
      JSON.stringify({
        brapiToken: this.brapiToken,
        finnhubToken: this.finnhubToken,
      }),
    );
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const themeColor = theme === 'light' ? '#f7f2fa' : '#11131a';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor);
}

export function loadTheme() {
  applyTheme(localStorage.getItem(THEME) || 'dark');
}

export function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem(THEME, nextTheme);
}

export const portfolio = new Portfolio();
export const preferences = new Preferences();
export const prices = new PriceCache();
export const settings = new Settings();

export let activeTab = 'overview';
let didTabChange = false;

export function setActiveTab(tab) {
  didTabChange = tab !== activeTab;
  activeTab = tab;
}

export function consumeTabChange() {
  const changed = didTabChange;
  didTabChange = false;
  return changed;
}
