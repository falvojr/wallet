import { state, cachePrices } from './state.js';

let fetchingPrices = false;

export async function fetchAllPrices(onProgress) {
  if (fetchingPrices || !state.portfolio) return;
  fetchingPrices = true;

  const brTickers = [...(state.portfolio.brStocks || []), ...(state.portfolio.brFiis || [])].map(a => a.id);
  const usTickers = [...(state.portfolio.usStocks || []), ...(state.portfolio.usReits || [])].map(a => a.id);
  const totalSteps = brTickers.length + usTickers.length + 1;
  let step = 0;

  const progress = label => onProgress?.(`${label} (${++step}/${totalSteps})`);

  try {
    progress('Câmbio');
    await fetchExchangeRates();
    for (const t of brTickers)  { progress(t); await fetchBrQuote(t); }
    for (const t of usTickers)  { progress(t); await fetchUsQuote(t); }
    cachePrices();
    return true;
  } catch (err) {
    console.error('fetchAllPrices:', err);
    return false;
  } finally {
    fetchingPrices = false;
  }
}

async function fetchExchangeRates() {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL');
  const data = await res.json();
  if (data.USDBRL) state.rates.USDBRL = parseFloat(data.USDBRL.bid);
  if (data.BTCBRL) state.rates.BTCBRL = parseFloat(data.BTCBRL.bid);
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
