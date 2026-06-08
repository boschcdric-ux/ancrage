import { escapeHtml } from '../../core/format.js';

/** Tags prédéfinis communs (ids sans accent pour les classes CSS) */
const PREDEFINED_TAGS = [
  { id: 'maison', emoji: '🏠', label: 'Maison' },
  { id: 'boulot', emoji: '💼', label: 'Boulot' },
  { id: 'jardin', emoji: '🌿', label: 'Jardin' },
  { id: 'sante', emoji: '🏥', label: 'Santé' },
  { id: 'admin', emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' }
];

function renderTagBadge(tagId) {
  const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
  if (!tag) return '';
  return `<span class="shared-tag-badge shared-tag-badge--${tag.id}"><span class="shared-tag-badge__emoji" aria-hidden="true">${tag.emoji}</span><span class="shared-tag-badge__label">${escapeHtml(tag.label)}</span></span>`;
}

function renderTagDot(taskId, tagId) {
  const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
  if (!tag) return '';
  return `<button type="button" class="tasks__tag-dot shared-tag-badge--${tag.id}" data-task-tag-preview="${taskId}" aria-label="Afficher le tag ${escapeHtml(tag.label)}" title="${escapeHtml(tag.label)}"></button>`;
}

function createTasksFilterBar(activeFilter = 'all') {
  const tagButtons = PREDEFINED_TAGS.map(
    (t) => `
    <button
      type="button"
      class="tasks__filter-chip ${activeFilter === t.id ? 'is-active' : ''}"
      data-task-filter="tag"
      data-task-filter-tag="${t.id}"
      aria-pressed="${activeFilter === t.id ? 'true' : 'false'}"
    >
      ${t.emoji} ${escapeHtml(t.label)}
    </button>
  `
  ).join('');

  return `
    <div class="tasks__filters" role="toolbar" aria-label="Filtrer les tâches">
      <button
        type="button"
        class="tasks__filter-chip ${activeFilter === 'all' ? 'is-active' : ''}"
        data-task-filter="all"
        aria-pressed="${activeFilter === 'all' ? 'true' : 'false'}"
      >
        Toutes
      </button>
      ${tagButtons}
      <button
        type="button"
        class="tasks__filter-chip ${activeFilter === 'priority' ? 'is-active' : ''}"
        data-task-filter="priority"
        aria-pressed="${activeFilter === 'priority' ? 'true' : 'false'}"
      >
        ⭐ Prioritaires
      </button>
    </div>
  `;
}

function createTagMenu(taskId, isOpen) {
  const items = [
    `<button type="button" class="tasks__tag-menu-item" data-task-tag-pick="${taskId}" data-tag-id="">Aucun tag</button>`,
    ...PREDEFINED_TAGS.map(
      (t) =>
        `<button type="button" class="tasks__tag-menu-item" data-task-tag-pick="${taskId}" data-tag-id="${t.id}">${t.emoji} ${escapeHtml(t.label)}</button>`
    )
  ].join('');

  return `
    <div class="tasks__tag-menu ${isOpen ? 'is-open' : ''}" data-task-tag-menu="${taskId}" role="menu" aria-hidden="${isOpen ? 'false' : 'true'}">
      ${items}
    </div>
  `;
}

function createSubtaskItem(subtask, editingSubtaskId) {
  const checked = subtask.completed ? 'checked' : '';
  const completedClass = subtask.completed ? 'tasks__subtask-text--completed' : '';
  const isEditing = editingSubtaskId === subtask.id;

  return `
    <li class="tasks__subtask card">
      <div class="tasks__subtask-main">
        <label class="tasks__subtask-label">
          <input
            type="checkbox"
            data-subtask-toggle="${subtask.id}"
            ${checked}
          />
          ${
            isEditing
              ? `<input
                  type="text"
                  class="tasks__inline-input tasks__inline-input--subtask"
                  data-subtask-edit-input="${subtask.id}"
                  value="${escapeHtml(subtask.text)}"
                  maxlength="140"
                />`
              : `<span class="tasks__subtask-text ${completedClass}">${escapeHtml(subtask.text)}</span>`
          }
        </label>
        <div class="tasks__actions">
          ${
            isEditing
              ? `
                <button
                  type="button"
                  class="tasks__inline-save"
                  data-subtask-edit-save="${subtask.id}"
                  aria-label="Enregistrer la sous-tâche"
                  title="Enregistrer"
                >
                  ✓
                </button>
                <button
                  type="button"
                  class="tasks__inline-cancel"
                  data-subtask-edit-cancel="${subtask.id}"
                  aria-label="Annuler la modification de la sous-tâche"
                  title="Annuler"
                >
                  ↺
                </button>
              `
              : `
                <button
                  type="button"
                  class="tasks__subtask-edit"
                  data-subtask-edit="${subtask.id}"
                  aria-label="Modifier la sous-tâche"
                  title="Modifier la sous-tâche"
                >
                  ✎
                </button>
                <button
                  type="button"
                  class="tasks__subtask-delete"
                  data-subtask-delete="${subtask.id}"
                  aria-label="Supprimer la sous-tâche"
                  title="Supprimer la sous-tâche"
                >
                  ✕
                </button>
              `
          }
        </div>
      </div>
    </li>
  `;
}

function createTaskItem(
  task,
  highlightedTaskId,
  editingTaskId,
  editingSubtaskId,
  openTagMenuTaskId,
  showFullTags,
  expandedTagTaskId
) {
  const checked = task.completed ? 'checked' : '';
  const isCompletedClass = task.completed ? 'tasks__item--completed' : '';
  const strikeClass = task.completed ? 'tasks__task-text--completed' : '';
  const isHighlightedClass = highlightedTaskId === task.id ? 'animate-bounce-in' : '';
  const isEditing = editingTaskId === task.id;
  const showExpandedTag = expandedTagTaskId === task.id;
  const tagBadge =
    !isEditing && task.tagId
      ? showFullTags || showExpandedTag
        ? renderTagBadge(task.tagId)
        : renderTagDot(task.id, task.tagId)
      : '';
  const menuOpen = openTagMenuTaskId === task.id;

  return `
    <li class="tasks__item card ${isCompletedClass} ${isHighlightedClass} animate-fade-in">
      <div class="tasks__item-main">
        <label class="tasks__task-label">
          <input
            type="checkbox"
            data-task-toggle="${task.id}"
            ${checked}
          />
          <span class="tasks__task-title-row">
            ${tagBadge}
            ${
              isEditing
                ? `<input
                  type="text"
                  class="tasks__inline-input tasks__inline-input--task"
                  data-task-edit-input="${task.id}"
                  value="${escapeHtml(task.text)}"
                  maxlength="180"
                />`
                : `<span class="tasks__task-text ${strikeClass}">${escapeHtml(task.text)}</span>`
            }
          </span>
        </label>

        <div class="tasks__actions">
          ${
            isEditing
              ? `
                <button
                  type="button"
                  class="tasks__inline-save"
                  data-task-edit-save="${task.id}"
                  aria-label="Enregistrer la tâche"
                  title="Enregistrer"
                >
                  ✓
                </button>
                <button
                  type="button"
                  class="tasks__inline-cancel"
                  data-task-edit-cancel="${task.id}"
                  aria-label="Annuler la modification de la tâche"
                  title="Annuler"
                >
                  ↺
                </button>
              `
              : `
                <div class="tasks__tag-wrap">
                  <button
                    type="button"
                    class="tasks__tag-btn"
                    data-task-tag-toggle="${task.id}"
                    aria-label="Choisir un tag"
                    aria-expanded="${menuOpen ? 'true' : 'false'}"
                    aria-haspopup="true"
                    title="Tag"
                  >
                    🏷
                  </button>
                  ${createTagMenu(task.id, menuOpen)}
                </div>
                <button
                  type="button"
                  class="tasks__priority ${task.priority ? 'is-active' : ''}"
                  data-task-priority="${task.id}"
                  aria-label="${task.priority ? 'Retirer la priorité' : 'Marquer prioritaire'}"
                  title="Prioritaire"
                >
                  ⭐
                </button>
                <button
                  type="button"
                  class="tasks__edit"
                  data-task-edit="${task.id}"
                  aria-label="Modifier la tâche"
                  title="Modifier"
                >
                  ✎
                </button>
              `
          }
          <button
            type="button"
            class="tasks__delete"
            data-task-delete="${task.id}"
            aria-label="Supprimer la tâche"
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="tasks__subtasks">
        ${
          task.subtasks.length
            ? `<ul class="tasks__subtasks-list">${task.subtasks
                .map((subtask) => createSubtaskItem(subtask, editingSubtaskId))
                .join('')}</ul>`
            : '<p class="tasks__subtasks-empty">Aucune sous-tâche.</p>'
        }

        <form class="tasks__subtask-form" data-subtask-form="${task.id}">
          <input
            type="text"
            class="tasks__subtask-input"
            data-subtask-input="${task.id}"
            placeholder="Nouvelle sous-tâche..."
            maxlength="140"
          />
          <button type="submit" class="btn" data-subtask-submit="${task.id}">
            Ajouter une sous-tâche
          </button>
        </form>
      </div>
    </li>
  `;
}

function createTasksList(
  tasks,
  highlightedTaskId = null,
  editingTaskId = null,
  editingSubtaskId = null,
  openTagMenuTaskId = null,
  showFullTags = false,
  expandedTagTaskId = null,
  noTasksInStorage = false,
  emptyWithFadeIn = false
) {
  if (!tasks.length) {
    const fadeClass = emptyWithFadeIn ? ' animate-fade-in' : '';
    return `<p class="tasks__empty${fadeClass}">${noTasksInStorage ? 'Ajoute ta première tâche pour démarrer.' : 'Aucune tâche ne correspond à ce filtre.'}</p>`;
  }

  return `
    <ul class="tasks__list">
      ${tasks
        .map((task) =>
          createTaskItem(
            task,
            highlightedTaskId,
            editingTaskId,
            editingSubtaskId,
            openTagMenuTaskId,
            showFullTags,
            expandedTagTaskId
          )
        )
        .join('')}
    </ul>
  `;
}

function formatArchiveDateLabel(archivedDate) {
  if (typeof archivedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(archivedDate)) {
    return escapeHtml(String(archivedDate ?? ''));
  }
  const [y, m, d] = archivedDate.split('-');
  return escapeHtml(`${d}/${m}/${y}`);
}

function createArchivedTaskLine(task) {
  const badge = task.tagId ? renderTagBadge(task.tagId) : '';
  const star = task.priority ? '<span aria-hidden="true">⭐ </span>' : '';
  const done = task.completed ? ' ✓' : '';
  return `<li class="tasks__archive-line">${star}${badge}<span class="tasks__archive-line-text">${escapeHtml(task.text)}${done}</span></li>`;
}

function createTasksArchivesPanel(archiveEntries = []) {
  if (!archiveEntries.length) {
    return '<p class="tasks__archives-empty">Aucune tâche archivée pour l’instant.</p>';
  }

  return archiveEntries
    .map((entry, index) => {
      const label = formatArchiveDateLabel(entry.archivedDate);
      const lines = entry.tasks.map((t) => createArchivedTaskLine(t)).join('');
      return `
        <section class="tasks__archive-group card animate-fade-in" aria-labelledby="tasks-archive-h-${index}">
          <div class="tasks__archive-group-head">
            <h2 class="tasks__archive-group-title" id="tasks-archive-h-${index}">${label}</h2>
            <span class="tasks__archive-group-meta">${entry.tasks.length} tâche${entry.tasks.length > 1 ? 's' : ''}</span>
          </div>
          <ul class="tasks__archive-group-list">${lines}</ul>
          <button type="button" class="btn btn-secondary tasks__archive-restore" data-tasks-archive-restore="${index}">
            Restaurer
          </button>
        </section>
      `;
    })
    .join('');
}

function createAmnestyBannerMarkup(pendingCount, visible) {
  const hiddenClass = visible ? '' : ' is-hidden';
  const escCount = escapeHtml(String(pendingCount));
  const taskWord = pendingCount === 1 ? 'tâche' : 'tâches';
  return `
    <div class="tasks__amnesty-banner card${hiddenClass}" data-tasks-amnesty-banner role="region" aria-label="Amnistie des tâches" aria-hidden="${visible ? 'false' : 'true'}">
      <p class="tasks__amnesty-text">
        La semaine a été chargée ? 🌿<br />
        Tu as ${escCount} ${taskWord} en attente.<br />
        Veux-tu archiver tout ça et repartir de zéro aujourd’hui ?
      </p>
      <div class="tasks__amnesty-actions">
        <button type="button" class="btn btn-primary tasks__amnesty-archive" data-tasks-amnesty-archive>
          🗂 Archiver et repartir
        </button>
        <button type="button" class="tasks__amnesty-dismiss" data-tasks-amnesty-dismiss>
          Non, je garde tout
        </button>
      </div>
    </div>
  `;
}

function createTasksView(
  tasks = [],
  progress = { completed: 0, total: 0 },
  highlightedTaskId = null,
  editingTaskId = null,
  editingSubtaskId = null,
  listFilter = 'all',
  openTagMenuTaskId = null,
  showFullTags = false,
  expandedTagTaskId = null,
  noTasksInStorage = false,
  ui = {}
) {
  const {
    showAmnestyBanner = false,
    amnestyPendingCount = 0,
    showArchivesView = false,
    archiveEntries = [],
    archivedTaskTotal = 0,
    amnestyToast = null,
    emptyListFadeIn = false
  } = ui;

  const toastHtml = amnestyToast
    ? `<p class="tasks__amnesty-toast animate-fade-in" role="status">${escapeHtml(amnestyToast)}</p>`
    : '';

  const mainHidden = showArchivesView ? ' hidden' : '';
  const archivesHidden = showArchivesView ? '' : ' hidden';
  const formHidden = showArchivesView ? ' hidden' : '';
  const footHidden = showArchivesView ? ' hidden' : '';

  const archiveLinkLabel =
    archivedTaskTotal <= 1
      ? `📦 Archives (${archivedTaskTotal} tâche archivée)`
      : `📦 Archives (${archivedTaskTotal} tâches archivées)`;
  const tagsToggleLabel = showFullTags ? 'Masquer les tags' : 'Afficher les tags';

  return `
    <section class="tasks animate-fade-in">
      <div class="tasks__card card animate-slide-up">
        <header class="tasks__header">
          <div class="tasks__header-top">
            <div class="tasks__header-titles">
              <h1 class="tasks__title">Tâches</h1>
              <p class="tasks__subtitle">Une étape à la fois, sans surcharge.</p>
            </div>
            <div class="tasks__header-actions">
              <span class="tasks__progress-inline tasks__progress">${progress.completed}/${progress.total} tâches complétées</span>
              <button
                type="button"
                class="tasks__tags-toggle"
                data-tasks-toggle-tags
                aria-pressed="${showFullTags ? 'true' : 'false'}"
              >
                ${tagsToggleLabel}
              </button>
              <button type="button" class="tasks__amnesty-manual" data-tasks-amnesty-manual aria-label="Ouvrir l’amnistie des tâches">
                🌿 Amnistie
              </button>
            </div>
          </div>
        </header>

        <div data-tasks-toast-wrap>${toastHtml}</div>

        <form class="tasks__form${formHidden}" data-task-form>
          <input
            id="task-input"
            class="tasks__input"
            data-task-input
            type="text"
            placeholder="Ajouter une tâche..."
            maxlength="180"
            required
          />
          <button type="submit" class="btn btn-primary">Ajouter</button>
        </form>

        <div class="tasks__main-stack"${mainHidden} data-tasks-main-stack>
          <div data-tasks-amnesty-slot>
            ${createAmnestyBannerMarkup(amnestyPendingCount, showAmnestyBanner)}
          </div>

          <div class="tasks__filters-wrap" data-tasks-filters>
            ${createTasksFilterBar(listFilter)}
          </div>

          <div class="tasks__list-container" data-tasks-list>
            ${createTasksList(
              tasks,
              highlightedTaskId,
              editingTaskId,
              editingSubtaskId,
              openTagMenuTaskId,
              showFullTags,
              expandedTagTaskId,
              noTasksInStorage,
              emptyListFadeIn
            )}
          </div>
        </div>

        <div class="tasks__archives-view"${archivesHidden} data-tasks-archives-view>
          <button type="button" class="tasks__archives-back btn btn-secondary" data-tasks-archives-back>
            ← Retour aux tâches
          </button>
          <div class="tasks__archives-groups" data-tasks-archives-groups>
            ${createTasksArchivesPanel(archiveEntries)}
          </div>
        </div>

        <p class="tasks__archives-foot"${footHidden}>
          <button type="button" class="tasks__archives-link" data-tasks-archives-toggle>
            ${escapeHtml(archiveLinkLabel)}
          </button>
        </p>
      </div>
    </section>
  `;
}

function createDashboardPreview(tasks = []) {
  if (!tasks.length) {
    return '<p class="tasks-widget__empty">Aucune tâche à venir.</p>';
  }

  return `
    <ul class="tasks-widget__list">
      ${tasks
        .map((task) => {
          const badge = task.tagId ? renderTagBadge(task.tagId) : '';
          const star = task.priority ? '<span class="tasks-widget__star" aria-hidden="true">⭐</span> ' : '';
          return `<li class="tasks-widget__item">${star}${badge}<span class="tasks-widget__item-text">${escapeHtml(task.text)}</span></li>`;
        })
        .join('')}
    </ul>
  `;
}

export {
  escapeHtml,
  createTasksView,
  createTasksList,
  createDashboardPreview,
  createTasksFilterBar,
  createTasksArchivesPanel,
  createAmnestyBannerMarkup,
  PREDEFINED_TAGS
};
