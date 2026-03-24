import { state, CLASS_META, CLASS_KEYS, activeClassKeys } from './state.js';
import {
  formatBRL, formatQty, formatCompact,
  assetValueBRL, classTotalBRL, portfolioTotalBRL,
  classTargetPct, classActualPct, isQuarantined,
  findMostDeficientClasses, findMostDeficientAssets,
} from './calc.js';

const $ = (s) => document.querySelector(s);
const SMART_BADGE_TITLE = 'Sugestão inteligente baseada no desvio para a alocação-alvo.';

function classHasAssets(key) {
  return (state.portfolio[key] || []).length > 0;
}

function renderAportarBadge() {
  return ` <span class="badge badge--aportar" title="${SMART_BADGE_TITLE}">aportar</span>`;
}

function renderQuarantineBadge() {
  return ' <span class="badge badge--ignorar">ignorar</span>';
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
    { key: 'overview', label: 'Visão Geral', count: null },
    ...activeClassKeys().map(k => ({
      key: k,
      label: CLASS_META[k].label,
      count: (state.portfolio[k] || []).length,
    })),
  ];

  $('#tabNav').innerHTML = tabs.map(t => `
    <button class="tab-btn ${t.key === state.activeTab ? 'active' : ''}" data-tab="${t.key}">
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

  const chartData = populatedKeys.map(k => {
    const total = classTotalBRL(k);
    const count = state.portfolio[k].length;
    return {
      key: k, label: CLASS_META[k].label, color: CLASS_META[k].color, icon: CLASS_META[k].icon,
      value: total ?? count * 0.01,
      count, hasPrices: total !== null, total,
    };
  });

  let html = '<div class="overview-grid">';

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
    const classTotal = classTotalBRL(key);
    const actual = classActualPct(key);
    const target = classTargetPct(key);
    const isTarget = targetClasses.includes(key);
    const barFill = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;
    const aportarHtml = isTarget ? renderAportarBadge() : '';

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
  const targetAssetIds = findMostDeficientAssets(key);

  let html = `
    <div class="asset-section-header">
      <h2 class="asset-section-title" style="color:${meta.color}">
        <i data-lucide="${meta.icon}" class="section-icon"></i> ${meta.label}
      </h2>
    </div>
    <div class="edit-target-row">
      <label>Meta da classe:</label>
      <input type="text" value="${classTargetPct(key).toFixed(0)}" data-class-target="${key}" inputmode="decimal">
      <span>% do portfólio</span>
    </div>`;

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

    const rowClass = isTarget ? 'row-target' : quarantined ? 'row-quarantine' : '';
    const badgeHtml = isTarget ? renderAportarBadge() : quarantined ? renderQuarantineBadge() : '';

    html += `
        <tr class="${rowClass}">
          <td class="td-ticker">${asset.id}${badgeHtml}</td>
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
