import {
  state, CLASS_META, CLASS_KEYS, visibleClassKeys,
  isClassHidden, isBrQuoted, pricesStale, pricesDateStr,
  hasCachedPrices, classItems,
} from './state.js';
import {
  formatBRL, formatCompact, assetValueBRL, classTotalBRL, portfolioTotalBRL,
  classTargetPct, classActualPct, isQuarantined, allocationWarning,
  deficientClasses, deficientItems,
} from './calc.js';

const $ = s => document.querySelector(s);

const createIcons = () => { if (typeof lucide !== 'undefined') lucide.createIcons(); };
const hasItems    = key => classItems(key).length > 0;
const countLabel  = n   => `${n} ativo${n !== 1 ? 's' : ''}`;

/** Escapes HTML special characters to prevent XSS in template literals. */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

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

const aportarBadge = () => badge('aportar', 'sparkles', 'aportar', 'Maior necessidade de aporte');
const ignorarBadge = () => badge('ignorar', 'circle-pause', 'ignorar', 'Em quarentena');

function tickerUrl(key, id) {
  const p = state.prices[id];
  if ((key === 'brStocks' || key === 'brFiis') && (isBrQuoted(id) || p))
    return `https://www.google.com/finance/quote/${encodeURIComponent(id)}:BVMF`;
  if ((key === 'usStocks' || key === 'usReits') && p)
    return `https://finance.yahoo.com/quote/${encodeURIComponent(id)}`;
  return null;
}

export function render() {
  const has = state.portfolio !== null;
  $('#emptyWelcome').hidden = has;
  $('#headerActions').hidden = !has;

  if (!has) {
    $('#tabNav').innerHTML = '';
    $('#panels').innerHTML = '';
    createIcons();
    return;
  }

  renderTabs();
  renderPanels();
  createIcons();
}

function renderTabs() {
  const tabs = [
    { key: 'overview', label: 'Visão Geral', count: null, hidden: false },
    ...CLASS_KEYS.map(k => ({
      key: k, label: CLASS_META[k].label,
      count: classItems(k).length,
      hidden: isClassHidden(k),
    })),
  ];

  $('#tabNav').innerHTML = tabs.map(t => `
    <button class="tab-btn${t.key === state.activeTab ? ' active' : ''}${t.hidden ? ' tab-hidden' : ''}"
      data-tab="${t.key}" aria-current="${t.key === state.activeTab ? 'page' : 'false'}">
      ${escapeHtml(t.label)}${t.count !== null ? `<span class="tab-count">${t.count}</span>` : ''}
    </button>`).join('');
}

function renderPanels() {
  const wrap = (key, content) =>
    `<div class="tab-panel${key === state.activeTab ? ' active' : ''}" data-panel="${key}"
      role="tabpanel">${content}</div>`;

  $('#panels').innerHTML =
    wrap('overview', renderOverview()) +
    CLASS_KEYS.map(key => wrap(key, renderClassPanel(key))).join('');
}

function renderOverview() {
  const defClasses = deficientClasses();
  const populated  = CLASS_KEYS.filter(hasItems);

  const chartData = populated.map(k => {
    const hidden  = isClassHidden(k);
    const total   = classTotalBRL(k);
    const count   = classItems(k).length;
    return {
      key: k, label: CLASS_META[k].label,
      color: CLASS_META[k].color, icon: CLASS_META[k].icon,
      value:     hidden ? 0 : (total ?? count * 0.01),
      count, hasPrices: total !== null, total, hidden,
    };
  });

  const warning = allocationWarning();
  let html = '';

  if (warning)
    html += notice('triangle-alert', `As metas somam <strong>${warning.sum}%</strong>, mas deveriam totalizar 100%.`);

  if (hasCachedPrices() && pricesStale())
    html += notice('clock', `Cotações desatualizadas (${pricesDateStr()}). Atualize em <strong>Cotar</strong>.`, 'info');
  else if (!hasCachedPrices())
    html += notice('clock', 'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.', 'info');

  html += `<div class="overview-grid">
    <div class="chart-card">
      ${renderDonut(chartData.filter(d => !d.hidden))}
      <div class="chart-legend">${chartData.map(renderLegendRow).join('')}</div>
    </div>
    <div class="summary-cards">
      ${populated.filter(k => !isClassHidden(k)).map(k => renderSummaryCard(k, defClasses)).join('')}
    </div>
  </div>`;

  return html;
}

function renderLegendRow(d) {
  const eye = d.hidden ? 'eye-off' : 'eye';
  const action = d.hidden ? 'Reativar' : 'Ocultar';
  return `<div class="legend-row${d.hidden ? ' legend-row--hidden' : ''}">
    <span class="legend-dot" style="background:${d.hidden ? 'var(--text-muted)' : d.color}"></span>
    <span class="legend-label" data-goto="${d.key}">${escapeHtml(d.label)}</span>
    <span class="legend-amount${d.hidden ? ' legend-amount--hidden' : ''}">
      ${d.hasPrices ? formatBRL(d.total) : countLabel(d.count)}
    </span>
    <button class="legend-eye" data-toggle-hidden="${d.key}"
      title="${action} classe ${escapeHtml(d.label)}"
      aria-label="${action} classe ${escapeHtml(d.label)}">
      <i data-lucide="${eye}"></i>
    </button>
  </div>`;
}

function renderSummaryCard(key, defClasses) {
  const m      = CLASS_META[key];
  const total  = classTotalBRL(key);
  const actual = classActualPct(key);
  const target = classTargetPct(key);
  const isDef  = defClasses.includes(key);
  const pct    = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;

  return `<div class="summary-card" style="--card-color:${m.color}">
    <div class="summary-card-head">
      <span class="summary-card-label" data-goto="${key}">
        <i data-lucide="${m.icon}" class="summary-icon"></i>${escapeHtml(m.label)}${isDef ? aportarBadge() : ''}
      </span>
    </div>
    <div class="summary-card-value" data-goto="${key}">
      ${total !== null ? formatBRL(total) : countLabel(classItems(key).length)}
    </div>
    <div class="summary-card-bar" role="progressbar"
      aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
      aria-label="Alocação de ${escapeHtml(m.label)}: ${actual !== null ? actual.toFixed(1) : 0}% de ${target.toFixed(0)}%">
      <div class="summary-card-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="summary-card-meta">
      ${actual !== null ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>` : '<span></span>'}
      <span class="summary-card-target-wrap">meta
        <input class="summary-card-target" type="text" value="${target.toFixed(0)}"
          data-class-target="${key}" inputmode="decimal"
          title="Meta da classe (%)" aria-label="Meta de ${escapeHtml(m.label)} (%)">%
      </span>
    </div>
  </div>`;
}

function renderDonut(segments) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '<p class="donut-empty">Sem dados</p>';

  const R = 75, circumference = Math.PI * 2 * R;
  let offset = 0;

  const descriptions = [];
  const arcs = segments.map(d => {
    const pct  = ((d.value / total) * 100).toFixed(1);
    const dash = (d.value / total) * circumference;
    descriptions.push(`${d.label}: ${pct}%`);
    const arc  = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${d.color}"
      stroke-width="22" stroke-dasharray="${dash} ${circumference - dash}"
      stroke-dashoffset="${-offset}" opacity="0.88">
      <title>${escapeHtml(d.label)}: ${formatBRL(d.value)} (${pct}%)</title>
    </circle>`;
    offset += dash;
    return arc;
  });

  const { total: ptotal, partial } = portfolioTotalBRL();
  const hasVal = ptotal > 0;
  const ariaLabel = `Distribuição do portfólio: ${descriptions.join(', ')}`;

  return `<div class="donut-wrap">
    <svg viewBox="0 0 200 200" role="img" aria-label="${escapeHtml(ariaLabel)}">${arcs.join('')}</svg>
    <div class="donut-center">
      <div class="total-label">${hasVal ? 'Patrimônio' : 'Total'}</div>
      <div class="total-value">
        ${hasVal ? formatCompact(ptotal) : segments.reduce((s, d) => s + d.count, 0) + ' ativos'}
      </div>
      ${hasVal && partial ? '<div class="total-sub">(parcial)</div>' : ''}
    </div>
  </div>`;
}

function renderClassPanel(key) {
  const meta  = CLASS_META[key];
  const items = classItems(key);
  const hidden = isClassHidden(key);

  let html = `<div class="asset-section-header">
    <h2 class="asset-section-title" style="color:${meta.color}">
      <i data-lucide="${meta.icon}" class="section-icon"></i>${escapeHtml(meta.label)}
    </h2>
  </div>`;

  if (hidden)
    html += notice('eye-off', 'Classe oculta. Valores não contabilizados no patrimônio e sem sugestões de aporte.', 'info');

  if (items.length === 0) {
    html += `<div class="empty-class">
      <p>Nenhum ativo nesta classe.</p>
      <button class="btn btn--primary add-to-empty" data-add-class="${key}">+ Adicionar ativo</button>
    </div>`;
    return html;
  }

  const defItems = hidden ? [] : deficientItems(key);

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      <th>Nome</th>
      <th class="col-r">Qtd</th>
      <th class="col-r">Preço</th>
      <th class="col-r">Hoje</th>
      <th class="col-r">Total</th>
      <th class="col-r">Meta %</th>
      <th class="col-action"><span class="sr-only">Ações</span></th>
    </tr></thead>
    <tbody>
      ${items.map((item, idx) => renderAssetRow(key, item, idx, meta, defItems)).join('')}
      <tr class="add-row" data-add-class="${key}"><td colspan="7">+ Adicionar ativo</td></tr>
    </tbody>
  </table></div>`;

  return html;
}

function renderAssetRow(key, item, idx, meta, defItems) {
  const isDef       = defItems.includes(item.id);
  const quarantined = isQuarantined(item);
  const p           = state.prices[item.id];
  const value       = assetValueBRL(key, item);
  const safeId      = escapeHtml(item.id);

  const { priceStr, changeHtml } = formatPriceCell(key, item, p);

  const url = tickerUrl(key, item.id);
  const noteAttr = item.note ? ` title="${escapeHtml(item.note)}"` : '';
  const ticker = url
    ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link"${noteAttr}>${safeId}</a>`
    : `<span class="ticker-note${item.note ? ' has-note' : ''}" data-note-class="${key}" data-note-id="${safeId}"${noteAttr}>${safeId}</span>`;

  const rowClass = isDef ? 'row-target' : quarantined ? 'row-quarantine' : '';

  return `<tr${rowClass ? ` class="${rowClass}"` : ''}>
    <td class="td-ticker">
      ${ticker}${isDef ? aportarBadge() : quarantined ? ignorarBadge() : ''}
    </td>
    <td class="td-r">
      <input class="inline-input inline-input--qty" type="text" value="${item.amount}"
        data-class="${key}" data-idx="${idx}" data-field="amount"
        inputmode="decimal" aria-label="Quantidade de ${safeId}">
    </td>
    <td class="td-price">${priceStr}</td>
    <td class="td-change">${changeHtml}</td>
    <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
    <td class="td-r">
      <input class="inline-input inline-input--target" type="text"
        value="${item.target !== undefined ? item.target : ''}"
        data-class="${key}" data-idx="${idx}" data-field="target"
        placeholder="auto" inputmode="decimal"
        aria-label="Meta % de ${safeId} na classe" title="Meta do ativo na classe">
    </td>
    <td class="td-action">
      <button class="remove-btn" data-class="${key}" data-idx="${idx}"
        title="Remover ${safeId}" aria-label="Remover ${safeId}">
        <i data-lucide="x" style="width:12px;height:12px"></i>
      </button>
    </td>
  </tr>`;
}

/** Returns formatted price string and change badge HTML for a table cell. */
function formatPriceCell(key, item, p) {
  let priceStr = '', changeHtml = '';

  if (key === 'fixedIncome' || key === 'assets' || (key === 'storeOfValue' && !p)) {
    priceStr = 'Declarado';
  } else if (p) {
    const prefix = p.currency === 'USD' ? '$ ' : 'R$ ';
    priceStr = prefix + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p.change !== undefined) {
      const dir = p.change >= 0;
      const label = dir ? 'alta' : 'queda';
      changeHtml = `<span class="${dir ? 'change-up' : 'change-down'}" title="${label} de ${Math.abs(p.change).toFixed(2)}%">${dir ? '+' : ''}${p.change.toFixed(2)}%</span>`;
    }
  }

  return { priceStr, changeHtml };
}
