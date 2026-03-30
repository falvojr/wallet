import {
  CLASS_KEYS, portfolio, preferences, prices, settings,
  setActiveTab, loadTheme, toggleTheme,
} from './js/state.js';
import { t } from './js/i18n.js';
import { fetchAllPrices } from './js/api.js';
import { render, renderOverviewOnly, renderChartOnly, toggleSort } from './js/render.js';

const $ = s => document.querySelector(s);

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function toast(msg, action) {
  const el = document.createElement('div');
  el.className = action ? 'toast toast--has-action' : 'toast';

  if (action) {
    const span = document.createElement('span');
    span.textContent = msg;
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.handler(); el.remove(); });
    el.append(span, btn);
  } else {
    el.textContent = msg;
  }

  $('#toastContainer').appendChild(el);
  setTimeout(() => el.remove(), action ? 5000 : 3000);
}

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

function showLoading(text, pct) {
  const overlay = $('#loadingOverlay');
  $('#loadingText').textContent = text;
  $('#loadingBarFill').style.width = pct !== undefined ? `${Math.round(pct * 100)}%` : '0%';
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
  const overlay = $('#loadingOverlay');
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
}

// ---------------------------------------------------------------------------
// Auto-save (debounced for inline edits)
// ---------------------------------------------------------------------------

let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    portfolio.save();
    render();
  }, 600);
}

async function refreshPrices() {
  if (!settings.hasTokens) {
    toast(t('toastConfigTokens'));
    return;
  }
  const ok = await fetchAllPrices(showLoading);
  hideLoading();
  render();
  toast(ok ? t('toastPricesOk') : t('toastPricesFail'));
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function trapFocus(modal) {
  const focusable = modal.querySelectorAll('input, textarea, button, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const handler = e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  modal.addEventListener('keydown', handler);
  modal._focusTrap = handler;
}

function releaseFocus(modal) {
  if (modal._focusTrap) {
    modal.removeEventListener('keydown', modal._focusTrap);
    delete modal._focusTrap;
  }
}

let previousFocus = null;

function openModal(id, focusSelector) {
  previousFocus = document.activeElement;
  const modal = $(id);
  modal.classList.add('open');
  trapFocus(modal);
  if (focusSelector) setTimeout(() => $(focusSelector)?.focus(), 100);
}

function closeModal(id) {
  const modal = $(id);
  modal.classList.remove('open');
  releaseFocus(modal);
  previousFocus?.focus();
  previousFocus = null;
}

// Add asset modal

let addTargetClass = null;

function openAddModal(cls) {
  addTargetClass = cls;
  $('#newTicker').value = '';
  $('#newAmount').value = '';
  $('#newTarget').value = '';
  openModal('#addModal', '#newTicker');
}

function closeAddModal() {
  closeModal('#addModal');
  addTargetClass = null;
}

function confirmAddAsset() {
  const id = $('#newTicker').value.trim();
  const amount = parseFloat($('#newAmount').value.replace(',', '.'));

  if (!id) { $('#newTicker').focus(); return; }
  if (isNaN(amount) || amount < 0) { $('#newAmount').focus(); return; }
  if (portfolio.items(addTargetClass).find(a => a.id === id)) {
    toast(t('toastExists', id));
    return;
  }

  const item = { id, amount };
  const raw = $('#newTarget').value.trim();
  if (raw !== '') {
    const v = parseFloat(raw.replace(',', '.'));
    if (!isNaN(v) && v >= 0) item.target = v;
  }

  portfolio.addItem(addTargetClass, item);
  portfolio.save();
  closeAddModal();
  render();
  toast(t('toastAdded', id));
}

// Note modal

let noteClass = null;
let noteId = null;

function openNoteModal(cls, id) {
  noteClass = cls;
  noteId = id;
  const item = portfolio.items(cls).find(a => a.id === id);
  $('#noteAssetName').textContent = id;
  $('#noteText').value = item?.note || '';
  openModal('#noteModal', '#noteText');
}

function closeNoteModal() {
  closeModal('#noteModal');
  noteClass = noteId = null;
}

function saveNote() {
  if (noteClass && noteId) {
    portfolio.setItemNote(noteClass, noteId, $('#noteText').value);
    closeNoteModal();
    render();
  }
}

// Settings modal

function openSettings() {
  $('#brapiToken').value = settings.brapiToken;
  $('#finnhubToken').value = settings.finnhubToken;
  openModal('#settingsModal', '#brapiToken');
}

function closeSettings() {
  closeModal('#settingsModal');
}

function saveSettingsModal() {
  settings.brapiToken = $('#brapiToken').value.trim();
  settings.finnhubToken = $('#finnhubToken').value.trim();
  settings.save();
  closeSettings();
  toast(t('toastSettingsSaved'));
}

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

function doExport() {
  const out = portfolio.export();
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = 'portfolio_' + (out.syncedAt || 'export') + '.json';
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
  toast(t('toastExported'));
}

function doImport(file) {
  showLoading(t('loadingImporting'));
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!CLASS_KEYS.some(k => data[k]?.items)) throw new Error(t('toastInvalidFormat'));
      portfolio.import(data);
      setActiveTab('overview');
      render();
      hideLoading();
      toast(t('toastImported'));
      if (settings.hasTokens) refreshPrices();
    } catch (err) {
      hideLoading();
      toast(t('toastErrorPrefix') + err.message);
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Delegated events
// ---------------------------------------------------------------------------

// Clicks
$('#panels').addEventListener('click', e => {
  // Chart legend toggle
  const chartToggle = e.target.closest('[data-toggle-chart]');
  if (chartToggle) {
    e.stopPropagation();
    portfolio.toggleChartHidden(chartToggle.dataset.toggleChart);
    renderChartOnly();
    return;
  }

  // Card navigation
  const goto = e.target.closest('[data-goto]');
  if (goto && !e.target.closest('input, button')) {
    setActiveTab(goto.dataset.goto);
    render();
    return;
  }

  // Add asset
  const addBtn = e.target.closest('.add-row, .add-to-empty');
  if (addBtn) { openAddModal(addBtn.dataset.addClass); return; }

  // Remove asset
  const removeBtn = e.target.closest('.remove-btn');
  if (removeBtn) {
    const cls = removeBtn.dataset.class;
    const items = portfolio.items(cls);
    const idx = parseInt(removeBtn.dataset.idx);
    const item = { ...items[idx] };
    items.splice(idx, 1);
    portfolio.save();
    render();
    toast(t('toastRemoved', item.id), {
      label: t('toastUndo'),
      handler() { portfolio.addItem(cls, item); portfolio.save(); render(); },
    });
    return;
  }

  // Note
  const noteBtn = e.target.closest('.note-btn');
  if (noteBtn) {
    openNoteModal(noteBtn.dataset.noteClass, noteBtn.dataset.noteId);
    return;
  }

  // Table sort
  const sortTh = e.target.closest('th[data-sort]');
  if (sortTh) { toggleSort(sortTh.dataset.sort); render(); }
});

// Prevent card navigation when clicking editable chips
$('#panels').addEventListener('click', e => {
  if (e.target.closest('[data-class-target], [data-class-goal], [data-class-order], .summary-card-target-chip, .summary-card-order-chip')) {
    e.stopPropagation();
  }
});

// Change events (inputs)
$('#panels').addEventListener('change', e => {
  // Inline asset inputs
  const inline = e.target.closest('.inline-input');
  if (inline) {
    if (inline.dataset.field === 'amount') {
      const v = parseFloat(inline.value.replace(',', '.'));
      if (!isNaN(v) && v >= 0) {
        portfolio.items(inline.dataset.class)[parseInt(inline.dataset.idx)].amount = v;
        scheduleSave();
      }
      return;
    }
    if (inline.dataset.field === 'target') {
      const items = portfolio.items(inline.dataset.class);
      const idx = parseInt(inline.dataset.idx);
      const raw = inline.value.trim();
      if (raw === '') delete items[idx].target;
      else {
        const v = parseFloat(raw.replace(',', '.'));
        if (!isNaN(v) && v >= 0) items[idx].target = v;
      }
      scheduleSave();
      return;
    }
  }

  // Class percentage target
  const ct = e.target.closest('[data-class-target]');
  if (ct) {
    const v = parseFloat(ct.value.replace(',', '.'));
    if (!isNaN(v) && v >= 0) {
      portfolio.setTarget(ct.dataset.classTarget, v);
      portfolio.save();
      renderOverviewOnly();
    }
    return;
  }

  // Emergency reserve goal
  const cg = e.target.closest('[data-class-goal]');
  if (cg) {
    const v = parseFloat(cg.value.replace(',', '.'));
    if (!isNaN(v) && v >= 0) {
      portfolio.setGoal(cg.dataset.classGoal, v);
      portfolio.save();
      renderOverviewOnly();
    }
    return;
  }

  // Class display order (local preference, not portfolio data)
  const co = e.target.closest('[data-class-order]');
  if (co) {
    const v = parseInt(co.value);
    if (!isNaN(v) && v > 0) {
      preferences.setOrder(co.dataset.classOrder, v);
      renderOverviewOnly();
    }
  }
});

// Tab navigation
$('#tabNav').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (btn) {
    setActiveTab(btn.dataset.tab);
    render();
  }
});

// ---------------------------------------------------------------------------
// Drag & Drop (file import)
// ---------------------------------------------------------------------------

function isFileDrag(e) { return e.dataTransfer?.types?.includes('Files'); }

let dragN = 0;

document.addEventListener('dragenter', e => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dragN++;
  $('#dropZone').classList.add('visible');
});

document.addEventListener('dragleave', e => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  if (--dragN <= 0) { dragN = 0; $('#dropZone').classList.remove('visible'); }
});

document.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });

document.addEventListener('drop', e => {
  e.preventDefault();
  dragN = 0;
  $('#dropZone').classList.remove('visible');
  const f = e.dataTransfer.files[0];
  if (f?.name.endsWith('.json')) doImport(f);
  else if (f) toast(t('toastJsonOnly'));
});

// ---------------------------------------------------------------------------
// Static event bindings
// ---------------------------------------------------------------------------

$('#btnImport').addEventListener('click', () => $('#fileInput').click());
$('#btnExport').addEventListener('click', doExport);
$('#btnTheme').addEventListener('click', () => {
  toggleTheme();
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
$('#btnSettings').addEventListener('click', openSettings);
$('#btnPrices').addEventListener('click', refreshPrices);
$('#btnWelcomeImport').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', e => {
  if (e.target.files[0]) doImport(e.target.files[0]);
  e.target.value = '';
});

$('#modalCancel').addEventListener('click', closeAddModal);
$('#modalConfirm').addEventListener('click', confirmAddAsset);
$('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAddModal(); });

$('#settingsCancel').addEventListener('click', closeSettings);
$('#settingsSave').addEventListener('click', saveSettingsModal);
$('#settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') closeSettings(); });

$('#noteCancel').addEventListener('click', closeNoteModal);
$('#noteSave').addEventListener('click', saveNote);
$('#noteModal').addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });

// Keyboard shortcuts
$('#newTicker').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newAmount').focus(); });
$('#newAmount').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newTarget').focus(); });
$('#newTarget').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddAsset(); });
$('#noteText').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#addModal').classList.contains('open')) closeAddModal();
  else if ($('#settingsModal').classList.contains('open')) closeSettings();
  else if ($('#noteModal').classList.contains('open')) closeNoteModal();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

loadTheme();
settings.load();
preferences.load();
portfolio.load();
prices.load();
render();
