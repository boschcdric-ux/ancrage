import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import {
  createTasksView,
  createTasksList,
  createDashboardPreview,
  createTasksFilterBar,
  createTasksArchivesPanel,
  createAmnestyBannerMarkup,
  escapeHtml,
  PREDEFINED_TAGS
} from './view.js';

const STORAGE_KEY = 'tasks:items';
const STORAGE_LAST_OPENED = 'tasks:last-opened';
const STORAGE_ARCHIVE = 'tasks:archive';
const STORAGE_SHOW_TAGS = 'tasks:show-tags';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const TAG_ID_SET = new Set(PREDEFINED_TAGS.map((t) => t.id));

function normalizeTagId(value) {
  if (value == null || value === '') return null;
  const id = String(value);
  return TAG_ID_SET.has(id) ? id : null;
}

let rootContainer = null;
let tasks = [];
let listFilter = 'all';
let openTagMenuTaskId = null;
let onFormSubmit = null;
let onClick = null;
let onChange = null;
let onRootSubmit = null;
let onKeyDown = null;
let onPointerDown = null;
let highlightedTaskId = null;
let editingTaskId = null;
let editingSubtaskId = null;
let showAmnestyBanner = false;
let showArchivesView = false;
let amnestyToast = null;
let amnestyToastTimer = null;
let emptyListFadeInAfterAmnesty = false;
let showFullTags = false;
let expandedTagTaskId = null;
let expandedTagTimer = null;

function normalizeSubtask(subtask) {
  if (!subtask || subtask.id == null || subtask.text == null) return null;
  const id = String(subtask.id).trim();
  const text = String(subtask.text).trim();
  if (!id || !text) return null;

  return {
    id,
    text,
    completed: Boolean(subtask.completed),
    createdAt: Number(subtask.createdAt) || Date.now(),
    completedAt: subtask.completedAt ? Number(subtask.completedAt) : null
  };
}

function normalizeTask(task) {
  if (!task || typeof task.id !== 'string' || typeof task.text !== 'string') return null;

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks.map(normalizeSubtask).filter(Boolean) : [];

  return {
    id: task.id,
    text: task.text,
    completed: Boolean(task.completed),
    createdAt: Number(task.createdAt) || Date.now(),
    completedAt: task.completedAt ? Number(task.completedAt) : null,
    subtasks,
    tagId: normalizeTagId(task.tagId),
    priority: Boolean(task.priority)
  };
}

function readTasks() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeTask).filter(Boolean);
}

function persistTasks() {
  save(STORAGE_KEY, tasks);
}

function localDateString(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isCompletedToday(task) {
  if (!task.completed || task.completedAt == null) return false;
  return localDateString(Number(task.completedAt)) === localDateString(Date.now());
}

function getPendingIncompleteCount() {
  return tasks.filter((t) => !t.completed).length;
}

function normalizeArchiveEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const archivedAt = Number(entry.archivedAt) || Date.now();
  const archivedDate =
    typeof entry.archivedDate === 'string' && entry.archivedDate
      ? entry.archivedDate
      : localDateString(archivedAt);
  const raw = Array.isArray(entry.tasks) ? entry.tasks : [];
  const normalizedTasks = raw.map(normalizeTask).filter(Boolean);
  if (!normalizedTasks.length) return null;
  return { archivedAt, archivedDate, tasks: normalizedTasks };
}

function readArchive() {
  const data = load(STORAGE_ARCHIVE, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeArchiveEntry).filter(Boolean);
}

function persistArchive(entries) {
  save(STORAGE_ARCHIVE, entries);
}

function getArchivedTaskTotal(entries) {
  return entries.reduce((acc, e) => acc + e.tasks.length, 0);
}

function performAmnesty() {
  const now = Date.now();
  const archivedDate = localDateString(now);
  const incomplete = tasks.filter((t) => !t.completed);
  const oldCompleted = tasks.filter((t) => t.completed && !isCompletedToday(t));
  const toArchive = [...incomplete, ...oldCompleted];

  if (!toArchive.length) {
    showAmnestyBanner = false;
    renderList();
    return;
  }

  const archive = readArchive();
  const entry = {
    archivedAt: now,
    archivedDate,
    tasks: toArchive.map((t) => normalizeTask(t)).filter(Boolean)
  };
  archive.unshift(entry);
  persistArchive(archive);

  tasks = tasks.filter((t) => t.completed && isCompletedToday(t));
  if (highlightedTaskId && !tasks.some((t) => t.id === highlightedTaskId)) highlightedTaskId = null;
  if (openTagMenuTaskId && !tasks.some((t) => t.id === openTagMenuTaskId)) openTagMenuTaskId = null;
  if (editingTaskId && !tasks.some((t) => t.id === editingTaskId)) editingTaskId = null;
  editingSubtaskId = null;

  persistTasks();
  showAmnestyBanner = false;
  emptyListFadeInAfterAmnesty = tasks.length === 0;

  if (amnestyToastTimer) {
    clearTimeout(amnestyToastTimer);
    amnestyToastTimer = null;
  }
  amnestyToast = "C'est reparti ! ✨ Tableau blanc.";
  amnestyToastTimer = setTimeout(() => {
    amnestyToastTimer = null;
    amnestyToast = null;
    renderList();
  }, 4200);

  renderList();
}

function restoreArchiveGroup(index) {
  const archive = readArchive();
  if (!Number.isInteger(index) || index < 0 || index >= archive.length) return;

  const [group] = archive.splice(index, 1);
  persistArchive(archive);

  const existingIds = new Set(tasks.map((t) => t.id));
  for (const raw of group.tasks) {
    const t = normalizeTask(raw);
    if (!t || existingIds.has(t.id)) continue;
    tasks.push(t);
    existingIds.add(t.id);
  }
  persistTasks();
  showArchivesView = false;
  renderList();
}

function sortTasksForDisplay(taskList) {
  return [...taskList].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed) {
      if (Boolean(a.priority) !== Boolean(b.priority)) return a.priority ? -1 : 1;
      return a.createdAt - b.createdAt;
    }
    return (a.completedAt || a.createdAt) - (b.completedAt || b.createdAt);
  });
}

function filterTasksForList(taskList) {
  if (listFilter === 'all') return taskList;
  if (listFilter === 'priority') return taskList.filter((t) => t.priority);
  return taskList.filter((t) => t.tagId === listFilter);
}

function getProgress() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { completed, total };
}

function renderList() {
  if (!rootContainer) return;

  const archiveEntries = readArchive();
  const archivedTaskTotal = getArchivedTaskTotal(archiveEntries);

  const progressNode = rootContainer.querySelector('.tasks__progress');
  const filtersNode = rootContainer.querySelector('[data-tasks-filters]');
  const listNode = rootContainer.querySelector('[data-tasks-list]');
  const toastWrap = rootContainer.querySelector('[data-tasks-toast-wrap]');
  const amnestySlot = rootContainer.querySelector('[data-tasks-amnesty-slot]');
  const mainStack = rootContainer.querySelector('[data-tasks-main-stack]');
  const archivesView = rootContainer.querySelector('[data-tasks-archives-view]');
  const archivesGroups = rootContainer.querySelector('[data-tasks-archives-groups]');
  const form = rootContainer.querySelector('[data-task-form]');
  const archivesFoot = rootContainer.querySelector('.tasks__archives-foot');
  const archivesToggle = rootContainer.querySelector('[data-tasks-archives-toggle]');

  if (!listNode || !progressNode) return;

  const filtered = filterTasksForList(tasks);
  const sortedTasks = sortTasksForDisplay(filtered);
  const progress = getProgress();
  progressNode.textContent = `${progress.completed}/${progress.total} tâches complétées`;
  if (filtersNode) filtersNode.innerHTML = createTasksFilterBar(listFilter);

  const useEmptyFadeIn = emptyListFadeInAfterAmnesty;
  if (emptyListFadeInAfterAmnesty) emptyListFadeInAfterAmnesty = false;

  listNode.innerHTML = createTasksList(
    sortedTasks,
    highlightedTaskId,
    editingTaskId,
    editingSubtaskId,
    openTagMenuTaskId,
    showFullTags,
    expandedTagTaskId,
    tasks.length === 0,
    useEmptyFadeIn
  );

  if (toastWrap) {
    toastWrap.innerHTML = amnestyToast
      ? `<p class="tasks__amnesty-toast animate-fade-in" role="status">${escapeHtml(amnestyToast)}</p>`
      : '';
  }

  if (amnestySlot) {
    const pending = getPendingIncompleteCount();
    amnestySlot.innerHTML = createAmnestyBannerMarkup(pending, showAmnestyBanner && !showArchivesView);
  }

  if (form) form.hidden = showArchivesView;
  if (mainStack) mainStack.hidden = showArchivesView;
  if (archivesView) archivesView.hidden = !showArchivesView;
  if (archivesFoot) archivesFoot.hidden = showArchivesView;
  if (archivesGroups) archivesGroups.innerHTML = createTasksArchivesPanel(archiveEntries);

  if (archivesToggle && !showArchivesView) {
    archivesToggle.textContent =
      archivedTaskTotal <= 1
        ? `📦 Archives (${archivedTaskTotal} tâche archivée)`
        : `📦 Archives (${archivedTaskTotal} tâches archivées)`;
  }

  if (editingTaskId) {
    const taskEditInput = listNode.querySelector(`[data-task-edit-input="${editingTaskId}"]`);
    if (taskEditInput instanceof HTMLInputElement) {
      taskEditInput.focus();
      taskEditInput.select();
    }
  }

  if (editingSubtaskId) {
    const subtaskEditInput = listNode.querySelector(`[data-subtask-edit-input="${editingSubtaskId}"]`);
    if (subtaskEditInput instanceof HTMLInputElement) {
      subtaskEditInput.focus();
      subtaskEditInput.select();
    }
  }
}

function createTask(text) {
  return {
    id: generateUUID(),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    subtasks: [],
    tagId: null,
    priority: false
  };
}

function markTaskCompletion(task, completed) {
  task.completed = completed;
  task.completedAt = completed ? Date.now() : null;
}

function toggleTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const nextCompletedState = !task.completed;
  markTaskCompletion(task, nextCompletedState);
  if (nextCompletedState) highlightedTaskId = task.id;
  persistTasks();
  renderList();
}

function toggleSubtask(subtaskId) {
  for (const task of tasks) {
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) continue;
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? Date.now() : null;
    persistTasks();
    renderList();
    return;
  }
}

function deleteTask(taskId) {
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) return;
  const removedTask = normalizeTask(tasks[taskIndex]);
  if (!removedTask) return;

  tasks.splice(taskIndex, 1);

  if (highlightedTaskId === taskId) highlightedTaskId = null;
  if (openTagMenuTaskId === taskId) openTagMenuTaskId = null;
  if (editingTaskId === taskId) editingTaskId = null;
  editingSubtaskId = null;
  persistTasks();
  renderList();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Tâche supprimée', () => {
      const exists = tasks.some((task) => task.id === removedTask.id);
      if (exists) return;
      const insertAt = Math.min(Math.max(taskIndex, 0), tasks.length);
      tasks.splice(insertAt, 0, removedTask);
      persistTasks();
      renderList();
    });
  }
}

function deleteSubtask(subtaskId) {
  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
    const task = tasks[taskIndex];
    const subtaskIndex = task.subtasks.findIndex((item) => item.id === subtaskId);
    if (subtaskIndex < 0) continue;

    const removedSubtask = normalizeSubtask(task.subtasks[subtaskIndex]);
    if (!removedSubtask) return;
    task.subtasks.splice(subtaskIndex, 1);
    if (editingSubtaskId === subtaskId) editingSubtaskId = null;
    persistTasks();
    renderList();

    const undo = window.showUndoToast;
    if (typeof undo === 'function') {
      undo('Sous-tâche supprimée', () => {
        const targetTask = tasks[taskIndex];
        if (!targetTask) return;
        const exists = targetTask.subtasks.some((item) => item.id === removedSubtask.id);
        if (exists) return;
        const insertAt = Math.min(Math.max(subtaskIndex, 0), targetTask.subtasks.length);
        targetTask.subtasks.splice(insertAt, 0, removedSubtask);
        persistTasks();
        renderList();
      });
    }
    return;
  }
}

function renameTask(taskId, nextText) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return false;

  const value = nextText.trim();
  if (!value || value === task.text) return false;

  task.text = value;
  persistTasks();
  return true;
}

function renameSubtask(subtaskId, nextText) {
  const value = nextText.trim();
  if (!value) return false;

  for (const task of tasks) {
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (!subtask || value === subtask.text) continue;
    subtask.text = value;
    persistTasks();
    return true;
  }
  return false;
}

function startTaskEdit(taskId) {
  openTagMenuTaskId = null;
  editingTaskId = taskId;
  editingSubtaskId = null;
  renderList();
}

function cancelTaskEdit() {
  if (!editingTaskId) return;
  editingTaskId = null;
  renderList();
}

function saveTaskEdit(taskId) {
  if (!rootContainer) return;
  const input = rootContainer.querySelector(`[data-task-edit-input="${taskId}"]`);
  if (!(input instanceof HTMLInputElement)) return;

  const renamed = renameTask(taskId, input.value);
  if (!renamed) {
    input.classList.remove('animate-shake');
    requestAnimationFrame(() => input.classList.add('animate-shake'));
    return;
  }

  editingTaskId = null;
  renderList();
}

function startSubtaskEdit(subtaskId) {
  editingSubtaskId = subtaskId;
  editingTaskId = null;
  openTagMenuTaskId = null;
  renderList();
}

function cancelSubtaskEdit() {
  if (!editingSubtaskId) return;
  editingSubtaskId = null;
  renderList();
}

function saveSubtaskEdit(subtaskId) {
  if (!rootContainer) return;
  const input = rootContainer.querySelector(`[data-subtask-edit-input="${subtaskId}"]`);
  if (!(input instanceof HTMLInputElement)) return;

  const renamed = renameSubtask(subtaskId, input.value);
  if (!renamed) {
    input.classList.remove('animate-shake');
    requestAnimationFrame(() => input.classList.add('animate-shake'));
    return;
  }

  editingSubtaskId = null;
  renderList();
}

function addSubtask(taskId, text) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const value = text.trim();
  if (!value) return;

  task.subtasks.push({
    id: generateUUID(),
    text: value.trim(),
    completed: false,
    createdAt: Date.now(),
    completedAt: null
  });
  persistTasks();
  renderList();
}

function setTaskTag(taskId, tagId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.tagId = tagId === '' || tagId == null ? null : normalizeTagId(tagId);
  openTagMenuTaskId = null;
  persistTasks();
  renderList();
}

function toggleTaskPriority(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.priority = !task.priority;
  persistTasks();
  renderList();
}

function setTagsVisibility(nextValue) {
  showFullTags = Boolean(nextValue);
  save(STORAGE_SHOW_TAGS, showFullTags);
  if (expandedTagTimer) {
    clearTimeout(expandedTagTimer);
    expandedTagTimer = null;
  }
  if (showFullTags) expandedTagTaskId = null;
  renderList();
}

function previewTaskTag(taskId) {
  if (!taskId || showFullTags) return;
  const exists = tasks.some((item) => item.id === taskId && item.tagId);
  if (!exists) return;

  expandedTagTaskId = taskId;
  if (expandedTagTimer) clearTimeout(expandedTagTimer);
  expandedTagTimer = setTimeout(() => {
    expandedTagTimer = null;
    expandedTagTaskId = null;
    renderList();
  }, 2000);
  renderList();
}

function bindEvents() {
  if (!rootContainer) return;

  const form = rootContainer.querySelector('[data-task-form]');
  const input = rootContainer.querySelector('[data-task-input]');
  if (!form || !input) return;

  onFormSubmit = (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (!value) {
      input.classList.remove('animate-shake');
      requestAnimationFrame(() => input.classList.add('animate-shake'));
      return;
    }

    tasks.unshift(createTask(value));
    highlightedTaskId = null;
    editingTaskId = null;
    editingSubtaskId = null;
    openTagMenuTaskId = null;
    persistTasks();
    renderList();
    form.reset();
    input.focus();
  };

  onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-task-toggle]')) {
      const taskId = target.dataset.taskToggle;
      if (taskId) toggleTask(taskId);
      return;
    }

    if (target.matches('[data-subtask-toggle]')) {
      const subtaskId = target.dataset.subtaskToggle;
      if (subtaskId) toggleSubtask(subtaskId);
    }
  };

  onClick = (event) => {
    const eventTarget = event.target;
    const target =
      eventTarget instanceof Element
        ? eventTarget
        : eventTarget instanceof Node
          ? eventTarget.parentElement
          : null;
    if (!(target instanceof Element)) return;

    const amnestyManual = target.closest('[data-tasks-amnesty-manual]');
    if (amnestyManual instanceof HTMLButtonElement) {
      showAmnestyBanner = true;
      renderList();
      return;
    }

    const amnestyArchive = target.closest('[data-tasks-amnesty-archive]');
    if (amnestyArchive instanceof HTMLButtonElement) {
      performAmnesty();
      return;
    }

    const amnestyDismiss = target.closest('[data-tasks-amnesty-dismiss]');
    if (amnestyDismiss instanceof HTMLButtonElement) {
      showAmnestyBanner = false;
      renderList();
      return;
    }

    const archivesToggle = target.closest('[data-tasks-archives-toggle]');
    if (archivesToggle instanceof HTMLButtonElement) {
      showArchivesView = true;
      showAmnestyBanner = false;
      renderList();
      return;
    }

    const archivesBack = target.closest('[data-tasks-archives-back]');
    if (archivesBack instanceof HTMLButtonElement) {
      showArchivesView = false;
      renderList();
      return;
    }

    const restoreBtn = target.closest('[data-tasks-archive-restore]');
    if (restoreBtn instanceof HTMLButtonElement) {
      const idxRaw = restoreBtn.getAttribute('data-tasks-archive-restore');
      const idx = idxRaw != null && idxRaw !== '' ? Number(idxRaw) : NaN;
      if (!Number.isNaN(idx)) restoreArchiveGroup(idx);
      return;
    }

    const filterBtn = target.closest('[data-task-filter]');
    if (filterBtn instanceof HTMLButtonElement) {
      const mode = filterBtn.dataset.taskFilter;
      if (mode === 'all') listFilter = 'all';
      else if (mode === 'priority') listFilter = 'priority';
      else if (mode === 'tag') {
        const tid = filterBtn.dataset.taskFilterTag;
        listFilter = tid && TAG_ID_SET.has(tid) ? tid : 'all';
      }
      openTagMenuTaskId = null;
      renderList();
      return;
    }

    const tagPick = target.closest('[data-task-tag-pick]');
    if (tagPick instanceof HTMLButtonElement) {
      const taskId = tagPick.dataset.taskTagPick;
      const tagId = tagPick.dataset.tagId ?? '';
      if (taskId) setTaskTag(taskId, tagId);
      return;
    }

    const tagToggle = target.closest('[data-task-tag-toggle]');
    if (tagToggle instanceof HTMLButtonElement) {
      const taskId = tagToggle.dataset.taskTagToggle;
      if (!taskId) return;
      openTagMenuTaskId = openTagMenuTaskId === taskId ? null : taskId;
      renderList();
      return;
    }

    const tagsVisibilityToggle = target.closest('[data-tasks-toggle-tags]');
    if (tagsVisibilityToggle instanceof HTMLButtonElement) {
      setTagsVisibility(!showFullTags);
      return;
    }

    const tagPreview = target.closest('[data-task-tag-preview]');
    if (tagPreview instanceof HTMLButtonElement) {
      const taskId = tagPreview.dataset.taskTagPreview;
      if (taskId) previewTaskTag(taskId);
      return;
    }

    const priorityBtn = target.closest('[data-task-priority]');
    if (priorityBtn instanceof HTMLButtonElement) {
      const taskId = priorityBtn.dataset.taskPriority;
      if (taskId) toggleTaskPriority(taskId);
      return;
    }

    const deleteButton = target.closest('[data-task-delete]');
    if (deleteButton instanceof HTMLButtonElement) {
      const taskId = deleteButton.dataset.taskDelete;
      if (taskId) deleteTask(taskId);
      return;
    }

    const deleteSubtaskButton = target.closest('[data-subtask-delete]');
    if (deleteSubtaskButton instanceof HTMLButtonElement) {
      const subtaskId = deleteSubtaskButton.dataset.subtaskDelete;
      if (subtaskId) deleteSubtask(subtaskId);
      return;
    }

    const editButton = target.closest('[data-task-edit]');
    if (editButton instanceof HTMLButtonElement) {
      const taskId = editButton.dataset.taskEdit;
      if (!taskId) return;
      startTaskEdit(taskId);
      return;
    }

    const editSubtaskButton = target.closest('[data-subtask-edit]');
    if (editSubtaskButton instanceof HTMLButtonElement) {
      const subtaskId = editSubtaskButton.dataset.subtaskEdit;
      if (!subtaskId) return;
      startSubtaskEdit(subtaskId);
      return;
    }

    const saveTaskButton = target.closest('[data-task-edit-save]');
    if (saveTaskButton instanceof HTMLButtonElement) {
      const taskId = saveTaskButton.dataset.taskEditSave;
      if (taskId) saveTaskEdit(taskId);
      return;
    }

    const cancelTaskButton = target.closest('[data-task-edit-cancel]');
    if (cancelTaskButton instanceof HTMLButtonElement) {
      cancelTaskEdit();
      return;
    }

    const saveSubtaskButton = target.closest('[data-subtask-edit-save]');
    if (saveSubtaskButton instanceof HTMLButtonElement) {
      const subtaskId = saveSubtaskButton.dataset.subtaskEditSave;
      if (subtaskId) saveSubtaskEdit(subtaskId);
      return;
    }

    const cancelSubtaskButton = target.closest('[data-subtask-edit-cancel]');
    if (cancelSubtaskButton instanceof HTMLButtonElement) {
      cancelSubtaskEdit();
    }
  };

  onKeyDown = (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    if (event.key === 'Escape') {
      if (event.target.matches('[data-task-edit-input]')) {
        event.preventDefault();
        cancelTaskEdit();
        return;
      }

      if (event.target.matches('[data-subtask-edit-input]')) {
        event.preventDefault();
        cancelSubtaskEdit();
      }
      return;
    }

    if (event.key !== 'Enter') return;

    if (event.target.matches('[data-task-edit-input]')) {
      event.preventDefault();
      const taskId = event.target.dataset.taskEditInput;
      if (taskId) saveTaskEdit(taskId);
      return;
    }

    if (event.target.matches('[data-subtask-edit-input]')) {
      event.preventDefault();
      const subtaskId = event.target.dataset.subtaskEditInput;
      if (subtaskId) saveSubtaskEdit(subtaskId);
    }
  };

  onPointerDown = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (openTagMenuTaskId) {
      const insideTagUi = target.closest('.tasks__tag-wrap');
      if (!insideTagUi) {
        openTagMenuTaskId = null;
        setTimeout(() => renderList(), 0);
      }
    }

    if (editingTaskId) {
      const clickedInsideTaskEditor =
        target.closest(`[data-task-edit-input="${editingTaskId}"]`) ||
        target.closest(`[data-task-edit-save="${editingTaskId}"]`) ||
        target.closest(`[data-task-edit-cancel="${editingTaskId}"]`) ||
        target.closest(`[data-task-edit="${editingTaskId}"]`);

      if (!clickedInsideTaskEditor) {
        cancelTaskEdit();
        return;
      }
    }

    if (editingSubtaskId) {
      const clickedInsideSubtaskEditor =
        target.closest(`[data-subtask-edit-input="${editingSubtaskId}"]`) ||
        target.closest(`[data-subtask-edit-save="${editingSubtaskId}"]`) ||
        target.closest(`[data-subtask-edit-cancel="${editingSubtaskId}"]`) ||
        target.closest(`[data-subtask-edit="${editingSubtaskId}"]`);

      if (!clickedInsideSubtaskEditor) {
        cancelSubtaskEdit();
      }
    }
  };

  onRootSubmit = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches('[data-subtask-form]')) {
      event.preventDefault();
      const taskId = target.dataset.subtaskForm;
      if (!taskId) return;

      const subtaskInput = target.querySelector('[data-subtask-input]');
      if (!(subtaskInput instanceof HTMLInputElement)) return;

      const value = subtaskInput.value.trim();
      if (!value) {
        subtaskInput.classList.remove('animate-shake');
        requestAnimationFrame(() => subtaskInput.classList.add('animate-shake'));
        return;
      }

      addSubtask(taskId, value);
    }
  };

  form.addEventListener('submit', onFormSubmit);
  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('submit', onRootSubmit);
  rootContainer.addEventListener('keydown', onKeyDown);
  rootContainer.addEventListener('pointerdown', onPointerDown);
}

const tasksModule = {
  id: 'tasks',
  label: 'Tâches',
  icon: '✅',

  init(container) {
    rootContainer = container;
    tasks = readTasks();
    listFilter = 'all';
    openTagMenuTaskId = null;
    highlightedTaskId = null;
    editingTaskId = null;
    editingSubtaskId = null;
    showArchivesView = false;
    amnestyToast = null;
    emptyListFadeInAfterAmnesty = false;
    expandedTagTaskId = null;
    if (amnestyToastTimer) {
      clearTimeout(amnestyToastTimer);
      amnestyToastTimer = null;
    }
    if (expandedTagTimer) {
      clearTimeout(expandedTagTimer);
      expandedTagTimer = null;
    }
    showFullTags = Boolean(load(STORAGE_SHOW_TAGS, false));

    const lastOpenedRaw = load(STORAGE_LAST_OPENED, null);
    const lastOpenedNum =
      typeof lastOpenedRaw === 'number' && !Number.isNaN(lastOpenedRaw) ? lastOpenedRaw : null;
    const pendingIncomplete = getPendingIncompleteCount();
    const shouldAutoAmnesty =
      lastOpenedNum != null &&
      Date.now() - lastOpenedNum > THREE_DAYS_MS &&
      pendingIncomplete > 0;
    showAmnestyBanner = shouldAutoAmnesty;
    save(STORAGE_LAST_OPENED, Date.now());

    const filtered = filterTasksForList(tasks);
    const archiveEntries = readArchive();
    const archivedTaskTotal = getArchivedTaskTotal(archiveEntries);
    rootContainer.innerHTML = createTasksView(
      sortTasksForDisplay(filtered),
      getProgress(),
      highlightedTaskId,
      editingTaskId,
      editingSubtaskId,
      listFilter,
      openTagMenuTaskId,
      showFullTags,
      expandedTagTaskId,
      tasks.length === 0,
      {
        showAmnestyBanner,
        amnestyPendingCount: pendingIncomplete,
        showArchivesView,
        archiveEntries,
        archivedTaskTotal,
        amnestyToast,
        emptyListFadeIn: false
      }
    );
    bindEvents();
  },

  destroy() {
    const form = rootContainer?.querySelector('[data-task-form]');
    if (form && onFormSubmit) {
      form.removeEventListener('submit', onFormSubmit);
    }

    if (rootContainer && onClick) {
      rootContainer.removeEventListener('click', onClick);
    }

    if (rootContainer && onChange) {
      rootContainer.removeEventListener('change', onChange);
    }
    if (rootContainer && onRootSubmit) {
      rootContainer.removeEventListener('submit', onRootSubmit);
    }
    if (rootContainer && onKeyDown) {
      rootContainer.removeEventListener('keydown', onKeyDown);
    }
    if (rootContainer && onPointerDown) {
      rootContainer.removeEventListener('pointerdown', onPointerDown);
    }

    onFormSubmit = null;
    onClick = null;
    onChange = null;
    onRootSubmit = null;
    onKeyDown = null;
    onPointerDown = null;
    highlightedTaskId = null;
    editingTaskId = null;
    editingSubtaskId = null;
    listFilter = 'all';
    openTagMenuTaskId = null;
    tasks = [];
    showAmnestyBanner = false;
    showArchivesView = false;
    amnestyToast = null;
    showFullTags = false;
    expandedTagTaskId = null;
    if (amnestyToastTimer) {
      clearTimeout(amnestyToastTimer);
      amnestyToastTimer = null;
    }
    if (expandedTagTimer) {
      clearTimeout(expandedTagTimer);
      expandedTagTimer = null;
    }

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const nextTasks = sortTasksForDisplay(readTasks())
      .filter((task) => !task.completed)
      .slice(0, 3);

    return {
      title: 'Prochaines tâches',
      content: createDashboardPreview(nextTasks)
    };
  }
};

export default tasksModule;
