import { settings } from './state.js';
import { t } from './i18n.js';
import { allAssetsWeighted, formatBRL } from './calc.js';

// Reads the rendered class color from the DOM, falling back to a neutral gray.
function getClassColor(key) {
  const element = document.querySelector(`[data-goto="${key}"]`);
  if (element) {
    const color = getComputedStyle(element).getPropertyValue('--card-color').trim();
    if (color) return color;
  }
  return '#888';
}

// WCAG relative luminance, used to pick readable label colors over each bubble.
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

// Truncates a label with an ellipsis to fit the bubble radius.
function fitLabel(name, radius) {
  const fontSize = Math.min(radius * 0.45, 14);
  const maxChars = Math.floor((radius * 1.6) / (fontSize * 0.6));
  return name.length <= maxChars
    ? name
    : maxChars >= 3 ? name.slice(0, maxChars - 1) + '…' : name.slice(0, maxChars);
}

// Force-directed bubble layout: each visible asset is a circle sized by its value.
export function renderBubbleChart() {
  const container = document.getElementById('bubbleChart');
  if (!container || typeof d3 === 'undefined') return;

  const assets = allAssetsWeighted();
  if (!assets.length) {
    container.innerHTML = `<p class="chart-empty">${t('noData')}</p>`;
    return;
  }

  const colorMap = {};
  for (const asset of assets) colorMap[asset.classKey] ??= getClassColor(asset.classKey);

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const bounds = container.getBoundingClientRect();
  const width = Math.max(280, Math.floor(bounds.width || container.clientWidth || 320));
  const height = Math.max(200, Math.floor(bounds.height || 400));
  const padding = Math.min(width, height) < 360 ? 2 : 3;

  // Compute radii proportional to value, scaled to fit the available area without overlap.
  const area = width * height;
  const scaleFactor = Math.sqrt(area / totalValue) * 0.44;
  const nodes = assets.map(asset => ({
    ...asset,
    r: Math.max(8, Math.sqrt(asset.value) * scaleFactor),
    x: width / 2 + (Math.random() - 0.5) * width * 0.3,
    y: height / 2 + (Math.random() - 0.5) * height * 0.3,
  }));

  // Force simulation distributes circles into the rectangle without overlap.
  const simulation = d3.forceSimulation(nodes)
    .force('collide', d3.forceCollide(d => d.r + padding + 1).iterations(4).strength(1))
    .force('x', d3.forceX(width / 2).strength(0.07))
    .force('y', d3.forceY(height / 2).strength(0.07))
    .stop();

  for (let i = 0; i < 300; i++) {
    simulation.tick();
    for (const node of nodes) {
      node.x = Math.max(node.r, Math.min(width - node.r, node.x));
      node.y = Math.max(node.r, Math.min(height - node.r, node.y));
    }
  }

  const percentOf = node => totalValue > 0 ? ((node.value / totalValue) * 100).toFixed(1) : '0';
  const bubbleInfo = node => settings.sardineMode
    ? `${node.id}: ${formatBRL(node.value)} (${percentOf(node)}%)`
    : `${node.id}: ${percentOf(node)}%`;
  const fillColor = node => colorMap[node.classKey];
  const labelColor = node => bubbleTextColor(fillColor(node));
  const sublabelColor = node => bubbleSubtextColor(fillColor(node));

  const svg = d3.select(container)
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', t('a11yBubbleChart'));

  const groups = svg.selectAll('g')
    .data(nodes)
    .join('g')
    .attr('transform', node => `translate(${node.x},${node.y})`);

  groups.append('circle')
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

  groups.append('title')
    .text(bubbleInfo);

  groups.on('click', (_event, node) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = bubbleInfo(node);
    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  });

  groups.filter(node => node.r > 16)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', labelColor)
    .attr('font-family', 'var(--font-h)')
    .attr('font-weight', '700')
    .attr('font-size', node => Math.min(node.r * 0.45, 14))
    .text(node => fitLabel(node.id, node.r))
    .style('pointer-events', 'none');

  groups.filter(node => node.r > 28)
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
