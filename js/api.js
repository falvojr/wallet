import { portfolio, prices, settings } from './state.js';
import { t } from './i18n.js';

const FINNHUB_DELAY_MS = 120;
const TICKER_RE = /^[A-Z0-9.]{1,10}$/;

let fetching = false;

export async function fetchAllPrices(onProgress) {
  if (fetching || !portfolio.loaded || !settings.hasTokens) return false;
  fetching = true;

  const br = [...portfolio.items('brStocks'), ...portfolio.items('brFiis')].map(a => a.id);
  const us = [...portfolio.items('usStocks'), ...portfolio.items('usReits')].map(a => a.id);
  const sov = portfolio.items('storeOfValue').map(a => a.id);

  let step = 0;
  const total = br.length + us.length + sov.length + 1;
  const progress = label => onProgress?.(`${label} (${++step}/${total})`, step / total);

  try {
    progress(t('loadingExchange'));
    await fetchExchangeRates();
    for (const ticker of br) { progress(ticker); await fetchBrQuote(ticker); }
    for (const ticker of us) { progress(ticker); await fetchUsQuote(ticker); }
    for (const ticker of sov) { progress(ticker); await fetchSovQuote(ticker); }

    if (prices.hasData) prices.save();
    return prices.hasData;
  } catch (err) {
    console.error('fetchAllPrices:', err);
    return false;
  } finally {
    fetching = false;
  }
}

async function fetchExchangeRates() {
  const data = await fetchJson('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  if (data?.USDBRL) prices.usdBrl = parseFloat(data.USDBRL.bid);
}

async function fetchBrQuote(ticker) {
  if (!settings.brapiToken) return;
  try {
    const data = await fetchJson(`https://brapi.dev/api/quote/${ticker}?token=${settings.brapiToken}`);
    const r = data?.results?.[0];
    if (r) {
      prices.set(r.symbol, {
        price: r.regularMarketPrice,
        currency: r.currency || 'BRL',
        change: r.regularMarketChangePercent,
      });
      prices.markBrQuoted(r.symbol);
    }
  } catch (e) {
    console.warn(`brapi (${ticker}):`, e);
  }
}

async function fetchUsQuote(ticker) {
  if (!settings.finnhubToken) return;
  try {
    const data = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${settings.finnhubToken}`);
    if (data?.c > 0) {
      prices.set(ticker, { price: data.c, currency: 'USD', change: data.dp });
    }
  } catch (e) {
    console.warn(`finnhub (${ticker}):`, e);
  }
  await delay(FINNHUB_DELAY_MS);
}

async function fetchSovQuote(ticker) {
  if (!TICKER_RE.test(ticker)) return;

  const data = await fetchJsonSoft(`https://economia.awesomeapi.com.br/json/last/${ticker}-BRL`);
  const entry = data?.[`${ticker}BRL`];
  if (entry) {
    prices.set(ticker, {
      price: parseFloat(entry.bid),
      currency: 'BRL',
      change: parseFloat(entry.pctChange),
    });
    return;
  }

  await fetchUsQuote(ticker);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchJsonSoft(url) {
  try {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

const delay = ms => new Promise(r => setTimeout(r, ms));
