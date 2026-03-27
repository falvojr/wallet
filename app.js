import { state, savePortfolio, saveSettings, loadPortfolio, loadSettings, loadCachedPrices, CLASS_KEYS, hasApiTokens, loadTheme, toggleTheme, toggleClassHidden, setAssetNote, classItems, addAssetToClass, setClassTarget, importPortfolio, exportPortfolio } from './js/state.js';
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
  $('#loadingText').textContent = text;
  $('#loadingOverlay').hidden = false;
}

function hideLoading() { $('#loadingOverlay').hidden = true; }

function rerender() {
  render();
  bindPanelEvents();
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { savePortfolio(); rerender(); }, 600);
}

async function refreshPrices() {
  const success = await fetchAllPrices(showLoading);
  hideLoading();
  rerender();
  toast(success ? 'Cotações atualizadas' : 'Erro ao buscar cotações');
}

// Modals

let addTargetClass = null;

function openAddModal(cls) {
  addTargetClass = cls;
  $('#newTicker').value = '';
  $('#newAmount').value = '';
  $('#newTarget').value = '';
  $('#addModal').classList.add('open');
  setTimeout(() => $('#newTicker').focus(), 100);
}

function closeAddModal() {
  $('#addModal').classList.remove('open');
  addTargetClass = null;
}

function confirmAddAsset() {
  const ticker = $('#newTicker').value.trim();
  const amount = parseFloat($('#newAmount').value.replace(',', '.'));

  if (!ticker) { $('#newTicker').focus(); return; }
  if (isNaN(amount) || amount <= 0) { $('#newAmount').focus(); return; }

  if (classItems(addTargetClass).find(a => a.id === ticker)) {
    toast(ticker + ' já existe');
    return;
  }

  const newAsset = { id: ticker, amount };
  const targetRaw = $('#newTarget').value.trim();
  if (targetRaw !== '') {
    const val = parseFloat(targetRaw.replace(',', '.'));
    if (!isNaN(val) && val >= 0) newAsset.target = val;
  }

  addAssetToClass(addTargetClass, newAsset);
  savePortfolio();
  closeAddModal();
  rerender();
  toast(ticker + ' adicionado');
}

let noteTargetClass = null, noteTargetId = null;

function openNoteModal(cls, id) {
  noteTargetClass = cls;
  noteTargetId = id;
  const asset = classItems(cls).find(a => a.id === id);
  $('#noteAssetName').textContent = id;
  $('#noteText').value = asset?.note || '';
  $('#noteModal').classList.add('open');
  setTimeout(() => $('#noteText').focus(), 100);
}

function closeNoteModal() {
  $('#noteModal').classList.remove('open');
  noteTargetClass = noteTargetId = null;
}

function saveNoteFromModal() {
  if (noteTargetClass && noteTargetId) {
    setAssetNote(noteTargetClass, noteTargetId, $('#noteText').value);
    closeNoteModal();
    rerender();
  }
}

function openSettings() {
  $('#brapiToken').value = state.settings.brapiToken || '';
  $('#finnhubToken').value = state.settings.finnhubToken || '';
  $('#settingsModal').classList.add('open');
}

function closeSettings() { $('#settingsModal').classList.remove('open'); }

function saveSettingsFromModal() {
  state.settings.brapiToken = $('#brapiToken').value.trim();
  state.settings.finnhubToken = $('#finnhubToken').value.trim();
  saveSettings();
  closeSettings();
  toast('Configurações salvas');
}

function doExport() {
  const out = exportPortfolio();
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio_' + (out.syncedAt || 'export') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('JSON exportado');
}

function doImport(file) {
  showLoading('Importando carteira...');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!CLASS_KEYS.some(k => Array.isArray(data[k]) || Array.isArray(data[k]?.items))) {
        throw new Error('Formato inválido');
      }
      importPortfolio(data);
      rerender();
      hideLoading();
      toast('Carteira importada');
      if (hasApiTokens()) refreshPrices();
    } catch (err) {
      hideLoading();
      toast('Erro: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Panel events

function bindPanelEvents() {
  $$('[data-goto]').forEach(el =>
    el.addEventListener('click', () => { state.activeTab = el.dataset.goto; rerender(); })
  );

  $$('[data-tab]').forEach(btn =>
    btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; rerender(); })
  );

  $$('.inline-input[data-field="amount"]').forEach(input =>
    input.addEventListener('change', () => {
      const val = parseFloat(input.value.replace(',', '.'));
      if (!isNaN(val) && val >= 0) {
        classItems(input.dataset.class)[parseInt(input.dataset.idx)].amount = val;
        scheduleSave();
      }
    })
  );

  $$('.inline-input[data-field="target"]').forEach(input =>
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.idx);
      const items = classItems(input.dataset.class);
      const raw = input.value.trim();
      if (raw === '') {
        delete items[idx].target;
      } else {
        const val = parseFloat(raw.replace(',', '.'));
        if (!isNaN(val) && val >= 0) items[idx].target = val;
      }
      scheduleSave();
    })
  );

  $$('input[data-class-target]').forEach(input => {
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('change', () => {
      const val = parseFloat(input.value.replace(',', '.'));
      if (!isNaN(val) && val >= 0) {
        setClassTarget(input.dataset.classTarget, val);
        savePortfolio();
        rerender();
      }
    });
  });

  $$('.remove-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const cls = btn.dataset.class;
      const idx = parseInt(btn.dataset.idx);
      const items = classItems(cls);
      const asset = items[idx];
      if (confirm('Remover ' + asset.id + '?')) {
        items.splice(idx, 1);
        savePortfolio();
        rerender();
        toast(asset.id + ' removido');
      }
    })
  );

  $$('.add-row, .add-to-empty').forEach(el =>
    el.addEventListener('click', () => openAddModal(el.dataset.addClass))
  );

  $$('[data-toggle-hidden]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleClassHidden(btn.dataset.toggleHidden);
      rerender();
    })
  );

  $$('.ticker-note').forEach(el =>
    el.addEventListener('click', () => openNoteModal(el.dataset.noteClass, el.dataset.noteId))
  );
}

// Drag and Drop

let dragCounter = 0;
document.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; $('#dropZone').classList.add('visible'); });
document.addEventListener('dragleave', e => { e.preventDefault(); if (--dragCounter <= 0) { dragCounter = 0; $('#dropZone').classList.remove('visible'); } });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault(); dragCounter = 0; $('#dropZone').classList.remove('visible');
  const file = e.dataTransfer.files[0];
  if (file?.name.endsWith('.json')) doImport(file);
  else toast('Apenas arquivos .json');
});

// Global listeners

$('#btnExport').addEventListener('click', doExport);
$('#btnImport').addEventListener('click', () => $('#fileInput').click());
$('#btnWelcomeImport').addEventListener('click', () => $('#fileInput').click());
$('#btnPrices').addEventListener('click', refreshPrices);
$('#btnSettings').addEventListener('click', openSettings);
$('#btnTheme').addEventListener('click', () => { toggleTheme(); lucide.createIcons(); });
$('#fileInput').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; });

$('#modalCancel').addEventListener('click', closeAddModal);
$('#modalConfirm').addEventListener('click', confirmAddAsset);
$('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAddModal(); });

$('#settingsCancel').addEventListener('click', closeSettings);
$('#settingsSave').addEventListener('click', saveSettingsFromModal);
$('#settingsModal').addEventListener('click', e => { if (e.target.id === 'settingsModal') closeSettings(); });

$('#noteCancel').addEventListener('click', closeNoteModal);
$('#noteSave').addEventListener('click', saveNoteFromModal);
$('#noteModal').addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });

$('#newAmount').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newTarget').focus(); });
$('#newTarget').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddAsset(); });
$('#newTicker').addEventListener('keydown', e => { if (e.key === 'Enter') $('#newAmount').focus(); });
$('#noteText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNoteFromModal(); } });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#addModal').classList.contains('open')) closeAddModal();
    else if ($('#settingsModal').classList.contains('open')) closeSettings();
    else if ($('#noteModal').classList.contains('open')) closeNoteModal();
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

loadTheme();
loadSettings();
loadPortfolio();
loadCachedPrices();
rerender();
