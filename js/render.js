import { state, CLASS_META, CLASS_KEYS, activeClassKeys, visibleClassKeys, isClassHidden, isBrQuoted, isUsQuoted } from './state.js';
import {
  formatBRL, formatQty, formatCompact,
  assetValueBRL, classTotalBRL, portfolioTotalBRL,
  classTargetPct, classActualPct, isQuarantined,
  allocationWarning,
  findMostDeficientClasses, findMostDeficientAssets,
} from './calc.js';

const $ = (s) => document.querySelector(s);
const SMART_BADGE_TITLE = 'Sugestão baseada no desvio para a alocação-alvo';

function classHasAssets(key) {
  return (state.portfolio[key] || []).length > 0;
}

function renderAportarBadge() {
  return ` <span class="badge badge--aportar" title="${SMART_BADGE_TITLE}"><i data-lucide="sparkles" style="width:9px;height:9px;vertical-align:-1px;margin-right:2px"></i>aportar</span>`;
}

function renderQuarantineBadge() {
  return ' <span class="badge badge--ignorar">ignorar</span>';
}

function renderHiddenBadge() {
  return ' <span class="badge badge--hidden">oculta</span>';
}

function tickerUrl(classKey, tickerId) {
  if (classKey === 'brStocks' || classKey === 'brFiis') {
    if (isBrQuoted(tickerId) || state.prices[tickerId]) {
      return `https://www.google.com/finance/quote/${tickerId}:BVMF`;
    }
  }
  if (classKey === 'usStocks' || classKey === 'usReits') {
    if (isUsQuoted(tickerId) || state.prices[tickerId]) {
      return `https://www.google.com/finance/quote/${tickerId}:NYSE`;
    }
  }
  return null;
}

export function render() {
  const hasPortfolio = state.portfolio !== null;

  $('#emptyWelcome').hidden = hasPortfolio;
  $('#headerActions').hidden = !hasPortfolio;

  if (!hasPortfolio) {
    $('#tabNav').innerHTML = '';
    $('#panels').innerHTML = '';
    return;
  }

  renderTabs();
  renderPanels();
  lucide.createIcons();
}

function renderTabs() {
  const tabs = [
    { key: 'overview', label: 'Visão Geral', count: null, hidden: false },
    ...activeClassKeys().map(k => ({
      key: k,
      label: CLASS_META[k].label,
      count: (state.portfolio[k] || []).length,
      hidden: isClassHidden(k),
    })),
  ];

  $('#tabNav').innerHTML = tabs.map(t => `
    <button class="tab-btn ${t.key === state.activeTab ? 'active' : ''} ${t.hidden ? 'tab-hidden' : ''}" data-tab="${t.key}">
      ${t.label}${t.count !== null ? `<span class="tab-count">${t.count}</span>` : ''}
    </button>
  `).join('');
}

function renderPanels() {
  let html = panelWrap('overview', renderOverview());
  for (const key of activeClassKeys()) html += panelWrap(key, renderAssetPanel(key));
  $('#panels').innerHTML = html;
}

function panelWrap(key, content) {
  return `<div class="tab-panel ${key === state.activeTab ? 'active' : ''}" data-panel="${key}">${content}</div>`;
}

function renderOverview() {
  const targetClasses = findMostDeficientClasses();
  const populatedKeys = CLASS_KEYS.filter(classHasAssets);

  const chartData = populatedKeys
    .filter(k => !isClassHidden(k))
    .map(k => {
      const total = classTotalBRL(k);
      const count = state.portfolio[k].length;
      return {
        key: k, label: CLASS_META[k].label, color: CLASS_META[k].color, icon: CLASS_META[k].icon,
        value: total ?? count * 0.01,
        count, hasPrices: total !== null, total,
      };
    });

  let html = '<div class="overview-grid">';

  // Allocation warning
  const warning = allocationWarning();
  if (warning) {
    const icon = warning.over ? 'triangle-alert' : 'info';
    html += `
      <div class="allocation-warning">
        <i data-lucide="${icon}" style="width:14px;height:14px;flex-shrink:0"></i>
        <span>A soma das metas é <strong>${warning.sum}%</strong> (${warning.over ? 'acima' : 'abaixo'} de 100% por ${warning.diff}p.p.)</span>
      </div>`;
  }

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

  html += '<div class="summary-cards">';
  populatedKeys.forEach(key => {
    const meta = CLASS_META[key];
    const hidden = isClassHidden(key);
    const classTotal = hidden ? null : classTotalBRL(key);
    const actual = hidden ? null : classActualPct(key);
    const target = classTargetPct(key);
    const isTarget = !hidden && targetClasses.includes(key);
    const barFill = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;
    const aportarHtml = isTarget ? renderAportarBadge() : '';

    if (hidden) {
      html += `
        <div class="summary-card summary-card--hidden" data-class="${key}" data-goto="${key}">
          <div class="summary-card-label">
            <i data-lucide="${meta.icon}" class="summary-icon"></i>
            ${meta.label}${renderHiddenBadge()}
          </div>
          <div class="summary-card-value summary-card-value--hidden">${classTotalBRL(key) !== null ? formatBRL(classTotalBRL(key)) : state.portfolio[key].length}</div>
        </div>`;
      return;
    }

    let pctHtml = '';
    if (actual !== null) {
      pctHtml = `<div class="summary-card-pct"><strong style="color:${meta.color}">${actual.toFixed(1)}%</strong> de ${target.toFixed(0)}%</div>`;
    }

    html += `
      <div class="summary-card" data-class="${key}" data-goto="${key}">
        <div class="summary-card-label">
          <i data-lucide="${meta.icon}" class="summary-icon" style="color:${meta.color}"></i>
          ${meta.label}${aportarHtml}
        </div>
        <div class="summary-card-value" style="color:${meta.color}">
          ${classTotal !== null ? formatBRL(classTotal) : state.portfolio[key].length}
        </div>
        ${pctHtml}
        ${target > 0 ? `<div class="target-bar"><div class="target-bar-fill" style="width:${barFill}%;background:${meta.color}"></div></div>` : ''}
      </div>`;
  });
  html += '</div></div>';

  return html;
}

function renderDonut(segments) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '<p style="color:var(--text-muted);padding:20px;font-size:0.82rem">Sem dados</p>';

  const R = 75, C = Math.PI * 2 * R;
  let offset = 0;

  const arcs = segments.map(d => {
    const pct = ((d.value / total) * 100).toFixed(1);
    const dash = (d.value / total) * C;
    const arc = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${d.color}"
      stroke-width="22" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" opacity="0.88">
      <title>${d.label}: ${pct}%</title>
    </circle>`;
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

function renderAssetPanel(key) {
  const meta = CLASS_META[key];
  const assets = state.portfolio[key] || [];
  const hidden = isClassHidden(key);
  const targetAssetIds = hidden ? [] : findMostDeficientAssets(key);

  const eyeIcon = hidden ? 'eye-off' : 'eye';
  const eyeTitle = hidden ? 'Mostrar classe no portfólio' : 'Ocultar classe do portfólio';

  let html = `
    <div class="asset-section-header">
      <h2 class="asset-section-title" style="color:${meta.color}">
        <i data-lucide="${meta.icon}" class="section-icon"></i> ${meta.label}
        ${hidden ? renderHiddenBadge() : ''}
      </h2>
      <button class="btn btn--icon toggle-hidden-btn" data-toggle-hidden="${key}" title="${eyeTitle}">
        <i data-lucide="${eyeIcon}"></i>
      </button>
    </div>
    <div class="edit-target-row">
      <label>Meta da classe:</label>
      <input type="text" value="${classTargetPct(key).toFixed(0)}" data-class-target="${key}" inputmode="decimal">
      <span>% do portfólio</span>
    </div>`;

  if (hidden) {
    html += `
      <div class="hidden-class-notice">
        <i data-lucide="eye-off" style="width:16px;height:16px"></i>
        <p>Classe oculta. Valores não contabilizados no patrimônio total e sem sugestões de aporte.</p>
      </div>`;
  }

  if (assets.length === 0) {
    html += `
      <div class="empty-class">
        <p>Nenhum ativo nesta classe.</p>
        <button class="btn btn--primary add-to-empty" data-add-class="${key}">+ Adicionar ativo</button>
      </div>`;
    return html;
  }

  html += `
    <div class="table-wrap">
    <table class="asset-table">
      <thead><tr>
        <th>Nome</th>
        <th class="col-r">Qtd</th>
        <th class="col-r">Preço</th>
        <th class="col-r">Hoje</th>
        <th class="col-r">Total</th>
        <th class="col-r edit-th">Meta %</th>
        <th class="edit-th"></th>
      </tr></thead>
      <tbody>`;

  assets.forEach((asset, idx) => {
    const isTarget = targetAssetIds.includes(asset.id);
    const quarantined = isQuarantined(asset);
    const p = state.prices[asset.id];
    const value = assetValueBRL(key, asset);

    let priceStr = '', changeHtml = '';
    const isDeclaredValue = key === 'fixedIncome' || key === 'realEstate' || (key === 'storeOfValue' && !p);
    if (isDeclaredValue) {
      priceStr = 'Declarado';
    } else if (p) {
      const sym = p.currency === 'USD' ? '$ ' : 'R$ ';
      priceStr = sym + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (p.change !== undefined) {
        const cls = p.change >= 0 ? 'change-up' : 'change-down';
        changeHtml = `<span class="${cls}">${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}%</span>`;
      }
    }

    const rowClass = hidden ? 'row-hidden' : isTarget ? 'row-target' : quarantined ? 'row-quarantine' : '';
    const badgeHtml = isTarget ? renderAportarBadge() : quarantined ? renderQuarantineBadge() : '';

    // External link for quoted tickers
    const url = tickerUrl(key, asset.id);
    const tickerHtml = url
      ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link" title="Ver no Google Finance">${asset.id}</a>`
      : asset.id;

    html += `
        <tr class="${rowClass}">
          <td class="td-ticker">${tickerHtml}${badgeHtml}</td>
          <td class="td-r view-cell">${formatQty(asset.amount)}</td>
          <td class="td-r edit-cell">
            <input type="text" value="${asset.amount}" data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal">
          </td>
          <td class="td-price">${priceStr}</td>
          <td class="td-change">${changeHtml}</td>
          <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
          <td class="td-r edit-cell">
            <input type="text" value="${asset.target !== undefined ? asset.target : ''}"
              data-class="${key}" data-idx="${idx}" data-field="target"
              placeholder="auto" style="width:45px" inputmode="decimal" title="Meta % (0 = quarentena)">
          </td>
          <td class="edit-cell">
            <button class="edit-remove-btn" data-class="${key}" data-idx="${idx}" title="Remover">
              <i data-lucide="x" style="width:12px;height:12px"></i>
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
