import { tn } from './i18n.js';

const STORAGE   = 'holding_portfolio';
const SETTINGS  = 'holding_settings';
const PRICES    = 'holding_prices';
const PREFS     = 'holding_prefs';
const THEME     = 'holding_theme';
const PRICES_TTL = 24 * 60 * 60 * 1000;

/**
 * Visual metadata for each asset class.
 * Colors: single vivid set (Tailwind 500) that works on both themes.
 *   Ações/FIIs: green family | Stocks/REITs: blue family
 *   Renda Fixa: amber | Reserva Emergência: rose | Reserva Valor: orange | Bens: slate
 */
export const CLASS_META = {
  brStocks:         { color: '#22c55e', icon: 'trending-up' },
  brFiis:           { color: '#10b981', icon: 'building-2' },
  usStocks:         { color: '#3b82f6', icon: 'globe' },
  usReits:          { color: '#8b5cf6', icon: 'landmark' },
  fixedIncome:      { color: '#eab308', icon: 'shield' },
  emergencyReserve: { color: '#f43f5e', icon: 'life-buoy' },
  storeOfValue:     { color: '#f97316', icon: 'bitcoin' },
  assets:           { color: '#94a3b8', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);
export function classLabel(key) { return tn('className', key); }

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }
  items(key) { return this.#data?.[key]?.items ?? []; }

  /** Raw active check (avoids recursion with activeKeys/target). */
  #isPercentageActive(key) {
    if (key === 'emergencyReserve') return false;
    const stored = this.#data?.[key]?.target;
    return stored !== undefined ? stored > 0 : key !== 'assets';
  }

  target(key) {
    if (key === 'emergencyReserve') return 0;
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored;
    if (key === 'assets') return 0;
    const count = this.activeKeys().length;
    return count > 0 ? 100 / count : 0;
  }

  setTarget(key, val) { this.#ensure(key); this.#data[key].target = val; }
  activeKeys() { return CLASS_KEYS.filter(k => this.#isPercentageActive(k)); }
  allKeys() { return CLASS_KEYS; }

  // Emergency reserve (BRL fixed goal)
  goal(key) { return this.#data?.[key]?.goal ?? 0; }
  setGoal(key, val) { this.#ensure(key); this.#data[key].goal = val; }

  isEmergencyUnmet() {
    const g = this.goal('emergencyReserve');
    if (g <= 0) return false;
    return this.items('emergencyReserve').reduce((s, a) => s + a.amount, 0) < g;
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

  // Persistence
  load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) { this.#data = JSON.parse(raw); delete this.#data?.hiddenClasses; }
    } catch { this.#data = null; }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE, JSON.stringify(this.#data));
  }

  import(data) { delete data?.hiddenClasses; this.#data = data; this.save(); }

  export() {
    const out = { syncedAt: this.#data.syncedAt };
    CLASS_KEYS.forEach(k => { if (this.#data[k]) out[k] = this.#data[k]; });
    return out;
  }

  #ensure(key) { this.#data[key] ??= { items: [] }; }
}

// ---------------------------------------------------------------------------
// Preferences (local-only, never exported with portfolio JSON)
// ---------------------------------------------------------------------------

export class Preferences {
  #data = {};

  // Display order
  order(key) { return this.#data.order?.[key] ?? CLASS_KEYS.indexOf(key) + 1; }

  setOrder(key, val) {
    this.#data.order ??= {};
    this.#data.order[key] = val;
    this.save();
  }

  /** Swaps order values between two classes. */
  swapOrder(keyA, keyB) {
    const a = this.order(keyA);
    const b = this.order(keyB);
    this.#data.order ??= {};
    this.#data.order[keyA] = b;
    this.#data.order[keyB] = a;
    this.save();
  }

  displayOrder() {
    return [...CLASS_KEYS].sort((a, b) => {
      return this.order(a) - this.order(b) || CLASS_KEYS.indexOf(a) - CLASS_KEYS.indexOf(b);
    });
  }

  // Chart visibility
  isChartHidden(key) { return !!this.#data.chartHidden?.[key]; }

  toggleChartHidden(key) {
    this.#data.chartHidden ??= {};
    if (this.#data.chartHidden[key]) delete this.#data.chartHidden[key];
    else this.#data.chartHidden[key] = true;
    this.save();
  }

  // Persistence
  load() {
    try {
      const raw = localStorage.getItem(PREFS);
      if (raw) this.#data = JSON.parse(raw);
    } catch { this.#data = {}; }
  }

  save() { localStorage.setItem(PREFS, JSON.stringify(this.#data)); }
}

// ---------------------------------------------------------------------------
// Price cache, Settings, Theme (unchanged)
// ---------------------------------------------------------------------------

export class PriceCache {
  #prices = {}; #rates = {}; #timestamp = null; #brQuoted = new Set();
  get(id) { return this.#prices[id] ?? null; }
  set(id, d) { this.#prices[id] = d; }
  get usdBrl() { return this.#rates.USDBRL ?? 0; }
  set usdBrl(val) { this.#rates.USDBRL = val; }
  markBrQuoted(t) { this.#brQuoted.add(t); }
  isBrQuoted(t) { return this.#brQuoted.has(t); }
  get hasData() { return Object.keys(this.#prices).length > 0; }
  get stale() { return this.#timestamp ? Date.now() - this.#timestamp > PRICES_TTL : false; }
  get dateStr() {
    return this.#timestamp
      ? new Date(this.#timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
  }
  load() { try { const d = JSON.parse(localStorage.getItem(PRICES)); if (d) { this.#prices = d.prices ?? {}; this.#rates = d.rates ?? {}; this.#timestamp = d.ts ?? null; } } catch {} }
  save() { this.#timestamp = Date.now(); localStorage.setItem(PRICES, JSON.stringify({ ts: this.#timestamp, prices: this.#prices, rates: this.#rates })); }
}

export class Settings {
  brapiToken = ''; finnhubToken = '';
  get hasTokens() { return !!(this.brapiToken || this.finnhubToken); }
  load() { try { const r = localStorage.getItem(SETTINGS); if (r) Object.assign(this, JSON.parse(r)); } catch {} }
  save() { localStorage.setItem(SETTINGS, JSON.stringify({ brapiToken: this.brapiToken, finnhubToken: this.finnhubToken })); }
}

export function loadTheme() { document.documentElement.dataset.theme = localStorage.getItem(THEME) || 'dark'; }
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME, next);
}

export const portfolio   = new Portfolio();
export const preferences = new Preferences();
export const prices      = new PriceCache();
export const settings    = new Settings();

export let activeTab = 'overview';
let tabChanged = false;
export function setActiveTab(tab) { tabChanged = tab !== activeTab; activeTab = tab; }
export function consumeTabChange() { const c = tabChanged; tabChanged = false; return c; }
