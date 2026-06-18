import { portfolio, prices, settings, isTicker } from './state.js';
import { t } from './i18n.js';

const FINNHUB_DELAY_MS = 120;

export async function fetchAllPrices(onProgress) {
  if (!portfolio.loaded || !settings.hasTokens) return false;

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
  }
}

// Soft failure: a missing rate must not abort the quotes; the cached rate stays in use.
async function fetchExchangeRates() {
  const data = await fetchJsonSoft('https://economia.awesomeapi.com.br/json/last/USD-BRL');
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

const USD_PEGGED = new Set(['USDC', 'USDT']);

// Cryptos are quoted in BRL by CoinGecko (free, no token); the map ties each ticker to its CoinGecko id.
const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
};

async function fetchSovQuote(ticker) {
  if (USD_PEGGED.has(ticker)) {
    prices.set(ticker, { price: 1, currency: 'USD', change: 0 });
    return;
  }

  if (!isTicker(ticker)) return;

  const coinId = COINGECKO_IDS[ticker];
  if (coinId) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl&include_24hr_change=true`;
    const entry = (await fetchJsonSoft(url))?.[coinId];
    if (entry?.brl) {
      prices.set(ticker, { price: entry.brl, currency: 'BRL', change: entry.brl_24h_change });
    }
    return;
  }

  // Non-crypto tickers (e.g. the GLD gold ETF) are quoted in dollars via Finnhub.
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
