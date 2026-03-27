import { state, CLASS_META, CLASS_KEYS, visibleClassKeys, isClassHidden, isBrQuoted, pricesStale, pricesDateStr, hasCachedPrices, classItems } from './state.js';
import {
  formatBRL, formatCompact,
  assetValueBRL, classTotalBRL, portfolioTotalBRL,
  classTargetPct, classActualPct, isQuarantined,
  allocationWarning,
  findMostDeficientClasses, findMostDeficientAssets,
} from './calc.js';

const $ = s => document.querySelector(s);

function hasItems(key) {
  return classItems(key).length > 0;
}

function notice(icon, text, variant = 'warning') {
  return `<div class="notice notice--${variant}">
    <i data-lucide="${icon}" class="notice-icon"></i><span>${text}</span></div>`;
}

function badge(cls, icon, label, title) {
  return ` <span class="badge badge--${cls}" title="${title}"><i data-lucide="${icon}" class="badge-icon"></i>${label}</span>`;
}

const aportarBadge = () => badge('aportar', 'sparkles', 'aportar', 'Classe ou ativo com maior necessidade de aporte');
const ignorarBadge = () => badge('ignorar', 'circle-pause', 'ignorar', 'Em quarentena, sem sugestão de aporte');

function tickerUrl(classKey, tickerId) {
  const p = state.prices[tickerId];
  if ((classKey === 'brStocks' || classKey === 'brFiis') && (isBrQuoted(tickerId) || p)) {
    return `https://www.google.com/finance/quote/${tickerId}:BVMF`;
  }
  if ((classKey === 'usStocks' || classKey === 'usReits') && p) {
    return `https://finance.yahoo.com/quote/${tickerId}`;
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
    ...CLASS_KEYS.map(k => ({
      key: k, label: CLASS_META[k].label,
      count: classItems(k).length,
      hidden: isClassHidden(k),
    })),
  ];

  $('#tabNav').innerHTML = tabs.map(t => `
    <button class="tab-btn ${t.key === state.activeTab ? 'active' : ''} ${t.hidden ? 'tab-hidden' : ''}" data-tab="${t.key}">
      ${t.label}${t.count !== null ? `<span class="tab-count">${t.count}</span>` : ''}
    </button>`).join('');
}

function renderPanels() {
  let html = panelWrap('overview', renderOverview());
  for (const key of CLASS_KEYS) html += panelWrap(key, renderAssetPanel(key));
  $('#panels').innerHTML = html;
}

function panelWrap(key, content) {
  return `<div class="tab-panel ${key === state.activeTab ? 'active' : ''}" data-panel="${key}">${content}</div>`;
}

function renderOverview() {
  const deficientClasses = findMostDeficientClasses();
  const populated = CLASS_KEYS.filter(hasItems);

  const chartData = populated.map(k => {
    const hidden = isClassHidden(k);
    const total = classTotalBRL(k);
    const items = classItems(k);
    return {
      key: k, label: CLASS_META[k].label, color: CLASS_META[k].color, icon: CLASS_META[k].icon,
      value: hidden ? 0 : (total ?? items.length * 0.01),
      count: items.length, hasPrices: total !== null, total, hidden,
    };
  });

  let html = '';

  const warning = allocationWarning();
  if (warning) {
    html += notice('triangle-alert',
      `As metas somam <strong>${warning.sum}%</strong>, mas deveriam totalizar 100%.`, 'warning');
  }

  if (hasCachedPrices() && pricesStale()) {
    html += notice('clock',
      `Cotações desatualizadas (sync: <strong>${pricesDateStr()}</strong>). Clique em <strong>Cotar</strong> para atualizar.`, 'info');
  } else if (!hasCachedPrices()) {
    html += notice('clock',
      'Nenhuma cotação carregada. Clique em <strong>Cotar</strong> para buscar preços.', 'info');
  }

  html += '<div class="overview-grid">';

  // Chart card
  html += '<div class="chart-card">';
  html += renderDonut(chartData.filter(d => !d.hidden));
  html += '<div class="chart-legend">';
  chartData.forEach(d => {
    const hCls = d.hidden ? 'legend-row--hidden' : '';
    const eyeIcon = d.hidden ? 'eye-off' : 'eye';
    const eyeHint = d.hidden ? 'Reativar classe' : 'Ocultar classe';
    html += `
      <div class="legend-row ${hCls}">
        <span class="legend-dot" style="background:${d.hidden ? 'var(--text-muted)' : d.color}"></span>
        <span class="legend-label" data-goto="${d.key}">${d.label}</span>
        <span class="legend-amount ${d.hidden ? 'legend-amount--hidden' : ''}">${d.hasPrices ? formatBRL(d.total) : d.count + ' pos.'}</span>
        <button class="legend-eye" data-toggle-hidden="${d.key}" title="${eyeHint}">
          <i data-lucide="${eyeIcon}"></i>
        </button>
      </div>`;
  });
  html += '</div></div>';

  // Summary cards
  html += '<div class="summary-cards">';
  populated.filter(k => !isClassHidden(k)).forEach(key => {
    const meta = CLASS_META[key];
    const classTotal = classTotalBRL(key);
    const actual = classActualPct(key);
    const target = classTargetPct(key);
    const isDeficient = deficientClasses.includes(key);
    const pct = actual !== null && target > 0 ? Math.min((actual / target) * 100, 100) : 0;

    html += `
      <div class="summary-card" style="--card-color:${meta.color}">
        <div class="summary-card-head">
          <span class="summary-card-label" data-goto="${key}">
            <i data-lucide="${meta.icon}" class="summary-icon"></i>
            ${meta.label}${isDeficient ? aportarBadge() : ''}
          </span>
        </div>
        <div class="summary-card-value" data-goto="${key}">
          ${classTotal !== null ? formatBRL(classTotal) : classItems(key).length + ' ativos'}
        </div>
        <div class="summary-card-bar"><div class="summary-card-bar-fill" style="width:${pct}%"></div></div>
        <div class="summary-card-meta">
          ${actual !== null ? `<span class="summary-card-actual">${actual.toFixed(1)}%</span>` : ''}
          <span class="summary-card-target-wrap">
            meta
            <input class="summary-card-target" type="text" value="${target.toFixed(0)}"
              data-class-target="${key}" inputmode="decimal" title="Meta da classe (%)">%
          </span>
        </div>
      </div>`;
  });
  html += '</div></div>';

  return html;
}

function renderDonut(segments) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '<p class="donut-empty">Sem dados</p>';

  const R = 75, C = Math.PI * 2 * R;
  let offset = 0;

  const arcs = segments.map(d => {
    const pct = ((d.value / total) * 100).toFixed(1);
    const dash = (d.value / total) * C;
    const arc = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${d.color}"
      stroke-width="22" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" opacity="0.88">
      <title>${d.label}: ${formatBRL(d.value)} (${pct}%)</title>
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
  const items = classItems(key);
  const hidden = isClassHidden(key);
  const deficientAssets = hidden ? [] : findMostDeficientAssets(key);

  let html = `
    <div class="asset-section-header">
      <h2 class="asset-section-title" style="color:${meta.color}">
        <i data-lucide="${meta.icon}" class="section-icon"></i> ${meta.label}
      </h2>
    </div>`;

  if (hidden) {
    html += notice('eye-off', 'Classe oculta. Valores não contabilizados no patrimônio e sem sugestões de aporte.', 'info');
  }

  if (items.length === 0) {
    html += `<div class="empty-class"><p>Nenhum ativo nesta classe.</p>
      <button class="btn btn--primary add-to-empty" data-add-class="${key}">+ Adicionar ativo</button></div>`;
    return html;
  }

  html += `<div class="table-wrap"><table class="asset-table">
    <thead><tr>
      <th>Nome</th><th class="col-r">Qtd</th><th class="col-r">Preço</th>
      <th class="col-r">Hoje</th><th class="col-r">Total</th>
      <th class="col-r">Meta %</th><th class="col-action"></th>
    </tr></thead><tbody>`;

  items.forEach((asset, idx) => {
    const isDeficient = deficientAssets.includes(asset.id);
    const quarantined = isQuarantined(asset);
    const p = state.prices[asset.id];
    const value = assetValueBRL(key, asset);

    let priceStr = '', changeHtml = '';
    const isDeclared = key === 'fixedIncome' || key === 'assets' || (key === 'storeOfValue' && !p);
    if (isDeclared) {
      priceStr = 'Declarado';
    } else if (p) {
      const sym = p.currency === 'USD' ? '$ ' : 'R$ ';
      priceStr = sym + p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (p.change !== undefined) {
        const cls = p.change >= 0 ? 'change-up' : 'change-down';
        changeHtml = `<span class="${cls}">${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}%</span>`;
      }
    }

    const rowCls = isDeficient ? 'row-target' : quarantined ? 'row-quarantine' : '';
    const bdg = isDeficient ? aportarBadge() : quarantined ? ignorarBadge() : '';

    const url = tickerUrl(key, asset.id);
    const noteEsc = asset.note ? asset.note.replace(/"/g, '&quot;') : '';
    const noteAttr = asset.note ? ` title="${noteEsc}"` : '';
    const noteCls = asset.note ? ' has-note' : '';

    const tickerHtml = url
      ? `<a href="${url}" target="_blank" rel="noopener" class="ticker-link"${noteAttr}>${asset.id}</a>`
      : `<span class="ticker-note${noteCls}" data-note-class="${key}" data-note-id="${asset.id}"${noteAttr}>${asset.id}</span>`;

    html += `<tr class="${rowCls}">
      <td class="td-ticker">${tickerHtml}${bdg}</td>
      <td class="td-r"><input class="inline-input inline-input--qty" type="text" value="${asset.amount}"
        data-class="${key}" data-idx="${idx}" data-field="amount" inputmode="decimal"></td>
      <td class="td-price">${priceStr}</td>
      <td class="td-change">${changeHtml}</td>
      <td class="td-value" style="color:${meta.color}">${value !== null ? formatBRL(value) : ''}</td>
      <td class="td-r"><input class="inline-input inline-input--target" type="text"
        value="${asset.target !== undefined ? asset.target : ''}"
        data-class="${key}" data-idx="${idx}" data-field="target"
        placeholder="auto" inputmode="decimal" title="Meta do ativo na classe"></td>
      <td class="td-action"><button class="remove-btn" data-class="${key}" data-idx="${idx}" title="Remover ${asset.id}">
        <i data-lucide="x" style="width:12px;height:12px"></i></button></td>
    </tr>`;
  });

  html += `<tr class="add-row" data-add-class="${key}">
    <td colspan="7">+ Adicionar ativo</td></tr></tbody></table></div>`;

  return html;
}
