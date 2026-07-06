/**
 * Manifeste des modules — métadonnées uniquement, aucun import de module.
 * Ordre aligné sur main.js (navigation / réglages).
 */
export const MODULES_META = [
  { id: 'now', label: 'Que faire ?', navLabel: 'Que faire ?', icon: '🧭', lazy: false, hasWidget: true },
  { id: 'dashboard', label: 'Accueil', navLabel: 'Accueil', icon: '🏠', lazy: false, hasWidget: false },
  { id: 'weather', label: 'Météo', navLabel: 'Météo', icon: '🌤', lazy: false, hasWidget: true },
  { id: 'capture', label: 'Capture Rapide', navLabel: 'Capture', icon: '⚡', lazy: false, hasWidget: true },
  { id: 'shopping', label: 'Courses', navLabel: 'Courses', icon: '🛒', lazy: true, hasWidget: false },
  { id: 'recipes', label: 'Recettes', navLabel: 'Recettes', icon: '📖', lazy: true, hasWidget: true },
  { id: 'budget', label: 'Budget', navLabel: 'Budget', icon: '💶', lazy: true, hasWidget: false },
  { id: 'calendar', label: 'Calendrier', navLabel: 'Agenda', icon: '📅', lazy: true, hasWidget: true },
  { id: 'tasks', label: 'Tâches', navLabel: 'Tâches', icon: '✅', lazy: false, hasWidget: true },
  { id: 'habits', label: 'Habitudes', navLabel: 'Habitudes', icon: '🌱', lazy: false, hasWidget: true },
  { id: 'medications', label: 'Médocs', navLabel: 'Médocs', icon: '💊', lazy: true, hasWidget: true },
  { id: 'mood', label: 'Humeur', navLabel: 'Humeur', icon: '🙂', lazy: false, hasWidget: true },
  { id: 'journal', label: 'Journal', navLabel: 'Journal', icon: '📔', lazy: true, hasWidget: true },
  { id: 'memo', label: 'Mémo', navLabel: 'Mémo', icon: '🗒️', lazy: false, hasWidget: true },
  { id: 'notes', label: 'Bloc-notes', navLabel: 'Post-its', icon: '🗒️', lazy: true, hasWidget: false },
  { id: 'pomodoro', label: 'Pomodoro', navLabel: 'Pomodoro', icon: '🍅', lazy: false, hasWidget: true },
  { id: 'focus', label: 'Focus', navLabel: 'Focus', icon: '🎯', lazy: false, hasWidget: false },
  { id: 'breathing', label: 'Respiration', navLabel: 'Respiration', icon: '🫁', lazy: false, hasWidget: false },
  {
    id: 'planning-boulot',
    label: 'Planning',
    navLabel: 'Planning',
    icon: '🏢',
    lazy: true,
    hasWidget: false
  },
  { id: 'settings', label: 'Réglages', navLabel: 'Réglages', icon: '⚙️', lazy: false, hasWidget: false }
];

/** Modules listés dans les réglages (hors settings lui-même). */
export const MODULES_META_FOR_SETTINGS = MODULES_META.filter((meta) => meta.id !== 'settings');

export function getModuleNavLabel(meta) {
  return meta.navLabel || meta.label || meta.id;
}
