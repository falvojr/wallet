const STORAGE_KEY  = 'holding_portfolio';
const SETTINGS_KEY = 'holding_settings';
const PRICES_KEY   = 'holding_prices';
const PRICES_TTL   = 24 * 60 * 60 * 1000;
const THEME_KEY    = 'holding_theme';

export const CLASS_META = {
  brStocks:     { label: 'Ações',            color: '#4ade80', icon: 'trending-up' },
  brFiis:       { label: 'FIIs',             color: '#22d3ee', icon: 'building-2'  },
  usStocks:     { label: 'Stocks',           color: '#818cf8', icon: 'globe'       },
  usReits:      { label: 'REITs',            color: '#c084fc', icon: 'landmark'    },
  fixedIncome:  { label: 'Renda Fixa',       color: '#fbbf24', icon: 'shield'      },
  storeOfValue: { label: 'Reserva de Valor', color: '#fb923c', icon: 'bitcoin'     },
  assets:       { label: 'Bens',             color: '#f472b6', icon: 'home'        },
};

export const CLASS_KEYS = Object.keys(CLASS_META);

export class Portfolio {
  #data = null;

  get loaded() { return this.#data !== null; }

  items(key) { return this.#data?.[key]?.items ?? []; }

  target(key) {
    const stored = this.#data?.[key]?.target;
    if (stored !== undefined) return stored;
    const count = this.visibleKeys().length;
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

  isHidden(key) { return !!(this.#data?.hiddenClasses?.[key]); }

  toggleHidden(key) {
    if (!this.#data) return;
    this.#data.hiddenClasses ??= {};
    if (this.#data.hiddenClasses[key]) delete this.#data.hiddenClasses[key];
    else this.#data.hiddenClasses[key] = true;
    this.save();
  }

  visibleKeys() { return CLASS_KEYS.filter(k => !this.isHidden(k)); }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.#data = JSON.parse(raw);
    } catch { this.#data = null; }
  }

  save() {
    this.#data.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#data));
  }

  import(data) {
    this.#data = data;
    this.save();
  }

  export() {
    const out = { syncedAt: this.#data.syncedAt };
    if (this.#data.hiddenClasses) out.hiddenClasses = this.#data.hiddenClasses;
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
    } catch { /* no cached prices */ }
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
    } catch { /* keep defaults */ }
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
