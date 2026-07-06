// core/theme.js — Gestion des thèmes et mode auto jour/nuit

const THEMES = ['encre', 'garrigue', 'crepuscule', 'maree'];
const STORAGE_KEY = 'adhd-theme-override';

const LEGACY_THEME_MAP = {
  dark: 'encre',
  light: 'garrigue',
  warm: 'crepuscule',
};

function migrateTheme(theme) {
  return LEGACY_THEME_MAP[theme] ?? theme;
}

function getAutoTheme() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 20) return 'garrigue';
  return 'encre';
}

function applyTheme(theme) {
  const resolved = THEMES.includes(theme) ? theme : getAutoTheme();
  document.documentElement.setAttribute('data-theme', resolved);
}

function readThemeOverride() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const theme = parsed && typeof parsed.theme === 'string' ? parsed.theme : null;
    const date = parsed && typeof parsed.date === 'string' ? parsed.date : null;
    if (!theme || date !== new Date().toDateString()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const migrated = migrateTheme(theme);
    if (migrated !== theme) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme: migrated,
        date,
      }));
    }
    return migrated;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getActiveTheme() {
  return readThemeOverride() ?? getAutoTheme();
}

function setThemeOverride(theme) {
  const resolved = migrateTheme(theme);
  if (!THEMES.includes(resolved)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    theme: resolved,
    date: new Date().toDateString(),
  }));
  applyTheme(resolved);
}

function removeThemeOverride() {
  localStorage.removeItem(STORAGE_KEY);
  applyTheme(getActiveTheme());
}

function getThemeUiSelectionState() {
  const theme = readThemeOverride();
  if (theme && THEMES.includes(theme)) {
    return { isAuto: false, manualTheme: theme };
  }
  return { isAuto: true, manualTheme: null };
}

function initTheme() {
  applyTheme(getActiveTheme());
  setInterval(() => applyTheme(getActiveTheme()), 60_000);
}

export { initTheme, setThemeOverride, getActiveTheme, removeThemeOverride, getThemeUiSelectionState, THEMES };
