import './style.css';
import { save, syncFromPocketBase } from '../../core/storage.js';
import {
  setThemeOverride,
  removeThemeOverride,
  getThemeUiSelectionState
} from '../../core/theme.js';
import { createSettingsMarkup } from './view.js';
import {
  getDisabledModuleIdsSet,
  isModuleEnabledForNav,
  persistDisabledModuleIds,
  MODULE_IDS_NAV_LOCKED
} from '../../shell/nav-modules.js';
import { MODULES_META_FOR_SETTINGS, getModuleNavLabel } from '../registry.js';

const THEME_OPTIONS = [
  { id: 'light', icon: '☀️', label: 'Clair' },
  { id: 'dark', icon: '🌙', label: 'Sombre' },
  { id: 'warm', icon: '🔥', label: 'Chaud' },
  { id: 'auto', icon: '🔄', label: 'Automatique' }
];

const SETTINGS_ROW = {
  id: 'settings',
  label: 'Réglages',
  icon: '⚙️'
};

/** Préfixe localStorage aligné sur core/storage.js */
const STORAGE_PREFIX = 'adhd-app:';

/**
 * Suffixe après « adhd-app: » → clé dans le JSON d’export (import inverse).
 * Couvre les payloads sync PocketBase, réglages modules, onboarding, méta sync.
 */
const STORAGE_SUFFIX_TO_EXPORT_KEY = {
  'capture:items': 'capture',
  'tasks:items': 'tasks',
  'memo:items': 'memo',
  'mood:entries': 'mood',
  'habits:list': 'habits',
  'habits:completions': 'habitCompletions',
  'medications:list': 'medicationsList',
  'medications:taken': 'medicationsTaken',
  'medications:history': 'medicationsHistory',
  'journal:entries': 'journal',
  'calendar:events': 'calendar',
  'pomodoro:history': 'pomodoro',
  'recipes:list': 'recipes',
  'shopping:stores': 'shopping',
  'shopping:history': 'shoppingHistory',
  'budget:config': 'budgetConfig',
  'budget:expenses': 'budgetExpenses',
  'budget:savings': 'budgetSavings',
  'onboarding:done': 'onboardingDone',
  'settings:modules': 'settingsModules',
  __storage_sync_meta__: 'storageSyncMeta',
  __pb_migration_v1_done__: 'pbMigrationV1Done',
  __pb_record_ids__: 'pbRecordIds'
};

const EXPORT_KEY_TO_STORAGE_SUFFIX = Object.fromEntries(
  Object.entries(STORAGE_SUFFIX_TO_EXPORT_KEY).map(([suffix, exportKey]) => [exportKey, suffix])
);

const BACKUP_VERSION = '1.1';

let rootContainer = null;
let onRootClick = null;
let onRootChange = null;

function suffixToExportKey(suffix) {
  return STORAGE_SUFFIX_TO_EXPORT_KEY[suffix] ?? suffix.replace(/:/g, '__');
}

function exportKeyToSuffix(exportKey) {
  if (EXPORT_KEY_TO_STORAGE_SUFFIX[exportKey]) return EXPORT_KEY_TO_STORAGE_SUFFIX[exportKey];
  return exportKey.replace(/__/g, ':');
}

function collectPrefixedLocalStorageData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const fullKey = localStorage.key(i);
    if (!fullKey || !fullKey.startsWith(STORAGE_PREFIX)) continue;
    const raw = localStorage.getItem(fullKey);
    if (raw == null || raw === '') continue;
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    const suffix = fullKey.slice(STORAGE_PREFIX.length);
    const dataKey = suffixToExportKey(suffix);
    data[dataKey] = value;
  }
  return data;
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function backupFilenameDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `ancrage-backup-${y}-${m}-${day}.json`;
}

function showDataFeedback(message, variant = 'success') {
  if (!rootContainer) return;
  const el = rootContainer.querySelector('[data-settings-data-feedback]');
  if (!(el instanceof HTMLElement)) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.toggle('settings-data-feedback--error', variant === 'error');
  clearTimeout(showDataFeedback._t);
  showDataFeedback._t = setTimeout(() => {
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('settings-data-feedback--error');
  }, variant === 'error' ? 5000 : 3500);
}

function clearAllPrefixedStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

function writeLocalStorageEntry(fullKey, value) {
  if (typeof value === 'string') {
    localStorage.setItem(fullKey, value);
  } else {
    localStorage.setItem(fullKey, JSON.stringify(value));
  }
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

function applyImportedBackupData(dataObj) {
  clearAllPrefixedStorage();
  for (const [exportKey, value] of Object.entries(dataObj)) {
    if (value === undefined) continue;
    const suffix = exportKeyToSuffix(exportKey);
    const fullKey = STORAGE_PREFIX + suffix;
    writeLocalStorageEntry(fullKey, value);
  }
}

function handleExportBackup() {
  const payload = {
    exportedAt: Date.now(),
    version: BACKUP_VERSION,
    data: collectPrefixedLocalStorageData()
  };
  downloadJson(backupFilenameDate(), payload);
  showDataFeedback('✅ Sauvegarde exportée !');
}

async function handleImportBackupFile(file) {
  let text;
  try {
    text = await readBackupFile(file);
  } catch {
    showDataFeedback('Impossible de lire le fichier.', 'error');
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    showDataFeedback('Fichier JSON invalide.', 'error');
    return;
  }
  if (!parsed || typeof parsed !== 'object' || parsed.data == null || typeof parsed.data !== 'object') {
    showDataFeedback('Format de sauvegarde non reconnu.', 'error');
    return;
  }
  const ok = window.confirm(
    '⚠️ Cette action remplacera toutes vos données actuelles. Continuer ?'
  );
  if (!ok) return;
  try {
    applyImportedBackupData(parsed.data);
  } catch {
    showDataFeedback('Échec de la restauration.', 'error');
    return;
  }
  showDataFeedback('✅ Données restaurées !');
  window.setTimeout(() => {
    window.location.reload();
  }, 900);
}

function getNotificationUiState() {
  if (typeof Notification === 'undefined') return { kind: 'unsupported' };
  const perm = Notification.permission;
  if (perm === 'granted') return { kind: 'granted' };
  if (perm === 'denied') return { kind: 'denied' };
  return { kind: 'prompt' };
}

function buildModuleRows() {
  const rows = MODULES_META_FOR_SETTINGS.map((meta) => {
    const locked = MODULE_IDS_NAV_LOCKED.has(meta.id);
    return {
      id: meta.id,
      icon: meta.icon || '•',
      label: getModuleNavLabel(meta),
      locked,
      on: isModuleEnabledForNav(meta.id)
    };
  });
  rows.push({
    id: SETTINGS_ROW.id,
    icon: SETTINGS_ROW.icon,
    label: SETTINGS_ROW.label,
    locked: true,
    on: true
  });
  return rows;
}

function buildThemeOptions() {
  const { isAuto, manualTheme } = getThemeUiSelectionState();
  return THEME_OPTIONS.map((option) => ({
    id: option.id,
    icon: option.icon,
    label: option.label,
    active: option.id === 'auto' ? isAuto : !isAuto && manualTheme === option.id
  }));
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createSettingsMarkup(
    buildModuleRows(),
    buildThemeOptions(),
    getNotificationUiState()
  );
}

function applyThemeChoice(themeId) {
  if (themeId === 'auto') {
    removeThemeOverride();
  } else if (themeId === 'light' || themeId === 'dark' || themeId === 'warm') {
    setThemeOverride(themeId);
  }
}

function handleModuleToggle(moduleId) {
  if (MODULE_IDS_NAV_LOCKED.has(moduleId)) return;
  const d = getDisabledModuleIdsSet();
  if (d.has(moduleId)) d.delete(moduleId);
  else d.add(moduleId);
  persistDisabledModuleIds(d);
  const disabled = [...d].filter((id) => !MODULE_IDS_NAV_LOCKED.has(id)).sort();
  save('settings:modules', { disabled });
  document.dispatchEvent(new CustomEvent('ancrage:modules-updated'));
  render();
}

function bindEvents() {
  if (!rootContainer) return;
  onRootClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-settings-export-backup]')) {
      handleExportBackup();
      return;
    }

    if (target.closest('[data-settings-import-backup]')) {
      const input = rootContainer.querySelector('[data-settings-backup-import]');
      if (input instanceof HTMLInputElement) input.click();
      return;
    }

    const toggle = target.closest('[data-settings-toggle]');
    if (toggle instanceof HTMLButtonElement && toggle.dataset.settingsToggle) {
      handleModuleToggle(toggle.dataset.settingsToggle);
      return;
    }

    const themeBtn = target.closest('[data-settings-theme]');
    if (themeBtn instanceof HTMLButtonElement && themeBtn.dataset.settingsTheme) {
      applyThemeChoice(themeBtn.dataset.settingsTheme);
      render();
      return;
    }

    if (target.closest('[data-settings-notifications-enable]')) {
      void (async () => {
        if (!('Notification' in window)) return;
        await Notification.requestPermission();
        render();
        if (Notification.permission === 'granted') {
          await syncFromPocketBase();
        }
      })();
    }
  };
  rootContainer.addEventListener('click', onRootClick);

  onRootChange = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) || !t.matches('[data-settings-backup-import]')) return;
    const file = t.files && t.files[0];
    t.value = '';
    if (file) void handleImportBackupFile(file);
  };
  rootContainer.addEventListener('change', onRootChange);
}

const settingsModule = {
  id: 'settings',
  label: 'Réglages',
  icon: '⚙️',

  init(container) {
    if (!(container instanceof HTMLElement)) return;
    rootContainer = container;
    render();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onRootClick) {
      rootContainer.removeEventListener('click', onRootClick);
    }
    if (rootContainer && onRootChange) {
      rootContainer.removeEventListener('change', onRootChange);
    }
    onRootClick = null;
    onRootChange = null;
    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    return null;
  }
};

export default settingsModule;
