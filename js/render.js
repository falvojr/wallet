import { CLASS_META, CLASS_KEYS, portfolio, prices, activeTab } from './state.js';
import {
  formatBRL, assetValueBRL, classTotalBRL, portfolioTotalBRL, classTargetPct, classActualPct,
  isQuarantined, allocationWarning, deficientClasses, deficientItems, itemTargetPct, allAssetsWeighted,
} from './calc.js';

const $ = s => document.querySelector(s);
const createIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };
const countLabel = n => `${n} ativo${n !== 1 ? 's' : ''}`;

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function notice(icon, text, variant = 'warning') {
  return `<div class="notice notice--${variant}"><i data-lucide="${icon}" class="notice-icon"></i><span>${text}</span></div>`;
}

function badge(cls, icon, label, title) {
  return ` <span class="badge badge--${cls}" title="${title}"><i data-lucide="${icon}" class="badge-icon"></i>${label}</span>`;
}

const aportarBadge = () => badge('aportar', 'sparkles', 'aportar', 'Maior necessidade de aporte');
const ignorarBadge = () => badge('ignorar', 'circle-pause', 'ignorar', 'Em quarentena');

let sortCol = null;
let sortDir = 'asc';

export function toggleSort(col) {
  if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortCol = col; sortDir = 'asc'; }
}

function tickerUrl(key, id) {
  const p = prices.get(id);
  if ((key === 'brStocks' || key === 'brFiis') && (prices.isBrQuoted(id) || p)) return `https://www.google.com/finance/quote/${encodeURIComponent(id)}:BVMF`;
  if ((key === 'usStocks' || key === 'usReits') && p) return `https://finance.yahoo.com/quote/${encodeURIComponent(id)}`;
  return null;
}

export function render() {
  const has = portfolio.loaded;
  $('#emptyWelcome').hidden = has;
  $('#headerActions').hidden = !has;

  if (!has) { $('#tabNav').innerHTML = ''; $('#panels').innerHTML = ''; createIcons(); return; }

  renderTabs();
  renderPanels();
  createIcons();

  if (activeTab === 'charts') renderBubbleChart();
}

function renderTabs() {
  const tabs = [
    { key: 'overview', label: 'Visão Geral', count: null, hidden: false },
    { key: 'charts', label: 'Gráficos', count: null, hidden: false },
    ...CLASS_KEYS.map(k => ({ key: k, label: CLASS_META[k].label, count: portfolio.items(k).length, hidden: portfolio.isHidden(k) })),
  ];

  $('#tabNav').innerHTML = tabs.map(t => `
    <button class="tab-btn${t.key === activeTab ? ' active' : ''}${t.hidden ? ' tab-hidden' : ''}"
      data-tab="${t.key}" aria-current="${t.key === activeTab ? 'page' : 'false'}">
      ${escapeHtml(t.label)}${t.count !== null ? `<span class="tab-count">${t.count}</span>` : ''}
    </button>`).join('');
}

function renderPanels() {
  const wrap = (key, content) => `<div class="tab-panel${key === activeTab ? ' active' : ''}" data-panel="${key}" role="tabpanel">${content}</div>`;

  $('#panels').innerHTML = wrap('overview', renderOverview()) + wrap('charts', renderChartsTab()) + CLASS_KEYS.map(key => wrap(key, renderClassPanel(key))).join('');
}

function renderOverview() {
  const defClasses = deficientClasses();
  const populated = CLASS_KEYS.filter(k => portfolio.items(k).length > 0);

  const warning = allocationWarning();
  let html = '';
  if (warning) html += notice('triangle-alert', `As metas somam <strong>${warning.sum}%</strong>, mas deveriam totalizar 100%.`);
  if (prices.hasData && prices.stale) html += notice('clock', `Cotações desatualizadas (${prices.dateStr}). Atualize em <strong>Cotar</strong>.`, 'info');
  else if (!prices.hasData) html += notice('clock', 'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.', 'info');

  html += `<div class="summary-cards summary-cards--overview">${populated.filter(k => !portfolio.isHidden(k)).map(k => renderSummaryCard(k, defClasses)).join('')}</div>`;
  return html;
}

function renderChartsTab() {
  const populated = CLASS_KEYS.filter(k => portfolio.items(k).length > 0);
  const chartData = populated.map(k => {
    const hidden = portfolio.isHidden(k), total = classTotalBRL(k), count = portfolio.items(k).length;
    return { key: k, label: CLASS_META[k].label, color: CLASS_META[k].color, value: hidden ? 0 : (total ?? count * 0.01), count, hasPrices: total !== null, total, hidden };
  });

  const { total, partial } = portfolioTotalBRL();
  const headerValue = total > 0 ? formatBRL(total) + (partial ? ' (parcial)' : '') : `${populated.reduce((s, k) => s + portfolio.items(k).length, 0)} ativos`;

  let html = `<div class="chart-fullwidth">
    <div class="chart-header"><span class="chart-header-label">Patrimônio</span><span class="chart-header-value">${headerValue}</span></div>
    <div id="bubbleChart" class="bubble-container"></div>
    <div class="chart-legend-bar">${chartData.map(renderLegendChip).join('')}</div>
  </div>`;
  return html;
}

function renderLegendChip(d) {
  const eye = d.hidden ? 'eye-off' : 'eye';
  const action = d.hidden ? 'Reativar' : 'Ocultar';
  return `<div class="legend-chip${d.hidden ? ' legend-chip--hidden' : ''}">
    <span class="legend-dot" style="background:${d.hidden ? 'var(--text-muted)' : d.color}"></span>
    <span class="legend-chip-label" data-goto="${d.key}">${escapeHtml(d.label)}</span>
    <span class="legend-chip-value">${d.hasPrices ? formatBRL(d.total) : countLabel(d.count)}</span>
    <button class="legend-eye-sm" data-toggle-hidden="${d.key}" title="${action} classe" aria-label="${action} classe ${escapeHtml(d.label)}"><i data-lucide="${eye}"></i></button>
  </div>`;
}

function renderSummaryCard(key, defClasses) {
  const m = CLASS_META[key], total = classTotalBRL(key), actual = classActualPct(key), target = classTargetPct(key);
  const isDef = defClasses.includes(key);
  const pct = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  return `<div class="summary-card" style="--card-color:${m.color}">
    <div class="summary-card-head">
      <span class="summary-card-label" data-goto="${key}"><i data-lucide="${m.icon}" class="summary-icon"></i>${escapeHtml(m.label)}${isDef ? aportarBadge() : ''}</span>
    </div>
    <div class="summary-card-value" data-goto="${key}">${total !== null ? formatBRL(total) : countLabel(portfolio.items(key).length)}</div>
    <div class="summary-card-bar" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
      aria-label="Alocação de ${escapeHtml(m.label)}: ${actual !== null ? actual.toFixed(1) : 0}% de ${target.toFixed(0)}%">
      <div class="summary-card-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="summary-card-meta">
      ${actual !== null ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>` : '<span></span>'}
      <span class="summary-card-target-wrap">meta
        <input class="summary-card-target" type="text" value="${target.toFixed(0)}" data-class-target="${key}" inputmode="decimal" title="Meta da classe (%)" aria-label="Meta de ${escapeHtml(m.label)} (%)">%
      </span>
    </div>
  </div>`;
}

/** Abbreviates a label to fit within a circle of given radius. */
function fitLabel(name, radius) {
  const fontSize = Math.min(radius * 0.45, 14);
  const maxChars = Math.floor((radius * 1.6) / (fontSize * 0.6));
  if (name.length <= maxChars) return name;
  return maxChars >= 3 ? name.slice(0, maxChars - 1) + '…' : name.slice(0, maxChars);
}

/**
 * Renders a D3 circle-packing bubble chart showing every asset sized by portfolio weight.
 * Called after DOM is ready (post-render), uses d3.pack() for layout.
 */
function renderBubbleChart() {
  const container = document.getElementById('bubbleChart');
  if (!container || typeof d3 === 'undefined') return;

  const assets = allAssetsWeighted();
  if (assets.length === 0) { container.innerHTML = '<p class="donut-empty">Sem dados</p>'; return; }

  const { total } = portfolioTotalBRL();
  const width = container.clientWidth || 500;
  const height = Math.max(400, Math.min(width * 0.85, 600));

  const root = d3.hierarchy({ children: assets }).sum(d => d.value);
  d3.pack().size([width, height]).padding(3)(root);

  const svg = d3.select(container).html('').append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', 'Mapa da carteira por tamanho de posição');

  const nodes = svg.selectAll('g').data(root.leaves()).join('g').attr('transform', d => `translate(${d.x},${d.y})`);

  nodes.append('circle').attr('r', d => d.r).attr('fill', d => d.data.color).attr('opacity', 0.8).attr('stroke', d => d.data.color).attr('stroke-opacity', 0.3).attr('stroke-width', 1);

  nodes.append('title').text(d => { const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0'; return `${d.data.id}: ${formatBRL(d.data.value)} (${pct}%)`; });

  nodes.filter(d => d.r > 16).append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('fill', 'var(--text-primary)').attr('font-family', 'var(--font-h)').attr('font-weight', '700')
    .attr('font-size', d => Math.min(d.r * 0.45, 14)).text(d => fitLabel(d.data.id, d.r));

  nodes.filter(d => d.r > 28).append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('dy', d => d.r * 0.35).attr('fill', 'var(--text-secondary)').attr('font-family', 'var(--font-b)')
    .attr('font-size', d => Math.min(d.r * 0.28, 10))
    .text(d => { const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0'; return pct + '%'; });
}

function sortIndicator(col) {
  if (sortCol !== col) return '<i data-lucide="arrow-up-down" class="sort-icon sort-icon--idle"></i>';
  return `<i data-lucide="${sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="sort-icon"></i>`;
}

function sortedItems(key) {
  const items = portfolio.items(key);
  if (!sortCol || items.length < 2) return items.map((item, idx) => ({ item, idx }));

  const indexed = items.map((item, idx) => ({ item, idx }));
  const dir = sortDir === 'asc' ? 1 : -1;

  return indexed.toSorted((a, b) => {
    const ia = a.item, ib = b.item;
    switch (sortCol) {
      case 'name':   return dir * ia.id.localeCompare(ib.id);
      case 'amount': return dir * (ia.amount - ib.amount);
      case 'price':  return dir * ((prices.get(ia.id)?.price ?? 0) - (prices.get(ib.id)?.price ?? 0));
      case 'change': return dir * ((prices.get(ia.id)?.change ?? 0) - (prices.get(ib.id)?.change ?? 0));
      case 'total':  return dir * ((assetValueBRL(key, ia) ?? 0) - (assetValueBRL(key, ib) ?? 0));
      case 'target': return dir * (itemTargetPct(key, ia) - itemTargetPct(key, ib));
      default: return 0;
    }
  });
}

function renderClassPanel(key) {
  const meta = CLASS_META[key], items = portfolio.items(key), hidden = portfolio.isHidden(key);
  let html = `<h2 class="sr-only">${escapeHtml(meta.label)}</h2>`;

  if (hidden) html += notice('eye-off', 'Classe oculta. Valores não contabilizados no patrimônio e sem sugestões de aporte.', 'info');
  if (items.length === 0) {
    return html + `<div class="empty-class"><p>Nenhum ativo nesta classe.</p><button class="btn btn--primary add-to-empty" data-add-class="${key}">+ Adicionar ativo</button></div>`;
  }

  const defItems = hidden ? [] : deficientItems(key);
  const sorted = sortedItems(key);

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      <th data-sort="name" class="sortable">Nome ${sortIndicator('name')}</th>
      <th data-sort="amount" class="col-r sortable">Qtd ${sortIndicator('amount')}</th>
      <th data-sort="price" class="col-r sortable">Preço ${sortIndicator('price')}</th>
      <th data-sort="change" class="col-r sortable">Hoje ${sortIndicator('change')}</th>
      <th data-sort="total" class="col-r sortable">Total ${sortIndicator('total')}</th>
      <th data-sort="target" class="col-r sortable">Meta % ${sortIndicator('target')}</th>
      <th class="col-action"><span class="sr-only">Ações</span></th>
    </tr></thead>
    <tbody>${sorted.map(({ item, idx }) => renderAssetRow(key, item, idx, meta, defItems)).join('')}
      <tr class="add-row" data-add-class="${key}"><td colspan="7">+ Adicionar ativo</td></tr>
    </tbody></table></div>`;
  return html;
}

function renderAssetRow(key, item, idx, meta, defItems) {
  const isDef = defItems.includes(item.id), quarantined = isQuarantined(item);
  const p = prices.get(item.id), value = assetValueBRL(key, item), safeId = escapeHtml(item.id);
  const { priceStr, changeHtml } = formatPriceCell(key, item, p);

  const url = tickerUrl(key, item.id);
  const ticker = url ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${safeId}</a>` : `<span class="ticker-name">${safeId}</span>`;
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const noteTitle = item.note ? escapeHtml(item.note) : 'Adicionar comentário';
  const rowClass = isDef ? 'row-target' : quarantined ? 'row-quarantine' : '';

  return `<tr${rowClass ? ` class="${rowClass}"` : ''}>
    <td class="td-ticker">${ticker}<button class="note-btn${item.note ? ' has-note' : ''}" data-note-class="${key}" data-note-id="${safeId}" title="${noteTitle}" aria-label="Comentário de ${safeId}"><i data-lucide="${noteIcon}"></i></button>${isDef ? aportarBadge() : quarantined ? ignorarBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}" data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal" aria-label="Quantidade de ${safeId}"></td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--target" type="text" value="${item.target !== undefined ? item.target : ''}" data-class="${key}" data-idx="${idx}" data-field="target" placeholder="auto" inputmode="decimal" aria-label="Meta % de ${safeId} na classe" title="Meta do ativo na classe"></td>
    <td class="td-action"><button class="remove-btn" data-class="${key}" data-idx="${idx}" title="Remover ${safeId}" aria-label="Remover ${safeId}"><i data-lucide="x" style="width:12px;height:12px"></i></button></td>
  </tr>`;
}

function formatPriceCell(key, item, p) {
  if (key === 'fixedIncome' || key === 'assets' || (key === 'storeOfValue' && !p)) return { priceStr: 'Declarado', changeHtml: '' };
  if (!p) return { priceStr: '', changeHtml: '' };

  const prefix = p.currency === 'USD' ? '$\u00A0' : 'R$\u00A0';
  const priceStr = prefix + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let changeHtml = '';
  if (p.change !== undefined) {
    const dir = p.change >= 0, label = dir ? 'alta' : 'queda';
    changeHtml = `<span class="${dir ? 'change-up' : 'change-down'}" title="${label} de ${Math.abs(p.change).toFixed(2)}%">${dir ? '+' : ''}${p.change.toFixed(2)}%</span>`;
  }
  return { priceStr, changeHtml };
}
