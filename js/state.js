import { tn } from './i18n.js';

const STORAGE   = 'holding_portfolio';
const SETTINGS  = 'holding_settings';
const PRICES    = 'holding_prices';
const PREFS     = 'holding_prefs';
const THEME     = 'holding_theme';
const PRICES_TTL = 24 * 60 * 60 * 1000;

/** Visual metadata for each asset class. */
export const CLASS_META = {
  brStocks:         { color: '#4ade80', icon: 'trending-up' },
  brFiis:           { color: '#22d3ee', icon: 'building-2' },
  usStocks:         { color: '#818cf8', icon: 'globe' },
  usReits:          { color: '#c084fc', icon: 'landmark' },
  fixedIncome:      { color: '#fbbf24', icon: 'shield' },
  emergencyReserve: { color: '#34d399', icon: 'life-buoy' },
  storeOfValue:     { color: '#fb923c', icon: 'bitcoin' },
  assets:           { color: '#f472b6', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

export function classLabel(key) {
  return tn('className', key);
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }

  items(key) {
    return this.#data?.[key]?.items ?? [];
  }

  /**
   * Raw active check that avoids calling target() to prevent circular
   * dependency with activeKeys(). Emergency reserve uses a BRL goal,
   * so it never participates in percentage-based allocation.
   */
  #isPercentageActive(key) {
    if (key === 'emergencyReserve') return false;
    const stored = this.#data?.[key]?.target;
    return stored !== undefined ? stored > 0 : key !== 'assets';
  }

  /**
   * Returns the percentage target for a class. Emergency reserve always
   * returns 0 (it uses goal instead). Classes without explicit targets
   * split 100% equally among active classes.
   */
  target(key) {
    if (key === 'emergencyReserve') return 0;
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored;
    if (key === 'assets') return 0;
    const count = this.activeKeys().length;
    return count > 0 ? 100 / count : 0;
  }

  setTarget(key, val) {
    this.#ensure(key);
    this.#data[key].target = val;
  }

  /** Classes with target > 0 (percentage-based rebalancing). */
  activeKeys() {
    return CLASS_KEYS.filter(k => this.#isPercentageActive(k));
  }

  allKeys() {
    return CLASS_KEYS;
  }

  // Emergency reserve (BRL fixed goal)

  goal(key) {
    return this.#data?.[key]?.goal ?? 0;
  }

  setGoal(key, val) {
    this.#ensure(key);
    this.#data[key].goal = val;
  }

  /** True when emergency reserve has a goal set and current amount is below it. */
  isEmergencyUnmet() {
    const g = this.goal('emergencyReserve');
    if (g <= 0) return false;
    const total = this.items('emergencyReserve').reduce((s, a) => s + a.amount, 0);
    return total < g;
  }

  // Items

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

  // Chart visibility (transient, not persisted)

  #chartHidden = new Set();

  isChartHidden(key) {
    return this.#chartHidden.has(key);
  }

  toggleChartHidden(key) {
    if (this.#chartHidden.has(key)) this.#chartHidden.delete(key);
    else this.#chartHidden.add(key);
  }

  // Persistence

  load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        this.#data = JSON.parse(raw);
        delete this.#data?.hiddenClasses;
      }
    } catch {
      this.#data = null;
    }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE, JSON.stringify(this.#data));
  }

  import(data) {
    delete data?.hiddenClasses;
    this.#data = data;
    this.save();
  }

  export() {
    const out = { syncedAt: this.#data.syncedAt };
    CLASS_KEYS.forEach(k => {
      if (this.#data[k]) out[k] = this.#data[k];
    });
    return out;
  }

  #ensure(key) {
    this.#data[key] ??= { items: [] };
  }
}

// ---------------------------------------------------------------------------
// Preferences (local-only, not exported with portfolio JSON)
// ---------------------------------------------------------------------------

export class Preferences {
  #data = {};

  /** Returns display order for a class (1-based). Falls back to CLASS_KEYS index. */
  order(key) {
    return this.#data.order?.[key] ?? CLASS_KEYS.indexOf(key) + 1;
  }

  setOrder(key, val) {
    this.#data.order ??= {};
    this.#data.order[key] = val;
    this.save();
  }

  /** Returns class keys sorted by user-defined order. */
  displayOrder() {
    return [...CLASS_KEYS].sort((a, b) => {
      return this.order(a) - this.order(b) || CLASS_KEYS.indexOf(a) - CLASS_KEYS.indexOf(b);
    });
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

// ---------------------------------------------------------------------------
// Price cache
// ---------------------------------------------------------------------------

export class PriceCache {
  #prices = {};
  #rates = {};
  #timestamp = null;
  #brQuoted = new Set();

  get(id)    { return this.#prices[id] ?? null; }
  set(id, d) { this.#prices[id] = d; }

  get usdBrl()    { return this.#rates.USDBRL ?? 0; }
  set usdBrl(val) { this.#rates.USDBRL = val; }

  markBrQuoted(ticker) { this.#brQuoted.add(ticker); }
  isBrQuoted(ticker)   { return this.#brQuoted.has(ticker); }

  get hasData() { return Object.keys(this.#prices).length > 0; }
  get stale()   { return this.#timestamp ? Date.now() - this.#timestamp > PRICES_TTL : false; }

  get dateStr() {
    if (!this.#timestamp) return null;
    return new Date(this.#timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(PRICES));
      if (data) {
        this.#prices = data.prices ?? {};
        this.#rates = data.rates ?? {};
        this.#timestamp = data.ts ?? null;
      }
    } catch { /* no cached prices */ }
  }

  save() {
    this.#timestamp = Date.now();
    localStorage.setItem(PRICES, JSON.stringify({
      ts: this.#timestamp,
      prices: this.#prices,
      rates: this.#rates,
    }));
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export class Settings {
  brapiToken = '';
  finnhubToken = '';

  get hasTokens() { return !!(this.brapiToken || this.finnhubToken); }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS);
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch { /* keep defaults */ }
  }

  save() {
    localStorage.setItem(SETTINGS, JSON.stringify({
      brapiToken: this.brapiToken,
      finnhubToken: this.finnhubToken,
    }));
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export function loadTheme() {
  document.documentElement.dataset.theme = localStorage.getItem(THEME) || 'dark';
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME, next);
}

// ---------------------------------------------------------------------------
// Singletons and active tab state
// ---------------------------------------------------------------------------

export const portfolio   = new Portfolio();
export const preferences = new Preferences();
export const prices      = new PriceCache();
export const settings    = new Settings();

export let activeTab = 'overview';
let tabChanged = false;

export function setActiveTab(tab) {
  tabChanged = tab !== activeTab;
  activeTab = tab;
}

export function consumeTabChange() {
  const changed = tabChanged;
  tabChanged = false;
  return changed;
}
