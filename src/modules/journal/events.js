import { TAG_ID_SET } from './store.js';

/**
 * Construit les gestionnaires d'événements du module à partir d'un contexte
 * (ctx) fourni par index.js. Aucun état n'est retenu ici : events.js ne fait
 * que router les interactions DOM vers les actions du contrôleur.
 */
function createEventHandlers(ctx) {
  function handleEntryClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openButton = target.closest('[data-journal-open]');
    if (openButton instanceof HTMLButtonElement) {
      const entryId = openButton.dataset.journalOpen;
      if (entryId) ctx.openEntry(entryId);
      return;
    }

    const newButton = target.closest('[data-journal-new]');
    if (newButton instanceof HTMLButtonElement) {
      ctx.openNewEntry();
    }
  }

  function handleEditorActions(event) {
    if (event.type === 'click') {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const backButton = target.closest('[data-journal-back]');
      if (backButton instanceof HTMLButtonElement) {
        ctx.leaveEditor();
        return;
      }

      const deleteButton = target.closest('[data-journal-delete]');
      if (deleteButton instanceof HTMLButtonElement) {
        ctx.deleteActiveEntry();
      }
      return;
    }

    if (event.type === 'input') {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('[data-journal-title]')) return;
      ctx.setActiveTitle(target.value);
      return;
    }

    if (event.type === 'change') {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.matches('[data-journal-tag]')) return;
      ctx.setActiveTag(target.value);
    }
  }

  function handleToolbarCommands(event) {
    if (event.type !== 'click') return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const commandButton = target.closest('[data-journal-command]');
    if (commandButton instanceof HTMLButtonElement) {
      const command = commandButton.dataset.journalCommand;
      if (command) ctx.runCommand(command);
    }
  }

  function handleEntryFilters(event) {
    if (event.type === 'click') {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tagFilterBtn = target.closest('[data-journal-tag-filter]');
      if (tagFilterBtn instanceof HTMLButtonElement) {
        const mode = tagFilterBtn.dataset.journalTagFilter;
        if (mode === 'all') {
          ctx.setTagFilter('all');
        } else if (mode === 'tag') {
          const tid = tagFilterBtn.dataset.journalFilterTag;
          ctx.setTagFilter(tid && TAG_ID_SET.has(tid) ? tid : 'all');
        }
      }
      return;
    }

    if (event.type === 'input') {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('[data-journal-search]')) return;
      ctx.setSearch(target.value, target.selectionStart, target.selectionEnd);
      return;
    }

    if (event.type === 'change') {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.matches('[data-journal-sort]')) return;
      ctx.setDateSort(target.value === 'asc' ? 'asc' : 'desc');
    }
  }

  return { handleEntryClick, handleEditorActions, handleToolbarCommands, handleEntryFilters };
}

function bindJournalEvents(root, handlers) {
  root.addEventListener('click', handlers.handleEntryClick);
  root.addEventListener('click', handlers.handleEditorActions);
  root.addEventListener('click', handlers.handleToolbarCommands);
  root.addEventListener('click', handlers.handleEntryFilters);
  root.addEventListener('input', handlers.handleEditorActions);
  root.addEventListener('input', handlers.handleEntryFilters);
  root.addEventListener('change', handlers.handleEditorActions);
  root.addEventListener('change', handlers.handleEntryFilters);
}

function unbindJournalEvents(root, handlers) {
  root.removeEventListener('click', handlers.handleEntryClick);
  root.removeEventListener('click', handlers.handleEditorActions);
  root.removeEventListener('click', handlers.handleToolbarCommands);
  root.removeEventListener('click', handlers.handleEntryFilters);
  root.removeEventListener('input', handlers.handleEditorActions);
  root.removeEventListener('input', handlers.handleEntryFilters);
  root.removeEventListener('change', handlers.handleEditorActions);
  root.removeEventListener('change', handlers.handleEntryFilters);
}

export { createEventHandlers, bindJournalEvents, unbindJournalEvents };
