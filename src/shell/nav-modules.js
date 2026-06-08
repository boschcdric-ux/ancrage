/** Modules masqués dans la barre de navigation ; JSON `{ disabled: string[] }`. */
export const MODULES_SETTINGS_KEY = 'adhd-app:settings:modules';

/** Toujours visibles dans la nav ; pas de désactivation. */
export const MODULE_IDS_NAV_LOCKED = new Set(['now', 'dashboard', 'settings']);

/** Modules actifs par défaut après la première fin d’onboarding (les autres sont désactivés). */
export const DEFAULT_NAV_ACTIVE_MODULE_IDS = new Set([
  'now',
  'dashboard',
  'tasks',
  'capture',
  'pomodoro',
  'memo',
  'breathing',
  'settings'
]);

export function parseStoredDisabledModuleIds() {
  const raw = localStorage.getItem(MODULES_SETTINGS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.disabled)) return null;
    return new Set(
      parsed.disabled.filter((id) => typeof id === 'string' && !MODULE_IDS_NAV_LOCKED.has(id))
    );
  } catch {
    return null;
  }
}

export function getDisabledModuleIdsSet() {
  const stored = parseStoredDisabledModuleIds();
  if (stored !== null) return stored;
  return new Set();
}

export function persistDisabledModuleIds(disabledSet) {
  const disabled = [...disabledSet].filter((id) => !MODULE_IDS_NAV_LOCKED.has(id)).sort();
  localStorage.setItem(MODULES_SETTINGS_KEY, JSON.stringify({ disabled }));
}

export function isModuleEnabledForNav(moduleId) {
  if (MODULE_IDS_NAV_LOCKED.has(moduleId)) return true;
  return !getDisabledModuleIdsSet().has(moduleId);
}

export function getNavModulesOrdered(modules) {
  const disabled = getDisabledModuleIdsSet();
  return modules.filter((m) => !disabled.has(m.id));
}

/** Au premier démarrage après onboarding : 6 modules ; utilisateur déjà onboardé sans clé : tout actif. */
export function initializeModulesSettingsIfNeeded(modules, fromFreshOnboarding) {
  if (localStorage.getItem(MODULES_SETTINGS_KEY)) return;
  if (fromFreshOnboarding) {
    const disabled = modules
      .map((m) => m.id)
      .filter((id) => !DEFAULT_NAV_ACTIVE_MODULE_IDS.has(id));
    persistDisabledModuleIds(new Set(disabled));
  }
}
