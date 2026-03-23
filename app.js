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
    newTarget: $('#newTarget'),
    modalCancel: $('#modalCancel'), modalConfirm: $('#modalConfirm'),
    settingsModal: $('#settingsModal'), brapiToken: $('#brapiToken'),
    finnhubToken: $('#finnhubToken'), settingsCancel: $('#settingsCancel'),
    settingsSave: $('#settingsSave'),
    dropZone: $('#dropZone'), toastContainer: $('#toastContainer'),
    fileInput: $('#fileInput'), app: $('#app'),
    loadingOverlay: $('#loadingOverlay'), loadingText: $('#loadingText'),
  };

  // Persistence

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

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) settings = JSON.parse(stored);
    } catch {}
  }

  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

  function loadCachedPrices() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(PRICES_KEY));
      if (stored && Date.now() - stored.ts < PRICES_TTL) {
        prices = stored.prices || {};
        rates = stored.rates || {};
      }
    } catch {}
  }

  function cachePrices() {
    sessionStorage.setItem(PRICES_KEY, JSON.stringify({ ts: Date.now(), prices, rates }));
  }

  // Formatting

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

  function formatGap(gap) {
    return (gap >= 0 ? '+' : '') + gap.toFixed(1) + '%';
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function showLoading(text) {
    dom.loadingText.textContent = text;
    dom.loadingOverlay.hidden = false;
  }

  function hideLoading() { dom.loadingOverlay.hidden = true; }

  // Conversão para BRL:
  // BR: preço direto. US: preço * câmbio USD/BRL.
  // BTC: taxa BTC/BRL * qtd. Renda fixa e imóveis: amount já é o valor em BRL.
  function assetValueBRL(classKey, asset) {
    if (classKey === 'fixedIncome' || classKey === 'realEstate') return asset.amount;
    if (classKey === 'storeOfValue') return (rates.BTCBRL || 0) * asset.amount;

    const p = prices[asset.id];
    if (!p) return null;

    const isUSD = classKey === 'usStocks' || classKey === 'usReits';
    return (isUSD ? p.price * (rates.USDBRL || 0) : p.price) * asset.amount;
  }

  function classTotalBRL(classKey) {
    const assets = portfolio[classKey] || [];
    let total = 0, hasPrices = false;
    for (const asset of assets) {
      const val = assetValueBRL(classKey, asset);
      if (val !== null) { total += val; hasPrices = true; }
    }
    return hasPrices ? total : null;
  }

  function portfolioTotalBRL() {
    let total = 0, partial = false;
    for (const key of CLASS_KEYS) {
      const val = classTotalBRL(key);
      if (val !== null) total += val;
      else if ((portfolio[key] || []).length > 0) partial = true;
    }
    return { total, partial };
  }

  function activeClassKeys() {
    return CLASS_KEYS.filter(k => (portfolio[k] || []).length > 0);
  }

  // Metas e rebalanceamento:
  // classTargets[key] = % desejado do portfólio total.
  // asset.target = % desejado dentro da classe. 0 = quarentena (excluído dos aportes).
  // "gap" = target - actual. Maior gap positivo = mais defasado = prioridade de aporte.

  function classTargetPct(classKey) {
    const targets = portfolio.classTargets || {};
    if (targets[classKey] !== undefined) return targets[classKey];
    const active = activeClassKeys();
    return active.length > 0 ? 100 / active.length : 0;
  }

  function classActualPct(classKey) {
    const classTotal = classTotalBRL(classKey);
    const { total } = portfolioTotalBRL();
    if (classTotal === null || total <= 0) return null;
    return (classTotal / total) * 100;
  }

  function assetTargetPct(classKey, asset) {
    if (asset.target !== undefined) return asset.target;
    const activeAssets = (portfolio[classKey] || []).filter(a => !isQuarantined(a));
    return activeAssets.length > 0 ? 100 / activeAssets.length : 0;
  }

  function isQuarantined(asset) {
    return asset.target !== undefined && asset.target === 0;
  }

  function findTopSuggestions(count) {
    const { total } = portfolioTotalBRL();
    if (total <= 0) return [];

    const candidates = [];

    for (const classKey of activeClassKeys()) {
      const classTotal = classTotalBRL(classKey);
      if (classTotal === null) continue;

      const classGap = classTargetPct(classKey) - (classTotal / total) * 100;

      for (const asset of portfolio[classKey]) {
        if (isQuarantined(asset)) continue;
        const val = assetValueBRL(classKey, asset);
        if (val === null) continue;

        const assetGap = assetTargetPct(classKey, asset) - (classTotal > 0 ? (val / classTotal) * 100 : 0);

        // Score combinado: peso maior na classe, refinado pelo ativo
        candidates.push({
          classKey,
          classLabel: CLASS_META[classKey].label,
          classColor: CLASS_META[classKey].color,
          id: asset.id,
          value: val,
          classGap,
          assetGap,
          score: classGap * 2 + assetGap,
        });
      }
    }

    return candidates.sort((a, b) => b.score - a.score).slice(0, count);
  }

  function findAssetToRebalance(classKey) {
    const assets = portfolio[classKey] || [];
    if (assets.length < 2) return null;

    const classTotal = classTotalBRL(classKey);
    if (!classTotal || classTotal <= 0) return null;

    let best = null, bestGap = -Infinity;

    for (const asset of assets) {
      if (isQuarantined(asset)) continue;
      const val = assetValueBRL(classKey, asset);
      if (val === null) continue;

      const gap = assetTargetPct(classKey, asset) - (val / classTotal) * 100;
      if (gap > bestGap) {
        bestGap = gap;
        best = { id: asset.id, value: val, gap };
      }
    }
    return best;
  }

  // Price APIs

  async function fetchAllPrices() {
    if (fetchingPrices || !portfolio) return;
    fetchingPrices = true;

    const brTickers = [...(portfolio.brStocks || []), ...(portfolio.brFiis || [])].map(a => a.id);
    const usTickers = [...(portfolio.usStocks || []), ...(portfolio.usReits || [])].map(a => a.id);
    const totalSteps = brTickers.length + usTickers.length + 1;
    let step = 0;

    const progress = label => showLoading(`${label} (${++step}/${totalSteps})`);

    try {
      progress('Câmbio');
      await fetchExchangeRates();

      for (const t of brTickers)  { progress(t); await fetchSingleBrQuote(t); }
      for (const t of usTickers)  { progress(t); await fetchSingleUsQuote(t); }

      cachePrices();
      render();
      toast('Cotações atualizadas');
    } catch (err) {
      toast('Erro ao buscar cotações');
      console.error(err);
    } finally {
      fetchingPrices = false;
      hideLoading();
    }
  }

  async function fetchExchangeRates() {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL');
    const data = await res.json();
    if (data.USDBRL) rates.USDBRL = parseFloat(data.USDBRL.bid);
    if (data.BTCBRL) rates.BTCBRL = parseFloat(data.BTCBRL.bid);
  }

  async function fetchSingleBrQuote(ticker) {
    if (!settings.brapiToken) return;
    try {
      const res = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${settings.brapiToken}`);
      const data = await res.json();
      const r = data.results?.[0];
      if (r) {
        prices[r.symbol] = { price: r.regularMarketPrice, currency: r.currency || 'BRL', change: r.regularMarketChangePercent };
      }
    } catch (e) { console.warn(`brapi (${ticker}):`, e); }
  }

  async function fetchSingleUsQuote(ticker) {
    if (!settings.finnhubToken) return;
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${settings.finnhubToken}`);
      const data = await res.json();
      if (data.c > 0) prices[ticker] = { price: data.c, currency: 'USD', change: data.dp };
    } catch (e) { console.warn(`finnhub (${ticker}):`, e); }
    await new Promise(r => setTimeout(r, 120));
  }

  // Donut chart

  function renderDonut(segments) {
    const total = segments.reduce((s, d) => s + d.value, 0);
    if (total === 0) return '<p style="color:var(--text-muted);padding:20px;font-size:0.82rem">Sem dados</p>';

    const R = 75, C = Math.PI * 2 * R;
    let offset = 0;

    const arcs = segments.map(d => {
      const dash = (d.value / total) * C;
      const arc = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${d.color}"
        stroke-width="22" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" opacity="0.88"/>`;
      offset += dash;
      return arc;
    });

    const { total: ptotal, partial } = portfolioTotalBRL();
    const hasValue = ptotal > 0;

    return `
      <div class="donut-wrap">
        <svg viewBox="0 0 200 200">${arcs.join('')}</svg>
        <div class="donut-center">
          <div class="total-label">${hasValue ? 'Patrimônio' : 'Posições'}</div>
          <div class="total-value">${hasValue ? formatCompact(ptotal) : segments.reduce((s, d) => s + d.count, 0)}</div>
          ${hasValue && partial ? '<div class="total-sub">(parcial)</div>' : ''}
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
      ...activeClassKeys().map(k => ({
        key: k, label: CLASS_META[k].label, count: portfolio[k].length,
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
    let html = panelWrap('overview', renderOverview());
    for (const key of activeClassKeys()) {
      html += panelWrap(key, renderAssetPanel(key));
    }
    dom.panels.innerHTML = html;
    bindPanelEvents();
  }

  function panelWrap(key, content) {
    return `<div class="tab-panel ${key === activeTab ? 'active' : ''}" data-panel="${key}">${content}</div>`;
  }

  function renderOverview() {
    const { total: pTotal } = portfolioTotalBRL();
    const suggestions = findTopSuggestions(3);

    const chartData = activeClassKeys().map(k => {
      const classTotal = classTotalBRL(k);
      const count = portfolio[k].length;
      return {
        key: k, label: CLASS_META[k].label, color: CLASS_META[k].color,
        value: classTotal !== null ? classTotal : count * 0.01,
        count, hasPrices: classTotal !== null, total: classTotal,
      };
    });

    let html = '<div class="overview-grid">';

    // Top 3 sugestões de aporte
    if (suggestions.length > 0) {
      html += '<div class="suggestions-card">';
      html += '<div class="suggestions-title">Sugestões de aporte</div>';
      suggestions.forEach((s, i) => {
        html += `
          <div class="suggestion-row">
            <span class="suggestion-rank ${i === 0 ? 'rank-1' : ''}">${i + 1}</span>
            <span class="suggestion-class">${s.classLabel}</span>
            <span class="suggestion-ticker" style="color:${s.classColor}">${s.id}</span>
            <span class="suggestion-gap">classe ${formatGap(s.classGap)} · ativo ${formatGap(s.assetGap)}</span>
          </div>`;
      });
      html += '</div>';
    }

    // Donut + legend limpa (só valor em BRL)
    html += '<div class="chart-card"><h2>Diversificação</h2>';
    html += renderDonut(chartData);
    html += '<div class="chart-legend">';
    chartData.forEach(d => {
      html += `
        <div class="legend-row" data-goto="${d.key}">
          <span class="legend-dot" style="background:${d.color}"></span>
          <span class="legend-label">${d.label}</span>
          <span class="legend-amount">${d.hasPrices ? formatBRL(d.total) : d.count + ' pos.'}</span>
        </div>`;
    });
    html += '</div></div>';

    // Summary cards com actual% → target%
    html += '<div class="summary-cards">';
    const topTargetClass = suggestions[0]?.classKey;

    activeClassKeys().forEach(key => {
      const meta = CLASS_META[key];
      const classTotal = classTotalBRL(key);
      const actual = classActualPct(key);
      const target = classTargetPct(key);
      const isTarget = key === topTargetClass;

      const barFill = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;
      const aboveTarget = actual !== null && actual >= target;

      let pctHtml = '';
      if (actual !== null) {
        const arrowCls = aboveTarget ? 'above' : 'below';
        const arrowIcon = aboveTarget ? '▲' : '▼';
        pctHtml = `
          <div class="summary-card-pcts">
            <span class="pct-actual" style="color:${meta.color}">${actual.toFixed(1)}%</span>
            <span class="pct-arrow ${arrowCls}">${arrowIcon}</span>
            <span class="pct-target">meta ${target.toFixed(0)}%</span>
          </div>`;
      }

      html += `
        <div class="summary-card ${isTarget ? 'is-target' : ''}" data-class="${key}" data-goto="${key}">
          <div class="summary-card-label">${meta.label}</div>
          <div class="summary-card-value" style="color:${meta.color}">
            ${classTotal !== null ? formatBRL(classTotal) : portfolio[key].length}
          </div>
          ${pctHtml}
          ${target > 0 ? `<div class="target-bar"><div class="target-bar-fill" style="width:${barFill}%;background:${meta.color}"></div></div>` : ''}
        </div>`;
    });
    html += '</div></div>';

    return html;
  }

  function renderAssetPanel(key) {
    const meta = CLASS_META[key];
    const assets = portfolio[key] || [];
    const isUSD = key === 'usStocks' || key === 'usReits';
    const rebalanceTarget = findAssetToRebalance(key);

    let html = `
      <div class="asset-section-header">
        <h2 class="asset-section-title" style="color:${meta.color}">${meta.icon} ${meta.label}</h2>
      </div>
      <div class="edit-target-row">
        <label>Meta da classe:</label>
        <input type="text" value="${classTargetPct(key).toFixed(0)}" data-class-target="${key}" inputmode="decimal">
        <span>% do portfólio</span>
      </div>`;

    if (rebalanceTarget && !editMode) {
      html += `
        <div class="rebalance-hint">
          <span class="rebalance-hint-label">
            Aportar em:
            <strong class="rebalance-hint-ticker" style="color:${meta.color}">${rebalanceTarget.id}</strong>
            (gap ${formatGap(rebalanceTarget.gap)})
          </span>
          <span class="rebalance-hint-value" style="color:${meta.color}">${formatBRL(rebalanceTarget.value)}</span>
        </div>`;
    }

    html += `
      <div class="table-wrap">
      <table class="asset-table">
        <thead><tr>
          <th>Ticker</th>
          <th class="col-r">Qtd</th>
          <th class="col-r">Preço</th>
          <th class="col-r">Var.</th>
          <th class="col-r">Total</th>
        </tr></thead>
        <tbody>`;

    assets.forEach((asset, idx) => {
      const isTarget = rebalanceTarget?.id === asset.id;
      const quarantined = isQuarantined(asset);
      const p = prices[asset.id];
      const value = assetValueBRL(key, asset);

      let priceStr = '', changeHtml = '';
      if (key === 'fixedIncome' || key === 'realEstate') {
        priceStr = 'Declarado';
      } else if (key === 'storeOfValue' && rates.BTCBRL) {
        priceStr = formatBRL(rates.BTCBRL);
      } else if (p) {
        priceStr = (isUSD ? '$ ' : 'R$ ') + p.price.toFixed(2);
        if (p.change !== undefined) {
          const cls = p.change >= 0 ? 'change-up' : 'change-down';
          changeHtml = `<span class="${cls}">${formatGap(p.change).replace('%', '')}%</span>`;
        }
      }

      const rowClass = isTarget ? 'row-target' : quarantined ? 'row-quarantine' : '';
      const badge = isTarget ? '<span class="target-badge">aportar</span>'
                  : quarantined ? '<span class="quarantine-badge">Q</span>' : '';

      html += `
          <tr class="${rowClass}">
            <td class="td-ticker">${asset.id}${badge}</td>
            <td class="td-r view-cell">${formatQty(asset.amount)}</td>
            <td class="td-r edit-cell">
              <input type="text" value="${asset.amount}" data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal">
            </td>
            <td class="td-price">${priceStr}</td>
            <td class="td-change">${changeHtml}</td>
            <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
            <td class="edit-cell" style="width:60px;text-align:right">
              <input type="text" value="${asset.target !== undefined ? asset.target : ''}"
                data-class="${key}" data-idx="${idx}" data-field="target"
                placeholder="auto" style="width:45px" inputmode="decimal" title="Meta % (0=quarentena)">
            </td>
            <td class="edit-cell" style="width:32px">
              <button class="edit-remove-btn" data-class="${key}" data-idx="${idx}" title="Remover">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </td>
          </tr>`;
    });

    html += `
          <tr class="add-row" data-add-class="${key}">
            <td colspan="7">+ Adicionar ativo</td>
          </tr>
        </tbody>
      </table>
      </div>`;

    return html;
  }

  // Event binding

  function bindPanelEvents() {
    $$('[data-goto]', dom.panels).forEach(el =>
      el.addEventListener('click', () => { activeTab = el.dataset.goto; render(); })
    );

    $$('.edit-cell input[data-field="amount"]', dom.panels).forEach(input =>
      input.addEventListener('change', () => {
        const val = parseFloat(input.value.replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
          portfolio[input.dataset.class][parseInt(input.dataset.idx)].amount = val;
          savePortfolio();
        }
      })
    );

    $$('.edit-cell input[data-field="target"]', dom.panels).forEach(input =>
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.idx);
        const raw = input.value.trim();
        if (raw === '') {
          delete portfolio[input.dataset.class][idx].target;
        } else {
          const val = parseFloat(raw.replace(',', '.'));
          if (!isNaN(val) && val >= 0) portfolio[input.dataset.class][idx].target = val;
        }
        savePortfolio();
      })
    );

    $$('input[data-class-target]', dom.panels).forEach(input =>
      input.addEventListener('change', () => {
        const val = parseFloat(input.value.replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
          if (!portfolio.classTargets) portfolio.classTargets = {};
          portfolio.classTargets[input.dataset.classTarget] = val;
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

    $$('.add-row', dom.panels).forEach(row =>
      row.addEventListener('click', () => openAddModal(row.dataset.addClass))
    );
  }

  // Edit mode

  function toggleEditMode() {
    editMode = !editMode;
    updateEditUI();
    if (!editMode) { savePortfolio(); render(); toast('Alterações salvas'); }
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
    dom.newTarget.value = '';
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
      toast(`${ticker} já existe`);
      return;
    }

    const newAsset = { id: ticker, amount };
    const targetRaw = dom.newTarget.value.trim();
    if (targetRaw !== '') {
      const targetVal = parseFloat(targetRaw.replace(',', '.'));
      if (!isNaN(targetVal) && targetVal >= 0) newAsset.target = targetVal;
    }

    if (!portfolio[addTargetClass]) portfolio[addTargetClass] = [];
    portfolio[addTargetClass].push(newAsset);
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
    if (portfolio.classTargets) out.classTargets = portfolio.classTargets;
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

  function importJSON(file) {
    showLoading('Importando carteira...');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!CLASS_KEYS.some(k => Array.isArray(data[k]))) throw new Error('Formato inválido');

        portfolio = data;
        savePortfolio();
        activeTab = 'overview';
        editMode = false;
        render();
        hideLoading();
        toast('Carteira importada');

        if (settings.brapiToken || settings.finnhubToken) fetchAllPrices();
      } catch (err) {
        hideLoading();
        toast('Erro: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // Drag & Drop

  let dragCounter = 0;

  document.addEventListener('dragenter', e => {
    e.preventDefault(); dragCounter++;
    dom.dropZone.classList.add('visible');
  });
  document.addEventListener('dragleave', e => {
    e.preventDefault(); dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dom.dropZone.classList.remove('visible'); }
  });
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault(); dragCounter = 0;
    dom.dropZone.classList.remove('visible');
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.json')) importJSON(file);
    else toast('Apenas arquivos .json');
  });

  // Global event listeners

  dom.btnEdit.addEventListener('click', toggleEditMode);
  dom.btnExport.addEventListener('click', exportJSON);
  dom.btnImport.addEventListener('click', () => dom.fileInput.click());
  dom.btnWelcomeImport.addEventListener('click', () => dom.fileInput.click());
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

  dom.newAmount.addEventListener('keydown', e => { if (e.key === 'Enter') dom.newTarget.focus(); });
  dom.newTarget.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddAsset(); });
  dom.newTicker.addEventListener('keydown', e => { if (e.key === 'Enter') dom.newAmount.focus(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dom.addModal.classList.contains('open')) closeAddModal();
      else if (dom.settingsModal.classList.contains('open')) closeSettings();
      else if (editMode) toggleEditMode();
    }
  });

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
