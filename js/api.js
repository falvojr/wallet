import { state, cachePrices, markBrQuoted } from './state.js';

let fetching = false;

export async function fetchAllPrices(onProgress) {
  if (fetching || !state.portfolio) return;
  fetching = true;

  const brTickers = [...(state.portfolio.brStocks || []), ...(state.portfolio.brFiis || [])].map(a => a.id);
  const usTickers = [...(state.portfolio.usStocks || []), ...(state.portfolio.usReits || [])].map(a => a.id);
  const sovTickers = (state.portfolio.storeOfValue || []).map(a => a.id);
  const total = brTickers.length + usTickers.length + sovTickers.length + 1;
  let step = 0;

  const progress = label => onProgress?.(`${label} (${++step}/${total})`);

  try {
    progress('Câmbio');
    await fetchExchangeRates();
    for (const t of brTickers)  { progress(t); await fetchBrQuote(t); }
    for (const t of usTickers)  { progress(t); await fetchUsQuote(t); }
    for (const t of sovTickers) { progress(t); await fetchStoreOfValueQuote(t); }
    cachePrices();
    return true;
  } catch (err) {
    console.error('fetchAllPrices:', err);
    return false;
  } finally {
    fetching = false;
  }
}

async function fetchExchangeRates() {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  const data = await res.json();
  if (data.USDBRL) state.rates.USDBRL = parseFloat(data.USDBRL.bid);
}

async function fetchBrQuote(ticker) {
  if (!state.settings.brapiToken) return;
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${state.settings.brapiToken}`);
    const r = (await res.json()).results?.[0];
    if (r) {
      state.prices[r.symbol] = {
        price: r.regularMarketPrice,
        currency: r.currency || 'BRL',
        change: r.regularMarketChangePercent,
      };
      markBrQuoted(r.symbol);
    }
  } catch (e) { console.warn(`brapi (${ticker}):`, e); }
}

async function fetchUsQuote(ticker) {
  if (!state.settings.finnhubToken) return;
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${state.settings.finnhubToken}`);
    const data = await res.json();
    if (data.c > 0) {
      state.prices[ticker] = { price: data.c, currency: 'USD', change: data.dp };
    }
  } catch (e) { console.warn(`finnhub (${ticker}):`, e); }
  await new Promise(r => setTimeout(r, 120));
}

async function fetchStoreOfValueQuote(ticker) {
  if (await tryAwesomeApi(ticker)) return;
  await fetchUsQuote(ticker);
}

async function tryAwesomeApi(ticker) {
  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${ticker}-BRL`);
    const data = await res.json();
    const key = `${ticker}BRL`;
    if (data[key]) {
      state.prices[ticker] = {
        price: parseFloat(data[key].bid),
        currency: 'BRL',
        change: parseFloat(data[key].pctChange),
      };
      return true;
    }
  } catch {}
  return false;
}
