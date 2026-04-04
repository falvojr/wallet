import { tn } from './i18n.js';

const STORAGE_KEYS = {
  portfolio: 'holding_portfolio',
  settings: 'holding_settings',
  prices: 'holding_prices',
  preferences: 'holding_prefs',
  theme: 'holding_theme',
};

const PRICES_TTL = 24 * 60 * 60 * 1000;

export const CLASS_META = {
  brStocks: { icon: 'trending-up' },
  brFiis:   { icon: 'building-2' },
  usStocks: { icon: 'globe' },
  usReits:  { icon: 'landmark' },
  fixedIncome:      { icon: 'shield' },
  emergencyReserve: { icon: 'life-buoy' },
  storeOfValue:     { icon: 'bitcoin' },
  assets:           { icon: 'home' },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

/** Classes where the user declares a monetary amount directly (no price lookup). */
const DECLARED_CLASSES = new Set(['fixedIncome', 'emergencyReserve', 'assets']);

/** Classes excluded from percentage-based rebalancing. */
const NON_REBALANCED_CLASSES = new Set(['emergencyReserve', 'assets']);

export { DECLARED_CLASSES, NON_REBALANCED_CLASSES };

function clone(value) {
  return structuredClone(value);
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id ?? '').trim();
  if (!id) return null;

  const normalized = {
    id,
    amount: normalizeNumber(item.amount),
  };

  if (item.target !== undefined && item.target !== null && item.target !== '') {
    normalized.target = normalizeNumber(item.target);
  }

  if (typeof item.note === 'string' && item.note.trim()) {
    normalized.note = item.note.trim();
  }

  return normalized;
}

function normalizeClassEntry(classKey, entry = {}) {
  const items = Array.isArray(entry?.items)
    ? entry.items.map(normalizeItem).filter(Boolean)
    : [];

  return {
    items,
    goal: normalizeNumber(entry?.goal),
    target: NON_REBALANCED_CLASSES.has(classKey) ? 0 : normalizeNumber(entry?.target),
  };
}

function createEmptyData() {
  const data = { syncedAt: null };
  for (const key of CLASS_KEYS) {
    data[key] = { target: 0, goal: 0, items: [] };
  }
  return data;
}

function normalizePortfolioData(data = {}) {
  const normalized = createEmptyData();

  if (typeof data?.syncedAt === 'string' && data.syncedAt.trim()) {
    normalized.syncedAt = data.syncedAt.trim();
  }

  for (const key of CLASS_KEYS) {
    normalized[key] = normalizeClassEntry(key, data?.[key]);
  }

  return normalized;
}

class LocalStorage {
  #key;

  constructor(key) {
    this.#key = key;
  }

  read(fallback = null) {
    try {
      const raw = localStorage.getItem(this.#key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  write(value) {
    localStorage.setItem(this.#key, JSON.stringify(value));
  }
}

export function classLabel(key) {
  return tn('classLabels', key);
}

export class Portfolio {
  #storage = new LocalStorage(STORAGE_KEYS.portfolio);
  #data = null;

  get loaded() {
    return this.#data !== null;
  }

  items(key) {
    return this.#data?.[key]?.items ?? [];
  }

  target(key) {
    if (NON_REBALANCED_CLASSES.has(key)) return 0;
    return normalizeNumber(this.#data?.[key]?.target);
  }

  setTarget(key, value) {
    this.#ensureClass(key);
    this.#data[key].target = normalizeNumber(value);
  }

  goal(key) {
    return normalizeNumber(this.#data?.[key]?.goal);
  }

  setGoal(key, value) {
    this.#ensureClass(key);
    this.#data[key].goal = normalizeNumber(value);
  }

  activeKeys() {
    return CLASS_KEYS.filter(key =>
      !NON_REBALANCED_CLASSES.has(key) && this.target(key) > 0
    );
  }

  allKeys() {
    return CLASS_KEYS;
  }

  isEmergencyUnmet() {
    const goal = this.goal('emergencyReserve');
    if (goal <= 0) return false;
    const total = this.items('emergencyReserve').reduce((sum, a) => sum + a.amount, 0);
    return total < goal;
  }

  addItem(key, item) {
    this.#ensureClass(key);
    const normalized = normalizeItem(item);
    if (normalized) this.#data[key].items.push(normalized);
  }

  setItemNote(key, id, note) {
    const item = this.items(key).find(a => a.id === id);
    if (!item) return;

    const trimmed = note.trim();
    if (trimmed) item.note = trimmed;
    else delete item.note;

    this.save();
  }

  load() {
    const raw = this.#storage.read(null);
    this.#data = raw ? normalizePortfolioData(raw) : null;
  }

  save() {
    this.#data ??= createEmptyData();
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    this.#storage.write(this.#data);
  }

  import(data) {
    this.#data = normalizePortfolioData(data);
    this.save();
  }

  export() {
    this.#data ??= createEmptyData();
    return normalizePortfolioData(this.#data);
  }

  #ensureClass(key) {
    this.#data ??= createEmptyData();
    this.#data[key] ??= { target: 0, goal: 0, items: [] };
    this.#data[key].items ??= [];
  }
}

export class Preferences {
  #storage = new LocalStorage(STORAGE_KEYS.preferences);
  #data = {};

  order(key) {
    return this.#data.order?.[key] ?? CLASS_KEYS.indexOf(key) + 1;
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
    return [...CLASS_KEYS].sort((a, b) =>
      this.order(a) - this.order(b) || CLASS_KEYS.indexOf(a) - CLASS_KEYS.indexOf(b)
    );
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
    this.#data = this.#storage.read({}) ?? {};
  }

  save() {
    this.#storage.write(this.#data);
  }
}

export class PriceCache {
  #storage = new LocalStorage(STORAGE_KEYS.prices);
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
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  load() {
    const data = this.#storage.read(null);
    if (!data) return;
    this.#prices = data.prices ?? {};
    this.#rates = data.rates ?? {};
    this.#timestamp = data.ts ?? null;
  }

  save() {
    this.#timestamp = Date.now();
    this.#storage.write({
      ts: this.#timestamp,
      prices: this.#prices,
      rates: this.#rates,
    });
  }
}

export class Settings {
  #storage = new LocalStorage(STORAGE_KEYS.settings);
  brapiToken = '';
  finnhubToken = '';

  get hasTokens() {
    return Boolean(this.brapiToken || this.finnhubToken);
  }

  load() {
    Object.assign(this, this.#storage.read({}) ?? {});
  }

  save() {
    this.#storage.write({
      brapiToken: this.brapiToken,
      finnhubToken: this.finnhubToken,
    });
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const color = theme === 'light' ? '#f7f2fa' : '#11131a';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function loadTheme() {
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'dark');
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEYS.theme, next);
}

export const portfolio = new Portfolio();
export const preferences = new Preferences();
export const prices = new PriceCache();
export const settings = new Settings();

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
