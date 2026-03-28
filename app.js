import { state, savePortfolio, saveSettings, loadPortfolio, loadSettings, loadCachedPrices, CLASS_KEYS, hasApiTokens, loadTheme, toggleTheme, toggleClassHidden, setItemNote, classItems, addItem, setClassTarget, importPortfolio, exportPortfolio } from './js/state.js';
import { fetchAllPrices } from './js/api.js';
import { render } from './js/render.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showLoading(text) {
  const overlay = $('#loadingOverlay');
  $('#loadingText').textContent = text;
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
  saveTimer = setTimeout(() => { savePortfolio(); render(); }, 600);
}

async function refreshPrices() {
  if (!hasApiTokens()) { toast('Configure os tokens de API em ⚙️'); return; }
  const ok = await fetchAllPrices(showLoading);
  hideLoading(); render();
  toast(ok ? 'Cotações atualizadas' : 'Erro ao buscar cotações');
}

/* Focus trap: keeps Tab cycling inside an open modal. */
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

/* Modal helpers */
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

/* Add asset modal */
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
  if (isNaN(amount) || amount <= 0) { $('#newAmount').focus(); return; }
  if (classItems(addTargetClass).find(a => a.id === id)) { toast(id + ' já existe'); return; }

  const item = { id, amount };
  const raw = $('#newTarget').value.trim();
  if (raw !== '') { const v = parseFloat(raw.replace(',', '.')); if (!isNaN(v) && v >= 0) item.target = v; }

  addItem(addTargetClass, item);
  savePortfolio(); closeAddModal(); render();
  toast(id + ' adicionado');
}

/* Note modal */
let noteClass = null, noteId = null;

function openNoteModal(cls, id) {
  noteClass = cls; noteId = id;
  const item = classItems(cls).find(a => a.id === id);
  $('#noteAssetName').textContent = id;
  $('#noteText').value = item?.note || '';
  openModal('#noteModal', '#noteText');
}

function closeNoteModal() { closeModal('#noteModal'); noteClass = noteId = null; }

function saveNote() {
  if (noteClass && noteId) { setItemNote(noteClass, noteId, $('#noteText').value); closeNoteModal(); render(); }
}

/* Settings modal */
function openSettings() {
  $('#brapiToken').value = state.settings.brapiToken || '';
  $('#finnhubToken').value = state.settings.finnhubToken || '';
  openModal('#settingsModal', '#brapiToken');
}

function closeSettings() { closeModal('#settingsModal'); }

function saveSettingsModal() {
  state.settings.brapiToken = $('#brapiToken').value.trim();
  state.settings.finnhubToken = $('#finnhubToken').value.trim();
  saveSettings(); closeSettings(); toast('Configurações salvas');
}

/* Export / Import */
function doExport() {
  const out = exportPortfolio();
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
      importPortfolio(data); render(); hideLoading(); toast('Carteira importada');
      if (hasApiTokens()) refreshPrices();
    } catch (err) { hideLoading(); toast('Erro: ' + err.message); }
  };
  reader.readAsText(file);
}

/* Event delegation on #panels — avoids rebinding after every render */
$('#panels').addEventListener('click', e => {
  const target = e.target.closest('[data-goto]');
  if (target) { state.activeTab = target.dataset.goto; render(); return; }

  const addBtn = e.target.closest('.add-row, .add-to-empty');
  if (addBtn) { openAddModal(addBtn.dataset.addClass); return; }

  const removeBtn = e.target.closest('.remove-btn');
  if (removeBtn) {
    const items = classItems(removeBtn.dataset.class);
    const idx = parseInt(removeBtn.dataset.idx);
    const item = items[idx];
    if (confirm('Remover ' + item.id + '?')) {
      items.splice(idx, 1); savePortfolio(); render();
      toast(item.id + ' removido');
    }
    return;
  }

  const toggleBtn = e.target.closest('[data-toggle-hidden]');
  if (toggleBtn) { e.stopPropagation(); toggleClassHidden(toggleBtn.dataset.toggleHidden); render(); return; }

  const noteEl = e.target.closest('.ticker-note');
  if (noteEl) { openNoteModal(noteEl.dataset.noteClass, noteEl.dataset.noteId); return; }
});

$('#panels').addEventListener('change', e => {
  const input = e.target.closest('.inline-input');
  if (!input) return;

  if (input.dataset.field === 'amount') {
    const val = parseFloat(input.value.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      classItems(input.dataset.class)[parseInt(input.dataset.idx)].amount = val;
      scheduleSave();
    }
    return;
  }

  if (input.dataset.field === 'target') {
    const items = classItems(input.dataset.class);
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
      setClassTarget(classTarget.dataset.classTarget, val);
      savePortfolio(); render();
    }
  }
});

/* Prevent class-target click from propagating to card navigation */
$('#panels').addEventListener('click', e => {
  if (e.target.closest('[data-class-target]')) e.stopPropagation();
});

/* Tab navigation — delegated */
$('#tabNav').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (btn) { state.activeTab = btn.dataset.tab; render(); }
});

/* Drag & Drop */
let dragN = 0;
document.addEventListener('dragenter', e => { e.preventDefault(); dragN++; $('#dropZone').classList.add('visible'); });
document.addEventListener('dragleave', e => { e.preventDefault(); if (--dragN <= 0) { dragN = 0; $('#dropZone').classList.remove('visible'); } });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); dragN = 0; $('#dropZone').classList.remove('visible'); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.json')) doImport(f); else toast('Apenas arquivos .json'); });

/* Global button listeners */
$('#btnExport').addEventListener('click', doExport);
$('#btnImport').addEventListener('click', () => $('#fileInput').click());
$('#btnWelcomeImport').addEventListener('click', () => $('#fileInput').click());
$('#btnPrices').addEventListener('click', refreshPrices);
$('#btnSettings').addEventListener('click', openSettings);
$('#btnTheme').addEventListener('click', () => { toggleTheme(); if (typeof lucide !== 'undefined') lucide.createIcons(); });
$('#fileInput').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });

/* Modal button listeners */
$('#modalCancel').addEventListener('click', closeAddModal);
$('#modalConfirm').addEventListener('click', confirmAddAsset);
$('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAddModal(); });
$('#settingsCancel').addEventListener('click', closeSettings);
$('#settingsSave').addEventListener('click', saveSettingsModal);
$('#settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') closeSettings(); });
$('#noteCancel').addEventListener('click', closeNoteModal);
$('#noteSave').addEventListener('click', saveNote);
$('#noteModal').addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });

/* Modal keyboard shortcuts */
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

/* Service Worker */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

/* Init */
loadTheme(); loadSettings(); loadPortfolio(); loadCachedPrices(); render();
