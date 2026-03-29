import { CLASS_KEYS, portfolio, prices, settings, setActiveTab, loadTheme, toggleTheme } from './js/state.js';
import { fetchAllPrices } from './js/api.js';
import { render, toggleSort } from './js/render.js';

const $ = s => document.querySelector(s);

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
  const delay = action ? 5000 : 3000;
  setTimeout(() => el.remove(), delay);
}

function showLoading(text, pct) {
  const overlay = $('#loadingOverlay');
  $('#loadingText').textContent = text;
  const fill = $('#loadingBarFill');
  if (pct !== undefined) fill.style.width = `${Math.round(pct * 100)}%`;
  else fill.style.width = '0%';
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
  const overlay = $('#loadingOverlay');
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { portfolio.save(); render(); }, 600);
}

async function refreshPrices() {
  if (!settings.hasTokens) { toast('Configure os tokens de API em ⚙️'); return; }
  const ok = await fetchAllPrices(showLoading);
  hideLoading(); render();
  toast(ok ? 'Cotações atualizadas' : 'Erro ao buscar cotações');
}

/** Keeps Tab cycling inside an open modal. */
function trapFocus(modal) {
  const focusable = modal.querySelectorAll('input, textarea, button, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  const handler = e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
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

let addTargetClass = null;

function openAddModal(cls) {
  addTargetClass = cls;
  $('#newTicker').value = ''; $('#newAmount').value = ''; $('#newTarget').value = '';
  openModal('#addModal', '#newTicker');
}

function closeAddModal() { closeModal('#addModal'); addTargetClass = null; }

function confirmAddAsset() {
  const id = $('#newTicker').value.trim();
  const amount = parseFloat($('#newAmount').value.replace(',', '.'));
  if (!id) { $('#newTicker').focus(); return; }
  if (isNaN(amount) || amount < 0) { $('#newAmount').focus(); return; }
  if (portfolio.items(addTargetClass).find(a => a.id === id)) { toast(id + ' já existe'); return; }

  const item = { id, amount };
  const raw = $('#newTarget').value.trim();
  if (raw !== '') { const v = parseFloat(raw.replace(',', '.')); if (!isNaN(v) && v >= 0) item.target = v; }

  portfolio.addItem(addTargetClass, item);
  portfolio.save(); closeAddModal(); render();
  toast(id + ' adicionado');
}

let noteClass = null, noteId = null;

function openNoteModal(cls, id) {
  noteClass = cls; noteId = id;
  const item = portfolio.items(cls).find(a => a.id === id);
  $('#noteAssetName').textContent = id;
  $('#noteText').value = item?.note || '';
  openModal('#noteModal', '#noteText');
}

function closeNoteModal() { closeModal('#noteModal'); noteClass = noteId = null; }

function saveNote() {
  if (noteClass && noteId) {
    portfolio.setItemNote(noteClass, noteId, $('#noteText').value);
    closeNoteModal(); render();
  }
}

function openSettings() {
  $('#brapiToken').value = settings.brapiToken;
  $('#finnhubToken').value = settings.finnhubToken;
  openModal('#settingsModal', '#brapiToken');
}

function closeSettings() { closeModal('#settingsModal'); }

function saveSettingsModal() {
  settings.brapiToken  = $('#brapiToken').value.trim();
  settings.finnhubToken = $('#finnhubToken').value.trim();
  settings.save(); closeSettings(); toast('Configurações salvas');
}

function doExport() {
  const out = portfolio.export();
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'portfolio_' + (out.syncedAt || 'export') + '.json' }).click();
  URL.revokeObjectURL(url);
  toast('JSON exportado');
}

function doImport(file) {
  showLoading('Importando...');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!CLASS_KEYS.some(k => data[k]?.items)) throw new Error('Formato inválido');
      portfolio.import(data);
      setActiveTab('overview'); render(); hideLoading();
      toast('Carteira importada');
      if (settings.hasTokens) refreshPrices();
    } catch (err) { hideLoading(); toast('Erro: ' + err.message); }
  };
  reader.readAsText(file);
}

$('#panels').addEventListener('click', e => {
  const target = e.target.closest('[data-goto]');
  if (target && !e.target.closest('input, button')) { setActiveTab(target.dataset.goto); render(); return; }

  const addBtn = e.target.closest('.add-row, .add-to-empty');
  if (addBtn) { openAddModal(addBtn.dataset.addClass); return; }

  const removeBtn = e.target.closest('.remove-btn');
  if (removeBtn) {
    const cls = removeBtn.dataset.class;
    const items = portfolio.items(cls);
    const idx = parseInt(removeBtn.dataset.idx);
    const item = { ...items[idx] };
    items.splice(idx, 1);
    portfolio.save(); render();
    toast(item.id + ' removido', {
      label: 'Desfazer',
      handler() { portfolio.addItem(cls, item); portfolio.save(); render(); },
    });
    return;
  }

  const toggleBtn = e.target.closest('[data-toggle-hidden]');
  if (toggleBtn) { e.stopPropagation(); portfolio.toggleHidden(toggleBtn.dataset.toggleHidden); render(); return; }

  const noteBtn = e.target.closest('.note-btn');
  if (noteBtn) { openNoteModal(noteBtn.dataset.noteClass, noteBtn.dataset.noteId); return; }

  const sortTh = e.target.closest('th[data-sort]');
  if (sortTh) { toggleSort(sortTh.dataset.sort); render(); return; }
});

$('#panels').addEventListener('change', e => {
  const input = e.target.closest('.inline-input');
  if (!input) return;

  if (input.dataset.field === 'amount') {
    const val = parseFloat(input.value.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      portfolio.items(input.dataset.class)[parseInt(input.dataset.idx)].amount = val;
      scheduleSave();
    }
    return;
  }

  if (input.dataset.field === 'target') {
    const items = portfolio.items(input.dataset.class);
    const idx = parseInt(input.dataset.idx);
    const raw = input.value.trim();
    if (raw === '') delete items[idx].target;
    else { const val = parseFloat(raw.replace(',', '.')); if (!isNaN(val) && val >= 0) items[idx].target = val; }
    scheduleSave();
    return;
  }

  const classTarget = e.target.closest('[data-class-target]');
  if (classTarget) {
    const val = parseFloat(classTarget.value.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      portfolio.setTarget(classTarget.dataset.classTarget, val);
      portfolio.save(); render();
    }
  }
});

$('#panels').addEventListener('click', e => {
  if (e.target.closest('[data-class-target]')) e.stopPropagation();
});

$('#tabNav').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (btn) { setActiveTab(btn.dataset.tab); render(); }
});

/* Drag & Drop — only react to external file drags, not internal element drags */
function isFileDrag(e) { return e.dataTransfer?.types?.includes('Files'); }

let dragN = 0;
document.addEventListener('dragenter', e => { if (!isFileDrag(e)) return; e.preventDefault(); dragN++; $('#dropZone').classList.add('visible'); });
document.addEventListener('dragleave', e => { if (!isFileDrag(e)) return; e.preventDefault(); if (--dragN <= 0) { dragN = 0; $('#dropZone').classList.remove('visible'); } });
document.addEventListener('dragover', e => { if (isFileDrag(e)) e.preventDefault(); });
document.addEventListener('drop', e => { e.preventDefault(); dragN = 0; $('#dropZone').classList.remove('visible'); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.json')) doImport(f); else if (f) toast('Apenas arquivos .json'); });

$('#btnExport').addEventListener('click', doExport);
$('#btnImport').addEventListener('click', () => $('#fileInput').click());
$('#btnWelcomeImport').addEventListener('click', () => $('#fileInput').click());
$('#btnPrices').addEventListener('click', refreshPrices);
$('#btnSettings').addEventListener('click', openSettings);
$('#btnTheme').addEventListener('click', () => { toggleTheme(); if (typeof lucide !== 'undefined') lucide.createIcons(); });
$('#fileInput').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });

$('#modalCancel').addEventListener('click', closeAddModal);
$('#modalConfirm').addEventListener('click', confirmAddAsset);
$('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAddModal(); });
$('#settingsCancel').addEventListener('click', closeSettings);
$('#settingsSave').addEventListener('click', saveSettingsModal);
$('#settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') closeSettings(); });
$('#noteCancel').addEventListener('click', closeNoteModal);
$('#noteSave').addEventListener('click', saveNote);
$('#noteModal').addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });

$('#newTicker').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newAmount').focus(); });
$('#newAmount').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newTarget').focus(); });
$('#newTarget').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddAsset(); });
$('#noteText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#addModal').classList.contains('open')) closeAddModal();
    else if ($('#settingsModal').classList.contains('open')) closeSettings();
    else if ($('#noteModal').classList.contains('open')) closeNoteModal();
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

loadTheme(); settings.load(); portfolio.load(); prices.load(); render();
