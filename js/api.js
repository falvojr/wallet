import { portfolio, prices, settings } from './state.js';
import { t } from './i18n.js';

const FINNHUB_DELAY_MS = 120;
const TICKER_RE = /^[A-Z0-9.]{1,10}$/;

let fetching = false;

export async function fetchAllPrices(onProgress) {
  if (fetching || !portfolio.loaded || !settings.hasTokens) return false;
  fetching = true;

  const brTickers = [...portfolio.items('brStocks'), ...portfolio.items('brFiis')].map(a => a.id);
  const usTickers = [...portfolio.items('usStocks'), ...portfolio.items('usReits')].map(a => a.id);
  const sovTickers = portfolio.items('storeOfValue').map(a => a.id);

  let step = 0;
  const total = brTickers.length + usTickers.length + sovTickers.length + 1;
  const progress = label => onProgress?.(`${label} (${++step}/${total})`, step / total);

  try {
    progress(t('loadingExchange'));
    await fetchExchangeRates();

    for (const ticker of brTickers)  { progress(ticker); await fetchBrQuote(ticker); }
    for (const ticker of usTickers)  { progress(ticker); await fetchUsQuote(ticker); }
    for (const ticker of sovTickers) { progress(ticker); await fetchSovQuote(ticker); }

    if (prices.hasData) prices.save();
    return prices.hasData;
  } catch (error) {
    console.error('fetchAllPrices:', error);
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
    const result = data?.results?.[0];
    if (result) {
      prices.set(result.symbol, {
        price: result.regularMarketPrice,
        currency: result.currency || 'BRL',
        change: result.regularMarketChangePercent,
      });
      prices.markBrQuoted(result.symbol);
    }
  } catch (error) {
    console.warn(`brapi (${ticker}):`, error);
  }
}

async function fetchUsQuote(ticker) {
  if (!settings.finnhubToken) return;
  try {
    const data = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${settings.finnhubToken}`);
    if (data?.c > 0) {
      prices.set(ticker, { price: data.c, currency: 'USD', change: data.dp });
    }
  } catch (error) {
    console.warn(`finnhub (${ticker}):`, error);
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
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

async function fetchJsonSoft(url) {
  try {
    const response = await fetch(url);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
