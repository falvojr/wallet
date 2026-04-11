import {
  CLASS_META, CLASS_KEYS, DECLARED_CLASSES,
  portfolio, preferences, prices,
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

const $ = selector => document.querySelector(selector);
const refreshIcons = () => typeof lucide !== 'undefined' && lucide.createIcons();

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(str) {
  return String(str).replace(/[&<>"']/g, ch => ESC_MAP[ch]);
}

function notice(icon, text, variant = 'warning') {
  return `<div class="notice notice--${variant}" role="status">
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

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export function toggleSort(col) {
  if (preferences.sortCol === col) {
    preferences.setSort(col, preferences.sortDir === 'asc' ? 'desc' : 'asc');
  } else {
    preferences.setSort(col, 'asc');
  }
}

function tickerUrl(key, id) {
  const slug = encodeURIComponent(id.toLowerCase());
  switch (key) {
    case 'brStocks': return `https://fundamentei.com/br/${slug}`;
    case 'brFiis':   return `https://fundamentei.com/fiis/${slug}`;
    case 'usStocks':
    case 'usReits':  return `https://fundamentei.com/us/${slug}`;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Theme-aware class color
// ---------------------------------------------------------------------------

function getClassColor(key) {
  const element = document.querySelector(`[data-goto="${key}"]`);
  if (element) {
    const color = getComputedStyle(element).getPropertyValue('--card-color').trim();
    if (color) return color;
  }
  return '#888';
}

function relativeLuminance(color) {
  const match = color.trim().match(/^#([\da-f]{6})$/i);
  if (!match) return 0;
  const rgb = [0, 2, 4].map(i => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

const isLightColor = color => relativeLuminance(color) > 0.42;
const bubbleTextColor = fill => isLightColor(fill) ? '#11131a' : '#ffffff';
const bubbleSubtextColor = fill => isLightColor(fill) ? 'rgba(17,19,26,0.72)' : 'rgba(255,255,255,0.72)';

// ---------------------------------------------------------------------------
// Render entry points
// ---------------------------------------------------------------------------

export function render() {
  const hasData = portfolio.loaded;
  $('#emptyWelcome').hidden = hasData;
  $('#headerActions').hidden = !hasData;

  if (!hasData) {
    $('#tabNav').innerHTML = '';
    $('#panels').innerHTML = '';
    refreshIcons();
    return;
  }

  renderTabs();
  renderPanels();
  refreshIcons();
  if (activeTab === 'charts') renderBubbleChart();
}

export function renderOverviewOnly() {
  const panel = $('[data-panel="overview"]');
  if (panel) {
    panel.innerHTML = renderOverview();
    refreshIcons();
  }
  renderTabs();
}

export function renderChartOnly() {
  const panel = $('[data-panel="charts"]');
  if (panel) {
    panel.innerHTML = renderChartsTab();
    refreshIcons();
    renderBubbleChart();
  }
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

  const classTabs = order.map(key => ({
    key,
    label: classLabel(key),
    count: portfolio.items(key).filter(item => !isSkippedAsset(item)).length,
    icon: CLASS_META[key].icon,
  }));

  const renderTab = tab => {
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
    ...CLASS_KEYS.map(key => wrap(key, renderClassPanel(key))),
  ].join('');
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function renderOverview() {
  const recommended = recommendedClasses();
  const order = preferences.displayOrder();
  let html = '';

  const warn = allocationWarning();
  if (warn) html += notice('triangle-alert', t('warningTargetSum', warn.sum));

  if (prices.hasData && prices.stale) {
    html += notice('clock', t('infoStale', prices.dateStr), 'info');
  } else if (!prices.hasData) {
    html += notice('clock', t('infoNoPrices'), 'info');
  }

  if (portfolio.isEmergencyUnmet()) {
    html += notice('life-buoy', t('emergencyPriority'), 'warning');
  } else if (prices.hasData && recommended.length === 0 && order.some(k => !isClassInactive(k))) {
    html += notice('check-circle', t('successBalanced'), 'success');
  }

  html += '<div class="summary-cards">';
  html += order.map((key, i) => renderSummaryCard(key, recommended, i, order)).join('');
  html += '</div>';
  return html;
}

function renderSummaryCard(key, recommended, index, orderedKeys) {
  const meta = CLASS_META[key];
  const label = classLabel(key);
  const total = classTotalBRL(key);
  const isRecommended = recommended.includes(key);
  const isEmergency = key === 'emergencyReserve';
  const inactive = isClassInactive(key) || (isEmergency && portfolio.goal('emergencyReserve') <= 0);
  const description = tn('classDescriptions', key);
  const valueStr = total !== null ? formatBRL(total) : t('assetCount', portfolio.items(key).length);

  let progress = 0;
  if (isEmergency) {
    progress = emergencyProgress() ?? 0;
  } else {
    const actual = classActualPct(key);
    const target = classTargetPct(key);
    progress = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  }

  const metaContent = buildMetaContent(key, label, inactive, isEmergency);
  const cardCls = inactive ? 'summary-card summary-card--inactive' : 'summary-card';

  const isFirst = index === 0;
  const isLast = index === orderedKeys.length - 1;
  const prevKey = isFirst ? null : orderedKeys[index - 1];
  const nextKey = isLast ? null : orderedKeys[index + 1];

  return `<div class="${cardCls}" data-goto="${key}">
    <div class="summary-card-head">
      <span class="summary-card-label">
        <i data-lucide="${meta.icon}" class="summary-icon"></i>
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
      <div class="summary-card-bar-fill" style="width:${progress}%"></div>
    </div>
    <div class="summary-card-meta">${metaContent}</div>
    <p class="summary-card-desc">${esc(description)}</p>
  </div>`;
}

function buildMetaContent(key, label, inactive, isEmergency) {
  if (isEmergency) {
    const prog = emergencyProgress();
    const goal = portfolio.goal('emergencyReserve');
    const left = goal > 0 && prog !== null
      ? `<span class="summary-card-actual">${prog.toFixed(1)}%</span>`
      : `<span class="summary-card-inactive-hint">${t('inactiveClassHint')}</span>`;
    return left + `<label class="summary-card-target-chip">
      <span class="target-chip-label">${t('goalLabel')}</span>
      <span class="target-chip-unit">R$</span>
      <input class="target-chip-input target-chip-input--wide" type="text"
        value="${Math.round(goal)}" data-class-goal="emergencyReserve"
        inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yGoalClass', esc(label))}">
    </label>`;
  }

  if (!inactive) {
    const actual = classActualPct(key);
    const target = classTargetPct(key);
    return `<span class="summary-card-actual">${(actual ?? 0).toFixed(1)}%</span>
    <label class="summary-card-target-chip">
      <span class="target-chip-label">${t('metaLabel')}</span>
      <input class="target-chip-input" type="text" value="${target.toFixed(0)}"
        data-class-target="${key}" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yTargetClass', esc(label))}">
      <span class="target-chip-unit">%</span>
    </label>`;
  }

  return `<span class="summary-card-inactive-hint">${t('inactiveClassHint')}</span>
    <label class="summary-card-target-chip">
      <span class="target-chip-label">${t('metaLabel')}</span>
      <input class="target-chip-input" type="text" value="0"
        data-class-target="${key}" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yTargetClass', esc(label))}">
      <span class="target-chip-unit">%</span>
    </label>`;
}

// ---------------------------------------------------------------------------
// Charts tab
// ---------------------------------------------------------------------------

function renderChartsTab() {
  const order = preferences.displayOrder();
  const data = order.map(key => ({
    key,
    label: classLabel(key),
    count: portfolio.items(key).length,
    hasPrices: classTotalBRL(key) !== null,
    total: classTotalBRL(key),
    hidden: preferences.isChartHidden(key),
  }));

  const { total, partial } = chartVisibleTotalBRL();
  const headerVal = total > 0
    ? formatBRL(total) + (partial ? ` ${t('partialSuffix')}` : '')
    : t('assetCount', order.reduce((sum, key) => sum + portfolio.items(key).length, 0));

  return `<div class="chart-layout">
    <div class="chart-sidebar">
      <div class="chart-header">
        <span class="chart-header-label">${t('portfolioLabel')}</span>
        <span class="chart-header-value">${headerVal}</span>
      </div>
      <div class="chart-legend-grid">${data.map(renderLegendItem).join('')}</div>
    </div>
    <div class="bubble-stage">
      <div id="bubbleChart" class="bubble-container"></div>
    </div>
  </div>`;
}

function renderLegendItem(item) {
  const hiddenCls = item.hidden ? ' legend-item--hidden' : '';
  const strikeCls = item.hidden ? ' legend-strike' : '';
  const valueText = item.hasPrices ? formatBRL(item.total) : t('assetCount', item.count);

  return `<div class="legend-item${hiddenCls}" data-toggle-chart="${item.key}" data-goto="${item.key}"
    title="${t('a11yToggleChart', item.label, !item.hidden)}">
    <span class="legend-dot"></span>
    <div class="legend-item-text">
      <span class="legend-item-label${strikeCls}">${esc(item.label)}</span>
      <span class="legend-item-value${strikeCls}">${valueText}</span>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Bubble chart (rectangular layout)
// ---------------------------------------------------------------------------

function fitLabel(name, radius) {
  const fontSize = Math.min(radius * 0.45, 14);
  const maxChars = Math.floor((radius * 1.6) / (fontSize * 0.6));
  return name.length <= maxChars
    ? name
    : (maxChars >= 3 ? name.slice(0, maxChars - 1) + '…' : name.slice(0, maxChars));
}

function renderBubbleChart() {
  const container = document.getElementById('bubbleChart');
  if (!container || typeof d3 === 'undefined') return;

  const assets = allAssetsWeighted();
  if (!assets.length) {
    container.innerHTML = `<p class="donut-empty">${t('noData')}</p>`;
    return;
  }

  const colorMap = {};
  for (const asset of assets) colorMap[asset.classKey] ??= getClassColor(asset.classKey);

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const bounds = container.getBoundingClientRect();
  const width = Math.max(280, Math.floor(bounds.width || container.clientWidth || 320));
  const height = Math.max(280, Math.floor(bounds.height || 400));
  const packPadding = Math.min(width, height) < 360 ? 2 : 3;

  const percentOf = node => totalValue > 0 ? ((node.data.value / totalValue) * 100).toFixed(1) : '0';
  const fillColor = node => colorMap[node.data.classKey];
  const labelColor = node => bubbleTextColor(fillColor(node));
  const sublabelColor = node => bubbleSubtextColor(fillColor(node));

  const root = d3.hierarchy({ children: assets }).sum(a => a.value);
  d3.pack().size([width, height]).padding(packPadding)(root);

  const svg = d3.select(container)
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', t('a11yBubbleChart'));

  const nodes = svg.selectAll('g')
    .data(root.leaves())
    .join('g')
    .attr('transform', node => `translate(${node.x},${node.y})`);

  nodes.append('circle')
    .attr('r', node => node.r)
    .attr('fill', fillColor)
    .attr('opacity', 0.82)
    .attr('stroke', fillColor)
    .attr('stroke-opacity', 0.25)
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .style('transition', 'opacity 200ms, stroke-width 200ms')
    .on('mouseenter', function () {
      d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5).attr('stroke-opacity', 0.5);
    })
    .on('mouseleave', function () {
      d3.select(this).attr('opacity', 0.82).attr('stroke-width', 1.5).attr('stroke-opacity', 0.25);
    });

  nodes.append('title')
    .text(node => `${node.data.id}: ${formatBRL(node.data.value)} (${percentOf(node)}%)`);

  nodes.on('click', (_event, node) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `${node.data.id}: ${formatBRL(node.data.value)} (${percentOf(node)}%)`;
    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  });

  nodes.filter(node => node.r > 16)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', labelColor)
    .attr('font-family', 'var(--font-h)')
    .attr('font-weight', '700')
    .attr('font-size', node => Math.min(node.r * 0.45, 14))
    .text(node => fitLabel(node.data.id, node.r))
    .style('pointer-events', 'none');

  nodes.filter(node => node.r > 28)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('dy', node => node.r * 0.35)
    .attr('fill', sublabelColor)
    .attr('font-family', 'var(--font-b)')
    .attr('font-size', node => Math.min(node.r * 0.28, 10))
    .text(node => `${percentOf(node)}%`)
    .style('pointer-events', 'none');
}

// ---------------------------------------------------------------------------
// Asset table
// ---------------------------------------------------------------------------

function sortIndicator(col) {
  if (preferences.sortCol !== col) return '<i data-lucide="arrow-up-down" class="sort-icon sort-icon--idle"></i>';
  const icon = preferences.sortDir === 'asc' ? 'arrow-up' : 'arrow-down';
  return `<i data-lucide="${icon}" class="sort-icon"></i>`;
}

function sortedItems(key) {
  const items = portfolio.items(key);
  const indexed = items.map((item, idx) => ({ item, idx }));

  const compare = (a, b) => {
    const skippedA = isSkippedAsset(a.item);
    const skippedB = isSkippedAsset(b.item);
    if (skippedA !== skippedB) return skippedA ? 1 : -1;

    const col = preferences.sortCol;
    if (!col) return 0;

    const dir = preferences.sortDir === 'asc' ? 1 : -1;
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
  };

  return indexed.toSorted(compare);
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

  const recommendedIds = recommendedItems(key);
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
      ${sorted.map(({ item, idx }) => renderAssetRow(key, item, idx, recommendedIds)).join('')}
    </tbody>
  </table></div>
  <button class="add-asset-btn" data-add-class="${key}">
    <i data-lucide="plus"></i> ${t('addAsset')}
  </button>`;
  return html;
}

function renderAssetRow(key, item, index, recommendedIds) {
  const isRecommended = recommendedIds.includes(item.id);
  const isSkipped = isSkippedAsset(item);
  const price = prices.get(item.id);
  const value = assetValueBRL(key, item);
  const id = esc(item.id);

  const url = tickerUrl(key, item.id);
  const ticker = url
    ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${id}</a>`
    : `<span class="ticker-name">${id}</span>`;

  const { priceStr, changeHtml } = formatPrice(key, item, price);
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const noteTitle = item.note ? esc(item.note) : t('a11yAddNote');
  const rowCls = isRecommended ? ' class="row-target"' : isSkipped ? ' class="row-skipped"' : '';

  return `<tr${rowCls}>
    <td class="td-ticker">${ticker}${isRecommended ? investBadge() : isSkipped ? skipBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}"
      data-class="${key}" data-idx="${index}" data-field="amount" inputmode="decimal" autocomplete="off"
      aria-label="${t('a11yAmountOf', id)}"></td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" data-goto="${key}">${value !== null ? formatBRL(value) : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--target" type="text"
      value="${item.target !== undefined ? item.target : ''}"
      data-class="${key}" data-idx="${index}" data-field="target"
      placeholder="${t('targetPlaceholder')}" inputmode="decimal" autocomplete="off"
      aria-label="${t('a11yTargetOf', id)}"></td>
    <td class="td-actions">
      <button class="icon-btn icon-btn--ghost note-btn${item.note ? ' has-note' : ''}"
        data-note-class="${key}" data-note-id="${id}" title="${noteTitle}"
        aria-label="${t('a11yNote', id)}"><i data-lucide="${noteIcon}"></i></button>
      <button class="icon-btn icon-btn--ghost remove-btn" data-class="${key}" data-idx="${index}"
        title="${t('a11yRemove', id)}" aria-label="${t('a11yRemove', id)}">
        <i data-lucide="trash-2"></i></button>
    </td>
  </tr>`;
}

function formatPrice(key, item, priceData) {
  if (DECLARED_CLASSES.has(key) || (key === 'storeOfValue' && !priceData)) {
    return { priceStr: t('declaredPrice'), changeHtml: '' };
  }

  if (!priceData) return { priceStr: '', changeHtml: '' };

  const prefix = priceData.currency === 'USD' ? '$\u00A0' : 'R$\u00A0';
  const priceStr = prefix + priceData.price.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (priceData.change === undefined) return { priceStr, changeHtml: '' };

  const isUp = priceData.change >= 0;
  const changeHtml = `<span class="quote-chip ${isUp ? 'quote-chip--up' : 'quote-chip--down'}">${isUp ? '+' : ''}${priceData.change.toFixed(2)}%</span>`;

  return { priceStr, changeHtml };
}
