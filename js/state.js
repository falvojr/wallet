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

const CLASS_DEFAULTS = {
  brStocks: { target: 0, goal: 0, items: [] },
  brFiis: { target: 0, goal: 0, items: [] },
  usStocks: { target: 0, goal: 0, items: [] },
  usReits: { target: 0, goal: 0, items: [] },
  fixedIncome: { target: 0, goal: 0, items: [] },
  emergencyReserve: { target: 0, goal: 0, items: [] },
  storeOfValue: { target: 0, goal: 0, items: [] },
  assets: { target: 0, goal: 0, items: [] },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeNumber(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id ?? '').trim();
  if (!id) return null;

  const normalizedItem = {
    id,
    amount: normalizeNumber(Number(item.amount)),
  };

  if (item.target !== undefined && item.target !== null && item.target !== '') {
    normalizedItem.target = normalizeNumber(Number(item.target));
  }

  if (typeof item.note === 'string' && item.note.trim()) {
    normalizedItem.note = item.note.trim();
  }

  return normalizedItem;
}

function normalizeClassEntry(classKey, classEntry = {}) {
  const defaults = CLASS_DEFAULTS[classKey];
  const normalizedItems = Array.isArray(classEntry?.items)
    ? classEntry.items.map(normalizeItem).filter(Boolean)
    : [];

  const normalizedEntry = {
    items: normalizedItems,
    goal: normalizeNumber(Number(classEntry?.goal), defaults.goal),
    target: normalizeNumber(Number(classEntry?.target), defaults.target),
  };

  if (classKey === 'emergencyReserve') {
    normalizedEntry.target = 0;
  }

  if (classKey === 'assets') {
    normalizedEntry.target = 0;
  }

  return normalizedEntry;
}

function createEmptyPortfolioData() {
  const data = { syncedAt: null };

  CLASS_KEYS.forEach(classKey => {
    data[classKey] = clone(CLASS_DEFAULTS[classKey]);
  });

  return data;
}

function normalizePortfolioData(data = {}) {
  const normalizedData = createEmptyPortfolioData();

  if (typeof data?.syncedAt === 'string' && data.syncedAt.trim()) {
    normalizedData.syncedAt = data.syncedAt.trim();
  }

  CLASS_KEYS.forEach(classKey => {
    normalizedData[classKey] = normalizeClassEntry(classKey, data?.[classKey]);
  });

  return normalizedData;
}

class LocalStorageRepository {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  read(fallbackValue = null) {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  write(value) {
    localStorage.setItem(this.storageKey, JSON.stringify(value));
  }
}

export function classLabel(key) {
  return tn('classLabels', key);
}

export class Portfolio {
  #repository = new LocalStorageRepository(STORAGE_KEYS.portfolio);
  #data = null;

  get loaded() {
    return this.#data !== null;
  }

  items(key) {
    return this.#data?.[key]?.items ?? [];
  }

  #ensureLoaded() {
    this.#data ??= createEmptyPortfolioData();
  }

  #ensureClass(key) {
    this.#ensureLoaded();
    this.#data[key] ??= clone(CLASS_DEFAULTS[key] ?? { target: 0, goal: 0, items: [] });
    this.#data[key].items ??= [];
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

    return normalizeNumber(this.#data?.[key]?.target);
  }

  setTarget(key, value) {
    this.#ensureClass(key);
    this.#data[key].target = normalizeNumber(value);
  }

  activeKeys() {
    return CLASS_KEYS.filter(key => this.#isPercentageActive(key));
  }

  allKeys() {
    return CLASS_KEYS;
  }

  goal(key) {
    return normalizeNumber(this.#data?.[key]?.goal);
  }

  setGoal(key, value) {
    this.#ensureClass(key);
    this.#data[key].goal = normalizeNumber(value);
  }

  isEmergencyUnmet() {
    const goal = this.goal('emergencyReserve');
    if (goal <= 0) return false;

    const currentTotal = this.items('emergencyReserve').reduce((sum, asset) => sum + asset.amount, 0);
    return currentTotal < goal;
  }

  addItem(key, item) {
    this.#ensureClass(key);

    const normalizedItem = normalizeItem(item);
    if (!normalizedItem) return;

    this.#data[key].items.push(normalizedItem);
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
    const rawData = this.#repository.read(null);
    this.#data = rawData ? normalizePortfolioData(rawData) : null;
  }

  save() {
    this.#ensureLoaded();
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    this.#repository.write(this.#data);
  }

  import(data) {
    this.#data = normalizePortfolioData(data);
    this.save();
  }

  export() {
    this.#ensureLoaded();
    return normalizePortfolioData(this.#data);
  }
}

export class Preferences {
  #repository = new LocalStorageRepository(STORAGE_KEYS.preferences);
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
    this.#data = this.#repository.read({}) ?? {};
  }

  save() {
    this.#repository.write(this.#data);
  }
}

export class PriceCache {
  #repository = new LocalStorageRepository(STORAGE_KEYS.prices);
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
    const data = this.#repository.read(null);
    if (!data) return;

    this.#prices = data.prices ?? {};
    this.#rates = data.rates ?? {};
    this.#timestamp = data.ts ?? null;
  }

  save() {
    this.#timestamp = Date.now();
    this.#repository.write({
      ts: this.#timestamp,
      prices: this.#prices,
      rates: this.#rates,
    });
  }
}

export class Settings {
  #repository = new LocalStorageRepository(STORAGE_KEYS.settings);
  brapiToken = '';
  finnhubToken = '';

  get hasTokens() {
    return Boolean(this.brapiToken || this.finnhubToken);
  }

  load() {
    Object.assign(this, this.#repository.read({}) ?? {});
  }

  save() {
    this.#repository.write({
      brapiToken: this.brapiToken,
      finnhubToken: this.finnhubToken,
    });
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
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'dark');
}

export function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
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
