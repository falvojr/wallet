import {
  CLASS_KEYS,
  portfolio,
  preferences,
  prices,
  settings,
  activeTab,
  setActiveTab,
  loadTheme,
  toggleTheme,
} from './js/state.js';
import { getLocale, t } from './js/i18n.js';
import { fetchAllPrices } from './js/api.js';
import { render, renderOverviewOnly, renderChartOnly, toggleSort } from './js/render.js';

const $ = selector => document.querySelector(selector);

const elements = {
  toastContainer: $('#toastContainer'),
  loadingOverlay: $('#loadingOverlay'),
  loadingText: $('#loadingText'),
  loadingBarFill: $('#loadingBarFill'),
  headerActions: $('#headerActions'),
  emptyWelcome: $('#emptyWelcome'),
  tabNav: $('#tabNav'),
  panels: $('#panels'),
  fileInput: $('#fileInput'),
};

function applyTranslations(root = document) {
  document.documentElement.lang = getLocale();

  const title = root.querySelector('title[data-i18n]');
  if (title) document.title = t(title.dataset.i18n);

  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll('[data-i18n-html]').forEach(element => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  root.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}

function showToast(message, action) {
  const toast = document.createElement('div');
  toast.className = action ? 'toast toast--has-action' : 'toast';

  if (action) {
    const text = document.createElement('span');
    text.textContent = message;

    const button = document.createElement('button');
    button.className = 'toast-action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.handler();
      toast.remove();
    });

    toast.append(text, button);
  } else {
    toast.textContent = message;
  }

  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), action ? 5000 : 3000);
}

function showLoading(text, progress) {
  const overlay = elements.loadingOverlay;
  elements.loadingText.textContent = text;
  elements.loadingBarFill.style.width = progress !== undefined ? `${Math.round(progress * 100)}%` : '0%';
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
}

function hideLoading() {
  const overlay = elements.loadingOverlay;
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
}

function parseNonNegativeNumber(value) {
  const number = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

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
    showToast(t('toastConfigTokens'));
    return;
  }

  const ok = await fetchAllPrices(showLoading);
  hideLoading();
  render();
  showToast(ok ? t('toastPricesOk') : t('toastPricesFail'));
}

function getFocusableElements(container) {
  return container.querySelectorAll('input, textarea, button, [tabindex]:not([tabindex="-1"])');
}

function trapFocus(modal) {
  const focusable = getFocusableElements(modal);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const handleTab = event => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  modal.addEventListener('keydown', handleTab);
  modal._focusTrapHandler = handleTab;
}

function releaseFocus(modal) {
  if (!modal._focusTrapHandler) return;
  modal.removeEventListener('keydown', modal._focusTrapHandler);
  delete modal._focusTrapHandler;
}

let previousFocus = null;

function openModal(modalSelector, focusSelector) {
  previousFocus = document.activeElement;

  const modal = $(modalSelector);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  trapFocus(modal);

  if (focusSelector) {
    setTimeout(() => $(focusSelector)?.focus(), 100);
  }
}

function closeModal(modalSelector) {
  const modal = $(modalSelector);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  releaseFocus(modal);
  previousFocus?.focus();
  previousFocus = null;
}

function bindModalBackdropClose(modalSelector, closeHandler) {
  $(modalSelector).addEventListener('click', event => {
    if (event.target.id === modalSelector.slice(1)) closeHandler();
  });
}

let addClassKey = null;

function openAddModal(classKey) {
  addClassKey = classKey;
  $('#newTicker').value = '';
  $('#newAmount').value = '';
  $('#newTarget').value = '';
  openModal('#addModal', '#newTicker');
}

function closeAddModal() {
  closeModal('#addModal');
  addClassKey = null;
}

function confirmAddAsset() {
  const id = $('#newTicker').value.trim();
  const amount = parseNonNegativeNumber($('#newAmount').value);

  if (!id) {
    $('#newTicker').focus();
    return;
  }

  if (amount === null) {
    $('#newAmount').focus();
    return;
  }

  if (portfolio.items(addClassKey).some(item => item.id === id)) {
    showToast(t('toastExists', id));
    return;
  }

  const item = { id, amount };
  const targetValue = $('#newTarget').value.trim();
  const target = targetValue ? parseNonNegativeNumber(targetValue) : null;

  if (targetValue && target !== null) {
    item.target = target;
  }

  portfolio.addItem(addClassKey, item);
  portfolio.save();
  closeAddModal();
  render();
  showToast(t('toastAdded', id));
}

let noteClassKey = null;
let noteItemId = null;

function openNoteModal(classKey, itemId) {
  noteClassKey = classKey;
  noteItemId = itemId;

  const item = portfolio.items(classKey).find(asset => asset.id === itemId);
  $('#noteAssetName').textContent = itemId;
  $('#noteText').value = item?.note || '';
  openModal('#noteModal', '#noteText');
}

function closeNoteModal() {
  closeModal('#noteModal');
  noteClassKey = null;
  noteItemId = null;
}

function saveNote() {
  if (!noteClassKey || !noteItemId) return;
  portfolio.setItemNote(noteClassKey, noteItemId, $('#noteText').value);
  closeNoteModal();
  render();
}

function openSettingsModal() {
  $('#brapiToken').value = settings.brapiToken;
  $('#finnhubToken').value = settings.finnhubToken;
  openModal('#settingsModal', '#brapiToken');
}

function closeSettingsModal() {
  closeModal('#settingsModal');
}

function saveSettingsModal() {
  settings.brapiToken = $('#brapiToken').value.trim();
  settings.finnhubToken = $('#finnhubToken').value.trim();
  settings.save();
  closeSettingsModal();
  showToast(t('toastSettingsSaved'));
}

function exportPortfolio() {
  const output = portfolio.export();
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `portfolio_${output.syncedAt || 'export'}.json`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(t('toastExported'));
}

function importPortfolio(file) {
  showLoading(t('loadingImporting'));

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      const hasSupportedClass = CLASS_KEYS.some(key => Array.isArray(data?.[key]?.items));
      if (!hasSupportedClass) throw new Error(t('toastInvalidFormat'));

      portfolio.import(data);
      setActiveTab('overview');
      render();
      hideLoading();
      showToast(t('toastImported'));

      if (settings.hasTokens) refreshPrices();
    } catch (error) {
      hideLoading();
      showToast(t('toastErrorPrefix') + error.message);
    }
  };

  reader.readAsText(file);
}

elements.panels.addEventListener('click', event => {
  const chartToggle = event.target.closest('[data-toggle-chart]');
  if (chartToggle) {
    event.stopPropagation();
    preferences.toggleChartHidden(chartToggle.dataset.toggleChart);
    renderChartOnly();
    return;
  }

  const orderSwap = event.target.closest('[data-order-swap]');
  if (orderSwap) {
    event.stopPropagation();
    const [firstKey, secondKey] = orderSwap.dataset.orderSwap.split(':');
    preferences.swapOrder(firstKey, secondKey);
    render();
    return;
  }

  const targetChip = event.target.closest('.summary-card-target-chip');
  if (targetChip) {
    event.stopPropagation();
    const input = targetChip.querySelector('input');
    if (input && event.target !== input) {
      input.focus();
      input.select?.();
    }
    return;
  }

  const cardTarget = event.target.closest('[data-goto]');
  if (cardTarget && !event.target.closest('input, button, label')) {
    setActiveTab(cardTarget.dataset.goto);
    render();
    return;
  }

  const addButton = event.target.closest('.add-row, .add-to-empty');
  if (addButton) {
    openAddModal(addButton.dataset.addClass);
    return;
  }

  const removeButton = event.target.closest('.remove-btn');
  if (removeButton) {
    const classKey = removeButton.dataset.class;
    const items = portfolio.items(classKey);
    const index = Number.parseInt(removeButton.dataset.idx, 10);
    const removedItem = { ...items[index] };

    items.splice(index, 1);
    portfolio.save();
    render();
    showToast(t('toastRemoved', removedItem.id), {
      label: t('toastUndo'),
      handler() {
        portfolio.addItem(classKey, removedItem);
        portfolio.save();
        render();
      },
    });
    return;
  }

  const noteButton = event.target.closest('.note-btn');
  if (noteButton) {
    openNoteModal(noteButton.dataset.noteClass, noteButton.dataset.noteId);
    return;
  }

  const sortHeader = event.target.closest('th[data-sort]');
  if (sortHeader) {
    toggleSort(sortHeader.dataset.sort);
    render();
  }
});

elements.panels.addEventListener('click', event => {
  if (event.target.closest('[data-class-target], [data-class-goal], [data-order-swap], .summary-card-target-chip, .order-arrows')) {
    event.stopPropagation();
  }
});

elements.panels.addEventListener('change', event => {
  const inlineInput = event.target.closest('.inline-input');
  if (inlineInput) {
    const classKey = inlineInput.dataset.class;
    const index = Number.parseInt(inlineInput.dataset.idx, 10);
    const items = portfolio.items(classKey);

    if (inlineInput.dataset.field === 'amount') {
      const amount = parseNonNegativeNumber(inlineInput.value);
      if (amount !== null) {
        items[index].amount = amount;
        scheduleSave();
      }
      return;
    }

    if (inlineInput.dataset.field === 'target') {
      const rawValue = inlineInput.value.trim();
      if (!rawValue) {
        delete items[index].target;
      } else {
        const target = parseNonNegativeNumber(rawValue);
        if (target !== null) items[index].target = target;
      }

      scheduleSave();
      return;
    }
  }

  const classTargetInput = event.target.closest('[data-class-target]');
  if (classTargetInput) {
    const target = parseNonNegativeNumber(classTargetInput.value);
    if (target !== null) {
      portfolio.setTarget(classTargetInput.dataset.classTarget, target);
      portfolio.save();
      renderOverviewOnly();
    }
    return;
  }

  const classGoalInput = event.target.closest('[data-class-goal]');
  if (classGoalInput) {
    const goal = parseNonNegativeNumber(classGoalInput.value);
    if (goal !== null) {
      portfolio.setGoal(classGoalInput.dataset.classGoal, goal);
      portfolio.save();
      renderOverviewOnly();
    }
  }
});

elements.tabNav.addEventListener('click', event => {
  const tabButton = event.target.closest('[data-tab]');
  if (!tabButton) return;

  setActiveTab(tabButton.dataset.tab);
  render();
});

function isFileDrag(event) {
  return event.dataTransfer?.types?.includes('Files');
}

let dragDepth = 0;

document.addEventListener('dragenter', event => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth += 1;
  $('#dropZone').classList.add('visible');
});

document.addEventListener('dragleave', event => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth -= 1;

  if (dragDepth <= 0) {
    dragDepth = 0;
    $('#dropZone').classList.remove('visible');
  }
});

document.addEventListener('dragover', event => {
  if (isFileDrag(event)) event.preventDefault();
});

document.addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  $('#dropZone').classList.remove('visible');

  const file = event.dataTransfer.files[0];
  if (file?.name.endsWith('.json')) {
    importPortfolio(file);
  } else if (file) {
    showToast(t('toastJsonOnly'));
  }
});

$('#btnImport').addEventListener('click', () => elements.fileInput.click());
$('#btnExport').addEventListener('click', exportPortfolio);
$('#btnTheme').addEventListener('click', () => {
  toggleTheme();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  if (activeTab === 'charts') renderChartOnly();
});
$('#btnSettings').addEventListener('click', openSettingsModal);
$('#btnPrices').addEventListener('click', refreshPrices);
$('#btnWelcomeImport').addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', event => {
  if (event.target.files[0]) importPortfolio(event.target.files[0]);
  event.target.value = '';
});

$('#modalCancel').addEventListener('click', closeAddModal);
$('#modalConfirm').addEventListener('click', confirmAddAsset);
$('#settingsCancel').addEventListener('click', closeSettingsModal);
$('#settingsSave').addEventListener('click', saveSettingsModal);
$('#noteCancel').addEventListener('click', closeNoteModal);
$('#noteSave').addEventListener('click', saveNote);

bindModalBackdropClose('#addModal', closeAddModal);
bindModalBackdropClose('#settingsModal', closeSettingsModal);
bindModalBackdropClose('#noteModal', closeNoteModal);

$('#newTicker').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('#newAmount').focus();
});
$('#newAmount').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('#newTarget').focus();
});
$('#newTarget').addEventListener('keydown', event => {
  if (event.key === 'Enter') confirmAddAsset();
});
$('#noteText').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    saveNote();
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  if ($('#addModal').classList.contains('open')) closeAddModal();
  else if ($('#settingsModal').classList.contains('open')) closeSettingsModal();
  else if ($('#noteModal').classList.contains('open')) closeNoteModal();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

loadTheme();
settings.load();
preferences.load();
portfolio.load();
prices.load();
applyTranslations();
render();
