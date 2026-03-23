(() => {
  'use strict';

  const STORAGE_KEY = 'holding_portfolio';
  const SETTINGS_KEY = 'holding_settings';
  const PRICES_KEY = 'holding_prices';
  const PRICES_TTL = 5 * 60 * 1000;

  const CLASS_META = {
    brStocks:     { label: 'Ações BR',         color: '#34d399', icon: '🇧🇷' },
    brFiis:       { label: 'FIIs',             color: '#22d3ee', icon: '🏢' },
    usStocks:     { label: 'Ações US',         color: '#818cf8', icon: '🇺🇸' },
    usReits:      { label: 'REITs',            color: '#c084fc', icon: '🏗️' },
    fixedIncome:  { label: 'Renda Fixa',       color: '#fbbf24', icon: '🔒' },
    storeOfValue: { label: 'Reserva de Valor', color: '#f97316', icon: '₿'  },
    realEstate:   { label: 'Imóveis',          color: '#fb7185', icon: '🏠' },
  };
  const CLASS_KEYS = Object.keys(CLASS_META);

  let portfolio = null;
  let settings  = { brapiToken: '', finnhubToken: '' };
  let prices    = {};
  let rates     = {};
  let editMode  = false;
  let activeTab = 'overview';
  let addTargetClass = null;
  let fetchingPrices = false;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const dom = {
    syncBadge: $('#syncBadge'), tabNav: $('#tabNav'), panels: $('#panels'),
    headerActions: $('#headerActions'), emptyWelcome: $('#emptyWelcome'),
    btnEdit: $('#btnEdit'), btnExport: $('#btnExport'), btnImport: $('#btnImport'),
    btnPrices: $('#btnPrices'), btnSettings: $('#btnSettings'),
    btnWelcomeImport: $('#btnWelcomeImport'),
    addModal: $('#addModal'), newTicker: $('#newTicker'), newAmount: $('#newAmount'),
    modalCancel: $('#modalCancel'), modalConfirm: $('#modalConfirm'),
    settingsModal: $('#settingsModal'), brapiToken: $('#brapiToken'),
    finnhubToken: $('#finnhubToken'), settingsCancel: $('#settingsCancel'),
    settingsSave: $('#settingsSave'),
    dropZone: $('#dropZone'), toastContainer: $('#toastContainer'),
    fileInput: $('#fileInput'), app: $('#app'),
  };

  function loadPortfolio() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) portfolio = JSON.parse(stored);
    } catch { portfolio = null; }
  }

  function savePortfolio() {
    portfolio.syncedAt = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }

  function clearPortfolio() {
    portfolio = null;
    prices = {};
    rates = {};
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PRICES_KEY);
  }

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) settings = JSON.parse(stored);
    } catch { /* keep defaults */ }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadCachedPrices() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(PRICES_KEY));
      if (stored && Date.now() - stored.ts < PRICES_TTL) {
        prices = stored.prices || {};
        rates = stored.rates || {};
      }
    } catch { /* no cache */ }
  }

  function cachePrices() {
    sessionStorage.setItem(PRICES_KEY, JSON.stringify({ ts: Date.now(), prices, rates }));
  }

  function formatBRL(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatQty(val) {
    if (Number.isInteger(val)) return val.toLocaleString('pt-BR');
    if (val < 1) return val.toFixed(8);
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatCompact(val) {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
    return val.toFixed(0);
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // Price APIs

  async function fetchAllPrices() {
    if (fetchingPrices || !portfolio) return;
    fetchingPrices = true;
    dom.btnPrices.classList.add('btn--loading');

    try {
      await fetchExchangeRates();

      const brTickers = [
        ...(portfolio.brStocks || []),
        ...(portfolio.brFiis || []),
      ].map(a => a.id);

      const usTickers = [
        ...(portfolio.usStocks || []),
        ...(portfolio.usReits || []),
      ].map(a => a.id);

      await Promise.allSettled([
        brTickers.length ? fetchBrPrices(brTickers) : Promise.resolve(),
        usTickers.length ? fetchUsPrices(usTickers) : Promise.resolve(),
      ]);

      cachePrices();
      render();
      toast('Cotações atualizadas');
    } catch (err) {
      toast('Erro ao buscar cotações');
      console.error(err);
    } finally {
      fetchingPrices = false;
      dom.btnPrices.classList.remove('btn--loading');
    }
  }

  async function fetchExchangeRates() {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL');
    const data = await res.json();
    if (data.USDBRL) rates.USDBRL = parseFloat(data.USDBRL.bid);
    if (data.BTCBRL) rates.BTCBRL = parseFloat(data.BTCBRL.bid);
  }

  async function fetchBrPrices(tickers) {
    if (!settings.brapiToken) return;
    const batchSize = 20;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize).join(',');
      try {
        const res = await fetch(`https://brapi.dev/api/quote/${batch}?token=${settings.brapiToken}`);
        const data = await res.json();
        if (data.results) {
          data.results.forEach(r => {
            prices[r.symbol] = {
              price: r.regularMarketPrice,
              currency: r.currency || 'BRL',
              change: r.regularMarketChangePercent,
            };
          });
        }
      } catch (e) { console.warn('brapi batch error:', e); }
    }
  }

  async function fetchUsPrices(tickers) {
    if (!settings.finnhubToken) return;
    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (const ticker of tickers) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${settings.finnhubToken}`);
        const data = await res.json();
        if (data.c && data.c > 0) {
          prices[ticker] = { price: data.c, currency: 'USD', change: data.dp };
        }
      } catch (e) { console.warn(`finnhub error (${ticker}):`, e); }
      await delay(120);
    }
  }

  // Conversão para BRL:
  // BR: preço direto. US: preço * câmbio USD/BRL.
  // BTC: taxa BTC/BRL * qtd. Renda fixa e imóveis: amount já é o valor em BRL.
  function getAssetValue(classKey, asset) {
    if (classKey === 'fixedIncome' || classKey === 'realEstate') return asset.amount;
    if (classKey === 'storeOfValue') return (rates.BTCBRL || 0) * asset.amount;

    const p = prices[asset.id];
    if (!p) return null;

    const isUSD = classKey === 'usStocks' || classKey === 'usReits';
    const priceInBRL = isUSD ? p.price * (rates.USDBRL || 0) : p.price;
    return priceInBRL * asset.amount;
  }

  function getClassTotal(classKey) {
    const assets = portfolio[classKey] || [];
    let total = 0;
    let hasPrice = false;
    for (const asset of assets) {
      const val = getAssetValue(classKey, asset);
      if (val !== null) { total += val; hasPrice = true; }
    }
    return hasPrice ? total : null;
  }

  function getPortfolioTotal() {
    let total = 0;
    let partial = false;
    for (const key of CLASS_KEYS) {
      const val = getClassTotal(key);
      if (val !== null) total += val;
      else if ((portfolio[key] || []).length > 0) partial = true;
    }
    return { total, partial };
  }

  // Donut

  function buildDonut(segments) {
    const total = segments.reduce((s, d) => s + d.value, 0);
    if (total === 0) return '<p style="color:var(--text-muted);padding:24px">Sem dados</p>';

    const R = 80;
    const C = Math.PI * 2 * R;
    let offset = 0;

    const arcs = segments.map(d => {
      const dash = (d.value / total) * C;
      const arc = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${d.color}"
        stroke-width="24" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}"
        opacity="0.88"/>`;
      offset += dash;
      return arc;
    });

    const { total: portfolioTotal, partial } = getPortfolioTotal();
    const hasValue = portfolioTotal > 0;
    const centerValue = hasValue ? formatCompact(portfolioTotal) : segments.reduce((s, d) => s + d.count, 0);
    const centerLabel = hasValue ? 'Patrimônio' : 'Posições';
    const centerSub = hasValue && partial ? '(parcial)' : '';

    return `
      <div class="donut-wrap">
        <svg viewBox="0 0 200 200">${arcs.join('')}</svg>
        <div class="donut-center">
          <div class="total-label">${centerLabel}</div>
          <div class="total-value">${centerValue}</div>
          ${centerSub ? `<div class="total-sub">${centerSub}</div>` : ''}
        </div>
      </div>`;
  }

  // Render

  function render() {
    const hasPortfolio = portfolio !== null;
    dom.emptyWelcome.hidden = hasPortfolio;
    dom.headerActions.hidden = !hasPortfolio;
    dom.syncBadge.textContent = hasPortfolio ? `Sync: ${portfolio.syncedAt || '---'}` : '';

    if (!hasPortfolio) {
      dom.tabNav.innerHTML = '';
      dom.panels.innerHTML = '';
      return;
    }

    renderTabs();
    renderPanels();
    updateEditUI();
  }

  function renderTabs() {
    const tabs = [
      { key: 'overview', label: 'Visão Geral', count: null },
      ...CLASS_KEYS.map(k => ({
        key: k, label: CLASS_META[k].label, count: (portfolio[k] || []).length,
      })),
    ];

    dom.tabNav.innerHTML = tabs.map(t => `
      <button class="tab-btn ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}">
        ${t.label}${t.count !== null ? `<span class="tab-count">${t.count}</span>` : ''}
      </button>
    `).join('');

    $$('.tab-btn', dom.tabNav).forEach(btn =>
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); })
    );
  }

  function renderPanels() {
    let html = `<div class="tab-panel ${activeTab === 'overview' ? 'active' : ''}" data-panel="overview">`;
    html += renderOverview();
    html += '</div>';

    for (const key of CLASS_KEYS) {
      html += `<div class="tab-panel ${activeTab === key ? 'active' : ''}" data-panel="${key}">`;
      html += renderAssetPanel(key);
      html += '</div>';
    }

    dom.panels.innerHTML = html;
    bindPanelEvents();
  }

  function renderOverview() {
    const chartData = CLASS_KEYS.map(k => {
      const classTotal = getClassTotal(k);
      const count = (portfolio[k] || []).length;
      return {
        key: k, label: CLASS_META[k].label, color: CLASS_META[k].color,
        value: classTotal !== null ? classTotal : count * 0.01,
        count, hasPrices: classTotal !== null, total: classTotal,
      };
    }).filter(d => d.count > 0);

    const pTotal = getPortfolioTotal().total;

    let html = '<div class="overview-grid">';
    html += '<div class="chart-card"><h2>Diversificação</h2>';
    html += buildDonut(chartData);
    html += '<div class="chart-legend">';

    chartData.forEach(d => {
      const display = d.hasPrices ? formatBRL(d.total) : `${d.count} pos.`;
      const pct = d.hasPrices && pTotal > 0 ? ((d.total / pTotal) * 100).toFixed(1) + '%' : '';
      html += `
        <div class="legend-item" data-goto="${d.key}">
          <span class="legend-dot" style="background:${d.color}"></span>
          ${d.label}
          <span class="legend-value">${pct ? pct + ' · ' : ''}${display}</span>
        </div>`;
    });

    html += '</div></div>';
    html += '<div class="summary-cards">';

    CLASS_KEYS.forEach(key => {
      const assets = portfolio[key] || [];
      const count = assets.length;
      if (count === 0) return;

      const meta = CLASS_META[key];
      const classTotal = getClassTotal(key);

      const valueDisplay = classTotal !== null
        ? `<div class="summary-card-value" style="color:${meta.color}">${formatBRL(classTotal)}</div>`
        : `<div class="summary-card-value" style="color:${meta.color}">${count}</div>`;

      const posLabel = count === 1 ? '1 posição' : `${count} posições`;
      const subDisplay = classTotal !== null ? posLabel : `${posLabel} · sem cotação`;

      html += `
        <div class="summary-card" data-class="${key}" data-goto="${key}">
          <div class="summary-card-label">${meta.label}</div>
          ${valueDisplay}
          <div class="summary-card-sub">${subDisplay}</div>
        </div>`;
    });

    html += '</div></div>';
    return html;
  }

  function renderAssetPanel(key) {
    const meta = CLASS_META[key];
    const assets = portfolio[key] || [];
    const isUSD = key === 'usStocks' || key === 'usReits';

    let html = `
      <div class="asset-section-header">
        <h2 class="asset-section-title" style="color:${meta.color}">${meta.icon} ${meta.label}</h2>
      </div>
      <div class="asset-grid">`;

    assets.forEach((asset, idx) => {
      const p = prices[asset.id];
      const val = getAssetValue(key, asset);

      let priceHtml = '';
      if (key === 'fixedIncome' || key === 'realEstate') {
        priceHtml = '<div class="asset-price">Valor declarado</div>';
      } else if (key === 'storeOfValue' && rates.BTCBRL) {
        priceHtml = `<div class="asset-price">${formatBRL(rates.BTCBRL)}</div>`;
      } else if (p) {
        const sym = isUSD ? '$' : 'R$';
        const chg = p.change !== undefined ? ` (${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}%)` : '';
        priceHtml = `<div class="asset-price">${sym} ${p.price.toFixed(2)}${chg}</div>`;
      }

      const valueHtml = val !== null
        ? `<div class="asset-value" style="color:${meta.color}">${formatBRL(val)}</div>` : '';

      html += `
        <div class="asset-card" data-class="${key}" data-idx="${idx}">
          <div class="asset-ticker">${asset.id}</div>
          ${priceHtml}
          <div class="asset-amount">Qtd: <strong>${formatQty(asset.amount)}</strong></div>
          ${valueHtml}
          <div class="edit-input-group">
            <input type="text" class="edit-input" value="${asset.amount}"
              data-class="${key}" data-idx="${idx}" inputmode="decimal">
            <button class="edit-remove-btn" data-class="${key}" data-idx="${idx}" title="Remover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>`;
    });

    html += `
        <div class="add-asset-card" data-add-class="${key}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar
        </div>
      </div>`;

    return html;
  }

  function bindPanelEvents() {
    $$('[data-goto]', dom.panels).forEach(el =>
      el.addEventListener('click', () => { activeTab = el.dataset.goto; render(); })
    );

    $$('.edit-input', dom.panels).forEach(input =>
      input.addEventListener('change', () => {
        const val = parseFloat(input.value.replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
          portfolio[input.dataset.class][parseInt(input.dataset.idx)].amount = val;
          savePortfolio();
        }
      })
    );

    $$('.edit-remove-btn', dom.panels).forEach(btn =>
      btn.addEventListener('click', () => {
        const cls = btn.dataset.class;
        const idx = parseInt(btn.dataset.idx);
        const asset = portfolio[cls][idx];
        if (confirm(`Remover ${asset.id}?`)) {
          portfolio[cls].splice(idx, 1);
          savePortfolio();
          render();
          toast(`${asset.id} removido`);
        }
      })
    );

    $$('.add-asset-card', dom.panels).forEach(card =>
      card.addEventListener('click', () => openAddModal(card.dataset.addClass))
    );
  }

  // Edit mode

  function toggleEditMode() {
    editMode = !editMode;
    updateEditUI();
    if (!editMode) {
      savePortfolio();
      render();
      toast('Alterações salvas');
    }
  }

  function updateEditUI() {
    dom.app.classList.toggle('edit-mode', editMode);
    dom.btnEdit.classList.toggle('btn--primary', editMode);

    const label = dom.btnEdit.querySelector('.btn-label');
    if (label) label.textContent = editMode ? 'Salvar' : 'Editar';

    dom.btnEdit.querySelector('svg').innerHTML = editMode
      ? '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>';
  }

  // Add modal

  function openAddModal(cls) {
    addTargetClass = cls;
    dom.newTicker.value = '';
    dom.newAmount.value = '';
    dom.addModal.classList.add('open');
    setTimeout(() => dom.newTicker.focus(), 100);
  }

  function closeAddModal() {
    dom.addModal.classList.remove('open');
    addTargetClass = null;
  }

  function confirmAddAsset() {
    const ticker = dom.newTicker.value.trim().toUpperCase();
    const amount = parseFloat(dom.newAmount.value.replace(',', '.'));

    if (!ticker) { dom.newTicker.focus(); return; }
    if (isNaN(amount) || amount <= 0) { dom.newAmount.focus(); return; }

    if ((portfolio[addTargetClass] || []).find(a => a.id === ticker)) {
      toast(`${ticker} já existe nesta classe`);
      return;
    }

    if (!portfolio[addTargetClass]) portfolio[addTargetClass] = [];
    portfolio[addTargetClass].push({ id: ticker, amount });
    savePortfolio();
    closeAddModal();
    render();
    toast(`${ticker} adicionado`);
  }

  // Settings modal

  function openSettings() {
    dom.brapiToken.value = settings.brapiToken || '';
    dom.finnhubToken.value = settings.finnhubToken || '';
    dom.settingsModal.classList.add('open');
  }

  function closeSettings() { dom.settingsModal.classList.remove('open'); }

  function saveSettingsFromModal() {
    settings.brapiToken = dom.brapiToken.value.trim();
    settings.finnhubToken = dom.finnhubToken.value.trim();
    saveSettings();
    closeSettings();
    toast('Configurações salvas');
  }

  // Import / Export

  function exportJSON() {
    const out = { currency: portfolio.currency || 'BRL', syncedAt: portfolio.syncedAt };
    CLASS_KEYS.forEach(k => { out[k] = portfolio[k] || []; });

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${portfolio.syncedAt || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('JSON exportado');
  }

  function validatePortfolioJSON(data) {
    return CLASS_KEYS.some(k => Array.isArray(data[k]));
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!validatePortfolioJSON(data)) throw new Error('Formato inválido');

        portfolio = data;
        savePortfolio();
        activeTab = 'overview';
        editMode = false;
        render();
        toast('Carteira importada');

        if (settings.brapiToken || settings.finnhubToken) fetchAllPrices();
      } catch (err) {
        toast('Erro: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function triggerFileInput() { dom.fileInput.click(); }

  // Drag & Drop

  let dragCounter = 0;

  document.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    dom.dropZone.classList.add('visible');
  });

  document.addEventListener('dragleave', e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dom.dropZone.classList.remove('visible'); }
  });

  document.addEventListener('dragover', e => e.preventDefault());

  document.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    dom.dropZone.classList.remove('visible');
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.json')) importJSON(file);
    else toast('Apenas arquivos .json');
  });

  // Event bindings

  dom.btnEdit.addEventListener('click', toggleEditMode);
  dom.btnExport.addEventListener('click', exportJSON);
  dom.btnImport.addEventListener('click', triggerFileInput);
  dom.btnWelcomeImport.addEventListener('click', triggerFileInput);
  dom.btnPrices.addEventListener('click', fetchAllPrices);
  dom.btnSettings.addEventListener('click', openSettings);

  dom.fileInput.addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });

  dom.modalCancel.addEventListener('click', closeAddModal);
  dom.modalConfirm.addEventListener('click', confirmAddAsset);
  dom.addModal.addEventListener('click', e => { if (e.target === dom.addModal) closeAddModal(); });

  dom.settingsCancel.addEventListener('click', closeSettings);
  dom.settingsSave.addEventListener('click', saveSettingsFromModal);
  dom.settingsModal.addEventListener('click', e => { if (e.target === dom.settingsModal) closeSettings(); });

  dom.newAmount.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddAsset(); });
  dom.newTicker.addEventListener('keydown', e => { if (e.key === 'Enter') dom.newAmount.focus(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dom.addModal.classList.contains('open')) closeAddModal();
      else if (dom.settingsModal.classList.contains('open')) closeSettings();
      else if (editMode) toggleEditMode();
    }
  });

  // PWA

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Init

  loadSettings();
  loadPortfolio();
  loadCachedPrices();
  render();

  if (portfolio && (settings.brapiToken || settings.finnhubToken) && Object.keys(prices).length === 0) {
    fetchAllPrices();
  }
})();
