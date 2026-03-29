import { tn } from './i18n.js';

const STORAGE_KEY  = 'holding_portfolio';
const SETTINGS_KEY = 'holding_settings';
const PRICES_KEY   = 'holding_prices';
const PRICES_TTL   = 24 * 60 * 60 * 1000;
const THEME_KEY    = 'holding_theme';

export const CLASS_META = {
  brStocks:         { color: '#4ade80', icon: 'trending-up' },
  brFiis:           { color: '#22d3ee', icon: 'building-2'  },
  usStocks:         { color: '#818cf8', icon: 'globe'       },
  usReits:          { color: '#c084fc', icon: 'landmark'    },
  fixedIncome:      { color: '#fbbf24', icon: 'shield'      },
  emergencyReserve: { color: '#34d399', icon: 'life-buoy'   },
  storeOfValue:     { color: '#fb923c', icon: 'bitcoin'     },
  assets:           { color: '#f472b6', icon: 'home'        },
};

export function classLabel(key) {
  return tn('className', key);
}

export const CLASS_KEYS = Object.keys(CLASS_META);

const DEFAULT_INACTIVE = new Set(['assets', 'emergencyReserve']);

export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }

  items(key) { return this.#data?.[key]?.items ?? []; }

  /**
   * Raw check without calling target(), avoiding infinite recursion.
   * Used only by activeKeys().
   */
  #isActiveRaw(key) {
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored > 0;
    return !DEFAULT_INACTIVE.has(key);
  }

  target(key) {
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored;
    if (DEFAULT_INACTIVE.has(key)) return 0;
    const count = this.activeKeys().length;
    return count > 0 ? 100 / count : 0;
  }

  setTarget(key, value) {
    this.#ensure(key);
    this.#data[key].target = value;
  }

  addItem(key, item) {
    this.#ensure(key);
    this.#data[key].items.push(item);
  }

  setItemNote(key, id, note) {
    const item = this.items(key).find(a => a.id === id);
    if (!item) return;
    const trimmed = note.trim();
    if (trimmed) item.note = trimmed;
    else delete item.note;
    this.save();
  }

  activeKeys() { return CLASS_KEYS.filter(k => this.#isActiveRaw(k)); }

  allKeys() { return CLASS_KEYS; }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.#data = JSON.parse(raw);
        delete this.#data?.hiddenClasses;
      }
    } catch { this.#data = null; }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#data));
  }

  import(data) {
    delete data?.hiddenClasses;
    this.#data = data;
    this.save();
  }

  export() {
    const out = { syncedAt: this.#data.syncedAt };
    CLASS_KEYS.forEach(k => { if (this.#data[k]) out[k] = this.#data[k]; });
    return out;
  }

  #ensure(key) {
    this.#data[key] ??= { items: [] };
  }
}

export class PriceCache {
  #prices = {};
  #rates = {};
  #timestamp = null;
  #brQuoted = new Set();

  get(id) { return this.#prices[id] ?? null; }
  set(id, data) { this.#prices[id] = data; }

  get usdBrl() { return this.#rates.USDBRL ?? 0; }
  set usdBrl(val) { this.#rates.USDBRL = val; }

  markBrQuoted(ticker) { this.#brQuoted.add(ticker); }
  isBrQuoted(ticker) { return this.#brQuoted.has(ticker); }

  get hasData() { return Object.keys(this.#prices).length > 0; }

  get stale() {
    return this.#timestamp ? Date.now() - this.#timestamp > PRICES_TTL : false;
  }

  get dateStr() {
    if (!this.#timestamp) return null;
    return new Date(this.#timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(PRICES_KEY));
      if (data) {
        this.#prices    = data.prices ?? {};
        this.#rates     = data.rates  ?? {};
        this.#timestamp = data.ts     ?? null;
      }
    } catch {}
  }

  save() {
    this.#timestamp = Date.now();
    localStorage.setItem(PRICES_KEY, JSON.stringify({
      ts: this.#timestamp, prices: this.#prices, rates: this.#rates,
    }));
  }
}

export class Settings {
  brapiToken = '';
  finnhubToken = '';

  get hasTokens() { return !!(this.brapiToken || this.finnhubToken); }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch {}
  }

  save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      brapiToken: this.brapiToken, finnhubToken: this.finnhubToken,
    }));
  }
}

export function loadTheme() {
  document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'dark';
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

export const portfolio = new Portfolio();
export const prices   = new PriceCache();
export const settings = new Settings();

export let activeTab = 'overview';
export function setActiveTab(tab) { activeTab = tab; }
