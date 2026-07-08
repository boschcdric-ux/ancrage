/**
 * État mutable partagé du module Journal. Un seul objet, muté par référence,
 * pour éviter de faire circuler l'état entre index.js et session.js.
 */
const state = {
  rootContainer: null,
  eventHandlers: null,
  entries: [],
  searchQuery: '',
  tagFilter: 'all',
  dateSort: 'desc',
  activeEntryId: null,
  isDirty: false,
  isDraft: false
};

function getActiveEntry() {
  if (!state.activeEntryId) return null;
  return state.entries.find((entry) => entry.id === state.activeEntryId) || null;
}

function resetSessionState() {
  state.searchQuery = '';
  state.tagFilter = 'all';
  state.dateSort = 'desc';
  state.activeEntryId = null;
  state.isDirty = false;
  state.isDraft = false;
}

export { state, getActiveEntry, resetSessionState };
