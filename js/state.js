import { tn } from './i18n.js';

const STORAGE_KEY  = 'holding_portfolio';
const SETTINGS_KEY = 'holding_settings';
const PRICES_KEY   = 'holding_prices';
const PRICES_TTL   = 24 * 60 * 60 * 1000;
const THEME_KEY    = 'holding_theme';

/** Visual metadata for each asset class (colour and icon). */
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

/** Returns the localised label for an asset class key. */
export function classLabel(key) { return tn('className', key); }

/** Ordered list of all asset class keys. */
export const CLASS_KEYS = Object.keys(CLASS_META);

/**
 * Keys that default to target=0 when the user has not explicitly set a target.
 * Emergency reserve is handled separately via a fixed BRL goal.
 */
const DEFAULT_INACTIVE = new Set(['assets']);

/**
 * Core portfolio state, persisted to localStorage.
 *
 * Manages asset items, allocation targets (percentage-based) and the
 * emergency reserve goal (BRL-based). Also provides display ordering
 * and chart-only visibility toggling.
 */
export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }
  items(key) { return this.#data?.[key]?.items ?? []; }

  // Target (percentage allocation)

  /**
   * Determines if a class actively participates in percentage-based rebalancing.
   * Uses raw stored data to avoid circular dependency with target().
   */
  #isPercentageActive(key) {
    if (key === 'emergencyReserve') return false;
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored > 0;
    return !DEFAULT_INACTIVE.has(key);
  }

  /**
   * Returns the allocation target for a class. Emergency reserve always
   * returns 0 since it uses a BRL goal instead of a percentage.
   * Classes without an explicit target get an equal share of 100%.
   */
  target(key) {
    if (key === 'emergencyReserve') return 0;
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored;
    if (DEFAULT_INACTIVE.has(key)) return 0;
    const count = this.activeKeys().length;
    return count > 0 ? 100 / count : 0;
  }

  setTarget(key, value) { this.#ensure(key); this.#data[key].target = value; }

  /** Classes with target > 0 that participate in percentage-based rebalancing. */
  activeKeys() { return CLASS_KEYS.filter(k => this.#isPercentageActive(k)); }

  /** All class keys regardless of active/inactive status. */
  allKeys() { return CLASS_KEYS; }

  /**
   * Display order: active classes first, then emergency reserve,
   * then inactive classes (target=0). Within each group, the original
   * CLASS_KEYS order is preserved.
   */
  displayOrder() {
    const active = [], inactive = [];
    for (const k of CLASS_KEYS) {
      if (k === 'emergencyReserve') continue;
      if (this.#isPercentageActive(k)) active.push(k);
      else inactive.push(k);
    }
    return [...active, 'emergencyReserve', ...inactive];
  }

  // Emergency reserve (BRL fixed goal)

  /** Returns the BRL goal for the emergency reserve. */
  goal(key) { return this.#data?.[key]?.goal ?? 0; }

  setGoal(key, value) { this.#ensure(key); this.#data[key].goal = value; }

  /** True when the emergency reserve has a goal set and has not reached it yet. */
  isEmergencyUnmet() {
    const g = this.goal('emergencyReserve');
    if (g <= 0) return false;
    const total = this.items('emergencyReserve').reduce((s, a) => s + a.amount, 0);
    return total < g;
  }

  // Items

  addItem(key, item) { this.#ensure(key); this.#data[key].items.push(item); }

  setItemNote(key, id, note) {
    const item = this.items(key).find(a => a.id === id);
    if (!item) return;
    const trimmed = note.trim();
    if (trimmed) item.note = trimmed; else delete item.note;
    this.save();
  }

  // Chart visibility (transient, not persisted to localStorage)

  #chartHidden = new Set();
  isChartHidden(key) { return this.#chartHidden.has(key); }
  toggleChartHidden(key) {
    if (this.#chartHidden.has(key)) this.#chartHidden.delete(key);
    else this.#chartHidden.add(key);
  }

  // Persistence

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { this.#data = JSON.parse(raw); delete this.#data?.hiddenClasses; }
    } catch { this.#data = null; }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#data));
  }

  import(data) { delete data?.hiddenClasses; this.#data = data; this.save(); }

  export() {
    const out = { syncedAt: this.#data.syncedAt };
    CLASS_KEYS.forEach(k => { if (this.#data[k]) out[k] = this.#data[k]; });
    return out;
  }

  #ensure(key) { this.#data[key] ??= { items: [] }; }
}

export class PriceCache {
  #prices = {}; #rates = {}; #timestamp = null; #brQuoted = new Set();

  get(id) { return this.#prices[id] ?? null; }
  set(id, data) { this.#prices[id] = data; }
  get usdBrl() { return this.#rates.USDBRL ?? 0; }
  set usdBrl(val) { this.#rates.USDBRL = val; }
  markBrQuoted(ticker) { this.#brQuoted.add(ticker); }
  isBrQuoted(ticker) { return this.#brQuoted.has(ticker); }
  get hasData() { return Object.keys(this.#prices).length > 0; }
  get stale() { return this.#timestamp ? Date.now() - this.#timestamp > PRICES_TTL : false; }

  get dateStr() {
    if (!this.#timestamp) return null;
    return new Date(this.#timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(PRICES_KEY));
      if (d) { this.#prices = d.prices ?? {}; this.#rates = d.rates ?? {}; this.#timestamp = d.ts ?? null; }
    } catch {}
  }

  save() {
    this.#timestamp = Date.now();
    localStorage.setItem(PRICES_KEY, JSON.stringify({ ts: this.#timestamp, prices: this.#prices, rates: this.#rates }));
  }
}

export class Settings {
  brapiToken = ''; finnhubToken = '';
  get hasTokens() { return !!(this.brapiToken || this.finnhubToken); }
  load() { try { const r = localStorage.getItem(SETTINGS_KEY); if (r) Object.assign(this, JSON.parse(r)); } catch {} }
  save() { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ brapiToken: this.brapiToken, finnhubToken: this.finnhubToken })); }
}

export function loadTheme() { document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'dark'; }
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

export const portfolio = new Portfolio();
export const prices   = new PriceCache();
export const settings = new Settings();

// Tab state with change tracking (used to animate only on tab switch, not data updates)

export let activeTab = 'overview';
let tabChanged = false;

export function setActiveTab(tab) { tabChanged = tab !== activeTab; activeTab = tab; }
export function consumeTabChange() { const c = tabChanged; tabChanged = false; return c; }
