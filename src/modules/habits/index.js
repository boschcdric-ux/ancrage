import './style.css';
import { createHabitsView, createDashboardPreview } from './view.js';
import {
  DAY_NAMES,
  FREQUENCY_DISPLAY_LABELS,
  toDateKey,
  habitScheduledOnDate,
  isCompletedOnDate,
  getReturnsCount,
  buildConstellationStars,
  getTodayBannerCopy,
  getGaugeOffset
} from './logic.js';
import {
  FREQUENCY_LABELS,
  migrateLegacyOnboarding,
  buildPetHabitDef,
  buildInitialHabitsFromOnboarding,
  readHabits,
  readCompletions,
  persistHabits,
  persistCompletions,
  readOnboardedFlag,
  saveOnboardingResult,
  readPetProfile,
  clearPetProfile,
  readPetHabitId,
  savePetProfile,
  generateUUID
} from './habits-store.js';
import { createHabitsEventHandlers } from './habits-events.js';
import { attachListDragReorder } from '../../core/list-drag-reorder.js';

const JUST_DONE_MS = 600;

let rootContainer = null;
let habits = [];
let completions = [];
let viewMode = 'day';
let panelOpen = false;
let editHabitId = null;
let bulkEditMode = false;
let showOnboarding = false;
let petSettingsOpen = false;
let onboardingPetKind = null;
let onClick = null;
let onSubmit = null;
let onSyncComplete = null;
let onDialogClose = null;
let onDialogClick = null;
let cleanupManageListDrag = null;
let onManageListKeydown = null;

function closeHabitsPanelDialog() {
  const dialog = rootContainer?.querySelector('[data-habits-panel-dialog]');
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

function closePetSettingsDialog() {
  const dialog = rootContainer?.querySelector('[data-pet-settings-dialog]');
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

function openHabitsPanelDialog() {
  requestAnimationFrame(() => {
    const dialog = rootContainer?.querySelector('[data-habits-panel-dialog]');
    if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
  });
}

function openPetSettingsDialog() {
  requestAnimationFrame(() => {
    const dialog = rootContainer?.querySelector('[data-pet-settings-dialog]');
    if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
  });
}

function syncDialogsAfterRender() {
  if (panelOpen) {
    openHabitsPanelDialog();
    setupManageListReorder();
  } else {
    teardownManageListReorder();
  }
  if (petSettingsOpen) openPetSettingsDialog();
}

function teardownManageListReorder() {
  if (cleanupManageListDrag) {
    cleanupManageListDrag();
    cleanupManageListDrag = null;
  }
  const listEl = rootContainer?.querySelector('[data-habits-manage-list]');
  if (listEl && onManageListKeydown) {
    listEl.removeEventListener('keydown', onManageListKeydown);
    onManageListKeydown = null;
  }
}

function setupManageListReorder() {
  teardownManageListReorder();
  if (!rootContainer || !bulkEditMode) return;

  const listEl = rootContainer.querySelector('[data-habits-manage-list]');
  if (!(listEl instanceof HTMLElement)) return;

  cleanupManageListDrag = attachListDragReorder({
    listEl,
    rowSelector: '.habits__manage-item',
    handleSelector: '.habits__manage-handle',
    getOrder: () => habits.map((habit) => habit.id),
    onReorderEnd: (orderedIds) => {
      reorderHabits(orderedIds);
      render();
    }
  });

  onManageListKeydown = (event) => {
    if (!bulkEditMode) return;
    const row = event.target instanceof Element ? event.target.closest('.habits__manage-item') : null;
    if (!(row instanceof HTMLElement)) return;
    const habitId = row.dataset.id;
    if (!habitId) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHabit(habitId, 'up');
      render();
      requestAnimationFrame(() => {
        const next = rootContainer?.querySelector(`[data-id="${habitId}"]`);
        if (next instanceof HTMLElement) next.focus();
      });
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHabit(habitId, 'down');
      render();
      requestAnimationFrame(() => {
        const next = rootContainer?.querySelector(`[data-id="${habitId}"]`);
        if (next instanceof HTMLElement) next.focus();
      });
    }
  };
  listEl.addEventListener('keydown', onManageListKeydown);
}

function getState() {
  return {
    habits,
    completions,
    viewMode,
    panelOpen,
    editHabitId,
    bulkEditMode,
    showOnboarding,
    petSettingsOpen,
    onboardingPetKind
  };
}

function setState(patch) {
  if (patch.habits !== undefined) habits = patch.habits;
  if (patch.completions !== undefined) completions = patch.completions;
  if (patch.viewMode !== undefined) viewMode = patch.viewMode;
  if (patch.panelOpen !== undefined) panelOpen = patch.panelOpen;
  if (patch.editHabitId !== undefined) editHabitId = patch.editHabitId;
  if (patch.bulkEditMode !== undefined) bulkEditMode = patch.bulkEditMode;
  if (patch.showOnboarding !== undefined) showOnboarding = patch.showOnboarding;
  if (patch.petSettingsOpen !== undefined) petSettingsOpen = patch.petSettingsOpen;
  if (patch.onboardingPetKind !== undefined) onboardingPetKind = patch.onboardingPetKind;
}

function isHabitCompletedOnDate(habitId, dateKey) {
  return isCompletedOnDate(habitId, dateKey, completions);
}

function toggleCompletion(habitId, checked) {
  const date = new Date();
  const dateKey = toDateKey(date);
  const dayOfWeek = DAY_NAMES[date.getDay()];

  if (checked) {
    if (isHabitCompletedOnDate(habitId, dateKey)) return;
    completions.push({ habitId, date: dateKey, timestamp: Date.now(), dayOfWeek });
    completions = persistCompletions(habits, completions);
    return;
  }

  completions = completions.filter((item) => !(item.habitId === habitId && item.date === dateKey));
  completions = persistCompletions(habits, completions);
}

function getConsecutiveDays(habitId) {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const dateKey = toDateKey(cursor);
    if (!isHabitCompletedOnDate(habitId, dateKey)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getCompletionRateForDate(date) {
  const dateKey = toDateKey(date);
  const expectedHabits = habits.filter((habit) => habitScheduledOnDate(habit, date));
  if (!expectedHabits.length) return 0;
  const doneCount = expectedHabits.filter((habit) => isHabitCompletedOnDate(habit.id, dateKey)).length;
  return Math.round((doneCount / expectedHabits.length) * 100);
}

function getTodayHabitsData() {
  const today = new Date();
  const todayKey = toDateKey(today);
  return habits
    .filter((habit) => habitScheduledOnDate(habit, today))
    .map((habit) => ({
      habit,
      completed: isHabitCompletedOnDate(habit.id, todayKey),
      returnsCount: getReturnsCount(habit.id, completions),
      frequencyLabel: FREQUENCY_DISPLAY_LABELS[habit.frequency] || FREQUENCY_DISPLAY_LABELS.daily
    }));
}

function getBannerStats() {
  const todayHabits = getTodayHabitsData();
  const doneCount = todayHabits.filter((item) => item.completed).length;
  const totalCount = todayHabits.length;
  const copy = getTodayBannerCopy(doneCount, totalCount);
  return {
    doneCount,
    totalCount,
    gaugeText: copy.gaugeText,
    subtitle: copy.subtitle,
    gaugeOffset: getGaugeOffset(doneCount, totalCount)
  };
}

function applyMooringCardState(card, done) {
  card.classList.toggle('done', done);
  card.setAttribute('aria-pressed', String(done));
  if (done) {
    card.classList.remove('just-done');
    void card.offsetWidth;
    card.classList.add('just-done');
    setTimeout(() => card.classList.remove('just-done'), JUST_DONE_MS);
  } else {
    card.classList.remove('just-done');
  }
}

function updateReturnsCounter(habitId) {
  if (!rootContainer) return;
  const counter = rootContainer.querySelector(`[data-returns-for="${habitId}"]`);
  if (counter) counter.textContent = String(getReturnsCount(habitId, completions));
}

function updateTodayBanner() {
  if (!rootContainer) return;
  const stats = getBannerStats();
  const arc = rootContainer.querySelector('[data-habits-gauge-arc]');
  const gaugeTxt = rootContainer.querySelector('[data-habits-gauge-txt]');
  const subtitle = rootContainer.querySelector('[data-habits-banner-sub]');
  if (arc) arc.style.strokeDashoffset = String(stats.gaugeOffset);
  if (gaugeTxt) gaugeTxt.textContent = stats.gaugeText;
  if (subtitle) subtitle.textContent = stats.subtitle;
}

function moveHabit(habitId, direction) {
  const index = habits.findIndex((item) => item.id === habitId);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= habits.length) return;
  const [item] = habits.splice(index, 1);
  habits.splice(targetIndex, 0, item);
  persistHabits(habits);
}

function reorderHabits(orderedIds) {
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  const next = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  if (next.length !== habits.length) return;
  habits = next;
  persistHabits(habits);
}

function upsertHabit(form) {
  const id = form.querySelector('[data-habit-id]')?.value?.trim() || '';
  const emojiValue = form.querySelector('[data-habit-emoji]')?.value?.trim() || '✨';
  const nameValue = form.querySelector('[data-habit-name]')?.value?.trim() || '';
  const frequencyValue = form.querySelector('[data-habit-frequency]')?.value || 'daily';
  const frequency = ['daily', 'weekdays', 'weekend', 'every2days'].includes(frequencyValue)
    ? frequencyValue
    : 'daily';

  if (!nameValue) return false;

  if (id) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return false;
    habit.emoji = emojiValue;
    habit.name = nameValue;
    habit.frequency = frequency;
    persistHabits(habits);
    return { ok: true, created: false };
  }

  habits.push({
    id: generateUUID(),
    name: nameValue,
    emoji: emojiValue,
    frequency,
    createdAt: Date.now(),
    color: '--success'
  });
  persistHabits(habits);
  return { ok: true, created: true };
}

function saveAllHabitsFromBulkForm(form) {
  const rows = Array.from(form.querySelectorAll('.habits__bulk-item'));
  if (!rows.length) return false;

  const nextHabits = rows
    .map((row) => {
      const id = row.querySelector('[data-bulk-habit-id]')?.value?.trim();
      const source = habits.find((item) => item.id === id);
      if (!id || !source) return null;

      const emojiValue = row.querySelector('[data-bulk-habit-emoji]')?.value?.trim() || '✨';
      const nameValue = row.querySelector('[data-bulk-habit-name]')?.value?.trim() || '';
      const frequencyValue = row.querySelector('[data-bulk-habit-frequency]')?.value || 'daily';
      const frequency = ['daily', 'weekdays', 'weekend', 'every2days'].includes(frequencyValue)
        ? frequencyValue
        : 'daily';
      if (!nameValue) return null;

      return { ...source, emoji: emojiValue, name: nameValue, frequency };
    })
    .filter(Boolean);

  if (nextHabits.length !== habits.length) return false;
  habits = nextHabits;
  persistHabits(habits);
  return true;
}

function deleteHabit(habitId) {
  const before = habits.length;
  habits = habits.filter((habit) => habit.id !== habitId);
  if (habits.length === before) return;
  completions = completions.filter((entry) => entry.habitId !== habitId);
  if (readPetHabitId() === habitId) clearPetProfile();
  persistHabits(habits);
  completions = persistCompletions(habits, completions);
}

function completeOnboarding(kind, nameRaw) {
  habits = buildInitialHabitsFromOnboarding(kind || 'none', nameRaw);
  persistHabits(habits);
  saveOnboardingResult(kind || 'none', nameRaw, habits);
  setState({ showOnboarding: false, onboardingPetKind: null });
  render();
}

function applyPetSettings(kind, nameRaw) {
  const trimmed = (nameRaw || '').trim();
  const petHabitId = readPetHabitId();
  const existingById =
    typeof petHabitId === 'string' && petHabitId ? habits.find((h) => h.id === petHabitId) : null;
  const existing = existingById || habits.find((h) => h.petSlot === true) || null;

  if (!kind || kind === 'none') {
    if (existing) deleteHabit(existing.id);
    else clearPetProfile();
    setState({ petSettingsOpen: false });
    render();
    return;
  }

  const def = buildPetHabitDef(kind, trimmed);
  if (!def) {
    setState({ petSettingsOpen: false });
    render();
    return;
  }

  if (existing) {
    existing.emoji = def.emoji;
    existing.name = def.name;
    existing.frequency = def.frequency;
    existing.petSlot = true;
    persistHabits(habits);
    savePetProfile(kind, trimmed, existing.id);
  } else {
    const newHabit = {
      id: generateUUID(),
      name: def.name,
      emoji: def.emoji,
      frequency: def.frequency,
      createdAt: Date.now(),
      color: '--success',
      petSlot: true
    };
    habits.unshift(newHabit);
    persistHabits(habits);
    savePetProfile(kind, trimmed, newHabit.id);
  }
  setState({ petSettingsOpen: false });
  render();
}

function getViewModel() {
  const banner = getBannerStats();
  const editHabit = editHabitId ? habits.find((habit) => habit.id === editHabitId) || null : null;
  const today = new Date();

  return {
    viewMode,
    todayHabits: getTodayHabitsData(),
    regularityCards: habits.map((habit) => ({
      habit,
      returnsCount: getReturnsCount(habit.id, completions),
      stars: buildConstellationStars(habit, completions, today)
    })),
    banner,
    showOnboarding,
    onboardingPetKind,
    petSettingsOpen,
    petProfile: readPetProfile(),
    panelOpen,
    manageHabits: habits.map((habit) => ({
      ...habit,
      frequencyLabel: FREQUENCY_LABELS[habit.frequency] || FREQUENCY_LABELS.daily
    })),
    editHabit,
    bulkEditMode
  };
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createHabitsView(getViewModel());
  syncDialogsAfterRender();
}

function bindEvents() {
  if (!rootContainer) return;

  const handlers = createHabitsEventHandlers({
    getRoot: () => rootContainer,
    getState,
    setState,
    toggleCompletion,
    applyMooringCardState,
    updateReturnsCounter,
    updateTodayBanner,
    moveHabit,
    upsertHabit,
    saveAllHabitsFromBulkForm,
    deleteHabit,
    completeOnboarding,
    applyPetSettings,
    closeHabitsPanelDialog,
    closePetSettingsDialog,
    render,
    readHabits,
    readCompletions
  });

  onClick = handlers.onClick;
  onSubmit = handlers.onSubmit;
  onSyncComplete = handlers.onSyncComplete;

  onDialogClose = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLDialogElement)) return;
    if (target.matches('[data-habits-panel-dialog]')) {
      setState({ panelOpen: false, editHabitId: null, bulkEditMode: false });
      render();
      return;
    }
    if (target.matches('[data-pet-settings-dialog]')) {
      setState({ petSettingsOpen: false });
      render();
    }
  };

  onDialogClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLDialogElement)) return;
    if (event.target !== target) return;
    if (target.matches('[data-habits-panel-dialog]') || target.matches('[data-pet-settings-dialog]')) {
      target.close();
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('submit', onSubmit);
  rootContainer.addEventListener('close', onDialogClose);
  rootContainer.addEventListener('click', onDialogClick);
  document.addEventListener('ancrage:sync-complete', onSyncComplete);
}

const habitsModule = {
  id: 'habits',
  label: 'Habitudes',
  icon: '🌱',

  init(container) {
    rootContainer = container;
    migrateLegacyOnboarding();
    habits = readHabits();
    completions = readCompletions();
    viewMode = 'day';
    showOnboarding = !readOnboardedFlag() && habits.length === 0;
    onboardingPetKind = null;
    petSettingsOpen = false;
    panelOpen = false;
    editHabitId = null;
    bulkEditMode = false;
    render();
    bindEvents();
  },

  destroy() {
    teardownManageListReorder();
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onSubmit) rootContainer.removeEventListener('submit', onSubmit);
    if (rootContainer && onDialogClose) rootContainer.removeEventListener('close', onDialogClose);
    if (rootContainer && onDialogClick) rootContainer.removeEventListener('click', onDialogClick);
    if (onSyncComplete) document.removeEventListener('ancrage:sync-complete', onSyncComplete);

    onClick = null;
    onSubmit = null;
    onSyncComplete = null;
    onDialogClose = null;
    onDialogClick = null;
    viewMode = 'day';
    panelOpen = false;
    editHabitId = null;
    bulkEditMode = false;
    showOnboarding = false;
    petSettingsOpen = false;
    onboardingPetKind = null;
    habits = [];
    completions = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const localHabits = readHabits();
    const localCompletions = readCompletions();
    const today = new Date();
    const todayKey = toDateKey(today);
    const todayHabits = localHabits.filter((habit) => habitScheduledOnDate(habit, today));
    const doneSet = new Set(
      localCompletions.filter((entry) => entry.date === todayKey).map((entry) => entry.habitId)
    );
    const completionRate = todayHabits.length
      ? Math.round((todayHabits.filter((habit) => doneSet.has(habit.id)).length / todayHabits.length) * 100)
      : 0;

    return {
      title: 'Habitudes du jour',
      content: createDashboardPreview({
        completionRate,
        habits: todayHabits.slice(0, 3).map((habit) => ({
          name: habit.name,
          emoji: habit.emoji,
          done: doneSet.has(habit.id)
        }))
      })
    };
  }
};

export default habitsModule;
export { getConsecutiveDays, getCompletionRateForDate };
