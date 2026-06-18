import { portfolio, prices, settings, isTicker } from './state.js';
import { t } from './i18n.js';

const COINGECKO = 'https://api.coingecko.com/api/v3';

// Market classes are always securities, quoted by brapi. Store of value mixes crypto (CoinGecko)
// with securities like the GLD gold ETF (brapi), told apart by what CoinGecko recognizes as a coin.
const MARKET_CLASSES = ['brStocks', 'brFiis', 'usStocks', 'usReits'];

export async function fetchAllPrices(onProgress) {
  if (!portfolio.loaded || !settings.hasTokens) return false;

  const securities = MARKET_CLASSES.flatMap(key => portfolio.items(key)).map(a => a.id).filter(isTicker);
  const storeTickers = portfolio.items('storeOfValue').map(a => a.id).filter(isTicker);

  let step = 0;
  const total = securities.length + storeTickers.length + 2;
  const progress = label => onProgress?.(`${label} (${++step}/${total})`, step / total);

  try {
    progress(t('loadingExchange'));
    await fetchExchangeRate();

    progress(t('loadingCrypto'));
    const crypto = await fetchCryptoQuotes(storeTickers);

    for (const ticker of [...securities, ...storeTickers]) {
      progress(ticker);
      if (!crypto.has(ticker)) await fetchBrapiQuote(ticker);
    }

    if (prices.hasData) prices.save();
    return prices.hasData;
  } catch (error) {
    console.error('fetchAllPrices:', error);
    return false;
  }
}

// CoinGecko has no fiat-only endpoint, so USD-BRL is derived from a reference asset priced in both.
async function fetchExchangeRate() {
  const data = await fetchJsonSoft(`${COINGECKO}/simple/price?ids=bitcoin&vs_currencies=usd,brl`);
  const { usd, brl } = data?.bitcoin ?? {};
  if (usd > 0 && brl > 0) prices.usdBrl = brl / usd;
}

// Resolves store-of-value tickers against CoinGecko by symbol (no hardcoded id list); stores the
// coins it recognizes in BRL and returns their tickers, so the rest fall through to brapi.
async function fetchCryptoQuotes(tickers) {
  const resolved = new Set();
  if (!tickers.length) return resolved;

  const symbols = tickers.map(ticker => ticker.toLowerCase()).join(',');
  const coins = await fetchJsonSoft(`${COINGECKO}/coins/markets?vs_currency=brl&symbols=${symbols}`);
  if (!Array.isArray(coins)) return resolved;

  for (const coin of coins) {
    const ticker = tickers.find(t => t.toLowerCase() === coin.symbol);
    if (ticker && Number.isFinite(coin.current_price)) {
      prices.set(ticker, { price: coin.current_price, currency: 'BRL', change: coin.price_change_percentage_24h });
      resolved.add(ticker);
    }
  }
  return resolved;
}

async function fetchBrapiQuote(ticker) {
  let result = await requestBrapi(ticker);
  // brapi usa hífen para ações de classe (BRK-B, não BRK.B); tenta a forma com hífen quando a com ponto falha.
  if (!result && ticker.includes('.')) result = await requestBrapi(ticker.replace(/\./g, '-'));

  if (result && Number.isFinite(result.regularMarketPrice)) {
    prices.set(ticker, {
      price: result.regularMarketPrice,
      currency: result.currency || 'BRL',
      change: result.regularMarketChangePercent,
    });
  } else {
    console.warn(`brapi: sem cotação para ${ticker}`);
  }
}

// Busca a cotação de um ticker na brapi, devolvendo null quando não existe ou a requisição falha.
async function requestBrapi(ticker) {
  try {
    const data = await fetchJson(`https://brapi.dev/api/quote/${ticker}?token=${settings.brapiToken}`);
    return data?.results?.[0] ?? null;
  } catch {
    return null;
  }
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
