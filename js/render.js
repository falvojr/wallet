import { CLASS_META, CLASS_KEYS, portfolio, prices, activeTab, classLabel } from './state.js';
import { t, tn } from './i18n.js';
import {
  formatBRL, assetValueBRL, classTotalBRL, portfolioTotalBRL, classTargetPct, classActualPct,
  isQuarantined, isClassInactive, allocationWarning, deficientClasses, deficientItems, itemTargetPct, allAssetsWeighted,
} from './calc.js';

const $ = s => document.querySelector(s);
const createIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };

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

const aportarBadge = () => badge('aportar', 'sparkles', t('badgeAportar'), t('badgeAportarTitle'));
const ignorarBadge = () => badge('ignorar', 'circle-pause', t('badgeIgnorar'), t('badgeIgnorarTitle'));

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
    { key: 'overview', label: t('tabOverview'), count: null },
    { key: 'charts', label: t('tabPortfolio'), count: null },
    { key: '_sep' },
    ...CLASS_KEYS.map(k => ({
      key: k,
      label: classLabel(k),
      count: portfolio.items(k).length,
      inactive: isClassInactive(k),
    })),
  ];

  $('#tabNav').innerHTML = tabs.map(tab => {
    if (tab.key === '_sep') return '<span class="tab-sep" aria-hidden="true"></span>';
    const cls = tab.inactive ? ' tab-inactive' : '';
    return `<button class="tab-btn${tab.key === activeTab ? ' active' : ''}${cls}"
      data-tab="${tab.key}" aria-current="${tab.key === activeTab ? 'page' : 'false'}">
      ${escapeHtml(tab.label)}${tab.count !== null ? `<span class="tab-count">${tab.count}</span>` : ''}
    </button>`;
  }).join('');
}

function renderPanels() {
  const wrap = (key, content) =>
    `<div class="tab-panel${key === activeTab ? ' active' : ''}" data-panel="${key}" role="tabpanel">${content}</div>`;

  $('#panels').innerHTML =
    wrap('overview', renderOverview()) +
    wrap('charts', renderChartsTab()) +
    CLASS_KEYS.map(key => wrap(key, renderClassPanel(key))).join('');
}

/* ── Overview ──────────────────────────────────────────────── */

function renderOverview() {
  const defClasses = deficientClasses();
  const populated = CLASS_KEYS.filter(k => portfolio.items(k).length > 0);

  const warning = allocationWarning();
  let html = '';
  if (warning) html += notice('triangle-alert', t('warningTargetSum', warning.sum));
  if (prices.hasData && prices.stale) html += notice('clock', t('infoStale', prices.dateStr), 'info');
  else if (!prices.hasData) html += notice('clock', t('infoNoPrices'), 'info');

  if (prices.hasData && defClasses.length === 0 && populated.filter(k => !isClassInactive(k)).length > 0) {
    html += notice('check-circle', t('successBalanced'), 'success');
  }

  /* Single unified grid — inactive cards (target=0) are styled differently via CSS */
  html += `<div class="summary-cards">${populated.map(k => renderSummaryCard(k, defClasses)).join('')}</div>`;
  return html;
}

function renderSummaryCard(key, defClasses) {
  const m = CLASS_META[key];
  const label = classLabel(key);
  const total = classTotalBRL(key);
  const actual = classActualPct(key);
  const target = classTargetPct(key);
  const isDef = defClasses.includes(key);
  const inactive = isClassInactive(key);
  const pct = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const description = tn('classDescription', key);
  const valueStr = total !== null ? formatBRL(total) : t('assetCount', portfolio.items(key).length);

  const cardClass = inactive ? 'summary-card summary-card--inactive' : 'summary-card';

  let metaSection;
  if (!inactive) {
    metaSection = `
      <div class="summary-card-bar" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
        aria-label="${t('a11yAllocation', escapeHtml(label), actual !== null ? actual.toFixed(1) : '0', target.toFixed(0))}">
        <div class="summary-card-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="summary-card-meta">
        ${actual !== null ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>` : '<span></span>'}
        <div class="summary-card-target-chip">
          <span class="target-chip-label">${t('metaLabel')}</span>
          <input class="target-chip-input" type="text" value="${target.toFixed(0)}" data-class-target="${key}"
            inputmode="decimal" title="${t('targetLabel')}" aria-label="${t('a11yTargetClass', escapeHtml(label))}">
          <span class="target-chip-unit">%</span>
        </div>
      </div>`;
  } else {
    metaSection = `
      <div class="summary-card-meta summary-card-meta--inactive">
        <span class="summary-card-inactive-hint">${t('disabledClassHint')}</span>
        <div class="summary-card-target-chip summary-card-target-chip--inactive">
          <span class="target-chip-label">${t('metaLabel')}</span>
          <input class="target-chip-input" type="text" value="0" data-class-target="${key}"
            inputmode="decimal" title="${t('targetLabel')}" aria-label="${t('a11yTargetClass', escapeHtml(label))}">
          <span class="target-chip-unit">%</span>
        </div>
      </div>`;
  }

  return `<div class="${cardClass}" data-goto="${key}" style="--card-color:${m.color}">
    <div class="summary-card-head">
      <span class="summary-card-label"><i data-lucide="${m.icon}" class="summary-icon"></i>${escapeHtml(label)}${isDef ? aportarBadge() : ''}</span>
    </div>
    <div class="summary-card-value">${valueStr}</div>
    ${metaSection}
    <p class="summary-card-desc">${escapeHtml(description)}</p>
  </div>`;
}

/* ── Carteira / Charts ─────────────────────────────────────── */

function renderChartsTab() {
  const populated = CLASS_KEYS.filter(k => portfolio.items(k).length > 0);
  const chartData = populated.map(k => {
    const total = classTotalBRL(k), count = portfolio.items(k).length;
    return {
      key: k, label: classLabel(k), color: CLASS_META[k].color,
      value: total ?? count * 0.01, count, hasPrices: total !== null, total,
    };
  });

  const { total, partial } = portfolioTotalBRL();
  const headerValue = total > 0
    ? formatBRL(total) + (partial ? ` ${t('partialSuffix')}` : '')
    : t('assetCount', populated.reduce((s, k) => s + portfolio.items(k).length, 0));

  return `<div class="chart-fullwidth">
    <div class="chart-header">
      <span class="chart-header-label">${t('portfolioLabel')}</span>
      <span class="chart-header-value">${headerValue}</span>
    </div>
    <div class="chart-layout">
      <div class="chart-legend-sidebar">${chartData.map(renderLegendItem).join('')}</div>
      <div id="bubbleChart" class="bubble-container"></div>
    </div>
  </div>`;
}

function renderLegendItem(d) {
  return `<div class="legend-item" data-goto="${d.key}">
    <span class="legend-dot" style="background:${d.color}"></span>
    <div class="legend-item-text">
      <span class="legend-item-label">${escapeHtml(d.label)}</span>
      <span class="legend-item-value">${d.hasPrices ? formatBRL(d.total) : t('assetCount', d.count)}</span>
    </div>
  </div>`;
}

/* ── Bubble chart ──────────────────────────────────────────── */

function fitLabel(name, radius) {
  const fontSize = Math.min(radius * 0.45, 14);
  const maxChars = Math.floor((radius * 1.6) / (fontSize * 0.6));
  if (name.length <= maxChars) return name;
  return maxChars >= 3 ? name.slice(0, maxChars - 1) + '…' : name.slice(0, maxChars);
}

function bubbleToast(id, value, pct) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = `${id}: ${formatBRL(value)} (${pct}%)`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function renderBubbleChart() {
  const container = document.getElementById('bubbleChart');
  if (!container || typeof d3 === 'undefined') return;

  const assets = allAssetsWeighted();
  if (assets.length === 0) { container.innerHTML = `<p class="donut-empty">${t('noData')}</p>`; return; }

  const { total } = portfolioTotalBRL();
  const width = container.clientWidth || 500;
  const height = Math.max(400, Math.min(width * 0.9, 620));

  const root = d3.hierarchy({ children: assets }).sum(d => d.value);
  d3.pack().size([width, height]).padding(3)(root);

  const svg = d3.select(container).html('')
    .append('svg').attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img').attr('aria-label', t('a11yBubbleChart'));

  const nodes = svg.selectAll('g').data(root.leaves()).join('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  nodes.append('circle').attr('r', d => d.r)
    .attr('fill', d => d.data.color).attr('opacity', 0.82)
    .attr('stroke', d => d.data.color).attr('stroke-opacity', 0.25).attr('stroke-width', 1.5)
    .style('cursor', 'pointer').style('transition', 'opacity 200ms, stroke-width 200ms')
    .on('mouseenter', function () { d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5).attr('stroke-opacity', 0.5); })
    .on('mouseleave', function () { d3.select(this).attr('opacity', 0.82).attr('stroke-width', 1.5).attr('stroke-opacity', 0.25); });

  nodes.append('title').text(d => {
    const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0';
    return `${d.data.id}: ${formatBRL(d.data.value)} (${pct}%)`;
  });

  nodes.on('click', (_event, d) => {
    const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0';
    bubbleToast(d.data.id, d.data.value, pct);
  });

  nodes.filter(d => d.r > 16).append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('fill', '#fff').attr('font-family', 'var(--font-h)').attr('font-weight', '700')
    .attr('font-size', d => Math.min(d.r * 0.45, 14))
    .text(d => fitLabel(d.data.id, d.r)).style('pointer-events', 'none');

  nodes.filter(d => d.r > 28).append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('dy', d => d.r * 0.35).attr('fill', 'rgba(255,255,255,0.65)')
    .attr('font-family', 'var(--font-b)').attr('font-size', d => Math.min(d.r * 0.28, 10))
    .text(d => { const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0'; return pct + '%'; })
    .style('pointer-events', 'none');
}

/* ── Asset table ───────────────────────────────────────────── */

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
  const label = classLabel(key);
  const items = portfolio.items(key);
  const inactive = isClassInactive(key);

  let html = `<h2 class="sr-only">${escapeHtml(label)}</h2>`;

  if (inactive) html += notice('info', t('disabledClassHint'), 'info');
  if (items.length === 0) {
    return html + `<div class="empty-class"><p>${t('emptyClass')}</p><button class="btn btn--filled add-to-empty" data-add-class="${key}">${t('addAsset')}</button></div>`;
  }

  const defItems = inactive ? [] : deficientItems(key);
  const sorted = sortedItems(key);

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      <th data-sort="name" class="sortable">${t('colName')} ${sortIndicator('name')}</th>
      <th data-sort="amount" class="col-r sortable">${t('colAmount')} ${sortIndicator('amount')}</th>
      <th data-sort="price" class="col-r sortable">${t('colPrice')} ${sortIndicator('price')}</th>
      <th data-sort="change" class="col-r sortable">${t('colChange')} ${sortIndicator('change')}</th>
      <th data-sort="total" class="col-r sortable">${t('colTotal')} ${sortIndicator('total')}</th>
      <th data-sort="target" class="col-r sortable">${t('colTarget')} ${sortIndicator('target')}</th>
      <th class="col-action"><span class="sr-only">${t('colActions')}</span></th>
    </tr></thead>
    <tbody>${sorted.map(({ item, idx }) => renderAssetRow(key, item, idx, defItems)).join('')}
      <tr class="add-row" data-add-class="${key}"><td colspan="7">${t('addAsset')}</td></tr>
    </tbody></table></div>`;
  return html;
}

function renderAssetRow(key, item, idx, defItems) {
  const meta = CLASS_META[key];
  const isDef = defItems.includes(item.id), quarantined = isQuarantined(item);
  const p = prices.get(item.id), value = assetValueBRL(key, item), safeId = escapeHtml(item.id);
  const { priceStr, changeHtml } = formatPriceCell(key, item, p);

  const url = tickerUrl(key, item.id);
  const ticker = url ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${safeId}</a>` : `<span class="ticker-name">${safeId}</span>`;
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const noteTitle = item.note ? escapeHtml(item.note) : t('a11yAddNote');
  const rowClass = isDef ? 'row-target' : quarantined ? 'row-quarantine' : '';

  return `<tr${rowClass ? ` class="${rowClass}"` : ''}>
    <td class="td-ticker">${ticker}<button class="icon-btn icon-btn--ghost note-btn${item.note ? ' has-note' : ''}" data-note-class="${key}" data-note-id="${safeId}" title="${noteTitle}" aria-label="${t('a11yNote', safeId)}"><i data-lucide="${noteIcon}"></i></button>${isDef ? aportarBadge() : quarantined ? ignorarBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}" data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal" aria-label="${t('a11yAmountOf', safeId)}"></td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--target" type="text" value="${item.target !== undefined ? item.target : ''}" data-class="${key}" data-idx="${idx}" data-field="target" placeholder="${t('targetPlaceholder')}" inputmode="decimal" aria-label="${t('a11yTargetOf', safeId)}" title="${t('a11yTargetTitle')}"></td>
    <td class="td-action"><button class="icon-btn icon-btn--ghost remove-btn" data-class="${key}" data-idx="${idx}" title="${t('a11yRemove', safeId)}" aria-label="${t('a11yRemove', safeId)}"><i data-lucide="x" style="width:14px;height:14px"></i></button></td>
  </tr>`;
}

function formatPriceCell(key, item, p) {
  if (key === 'fixedIncome' || key === 'assets' || key === 'emergencyReserve' || (key === 'storeOfValue' && !p)) {
    return { priceStr: t('declaredPrice'), changeHtml: '' };
  }
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
