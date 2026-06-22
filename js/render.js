import {
  CLASS_ICONS, CLASS_KEYS, DECLARED_CLASSES, portfolio, preferences, prices, settings, activeTab, classLabel, consumeTabChange,
} from './state.js';
import { t, tn } from './i18n.js';
import {
  formatBRL, assetValueBRL, classTotalBRL, portfolioTotalBRL, chartVisibleTotalBRL, classTargetPct, classActualPct, isSkippedAsset,
  isClassInactive, allocationWarning, recommendedClasses, recommendedItems, itemTargetPct, emergencyProgress,
} from './calc.js';
import { renderBubbleChart } from './chart.js';

const $ = selector => document.querySelector(selector);
export const refreshIcons = () => typeof lucide !== 'undefined' && lucide.createIcons();

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

// With sardine mode off, money values are masked and only percentages are shown (inspired by Bastter System's "Exibir financeiro" flag).
const MASKED_VALUE = '••••';
const moneyOrMask = value => settings.sardineMode ? formatBRL(value) : MASKED_VALUE;
const percentOfTotal = (value, total) => total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '';

// Sort

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

// Render entry points

function editingSelector(el) {
  const data = el.dataset;
  if (el.classList.contains('inline-input')) {
    return `.inline-input[data-class="${data.class}"][data-idx="${data.idx}"][data-field="${data.field}"]`;
  }
  if (data.classTarget !== undefined) return `[data-class-target="${data.classTarget}"]`;
  if (data.classGoal !== undefined) return `[data-class-goal="${data.classGoal}"]`;
  return null;
}

/*
 * A full re-render rebuilds the panels via innerHTML, dropping the focus and any uncommitted text of the edited field.
 * Capture that field before the rebuild and restore it afterwards.
 */
function captureEditing() {
  const el = document.activeElement;
  if (!el || typeof el.matches !== 'function') return null;
  if (!el.matches('.inline-input, [data-class-target], [data-class-goal]')) return null;
  return { selector: editingSelector(el), value: el.value, start: el.selectionStart, end: el.selectionEnd };
}

function restoreEditing(snapshot) {
  if (!snapshot || !snapshot.selector) return;
  const el = $(snapshot.selector);
  if (!el) return;
  el.value = snapshot.value;
  el.focus();
  // Some input types reject setSelectionRange; the caret is non-essential, so ignore the failure.
  try {
    el.setSelectionRange(snapshot.start, snapshot.end);
  } catch {}
}

export function render() {
  const hasData = portfolio.loaded;
  $('#emptyWelcome').hidden = hasData;
  $('#headerActions').hidden = !hasData;
  document.body.classList.toggle('quotes-hidden', !settings.sardineMode);

  if (!hasData) {
    $('#tabNav').innerHTML = '';
    $('#panels').innerHTML = '';
    refreshIcons();
    return;
  }

  const editing = captureEditing();
  renderTabs();
  renderPanels();
  refreshIcons();
  revealDescToggles();
  restoreEditing(editing);
  if (activeTab === 'charts') renderBubbleChart();
}

export function renderOverviewOnly() {
  const editing = captureEditing();
  const panel = $('[data-panel="overview"]');
  if (panel) {
    panel.innerHTML = renderOverview();
    refreshIcons();
    revealDescToggles();
  }
  renderTabs();
  restoreEditing(editing);
}

export function renderChartOnly() {
  const panel = $('[data-panel="charts"]');
  if (panel) {
    panel.innerHTML = renderChartsTab();
    refreshIcons();
    renderBubbleChart();
  }
}

// Tabs

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
    icon: CLASS_ICONS[key],
  }));

  const renderTab = tab => {
    const isActive = tab.key === activeTab;
    const countHtml = tab.count != null ? `<span class="tab-count">${tab.count}</span>` : '';
    const iconHtml = isActive ? `<i data-lucide="${tab.icon}" class="tab-icon"></i>` : '';
    return `<button class="tab-btn${isActive ? ' active' : ''}" data-tab="${tab.key}"${isActive ? ' aria-current="true"' : ''}>
      ${iconHtml}${esc(tab.label)}${countHtml}
    </button>`;
  };

  const nav = $('#tabNav');
  nav.innerHTML = fixedTabs.map(renderTab).join('')
    + '<span class="tab-gap" aria-hidden="true"></span>'
    + classTabs.map(renderTab).join('');

  // Fade the edges only when the tabs overflow, hinting they can be scrolled sideways.
  nav.classList.toggle('tab-nav--scrollable', nav.scrollWidth > nav.clientWidth);
  // Keep the active tab in view when navigating (e.g. tapping a summary card on mobile).
  nav.querySelector('.tab-btn.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// Panels

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

// Overview

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
  const label = classLabel(key);
  const total = classTotalBRL(key);
  const isRecommended = recommended.includes(key);
  const isEmergency = key === 'emergencyReserve';
  const inactive = isClassInactive(key) || (isEmergency && portfolio.goal('emergencyReserve') <= 0);
  const description = tn('classDescriptions', key);
  const valueStr = total !== null ? moneyOrMask(total) : t('assetCount', portfolio.items(key).length);

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

  return `<div class="${cardCls}" data-goto="${key}" role="button" tabindex="0" aria-label="${t('a11yGotoClass', esc(label))}">
    <div class="summary-card-head">
      <span class="summary-card-label">
        <i data-lucide="${CLASS_ICONS[key]}" class="summary-icon"></i>
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
    <div class="summary-card-desc-wrap">
      <p class="summary-card-desc">${esc(description)}</p>
      <button type="button" class="desc-toggle" data-desc-toggle hidden>${t('descMore')}</button>
    </div>
  </div>`;
}

// Shows the "ver mais" toggle only on cards whose description is actually clipped.
function revealDescToggles() {
  for (const desc of document.querySelectorAll('.summary-card-desc')) {
    const toggle = desc.nextElementSibling;
    if (toggle?.matches('[data-desc-toggle]')) {
      toggle.hidden = desc.scrollHeight <= desc.clientHeight + 1;
    }
  }
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

  // Inactive classes have target 0, so target.toFixed(0) is "0"; only the leading span differs.
  const left = inactive
    ? `<span class="summary-card-inactive-hint">${t('inactiveClassHint')}</span>`
    : `<span class="summary-card-actual">${(classActualPct(key) ?? 0).toFixed(1)}%</span>`;
  return left + `
    <label class="summary-card-target-chip">
      <span class="target-chip-label">${t('metaLabel')}</span>
      <input class="target-chip-input" type="text" value="${classTargetPct(key).toFixed(0)}"
        data-class-target="${key}" inputmode="decimal" pattern="[0-9]*" autocomplete="off"
        aria-label="${t('a11yTargetClass', esc(label))}">
      <span class="target-chip-unit">%</span>
    </label>`;
}

// Charts tab

function renderChartsTab() {
  const order = preferences.displayOrder();
  const data = order.map(key => {
    const total = classTotalBRL(key);
    return {
      key,
      label: classLabel(key),
      count: portfolio.items(key).length,
      hasPrices: total !== null,
      total,
      hidden: preferences.isChartHidden(key),
    };
  });

  const { total, partial } = chartVisibleTotalBRL();
  const portfolioTotal = portfolioTotalBRL().total;
  const headerVal = total > 0
    ? moneyOrMask(total) + (partial ? ` ${t('partialSuffix')}` : '')
    : t('assetCount', order.reduce((sum, key) => sum + portfolio.items(key).length, 0));

  return `<div class="chart-layout">
    <div class="chart-sidebar">
      <div class="chart-header">
        <span class="chart-header-label">${t('portfolioLabel')}</span>
        <span class="chart-header-value">${headerVal}</span>
      </div>
      <div class="chart-legend-grid">${data.map(item => renderLegendItem(item, portfolioTotal)).join('')}</div>
    </div>
    <div class="bubble-stage">
      <div id="bubbleChart" class="bubble-container"></div>
    </div>
  </div>`;
}

function renderLegendItem(item, portfolioTotal) {
  const hiddenCls = item.hidden ? ' legend-item--hidden' : '';
  const strikeCls = item.hidden ? ' legend-strike' : '';
  const valueText = !item.hasPrices
    ? t('assetCount', item.count)
    : settings.sardineMode ? formatBRL(item.total) : percentOfTotal(item.total, portfolioTotal) || t('assetCount', item.count);

  return `<button type="button" class="legend-item${hiddenCls}" data-toggle-chart="${item.key}" data-goto="${item.key}"
    title="${t('a11yToggleChart', item.label, !item.hidden)}">
    <span class="legend-dot"></span>
    <span class="legend-item-text">
      <span class="legend-item-label${strikeCls}">${esc(item.label)}</span>
      <span class="legend-item-value${strikeCls}">${valueText}</span>
    </span>
  </button>`;
}

// Asset table

function sortIndicator(col) {
  if (preferences.sortCol !== col) return '<i data-lucide="arrow-up-down" class="sort-icon sort-icon--idle"></i>';
  const icon = preferences.sortDir === 'asc' ? 'arrow-up' : 'arrow-down';
  return `<i data-lucide="${icon}" class="sort-icon"></i>`;
}

function sortableHeader(col, label, extraClass = '') {
  const ariaSort = preferences.sortCol !== col
    ? 'none'
    : preferences.sortDir === 'asc' ? 'ascending' : 'descending';
  return `<th class="col-${col}${extraClass}" aria-sort="${ariaSort}">
    <button type="button" class="sort-btn" data-sort="${col}">${label} ${sortIndicator(col)}</button>
  </th>`;
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
  const classTotal = classTotalBRL(key) ?? 0;

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      ${sortableHeader('name', t('colName'))}
      ${sortableHeader('amount', t('colAmount'), ' col-r')}
      ${sortableHeader('price', t('colPrice'), ' col-r')}
      ${sortableHeader('change', t('colChange'), ' col-r')}
      ${sortableHeader('total', settings.sardineMode ? t('colTotal') : t('colActual'), ' col-r')}
      ${sortableHeader('target', t('colTarget'), ' col-r')}
      <th class="col-actions"><span class="sr-only">${t('colActionsA11y')}</span></th>
    </tr></thead>
    <tbody>
      ${sorted.map(({ item, idx }) => renderAssetRow(key, item, idx, recommendedIds, classTotal)).join('')}
    </tbody>
  </table></div>
  <button class="add-asset-btn" data-add-class="${key}">
    <i data-lucide="plus"></i> ${t('addAsset')}
  </button>`;
  return html;
}

function renderAssetRow(key, item, index, recommendedIds, classTotal) {
  const isRecommended = recommendedIds.includes(item.id);
  const isSkipped = isSkippedAsset(item);
  const price = prices.get(item.id);
  const value = assetValueBRL(key, item);
  const valueCell = value === null
    ? ''
    : settings.sardineMode ? formatBRL(value) : percentOfTotal(value, classTotal);
  const id = esc(item.id);

  const url = tickerUrl(key, item.id);
  const ticker = url
    ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${id}</a>`
    : `<span class="ticker-name">${id}</span>`;

  const { priceStr, changeHtml } = formatPrice(key, item, price);
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const noteTitle = item.note ? esc(item.note) : t('a11yAddNote');
  const rowCls = isRecommended
    ? ' class="row-target"'
    : isSkipped ? ' class="row-skipped"' : '';

  return `<tr${rowCls}>
    <td class="td-ticker">${ticker}${isRecommended ? investBadge() : isSkipped ? skipBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}"
      data-class="${key}" data-idx="${index}" data-field="amount" inputmode="decimal" autocomplete="off"
      aria-label="${t('a11yAmountOf', id)}"></td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" data-goto="${key}">${valueCell}</td>
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
  if (!Number.isFinite(priceData.price)) return { priceStr: '', changeHtml: '' };

  const prefix = priceData.currency === 'USD' ? '$\u00A0' : 'R$\u00A0';
  const priceStr = prefix + priceData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (priceData.change === undefined) return { priceStr, changeHtml: '' };

  const isUp = priceData.change >= 0;
  const changeHtml = `<span class="quote-chip ${isUp ? 'quote-chip--up' : 'quote-chip--down'}">${isUp ? '+' : ''}${priceData.change.toFixed(2)}%</span>`;

  return { priceStr, changeHtml };
}
