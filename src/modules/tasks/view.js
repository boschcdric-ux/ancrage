import { escapeHtml } from '../../core/format.js';

/** Tags prédéfinis communs (ids sans accent pour les classes CSS) */
const PREDEFINED_TAGS = [
  { id: 'maison', emoji: '🏠', label: 'Maison' },
  { id: 'boulot', emoji: '💼', label: 'Boulot' },
  { id: 'sante', emoji: '🏥', label: 'Santé' },
  { id: 'admin', emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' },
  { id: 'projets', emoji: '🚀', label: 'Projets' },
  { id: 'idees', emoji: '💡', label: 'Idées' },
  { id: 'ecriture', emoji: '✍️', label: 'Écriture' },
  { id: 'nature', emoji: '🌿', label: 'Nature' }
];

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const WATER_BACK_SVG =
  '<svg class="tasks__water-back" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0,13 C75,4 150,22 300,13 C450,4 525,22 600,13 C675,4 750,22 900,13 C1050,4 1125,22 1200,13 L1200,24 L0,24 Z"/></svg>';

const WATER_FRONT_SVG =
  '<svg class="tasks__water-front" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0,15 C100,8 200,20 300,15 C400,10 500,20 600,15 C700,8 800,20 900,15 C1000,10 1100,20 1200,15 L1200,24 L0,24 Z"/></svg>';

const ANCHOR_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="5" r="2.4"/><path d="M12 7.4V21M12 21c-4.4 0-8-3.2-8-7.4M12 21c4.4 0 8-3.2 8-7.4M2.8 13.6H6M18 13.6h3.2"/></svg>';

/**
 * Progression de marée 0..1 — « commencer compte ».
 * Tâche faite = 1 ; tâche non faite avec sous-tâches = (faites/total) × 0,6.
 */
function computeTideProgress(tasks) {
  if (!tasks.length) return 0;
  let sum = 0;
  for (const task of tasks) {
    if (task.completed) {
      sum += 1;
      continue;
    }
    if (task.subtasks?.length) {
      const done = task.subtasks.filter((s) => s.completed).length;
      sum += (done / task.subtasks.length) * 0.6;
    }
  }
  return sum / tasks.length;
}

/** Libellé de marée selon la progression et l'état « tout fait ». */
function tideLabel(progress, allDone) {
  if (allDone) return 'journée tenue';
  if (progress <= 0.02) return 'mer étale';
  if (progress < 0.45) return 'la mer monte';
  if (progress < 0.85) return 'la marée est belle';
  return 'presque marée haute';
}

function tideLevelPercent(progress) {
  return `${(8 + progress * 74).toFixed(1)}%`;
}

function getFilterChipCount(allTasks, filterId) {
  if (filterId === 'all') return allTasks.filter((t) => !t.completed).length;
  if (filterId === 'priority') return allTasks.filter((t) => t.priority && !t.completed).length;
  return allTasks.filter((t) => t.tagId === filterId && !t.completed).length;
}

function renderChipCount(count) {
  if (count <= 0) return '';
  return `<span class="tasks__filter-chip-n">${count}</span>`;
}

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

function createTasksFilterBar(activeFilter = 'all', allTasks = []) {
  const tagButtons = PREDEFINED_TAGS.map((t) => {
    const count = getFilterChipCount(allTasks, t.id);
    return `
    <button
      type="button"
      class="tasks__filter-chip ${activeFilter === t.id ? 'is-active' : ''}"
      data-task-filter="tag"
      data-task-filter-tag="${t.id}"
      aria-pressed="${activeFilter === t.id ? 'true' : 'false'}"
    >
      ${t.emoji} ${escapeHtml(t.label)}${renderChipCount(count)}
    </button>
  `;
  }).join('');

  const allCount = getFilterChipCount(allTasks, 'all');
  const prioCount = getFilterChipCount(allTasks, 'priority');

  return `
    <div class="tasks__filters" data-h-scroll role="toolbar" aria-label="Filtrer les tâches">
      <button
        type="button"
        class="tasks__filter-chip ${activeFilter === 'all' ? 'is-active' : ''}"
        data-task-filter="all"
        aria-pressed="${activeFilter === 'all' ? 'true' : 'false'}"
      >
        Toutes${renderChipCount(allCount)}
      </button>
      ${tagButtons}
      <button
        type="button"
        class="tasks__filter-chip ${activeFilter === 'priority' ? 'is-active' : ''}"
        data-task-filter="priority"
        aria-pressed="${activeFilter === 'priority' ? 'true' : 'false'}"
      >
        ⭐ Prioritaires${renderChipCount(prioCount)}
      </button>
    </div>
  `;
}

function createTaskActionButton(className, label, attrs = '') {
  return `
    <button type="button" class="tasks__item-action ${className}" ${attrs}>
      <span class="tasks__item-action-icon" aria-hidden="true">${label.icon}</span>
      <span class="tasks__item-action-label">${escapeHtml(label.text)}</span>
    </button>
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

function createCreateTagSelector(pendingTagId, isOpen) {
  const tag = pendingTagId ? PREDEFINED_TAGS.find((t) => t.id === pendingTagId) : null;
  const ariaLabel = tag
    ? `Tag sélectionné : ${tag.label}. Ouvrir le sélecteur de tag`
    : 'Choisir un tag pour la nouvelle tâche';

  const triggerContent = tag
    ? `<span class="tasks__create-tag-badge">${renderTagBadge(pendingTagId)}</span>`
    : `<span class="tasks__create-tag-icon" aria-hidden="true">🏷</span>`;

  const menuItems = [
    `<button type="button" class="tasks__tag-menu-item" data-create-tag-pick data-tag-id="">Aucun tag</button>`,
    ...PREDEFINED_TAGS.map(
      (t) =>
        `<button type="button" class="tasks__tag-menu-item" data-create-tag-pick data-tag-id="${t.id}">${t.emoji} ${escapeHtml(t.label)}</button>`
    )
  ].join('');

  return `
    <div class="tasks__create-tag-wrap" data-task-create-tag>
      <button
        type="button"
        class="tasks__create-tag-toggle"
        data-create-tag-toggle
        aria-label="${escapeHtml(ariaLabel)}"
        aria-expanded="${isOpen ? 'true' : 'false'}"
        aria-haspopup="true"
      >
        ${triggerContent}
      </button>
      <div class="tasks__tag-menu tasks__tag-menu--create ${isOpen ? 'is-open' : ''}" data-create-tag-menu role="menu" aria-hidden="${isOpen ? 'false' : 'true'}">
        ${menuItems}
      </div>
    </div>
  `;
}

function createTaskCheck(taskId, completed, isSubtask = false, justDone = false) {
  const subClass = isSubtask ? ' tasks__check--sub' : '';
  const justClass = justDone ? ' tasks__check--just-done' : '';
  const doneClass = completed && !justDone ? ' tasks__check--done' : '';
  const label = isSubtask ? '' : 'Marquer la tâche comme terminée';
  const dataAttr = isSubtask ? `data-subtask-toggle="${taskId}"` : `data-task-toggle="${taskId}"`;

  return `
    <label class="tasks__check-wrap${subClass}">
      <input
        type="checkbox"
        class="tasks__check-input"
        ${dataAttr}
        ${completed ? 'checked' : ''}
        aria-label="${escapeHtml(label)}"
      />
      <span class="tasks__check${justClass}${doneClass}" aria-hidden="true">${CHECK_SVG}</span>
    </label>
  `;
}

function createSubtaskItem(subtask, editingSubtaskId, parentJustDone = false) {
  const completedClass = subtask.completed ? 'tasks__subtask--completed' : '';
  const isEditing = editingSubtaskId === subtask.id;

  return `
    <li class="tasks__subtask ${completedClass}">
      <div class="tasks__subtask-main">
        ${
          isEditing
            ? ''
            : createTaskCheck(subtask.id, subtask.completed, true, parentJustDone && subtask.completed)
        }
        ${
          isEditing
            ? `<input
                  type="text"
                  class="tasks__inline-input tasks__inline-input--subtask"
                  data-subtask-edit-input="${subtask.id}"
                  value="${escapeHtml(subtask.text)}"
                  maxlength="140"
                />`
            : `<span class="tasks__subtask-text">${escapeHtml(subtask.text)}</span>`
        }
        <div class="tasks__subtask-actions">
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
  expandedTagTaskId,
  expandedTaskId
) {
  const isCompletedClass = task.completed ? 'tasks__item--completed' : '';
  const isJustDone = highlightedTaskId === task.id && task.completed;
  const isJustDoneClass = isJustDone ? 'tasks__item--just-done' : '';
  const isExpanded = expandedTaskId === task.id;
  const isExpandedClass = isExpanded ? 'tasks__item--expanded' : '';
  const isEditing = editingTaskId === task.id;
  const isEditingClass = isEditing ? 'tasks__item--editing' : '';
  const showExpandedTag = expandedTagTaskId === task.id;
  const tagBadge =
    !isEditing && task.tagId
      ? showFullTags || showExpandedTag
        ? renderTagBadge(task.tagId)
        : renderTagDot(task.id, task.tagId)
      : '';
  const menuOpen = openTagMenuTaskId === task.id;
  const isTagOpenClass = menuOpen ? 'tasks__item--tag-open' : '';

  const titleMarkup = isEditing
    ? `<input
        type="text"
        class="tasks__inline-input tasks__inline-input--task"
        data-task-edit-input="${task.id}"
        value="${escapeHtml(task.text)}"
        maxlength="180"
      />`
    : `<span class="tasks__item-text" data-task-expand="${task.id}" role="button" tabindex="0">${escapeHtml(task.text)}</span>`;

  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const subtaskProgress =
    task.subtasks.length > 0
      ? `<div class="tasks__subtasks-progress">${subtaskDone} / ${task.subtasks.length} étapes</div>`
      : '';

  const actionsMarkup = isEditing
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
          ${createTaskActionButton(
            'tasks__tag-btn',
            { icon: '🏷', text: 'Tag' },
            `data-task-tag-toggle="${task.id}" aria-label="Choisir un tag" aria-expanded="${menuOpen ? 'true' : 'false'}" aria-haspopup="true"`
          )}
          ${createTagMenu(task.id, menuOpen)}
        </div>
        ${createTaskActionButton(
          'tasks__edit',
          { icon: '✎', text: 'Modifier' },
          `data-task-edit="${task.id}" aria-label="Modifier la tâche"`
        )}
        ${createTaskActionButton(
          'tasks__subtask-add',
          { icon: '＋', text: 'Étape' },
          `data-task-expand="${task.id}" aria-label="Ajouter une étape"`
        )}
        ${createTaskActionButton(
          'tasks__delete',
          { icon: '✕', text: 'Supprimer' },
          `data-task-delete="${task.id}" aria-label="Supprimer la tâche"`
        )}
      `;

  const priorityBtn = isEditing
    ? ''
    : `<button
        type="button"
        class="tasks__priority-star ${task.priority ? 'is-active' : ''}"
        data-task-priority="${task.id}"
        aria-pressed="${task.priority ? 'true' : 'false'}"
        aria-label="${task.priority ? 'Retirer la priorité' : 'Marquer prioritaire'}"
      >⭐</button>`;

  return `
    <li class="tasks__item ${isCompletedClass} ${isJustDoneClass} ${isExpandedClass} ${isEditingClass} ${isTagOpenClass}" data-task-id="${task.id}">
      <div class="tasks__item-row">
        ${isEditing ? '' : createTaskCheck(task.id, task.completed, false, isJustDone)}
        <div class="tasks__item-body">
          ${titleMarkup}
        </div>
        ${priorityBtn}
        ${tagBadge}
      </div>

      <div class="tasks__item-detail">
        ${
          task.subtasks.length
            ? `<ul class="tasks__subtasks-list">${subtaskProgress}${task.subtasks
                .map((subtask) => createSubtaskItem(subtask, editingSubtaskId, isJustDone))
                .join('')}</ul>`
            : ''
        }

        <form class="tasks__subtask-form" data-subtask-form="${task.id}">
          <input
            type="text"
            class="tasks__subtask-input"
            data-subtask-input="${task.id}"
            placeholder="Nouvelle sous-tâche..."
            maxlength="140"
          />
          <button type="submit" class="tasks__subtask-submit" data-subtask-submit="${task.id}">
            Ajouter une étape
          </button>
        </form>

        <div class="tasks__item-actions">
          ${actionsMarkup}
        </div>
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
  expandedTaskId = null,
  noTasksInStorage = false,
  emptyWithFadeIn = false,
  filterActive = false
) {
  if (!tasks.length) {
    const fadeClass = emptyWithFadeIn ? ' tasks__empty--rise' : '';
    if (noTasksInStorage) {
      return `
        <div class="tasks__empty${fadeClass}">
          <div class="tasks__empty-title">Mer libre.</div>
          <div class="tasks__empty-hint">Rien à faire n'est pas rien. Pose une pensée quand elle vient.</div>
        </div>`;
    }
    if (filterActive) {
      return `
        <div class="tasks__empty${fadeClass}">
          <div class="tasks__empty-title">Rien sous ce filtre.</div>
          <div class="tasks__empty-hint">La mer est calme de ce côté.</div>
        </div>`;
    }
    return `
      <div class="tasks__empty${fadeClass}">
        <div class="tasks__empty-title">Mer libre.</div>
        <div class="tasks__empty-hint">Rien à faire n'est pas rien. Pose une pensée quand elle vient.</div>
      </div>`;
  }

  const displaySorted = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  return `
    <ul class="tasks__list">
      ${displaySorted
        .map((task) =>
          createTaskItem(
            task,
            highlightedTaskId,
            editingTaskId,
            editingSubtaskId,
            openTagMenuTaskId,
            showFullTags,
            expandedTagTaskId,
            expandedTaskId
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
    return '<p class="tasks__archives-empty">Aucune tâche archivée pour l\u2019instant.</p>';
  }

  return archiveEntries
    .map((entry, index) => {
      const label = formatArchiveDateLabel(entry.archivedDate);
      const lines = entry.tasks.map((t) => createArchivedTaskLine(t)).join('');
      return `
        <section class="tasks__archive-group" aria-labelledby="tasks-archive-h-${index}">
          <div class="tasks__archive-group-head">
            <h2 class="tasks__archive-group-title" id="tasks-archive-h-${index}">${label}</h2>
            <span class="tasks__archive-group-meta">${entry.tasks.length} tâche${entry.tasks.length > 1 ? 's' : ''}</span>
          </div>
          <ul class="tasks__archive-group-list">${lines}</ul>
          <button type="button" class="tasks__archive-restore" data-tasks-archive-restore="${index}">
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
    <div class="tasks__amnesty${hiddenClass}" data-tasks-amnesty-banner role="region" aria-label="Amnistie des tâches" aria-hidden="${visible ? 'false' : 'true'}">
      <p class="tasks__amnesty-text">
        <strong>${escCount} ${taskWord}</strong> en attente. Les pardonner&nbsp;?
      </p>
      <button type="button" class="tasks__amnesty-btn" data-tasks-amnesty-archive>
        Amnistie
      </button>
      <button type="button" class="tasks__amnesty-dismiss" data-tasks-amnesty-dismiss aria-label="Garder les tâches en attente">
        ✕
      </button>
    </div>
  `;
}

function createTasksHead(progress, tideText, levelPercent, showAnchor, anchorAnimate) {
  const anchoredClass = showAnchor ? ' tasks__head--anchored' : '';
  const anchorHidden = showAnchor ? '' : ' hidden';
  const anchorAnimClass = anchorAnimate ? ' tasks__head-anchor--drop' : '';

  return `
    <header class="tasks__head${anchoredClass}" data-tasks-head>
      <h1 class="tasks__head-title">Tâches</h1>
      <p class="tasks__head-meta">
        <span class="tasks__head-count" data-tasks-count>${progress.completed}</span>
        <span>sur <span data-tasks-total>${progress.total}</span> — <span data-tasks-tide>${escapeHtml(tideText)}</span></span>
      </p>
      <div class="tasks__water" data-tasks-water style="--level: ${levelPercent}">
        ${WATER_BACK_SVG}
        ${WATER_FRONT_SVG}
        <div class="tasks__water-fill"></div>
      </div>
      <div class="tasks__head-anchor${anchorAnimClass}" data-tasks-anchor${anchorHidden}>
        ${ANCHOR_SVG}
        <span class="tasks__head-anchor-label">Ancre posée</span>
      </div>
    </header>
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
  expandedTaskId = null,
  noTasksInStorage = false,
  ui = {},
  pendingCreateTagId = null,
  openCreateTagMenu = false
) {
  const {
    showAmnestyBanner = false,
    amnestyPendingCount = 0,
    showArchivesView = false,
    archiveEntries = [],
    archivedDayCount = 0,
    amnestyToast = null,
    emptyListFadeIn = false,
    allTasks = tasks,
    tideProgress = 0,
    allDone = false,
    showAnchor = false,
    anchorAnimate = false
  } = ui;

  const tideText = tideLabel(tideProgress, allDone);
  const levelPercent = tideLevelPercent(tideProgress);

  const amnestyNote = amnestyToast
    ? `<p class="tasks__amnesty-note tasks__empty--rise" role="status">Pardonné. Demain est une autre marée.</p>`
    : '';

  const mainHidden = showArchivesView ? ' hidden' : '';
  const archivesHidden = showArchivesView ? '' : ' hidden';
  const formHidden = showArchivesView ? ' hidden' : '';
  const footHidden = showArchivesView ? ' hidden' : '';

  const archiveDayWord = archivedDayCount <= 1 ? 'journée' : 'journées';
  const archiveLinkLabel = `Voir les archives (${archivedDayCount} ${archiveDayWord})`;

  return `
    <section class="tasks">
      <div class="tasks__shell">
        ${createTasksHead(progress, tideText, levelPercent, showAnchor, anchorAnimate)}

        <div class="tasks__toolbar">
          <button
            type="button"
            class="tasks__tags-toggle"
            data-tasks-toggle-tags
            aria-pressed="${showFullTags ? 'true' : 'false'}"
            aria-label="${showFullTags ? 'Masquer les tags' : 'Afficher les tags'}"
          >
            🏷
          </button>
          <button type="button" class="tasks__amnesty-manual" data-tasks-amnesty-manual aria-label="Ouvrir l'amnistie des tâches">
            🌿
          </button>
        </div>

        <form class="tasks__form${formHidden}" data-task-form>
          ${createCreateTagSelector(pendingCreateTagId, openCreateTagMenu)}
          <input
            id="task-input"
            class="tasks__input"
            data-task-input
            type="text"
            placeholder="Ajouter une tâche…"
            maxlength="180"
            required
          />
          <button type="submit" class="tasks__submit">Poser</button>
        </form>

        <div class="tasks__main-stack"${mainHidden} data-tasks-main-stack>
          <div data-tasks-amnesty-slot>
            ${createAmnestyBannerMarkup(amnestyPendingCount, showAmnestyBanner)}
          </div>

          <div class="tasks__filters-wrap" data-tasks-filters>
            ${createTasksFilterBar(listFilter, allTasks)}
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
              expandedTaskId,
              noTasksInStorage,
              emptyListFadeIn,
              listFilter !== 'all'
            )}
            ${amnestyNote}
          </div>
        </div>

        <div class="tasks__archives-view"${archivesHidden} data-tasks-archives-view>
          <button type="button" class="tasks__archives-back" data-tasks-archives-back>
            ← Retour aux tâches
          </button>
          <div class="tasks__archives-groups" data-tasks-archives-groups>
            ${createTasksArchivesPanel(archiveEntries)}
          </div>
        </div>

        <footer class="tasks__foot${footHidden}">
          <button type="button" class="tasks__archives-link" data-tasks-archives-toggle>
            ${escapeHtml(archiveLinkLabel)}
          </button>
        </footer>
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
  createCreateTagSelector,
  computeTideProgress,
  tideLabel,
  tideLevelPercent,
  PREDEFINED_TAGS
};
