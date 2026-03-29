import { tn } from './i18n.js';

const STORAGE = 'holding_portfolio', SETTINGS = 'holding_settings', PRICES = 'holding_prices', THEME = 'holding_theme';
const PRICES_TTL = 24 * 60 * 60 * 1000;

export const CLASS_META = {
  brStocks: { color: '#4ade80', icon: 'trending-up' }, brFiis: { color: '#22d3ee', icon: 'building-2' },
  usStocks: { color: '#818cf8', icon: 'globe' },       usReits: { color: '#c084fc', icon: 'landmark' },
  fixedIncome: { color: '#fbbf24', icon: 'shield' },    emergencyReserve: { color: '#34d399', icon: 'life-buoy' },
  storeOfValue: { color: '#fb923c', icon: 'bitcoin' },  assets: { color: '#f472b6', icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);
export function classLabel(key) { return tn('className', key); }

/**
 * Portfolio state persisted to localStorage. Manages asset items, percentage-based allocation targets,
 * emergency reserve BRL goal, class display order, and transient chart visibility.
 */
export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }
  items(key) { return this.#data?.[key]?.items ?? []; }

  // Percentage-based target (applies to all classes except emergencyReserve and assets with target=0)

  /** Raw active check without calling target() to avoid circular dependency with activeKeys(). */
  #isPercentageActive(key) {
    if (key === 'emergencyReserve') return false; // uses BRL goal, not percentage
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

  // Display order (user-editable, stored per-class as `order` field)

  order(key) { return this.#data?.[key]?.order ?? CLASS_KEYS.indexOf(key) + 1; }

  setOrder(key, val) { this.#ensure(key); this.#data[key].order = val; }

  /** Returns class keys sorted by user-defined order. Ties fall back to CLASS_KEYS position. */
  displayOrder() {
    return [...CLASS_KEYS].sort((a, b) => this.order(a) - this.order(b) || CLASS_KEYS.indexOf(a) - CLASS_KEYS.indexOf(b));
  }

  // Emergency reserve (BRL fixed goal instead of percentage target)

  goal(key) { return this.#data?.[key]?.goal ?? 0; }
  setGoal(key, val) { this.#ensure(key); this.#data[key].goal = val; }

  /** True when emergency reserve has a goal and current total is below it. */
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

  // Chart visibility (transient, not persisted)

  #chartHidden = new Set();
  isChartHidden(key) { return this.#chartHidden.has(key); }
  toggleChartHidden(key) { this.#chartHidden.has(key) ? this.#chartHidden.delete(key) : this.#chartHidden.add(key); }

  // Persistence

  load() {
    try { const r = localStorage.getItem(STORAGE); if (r) { this.#data = JSON.parse(r); delete this.#data?.hiddenClasses; } } catch { this.#data = null; }
  }
  save() { this.#data.syncedAt = new Date().toISOString().slice(0, 10); localStorage.setItem(STORAGE, JSON.stringify(this.#data)); }
  import(data) { delete data?.hiddenClasses; this.#data = data; this.save(); }
  export() { const o = { syncedAt: this.#data.syncedAt }; CLASS_KEYS.forEach(k => { if (this.#data[k]) o[k] = this.#data[k]; }); return o; }
  #ensure(key) { this.#data[key] ??= { items: [] }; }
}

export class PriceCache {
  #p = {}; #r = {}; #ts = null; #brQ = new Set();
  get(id) { return this.#p[id] ?? null; }
  set(id, d) { this.#p[id] = d; }
  get usdBrl() { return this.#r.USDBRL ?? 0; }
  set usdBrl(v) { this.#r.USDBRL = v; }
  markBrQuoted(t) { this.#brQ.add(t); }
  isBrQuoted(t) { return this.#brQ.has(t); }
  get hasData() { return Object.keys(this.#p).length > 0; }
  get stale() { return this.#ts ? Date.now() - this.#ts > PRICES_TTL : false; }
  get dateStr() {
    return this.#ts ? new Date(this.#ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  }
  load() { try { const d = JSON.parse(localStorage.getItem(PRICES)); if (d) { this.#p = d.prices ?? {}; this.#r = d.rates ?? {}; this.#ts = d.ts ?? null; } } catch {} }
  save() { this.#ts = Date.now(); localStorage.setItem(PRICES, JSON.stringify({ ts: this.#ts, prices: this.#p, rates: this.#r })); }
}

export class Settings {
  brapiToken = ''; finnhubToken = '';
  get hasTokens() { return !!(this.brapiToken || this.finnhubToken); }
  load() { try { const r = localStorage.getItem(SETTINGS); if (r) Object.assign(this, JSON.parse(r)); } catch {} }
  save() { localStorage.setItem(SETTINGS, JSON.stringify({ brapiToken: this.brapiToken, finnhubToken: this.finnhubToken })); }
}

export function loadTheme() { document.documentElement.dataset.theme = localStorage.getItem(THEME) || 'dark'; }
export function toggleTheme() {
  const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n; localStorage.setItem(THEME, n);
}

export const portfolio = new Portfolio();
export const prices = new PriceCache();
export const settings = new Settings();

export let activeTab = 'overview';
let tabChanged = false;
export function setActiveTab(tab) { tabChanged = tab !== activeTab; activeTab = tab; }
export function consumeTabChange() { const c = tabChanged; tabChanged = false; return c; }
