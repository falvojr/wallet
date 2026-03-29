import { CLASS_META, CLASS_KEYS, portfolio, prices, activeTab, classLabel, consumeTabChange } from './state.js';
import { t, tn } from './i18n.js';
import {
  formatBRL, assetValueBRL, classTotalBRL, portfolioTotalBRL, chartVisibleTotalBRL, classTargetPct, classActualPct,
  isQuarantined, isClassInactive, allocationWarning, deficientClasses, deficientItems, itemTargetPct, allAssetsWeighted, emergencyProgress,
} from './calc.js';

const $ = s => document.querySelector(s);
const refreshIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };
const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Shared HTML fragments (DRY)

function notice(icon, text, variant = 'warning') {
  return `<div class="notice notice--${variant}"><i data-lucide="${icon}" class="notice-icon"></i><span>${text}</span></div>`;
}

const badge = (cls, icon, label, title) => ` <span class="badge badge--${cls}" title="${title}"><i data-lucide="${icon}" class="badge-icon"></i>${label}</span>`;
const aportarBadge = () => badge('aportar', 'sparkles', t('badgeAportar'), t('badgeAportarTitle'));
const ignorarBadge = () => badge('ignorar', 'circle-off', t('badgeIgnorar'), t('badgeIgnorarTitle'));

function targetChip(key, value, unit, inputAttrs, wide = false) {
  const inactive = isClassInactive(key) ? ' summary-card-target-chip--inactive' : '';
  return `<div class="summary-card-target-chip${inactive}"><span class="target-chip-label">${t(unit === 'R$' ? 'goalLabel' : 'metaLabel')}</span>${
    unit === 'R$' ? `<span class="target-chip-unit">R$</span><input class="target-chip-input target-chip-input--wide" type="text" value="${value}" ${inputAttrs} placeholder="0" inputmode="decimal">` :
    `<input class="target-chip-input" type="text" value="${value}" ${inputAttrs} inputmode="decimal"><span class="target-chip-unit">%</span>`
  }</div>`;
}

// Sort state

let sortCol = null, sortDir = 'asc';
export function toggleSort(col) { if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc'; else { sortCol = col; sortDir = 'asc'; } }

function tickerUrl(key, id) {
  const p = prices.get(id);
  if ((key === 'brStocks' || key === 'brFiis') && (prices.isBrQuoted(id) || p)) return `https://www.google.com/finance/quote/${encodeURIComponent(id)}:BVMF`;
  if ((key === 'usStocks' || key === 'usReits') && p) return `https://finance.yahoo.com/quote/${encodeURIComponent(id)}`;
  return null;
}

// Full render

export function render() {
  const has = portfolio.loaded;
  $('#emptyWelcome').hidden = has; $('#headerActions').hidden = !has;
  if (!has) { $('#tabNav').innerHTML = ''; $('#panels').innerHTML = ''; refreshIcons(); return; }
  renderTabs(); renderPanels(); refreshIcons();
  if (activeTab === 'charts') renderBubbleChart();
}

/** Surgical update: re-renders only the overview panel without touching tabs or other panels. */
export function renderOverviewOnly() {
  const panel = $('[data-panel="overview"]');
  if (panel) { panel.innerHTML = renderOverview(); refreshIcons(); }
}

/** Surgical update: re-renders only the chart panel (used after toggling class visibility). */
export function renderChartOnly() {
  const panel = $('[data-panel="charts"]');
  if (panel) { panel.innerHTML = renderChartsTab(); refreshIcons(); renderBubbleChart(); }
}

// Tabs (follows displayOrder, no disabled styling)

function renderTabs() {
  const order = portfolio.displayOrder();
  const tabs = [{ key: 'overview', label: t('tabOverview') }, { key: 'charts', label: t('tabPortfolio') }, { key: '_sep' },
    ...order.map(k => ({ key: k, label: classLabel(k), count: portfolio.items(k).length }))];
  $('#tabNav').innerHTML = tabs.map(tab => {
    if (tab.key === '_sep') return '<span class="tab-sep" aria-hidden="true"></span>';
    return `<button class="tab-btn${tab.key === activeTab ? ' active' : ''}" data-tab="${tab.key}">${esc(tab.label)}${tab.count != null ? `<span class="tab-count">${tab.count}</span>` : ''}</button>`;
  }).join('');
}

// Panels (animation only on tab switch)

function renderPanels() {
  const anim = consumeTabChange();
  const wrap = (key, html) => `<div class="tab-panel${key === activeTab ? (anim ? ' active tab-panel--enter' : ' active') : ''}" data-panel="${key}">${html}</div>`;
  $('#panels').innerHTML = wrap('overview', renderOverview()) + wrap('charts', renderChartsTab()) + CLASS_KEYS.map(k => wrap(k, renderClassPanel(k))).join('');
}

// Overview

function renderOverview() {
  const defCls = deficientClasses(), order = portfolio.displayOrder();
  const populated = order.filter(k => portfolio.items(k).length > 0);

  let html = '';
  const warn = allocationWarning();
  if (warn) html += notice('triangle-alert', t('warningTargetSum', warn.sum));
  if (prices.hasData && prices.stale) html += notice('clock', t('infoStale', prices.dateStr), 'info');
  else if (!prices.hasData) html += notice('clock', t('infoNoPrices'), 'info');

  if (portfolio.isEmergencyUnmet()) html += notice('life-buoy', t('emergencyPriority'), 'warning');
  else if (prices.hasData && defCls.length === 0 && populated.some(k => !isClassInactive(k))) html += notice('check-circle', t('successBalanced'), 'success');

  html += `<div class="summary-cards">${populated.map((k, i) => renderSummaryCard(k, defCls, i + 1)).join('')}</div>`;
  return html;
}

/** All cards follow the same template: header > value > bar > meta > description. Only the meta chip content varies per type. */
function renderSummaryCard(key, defCls, displayIdx) {
  const m = CLASS_META[key], label = classLabel(key), total = classTotalBRL(key), isDef = defCls.includes(key);
  const inactive = isClassInactive(key), isEmergency = key === 'emergencyReserve';
  const desc = tn('classDescription', key), val = total !== null ? formatBRL(total) : t('assetCount', portfolio.items(key).length);
  const order = portfolio.order(key);

  // Progress bar percentage
  let pct = 0;
  if (isEmergency) { pct = emergencyProgress() ?? 0; }
  else { const actual = classActualPct(key), tgt = classTargetPct(key); pct = actual !== null && tgt > 0 ? Math.min((actual / tgt) * 100, 100) : 0; }

  // Meta row (varies by type)
  let metaLeft, chipHtml;
  if (isEmergency) {
    const prog = emergencyProgress(), goal = portfolio.goal('emergencyReserve');
    metaLeft = prog !== null ? `<span class="summary-card-actual">${prog.toFixed(1)}%</span>` : '<span></span>';
    chipHtml = targetChip(key, goal > 0 ? Math.round(goal) : '', 'R$', `data-class-goal="emergencyReserve" aria-label="${t('a11yGoalClass', esc(label))}"`, true);
  } else if (!inactive) {
    const actual = classActualPct(key), tgt = classTargetPct(key);
    metaLeft = actual !== null ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>` : '<span></span>';
    chipHtml = targetChip(key, tgt.toFixed(0), '%', `data-class-target="${key}" aria-label="${t('a11yTargetClass', esc(label))}"`);
  } else {
    metaLeft = `<span class="summary-card-inactive-hint">${t('inactiveClassHint')}</span>`;
    chipHtml = targetChip(key, '0', '%', `data-class-target="${key}" aria-label="${t('a11yTargetClass', esc(label))}"`);
  }

  const cardCls = inactive ? 'summary-card summary-card--inactive' : 'summary-card';
  return `<div class="${cardCls}" data-goto="${key}" style="--card-color:${m.color}">
    <div class="summary-card-head">
      <span class="summary-card-label"><i data-lucide="${m.icon}" class="summary-icon"></i>${esc(label)}${isDef ? aportarBadge() : ''}</span>
      <input class="summary-card-order" type="text" value="${order}" data-class-order="${key}" inputmode="numeric" title="Ordem" aria-label="Ordem de ${esc(label)}">
    </div>
    <div class="summary-card-value">${val}</div>
    <div class="summary-card-bar"><div class="summary-card-bar-fill" style="width:${pct}%"></div></div>
    <div class="summary-card-meta">${metaLeft}${chipHtml}</div>
    <p class="summary-card-desc">${esc(desc)}</p>
  </div>`;
}

// Carteira (chart patrimônio reflects only visible classes)

function renderChartsTab() {
  const order = portfolio.displayOrder(), populated = order.filter(k => portfolio.items(k).length > 0);
  const data = populated.map(k => {
    const total = classTotalBRL(k), count = portfolio.items(k).length, hidden = portfolio.isChartHidden(k);
    return { key: k, label: classLabel(k), color: CLASS_META[k].color, count, hasPrices: total !== null, total, hidden };
  });

  const { total, partial } = chartVisibleTotalBRL();
  const headerVal = total > 0 ? formatBRL(total) + (partial ? ` ${t('partialSuffix')}` : '') : t('assetCount', populated.reduce((s, k) => s + portfolio.items(k).length, 0));

  return `<div class="chart-fullwidth">
    <div class="chart-header"><span class="chart-header-label">${t('portfolioLabel')}</span><span class="chart-header-value">${headerVal}</span></div>
    <div class="chart-layout">
      <div class="chart-legend-sidebar">${data.map(renderLegendItem).join('')}</div>
      <div id="bubbleChart" class="bubble-container"></div>
    </div>
  </div>`;
}

/** Legend item: entire row is clickable to toggle chart visibility. Hidden items get strikethrough. */
function renderLegendItem(d) {
  return `<div class="legend-item${d.hidden ? ' legend-item--hidden' : ''}" data-toggle-chart="${d.key}" title="${t('a11yToggleChart', d.label, !d.hidden)}">
    <span class="legend-dot" style="background:${d.hidden ? 'var(--text-muted)' : d.color}"></span>
    <div class="legend-item-text">
      <span class="legend-item-label${d.hidden ? ' legend-strike' : ''}">${esc(d.label)}</span>
      <span class="legend-item-value${d.hidden ? ' legend-strike' : ''}">${d.hasPrices ? formatBRL(d.total) : t('assetCount', d.count)}</span>
    </div>
  </div>`;
}

// Bubble chart

function fitLabel(name, r) { const fs = Math.min(r * 0.45, 14), mx = Math.floor((r * 1.6) / (fs * 0.6)); return name.length <= mx ? name : (mx >= 3 ? name.slice(0, mx - 1) + '…' : name.slice(0, mx)); }

function renderBubbleChart() {
  const el = document.getElementById('bubbleChart');
  if (!el || typeof d3 === 'undefined') return;
  const assets = allAssetsWeighted();
  if (!assets.length) { el.innerHTML = `<p class="donut-empty">${t('noData')}</p>`; return; }

  const vTotal = assets.reduce((s, a) => s + a.value, 0);
  const w = el.clientWidth || 600, h = Math.max(440, Math.min(w * 0.75, window.innerHeight * 0.68));
  const root = d3.hierarchy({ children: assets }).sum(d => d.value);
  d3.pack().size([w, h]).padding(3)(root);

  const svg = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', t('a11yBubbleChart'));
  const nodes = svg.selectAll('g').data(root.leaves()).join('g').attr('transform', d => `translate(${d.x},${d.y})`);

  nodes.append('circle').attr('r', d => d.r).attr('fill', d => d.data.color).attr('opacity', 0.82)
    .attr('stroke', d => d.data.color).attr('stroke-opacity', 0.25).attr('stroke-width', 1.5)
    .style('cursor', 'pointer').style('transition', 'opacity 200ms, stroke-width 200ms')
    .on('mouseenter', function () { d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5).attr('stroke-opacity', 0.5); })
    .on('mouseleave', function () { d3.select(this).attr('opacity', 0.82).attr('stroke-width', 1.5).attr('stroke-opacity', 0.25); });

  const pct = d => vTotal > 0 ? ((d.data.value / vTotal) * 100).toFixed(1) : '0';
  nodes.append('title').text(d => `${d.data.id}: ${formatBRL(d.data.value)} (${pct(d)}%)`);
  nodes.on('click', (_e, d) => { const el2 = document.createElement('div'); el2.className = 'toast'; el2.textContent = `${d.data.id}: ${formatBRL(d.data.value)} (${pct(d)}%)`; document.getElementById('toastContainer')?.appendChild(el2); setTimeout(() => el2.remove(), 2500); });

  nodes.filter(d => d.r > 16).append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central').attr('fill', '#fff')
    .attr('font-family', 'var(--font-h)').attr('font-weight', '700').attr('font-size', d => Math.min(d.r * 0.45, 14)).text(d => fitLabel(d.data.id, d.r)).style('pointer-events', 'none');

  nodes.filter(d => d.r > 28).append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central').attr('dy', d => d.r * 0.35)
    .attr('fill', 'rgba(255,255,255,0.65)').attr('font-family', 'var(--font-b)').attr('font-size', d => Math.min(d.r * 0.28, 10))
    .text(d => pct(d) + '%').style('pointer-events', 'none');
}

// Asset table

function sortIndicator(col) { return sortCol !== col ? '<i data-lucide="arrow-up-down" class="sort-icon sort-icon--idle"></i>' : `<i data-lucide="${sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="sort-icon"></i>`; }

function sortedItems(key) {
  const items = portfolio.items(key); if (!sortCol || items.length < 2) return items.map((item, idx) => ({ item, idx }));
  const dir = sortDir === 'asc' ? 1 : -1;
  return items.map((item, idx) => ({ item, idx })).toSorted((a, b) => {
    const [ia, ib] = [a.item, b.item];
    switch (sortCol) {
      case 'name': return dir * ia.id.localeCompare(ib.id); case 'amount': return dir * (ia.amount - ib.amount);
      case 'price': return dir * ((prices.get(ia.id)?.price ?? 0) - (prices.get(ib.id)?.price ?? 0));
      case 'change': return dir * ((prices.get(ia.id)?.change ?? 0) - (prices.get(ib.id)?.change ?? 0));
      case 'total': return dir * ((assetValueBRL(key, ia) ?? 0) - (assetValueBRL(key, ib) ?? 0));
      case 'target': return dir * (itemTargetPct(key, ia) - itemTargetPct(key, ib)); default: return 0;
    }
  });
}

function renderClassPanel(key) {
  const label = classLabel(key), items = portfolio.items(key), inactive = isClassInactive(key);
  let html = `<h2 class="sr-only">${esc(label)}</h2>`;
  if (inactive) html += notice('info', t('inactiveClassHint'), 'info');
  if (!items.length) return html + `<div class="empty-class"><p>${t('emptyClass')}</p><button class="btn btn--filled add-to-empty" data-add-class="${key}">${t('addAsset')}</button></div>`;
  const defItems = deficientItems(key);
  html += `<div class="table-wrap"><table class="asset-table"><thead><tr>
    <th data-sort="name" class="sortable">${t('colName')} ${sortIndicator('name')}</th>
    <th data-sort="amount" class="col-r sortable">${t('colAmount')} ${sortIndicator('amount')}</th>
    <th data-sort="price" class="col-r sortable">${t('colPrice')} ${sortIndicator('price')}</th>
    <th data-sort="change" class="col-r sortable">${t('colChange')} ${sortIndicator('change')}</th>
    <th data-sort="total" class="col-r sortable">${t('colTotal')} ${sortIndicator('total')}</th>
    <th data-sort="target" class="col-r sortable">${t('colTarget')} ${sortIndicator('target')}</th>
    <th class="col-actions">${t('colActions')}</th></tr></thead><tbody>
    ${sortedItems(key).map(({ item, idx }) => renderAssetRow(key, item, idx, defItems)).join('')}
    <tr class="add-row" data-add-class="${key}"><td colspan="7">${t('addAsset')}</td></tr></tbody></table></div>`;
  return html;
}

function renderAssetRow(key, item, idx, defItems) {
  const m = CLASS_META[key], isDef = defItems.includes(item.id), q = isQuarantined(item);
  const p = prices.get(item.id), val = assetValueBRL(key, item), id = esc(item.id);
  const url = tickerUrl(key, item.id);
  const ticker = url ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link">${id}</a>` : `<span class="ticker-name">${id}</span>`;
  const { priceStr, changeHtml } = fmtPrice(key, item, p);
  const noteIcon = item.note ? 'message-square-text' : 'message-square';
  const cls = isDef ? ' class="row-target"' : q ? ' class="row-quarantine"' : '';
  return `<tr${cls}>
    <td class="td-ticker">${ticker}${isDef ? aportarBadge() : q ? ignorarBadge() : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${item.amount}" data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal" aria-label="${t('a11yAmountOf', id)}"></td>
    <td class="td-price">${priceStr}</td><td class="td-change">${changeHtml}</td>
    <td class="td-value" style="color:${m.color}">${val !== null ? formatBRL(val) : ''}</td>
    <td class="td-r"><input class="inline-input inline-input--target" type="text" value="${item.target !== undefined ? item.target : ''}" data-class="${key}" data-idx="${idx}" data-field="target" placeholder="${t('targetPlaceholder')}" inputmode="decimal" aria-label="${t('a11yTargetOf', id)}"></td>
    <td class="td-actions">
      <button class="icon-btn icon-btn--ghost note-btn${item.note ? ' has-note' : ''}" data-note-class="${key}" data-note-id="${id}" title="${item.note ? esc(item.note) : t('a11yAddNote')}" aria-label="${t('a11yNote', id)}"><i data-lucide="${noteIcon}"></i></button>
      <button class="icon-btn icon-btn--ghost remove-btn" data-class="${key}" data-idx="${idx}" title="${t('a11yRemove', id)}" aria-label="${t('a11yRemove', id)}"><i data-lucide="trash-2"></i></button>
    </td></tr>`;
}

function fmtPrice(key, item, p) {
  if (key === 'fixedIncome' || key === 'assets' || key === 'emergencyReserve' || (key === 'storeOfValue' && !p)) return { priceStr: t('declaredPrice'), changeHtml: '' };
  if (!p) return { priceStr: '', changeHtml: '' };
  const pfx = p.currency === 'USD' ? '$\u00A0' : 'R$\u00A0';
  const priceStr = pfx + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p.change === undefined) return { priceStr, changeHtml: '' };
  const up = p.change >= 0;
  return { priceStr, changeHtml: `<span class="${up ? 'change-up' : 'change-down'}">${up ? '+' : ''}${p.change.toFixed(2)}%</span>` };
}
