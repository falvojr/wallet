import { state, cachePrices, markBrQuoted, classItems } from './state.js';

let fetching = false;

export async function fetchAllPrices(onProgress) {
  if (fetching || !state.portfolio) return false;
  if (!state.settings.brapiToken && !state.settings.finnhubToken) return false;
  fetching = true;

  const br = [...classItems('brStocks'), ...classItems('brFiis')].map(a => a.id);
  const us = [...classItems('usStocks'), ...classItems('usReits')].map(a => a.id);
  const sov = classItems('storeOfValue').map(a => a.id);
  const total = br.length + us.length + sov.length + 1;
  let step = 0;
  const pricesBefore = Object.keys(state.prices).length;
  const progress = label => onProgress?.(`${label} (${++step}/${total})`);

  try {
    progress('Câmbio');
    await fetchExchangeRates();
    for (const t of br)  { progress(t); await fetchBrQuote(t); }
    for (const t of us)  { progress(t); await fetchUsQuote(t); }
    for (const t of sov) { progress(t); await fetchSovQuote(t); }

    const fetched = Object.keys(state.prices).length > pricesBefore;
    if (fetched) cachePrices();
    return fetched;
  } catch (err) {
    console.error('fetchAllPrices:', err);
    return false;
  } finally {
    fetching = false;
  }
}

async function fetchExchangeRates() {
  const data = await (await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')).json();
  if (data.USDBRL) state.rates.USDBRL = parseFloat(data.USDBRL.bid);
}

async function fetchBrQuote(ticker) {
  if (!state.settings.brapiToken) return;
  try {
    const r = (await (await fetch(`https://brapi.dev/api/quote/${ticker}?token=${state.settings.brapiToken}`)).json()).results?.[0];
    if (r) {
      state.prices[r.symbol] = { price: r.regularMarketPrice, currency: r.currency || 'BRL', change: r.regularMarketChangePercent };
      markBrQuoted(r.symbol);
    }
  } catch (e) { console.warn(`brapi (${ticker}):`, e); }
}

async function fetchUsQuote(ticker) {
  if (!state.settings.finnhubToken) return;
  try {
    const data = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${state.settings.finnhubToken}`)).json();
    if (data.c > 0) state.prices[ticker] = { price: data.c, currency: 'USD', change: data.dp };
  } catch (e) { console.warn(`finnhub (${ticker}):`, e); }
  await new Promise(r => setTimeout(r, 120));
}

async function fetchSovQuote(ticker) {
  try {
    const data = await (await fetch(`https://economia.awesomeapi.com.br/json/last/${ticker}-BRL`)).json();
    const entry = data[`${ticker}BRL`];
    if (entry) {
      state.prices[ticker] = { price: parseFloat(entry.bid), currency: 'BRL', change: parseFloat(entry.pctChange) };
      return;
    }
  } catch {}
  await fetchUsQuote(ticker);
}
