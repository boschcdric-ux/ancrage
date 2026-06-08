// core/theme.js — Gestion des thèmes et mode auto jour/nuit

const THEMES = ['dark', 'light', 'warm'];
const STORAGE_KEY = 'adhd-theme-override';

function getAutoTheme() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 20) return 'light';
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getActiveTheme() {
  const override = localStorage.getItem(STORAGE_KEY);
  // L'override expire à minuit
  if (override) {
    try {
      const { theme, date } = JSON.parse(override);
      if (date === new Date().toDateString()) return theme;
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return getAutoTheme();
    }
  }
  return getAutoTheme();
}

function setThemeOverride(theme) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    theme,
    date: new Date().toDateString()
  }));
  applyTheme(theme);
}

function removeThemeOverride() {
  localStorage.removeItem(STORAGE_KEY);
  applyTheme(getActiveTheme());
}

function getThemeUiSelectionState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { isAuto: true, manualTheme: null };
  try {
    const parsed = JSON.parse(raw);
    const theme = parsed && typeof parsed.theme === 'string' ? parsed.theme : null;
    const date = parsed && typeof parsed.date === 'string' ? parsed.date : null;
    if (theme && date === new Date().toDateString()) {
      return { isAuto: false, manualTheme: theme };
    }
  } catch {
    /* auto */
  }
  return { isAuto: true, manualTheme: null };
}

function initTheme() {
  applyTheme(getActiveTheme());
  // Vérification toutes les minutes
  setInterval(() => applyTheme(getActiveTheme()), 60_000);
}

export { initTheme, setThemeOverride, getActiveTheme, removeThemeOverride, getThemeUiSelectionState, THEMES };
