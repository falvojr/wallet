import {
  CLASS_META, CLASS_KEYS, portfolio, preferences, prices,
  activeTab, classLabel, consumeTabChange,
} from './state.js';
import { t, tn } from './i18n.js';
import {
  formatBRL, assetValueBRL, classTotalBRL, portfolioTotalBRL,
  chartVisibleTotalBRL, classTargetPct, classActualPct,
  isSkippedAsset, isClassInactive, allocationWarning,
  recommendedClasses, recommendedItems, itemTargetPct,
  allAssetsWeighted, emergencyProgress,
} from './calc.js';

const $ = s => document.querySelector(s);
const refreshIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };

function esc(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

// Shared HTML helpers

function notice(icon, text, variant = 'warning') {
  return `<div class="notice notice--${variant}">
    <i data-lucide="${icon}" class="notice-icon"></i><span>${text}</span>
  </div>`;
}

function badge(cls, icon, label, title) {
  return ` <span class="badge badge--${cls}" title="${title}">
    <i data-lucide="${icon}" class="badge-icon"></i>${label}
  </span>`;
}

const investBadge = () => badge('invest', 'sparkles', t('badgeInvest'), t('badgeInvestTitle'));
const skipBadge = () => badge('skip', 'circle-pause', t('badgeSkip'), t('badgeSkipTitle'));

// Sort

export function toggleSort(col) {
  const currentCol = preferences.sortCol;
  const currentDir = preferences.sortDir;
  if (currentCol === col) {
    preferences.setSort(col, currentDir === 'asc' ? 'desc' : 'asc');
  } else {
    preferences.setSort(col, 'asc');
  }
}

function tickerUrl(key, id) {
  const p = prices.get(id);
  if ((key === 'brStocks' || key === 'brFiis') && (prices.isBrQuoted(id) || p))
    return `https://www.google.com/finance/quote/${encodeURIComponent(id)}:BVMF`;
  if ((key === 'usStocks' || key === 'usReits') && p)
    return `https://finance.yahoo.com/quote/${encodeURIComponent(id)}`;
  return null;
}

// Theme-aware class color (reads CSS computed value)

function getClassColor(key) {
  const el = document.querySelector(`[data-goto="${key}"]`);
  if (el) {
    const color = getComputedStyle(el).getPropertyValue('--card-color').trim();
    if (color) return color;
  }
  return CLASS_META[key]?.color ?? '#888';
}


function hexToRgb(color) {
  const match = color.trim().match(/^#([\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function relativeLuminance(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const linear = rgb.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function bubbleTextColor(fill) {
  return relativeLuminance(fill) > 0.42 ? '#11131a' : '#ffffff';
}

function bubbleSubtextColor(fill) {
  return relativeLuminance(fill) > 0.42 ? 'rgba(17,19,26,0.72)' : 'rgba(255,255,255,0.72)';
}

// ---------------------------------------------------------------------------
// Render entry points
// ---------------------------------------------------------------------------

export function render() {
  const has = portfolio.loaded;
  $('#emptyWelcome').hidden = has;
  $('#headerActions').hidden = !has;
  if (!has) { $('#tabNav').innerHTML = ''; $('#panels').innerHTML = ''; refreshIcons(); return; }
  renderTabs();
  renderPanels();
  refreshIcons();
  if (activeTab === 'charts') renderBubbleChart();
}

export function renderOverviewOnly() {
  const panel = $('[data-panel="overview"]');
  if (panel) { panel.innerHTML = renderOverview(); refreshIcons(); }
  renderTabs();
}

export function renderChartOnly() {
  const panel = $('[data-panel="charts"]');
  if (panel) { panel.innerHTML = renderChartsTab(); refreshIcons(); renderBubbleChart(); }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function renderTabs() {
  const order = preferences.displayOrder();

  const fixedTabs = [
    { key: 'overview', label: t('tabOverview'), icon: 'layout-grid' },
    { key: 'charts', label: t('tabPortfolio'), icon: 'pie-chart' },
  ];

  const classTabs = order.map(k => ({
    key: k,
    label: classLabel(k),
    count: portfolio.items(k).length,
    icon: CLASS_META[k].icon,
  }));

  const renderTab = (tab) => {
    const isActive = tab.key === activeTab;
    const countHtml = tab.count != null ? `<span class="tab-count">${tab.count}</span>` : '';
    const iconHtml = isActive ? `<i data-lucide="${tab.icon}" class="tab-icon"></i>` : '';
    return `<button class="tab-btn${isActive ? ' active' : ''}" data-tab="${tab.key}">
      ${iconHtml}${esc(tab.label)}${countHtml}
    </button>`;
  };

  $('#tabNav').innerHTML = fixedTabs.map(renderTab).join('')
    + '<span class="tab-gap" aria-hidden="true"></span>'
    + classTabs.map(renderTab).join('');
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

function renderPanels() {
  const animated = consumeTabChange();
  const wrap = (key, html) => {
    const isActive = key === activeTab;
    const cls = isActive ? (animated ? ' active tab-panel--enter' : ' active') : '';
    return `<div class="tab-panel${cls}" data-panel="${key}">${html}</div>`;
  };
  $('#panels').innerHTML = [
    wrap('overview', renderOverview()),
    wrap('charts', renderChartsTab()),
    ...CLASS_KEYS.map(k => wrap(k, renderClassPanel(k))),
  ].join('');
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function renderOverview() {
  const recommendedClassKeys = recommendedClasses();
  const order = preferences.displayOrder();
  const populated = order.filter(k => portfolio.items(k).length > 0);

  let html = '';
  const warn = allocationWarning();
  if (warn) html += notice('triangle-alert', t('warningTargetSum', warn.sum));
  if (prices.hasData && prices.stale) html += notice('clock', t('infoStale', prices.dateStr), 'info');
  else if (!prices.hasData) html += notice('clock', t('infoNoPrices'), 'info');

  if (portfolio.isEmergencyUnmet()) {
    html += notice('life-buoy', t('emergencyPriority'), 'warning');
  } else if (prices.hasData && recommendedClassKeys.length === 0 && populated.some(k => !isClassInactive(k))) {
    html += notice('check-circle', t('successBalanced'), 'success');
  }

  html += '<div class="summary-cards">';
  html += populated.map((k, i) => renderSummaryCard(k, recommendedClassKeys, i, populated)).join('');
  html += '</div>';
  return html;
}

/**
 * Renders a summary card. All cards share the same template:
 * header (icon + label + badges + order arrows) > value > bar > meta > description.
 */
function renderSummaryCard(key, recommendedClassKeys, idx, orderedKeys) {
  const m = CLASS_META[key];
  const label = classLabel(key);
  const total = classTotalBRL(key);
  const isRecommended = recommendedClassKeys.includes(key);
  const inactive = isClassInactive(key);
  const isEmergency = key === 'emergencyReserve';
  const desc = tn('classDescriptions', key);
  const valueStr = total !== null ? formatBRL(total) : t('assetCount', portfolio.items(key).length);

  // Progress bar
  let pct = 0;
  if (isEmergency) {
    pct = emergencyProgress() ?? 0;
  } else {
    const actual = classActualPct(key);
    const tgt = classTargetPct(key);
    pct = actual !== null && tgt > 0 ? Math.min((actual / tgt) * 100, 100) : 0;
  }

  const metaContent = buildMetaContent(key, label, inactive, isEmergency);
  const cardCls = inactive ? 'summary-card summary-card--inactive' : 'summary-card';

  // Order arrows: up enabled if not first, down if not last
  const isFirst = idx === 0;
  const isLast = idx === orderedKeys.length - 1;
  const prevKey = isFirst ? null : orderedKeys[idx - 1];
  const nextKey = isLast ? null : orderedKeys[idx + 1];

  return `<div class="${cardCls}" data-goto="${key}">
    <div class="summary-card-head">
      <span class="summary-card-label">
        <i data-lucide="${m.icon}" class="summary-icon"></i>
        ${esc(label)}${isRecommended ? investBadge() : ''}
      </span>
      <span class="order-arrows">
        <button class="order-btn${isFirst ? ' order-btn--disabled' : ''}"
          ${prevKey ? `data-order-swap="${key}:${prevKey}"` : 'disabled'}
          aria-label="${t('a11yMoveUp')}"><i data-lucide="chevron-up"></i></button>
        <button class="order-btn${isLast ? ' order-btn--disabled' : ''}"
          ${nextKey ? `data-order-swap="${key}:${nextKey}"` : 'disabled'}
          aria-label="${t('a11yMoveDown')}"><i data-lucide="chevron-down"></i></button>
      </span>
    </div>
    <div class="summary-card-value">${valueStr}</div>
    <div class="summary-card-bar">
      <div class="summary-card-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="summary-card-meta">${metaContent}</div>
    <p class="summary-card-desc">${esc(desc)}</p>
  </div>`;
}

function buildMetaContent(key, label, inactive, isEmergency) {
  if (isEmergency) {
    const prog = emergencyProgress();
    const goal = portfolio.goal('emergencyReserve');
    const left = prog !== null
      ? `<span class="summary-card-actual">${prog.toFixed(1)}%</span>`
      : '<span></span>';
    return left + `<div class="summary-card-target-chip">
      <span class="target-chip-label">${t('goalLabel')}</span>
      <span class="target-chip-unit">R$</span>
      <input class="target-chip-input target-chip-input--wide" type="text"
        value="${goal > 0 ? Math.round(goal) : ''}" data-class-goal="emergencyReserve"
        placeholder="0" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yGoalClass', esc(label))}">
    </div>`;
  }

  if (!inactive) {
    const actual = classActualPct(key);
    const tgt = classTargetPct(key);
    const left = actual !== null
      ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>`
      : '<span></span>';
    return left + `<div class="summary-card-target-chip">
      <span class="target-chip-label">${t('metaLabel')}</span>
      <input class="target-chip-input" type="text" value="${tgt.toFixed(0)}"
        data-class-target="${key}" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yTargetClass', esc(label))}">
      <span class="target-chip-unit">%</span>
    </div>`;
  }

  // Inactive (target = 0)
  return `<span class="summary-card-inactive-hint">${t('inactiveClassHint')}</span>
    <div class="summary-card-target-chip">
      <span class="target-chip-label">${t('metaLabel')}</span>
      <input class="target-chip-input" type="text" value="0"
        data-class-target="${key}" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yTargetClass', esc(label))}">
      <span class="target-chip-unit">%</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

function renderChartsTab() {
  const order = preferences.displayOrder();
  const populated = order.filter(k => portfolio.items(k).length > 0);
  const data = populated.map(k => ({
    key: k,
    label: classLabel(k),
    count: portfolio.items(k).length,
    hasPrices: classTotalBRL(k) !== null,
    total: classTotalBRL(k),
    hidden: preferences.isChartHidden(k),
  }));

  const { total, partial } = chartVisibleTotalBRL();
  const headerVal = total > 0
    ? formatBRL(total) + (partial ? ` ${t('partialSuffix')}` : '')
    : t('assetCount', populated.reduce((s, k) => s + portfolio.items(k).length, 0));

  return `<div class="chart-header">
    <span class="chart-header-label">${t('portfolioLabel')}</span>
    <span class="chart-header-value">${headerVal}</span>
  </div>
  <div class="chart-layout">
    <div class="chart-legend-sidebar">${data.map(renderLegendItem).join('')}</div>
    <div class="bubble-stage">
      <div id="bubbleChart" class="bubble-container"></div>
    </div>
  </div>`;
}

function renderLegendItem(d) {
  const hiddenCls = d.hidden ? ' legend-item--hidden' : '';
  const strikeCls = d.hidden ? ' legend-strike' : '';
  const valText = d.hasPrices ? formatBRL(d.total) : t('assetCount', d.count);

  return `<div class="legend-item${hiddenCls}" data-toggle-chart="${d.key}" data-goto="${d.key}"
    title="${t('a11yToggleChart', d.label, !d.hidden)}">
    <span class="legend-dot"></span>
    <div class="legend-item-text">
      <span class="legend-item-label${strikeCls}">${esc(d.label)}</span>
      <span class="legend-item-value${strikeCls}">${valText}</span>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Bubble chart
// ---------------------------------------------------------------------------

function fitLabel(name, r) {
  const fontSize = Math.min(r * 0.45, 14);
  const maxChars = Math.floor((r * 1.6) / (fontSize * 0.6));
  return name.length <= maxChars ? name : (maxChars >= 3 ? name.slice(0, maxChars - 1) + '…' : name.slice(0, maxChars));
}

function renderBubbleChart() {
  const el = document.getElementById('bubbleChart');
  if (!el || typeof d3 === 'undefined') return;

  const assets = allAssetsWeighted();
  if (!assets.length) { el.innerHTML = `<p class="donut-empty">${t('noData')}</p>`; return; }

  // Resolve theme-aware colors
  const colorMap = {};
  assets.forEach(a => { colorMap[a.classKey] ??= getClassColor(a.classKey); });

  const vTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
  const width = el.clientWidth || 600;
  const height = el.clientHeight || width;
  const size = Math.max(280, Math.floor(Math.min(width, height)));
  const padding = size < 380 ? 2.5 : size < 560 ? 3 : 4;
  const pctOf = d => vTotal > 0 ? ((d.data.value / vTotal) * 100).toFixed(1) : '0';
  const color = d => colorMap[d.data.classKey];
  const labelColor = d => bubbleTextColor(color(d));
  const sublabelColor = d => bubbleSubtextColor(color(d));

  const root = d3.hierarchy({ children: assets }).sum(d => d.value);
  d3.pack().size([size, size]).padding(padding)(root);

  const svg = d3.select(el).html('')
    .append('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', t('a11yBubbleChart'));

  const nodes = svg.selectAll('g').data(root.leaves()).join('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  nodes.append('circle').attr('r', d => d.r)
    .attr('fill', color).attr('opacity', 0.82)
    .attr('stroke', color).attr('stroke-opacity', 0.25).attr('stroke-width', 1.5)
    .style('cursor', 'pointer').style('transition', 'opacity 200ms, stroke-width 200ms')
    .on('mouseenter', function () { d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5).attr('stroke-opacity', 0.5); })
    .on('mouseleave', function () { d3.select(this).attr('opacity', 0.82).attr('stroke-width', 1.5).attr('stroke-opacity', 0.25); });

  nodes.append('title').text(d => `${d.data.id}: ${formatBRL(d.data.value)} (${pctOf(d)}%)`);

  nodes.on('click', (_e, d) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `${d.data.id}: ${formatBRL(d.data.value)} (${pctOf(d)}%)`;
    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  });

  nodes.filter(d => d.r > 16).append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('fill', d => labelColor(d)).attr('font-family', 'var(--font-h)').attr('font-weight', '700')
    .attr('font-size', d => Math.min(d.r * 0.42, size < 420 ? 12 : 14))
    .text(d => fitLabel(d.data.id, d.r)).style('pointer-events', 'none');

  nodes.filter(d => d.r > 28).append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('dy', d => d.r * 0.35).attr('fill', d => sublabelColor(d))
    .attr('font-family', 'var(--font-b)').attr('font-size', d => Math.min(d.r * 0.24, size < 420 ? 9 : 10))
    .text(d => pctOf(d) + '%').style('pointer-events', 'none');
}

// ---------------------------------------------------------------------------
// Asset table
// ---------------------------------------------------------------------------

function sortIndicator(col) {
  if (preferences.sortCol !== col) return '<i data-lucide="arrow-up-down" class="sort-icon sort-icon--idle"></i>';
  return `<i data-lucide="${preferences.sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="sort-icon"></i>`;
}

function sortedItems(key) {
  const items = portfolio.items(key);
  const col = preferences.sortCol;
  if (!col || items.length < 2) return items.map((item, idx) => ({ item, idx }));
  const dir = preferences.sortDir === 'asc' ? 1 : -1;
  return items.map((item, idx) => ({ item, idx })).toSorted((a, b) => {
    const [ia, ib] = [a.item, b.item];
    switch (col) {
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

  let html = `<h2 class="sr-only">${esc(label)}</h2>`;

  if (!items.length) {
    return html + `<div class="empty-class">
      <p>${t('emptyClass')}</p>
      <button class="btn btn--filled add-to-empty" data-add-class="${key}">${t('addAsset')}</button>
    </div>`;
  }

  const recommendedAssetIds = recommendedItems(key);
  const sorted = sortedItems(key);

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      <th data-sort="name" class="sortable">${t('colName')} ${sortIndicator('name')}</th>
      <th data-sort="amount" class="col-r sortable">${t('colAmount')} ${sortIndicator('amount')}</th>
      <th data-sort="price" class="col-r sortable">${t('colPrice')} ${sortIndicator('price')}</th>
      <th data-sort="change" class="col-r sortable">${t('colChange')} ${sortIndicator('change')}</th>
      <th data-sort="total" class="col-r sortable">${t('colTotal')} ${sortIndicator('total')}</th>
      <th data-sort="target" class="col-r sortable">${t('colTarget')} ${sortIndicator('target')}</th>
      <th class="col-actions"><span class="sr-only">${t('colActionsA11y')}</span></th>
    </tr></thead>
    <tbody>
      ${sorted.map(({ item, idx }) => renderAssetRow(key, item, idx, recommendedAssetIds)).join('')}
      <tr class="add-row" data-add-class="${key}"><td colspan="7">${t('addAsset')}</td></tr>
    </tbody>
  </table></div>`;
  return html;
}

function renderAssetRow(key, item, idx, recommendedAssetIds) {
  const isRecommended = recommendedAssetIds.includes(item.id);
  const isSkipped = isSkippedAsset(item);
  const p = prices.get(item.id);
  const val = assetValueBRL(key, item);
  const id = esc(item.id);
  const url = tickerUrl(key, item.id);
  const ticker = url
    ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${id}</a>`
    : `<span class="ticker-name">${id}</span>`;
  const { priceStr, changeHtml } = fmtPrice(key, item, p);
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const noteTitle = item.note ? esc(item.note) : t('a11yAddNote');
  const rowCls = isRecommended ? ' class="row-target"' : isSkipped ? ' class="row-skipped"' : '';

  return `<tr${rowCls}>
    <td class="td-ticker">${ticker}${isRecommended ? investBadge() : isSkipped ? skipBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}"
      data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal" autocomplete="off"
      aria-label="${t('a11yAmountOf', id)}"></td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" data-goto="${key}">${val !== null ? formatBRL(val) : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--target" type="text"
      value="${item.target !== undefined ? item.target : ''}"
      data-class="${key}" data-idx="${idx}" data-field="target"
      placeholder="${t('targetPlaceholder')}" inputmode="decimal" autocomplete="off"
      aria-label="${t('a11yTargetOf', id)}"></td>
    <td class="td-actions">
      <button class="icon-btn icon-btn--ghost note-btn${item.note ? ' has-note' : ''}"
        data-note-class="${key}" data-note-id="${id}" title="${noteTitle}"
        aria-label="${t('a11yNote', id)}"><i data-lucide="${noteIcon}"></i></button>
      <button class="icon-btn icon-btn--ghost remove-btn" data-class="${key}" data-idx="${idx}"
        title="${t('a11yRemove', id)}" aria-label="${t('a11yRemove', id)}">
        <i data-lucide="trash-2"></i></button>
    </td>
  </tr>`;
}

function fmtPrice(key, item, p) {
  const declared = ['fixedIncome', 'assets', 'emergencyReserve'];
  if (declared.includes(key) || (key === 'storeOfValue' && !p))
    return { priceStr: t('declaredPrice'), changeHtml: '' };
  if (!p) return { priceStr: '', changeHtml: '' };
  const prefix = p.currency === 'USD' ? '$\u00A0' : 'R$\u00A0';
  const priceStr = prefix + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p.change === undefined) return { priceStr, changeHtml: '' };
  const up = p.change >= 0;
  return {
    priceStr,
    changeHtml: `<span class="quote-chip ${up ? 'quote-chip--up' : 'quote-chip--down'}">${up ? '+' : ''}${p.change.toFixed(2)}%</span>`,
  };
}
