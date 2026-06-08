import './style.css';
import { save, load, generateUUID, remove } from '../../core/storage.js';
import { createHabitsView, createDashboardPreview } from './view.js';

const HABITS_KEY = 'habits:list';
const COMPLETIONS_KEY = 'habits:completions';
const ONBOARDED_KEY = 'habits:onboarded';
const PET_PROFILE_KEY = 'habits:petProfile';
const PET_HABIT_ID_KEY = 'habits:petHabitId';
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FREQUENCY_LABELS = {
  daily: 'Quotidien',
  weekdays: 'Jours de semaine',
  weekend: 'Weekend',
  every2days: 'Tous les 2 jours'
};
const FREQUENCY_SHORT_LABELS = {
  daily: 'Quotidien',
  weekdays: 'L-V',
  weekend: 'S-D',
  every2days: '2 j'
};
const DEFAULT_HABITS = [
  { emoji: '💧', name: "Boire suffisamment d'eau", frequency: 'daily' },
  { emoji: '📵', name: '10 min sans écran le matin', frequency: 'daily' },
  { emoji: '🌿', name: '5 min de lumière naturelle', frequency: 'daily' },
  { emoji: '😴', name: 'Coucher avant minuit', frequency: 'daily' }
];

let rootContainer = null;
let habits = [];
let completions = [];
let panelOpen = false;
let editHabitId = null;
let bulkEditMode = false;
let selectedHistoryDate = null;
let showOnboarding = false;
let petSettingsOpen = false;
let onboardingPetKind = null;
let onClick = null;
let onChange = null;
let onSubmit = null;
let onSyncComplete = null;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function normalizeHabit(habit) {
  if (!habit || typeof habit.id !== 'string' || typeof habit.name !== 'string') return null;
  const frequency = ['daily', 'weekdays', 'weekend', 'every2days'].includes(habit.frequency)
    ? habit.frequency
    : 'daily';
  const name = habit.name.trim();
  if (!name) return null;

  const normalized = {
    id: habit.id,
    name,
    emoji: typeof habit.emoji === 'string' && habit.emoji.trim() ? habit.emoji.trim() : '✨',
    frequency,
    createdAt: Number(habit.createdAt) || Date.now(),
    color: typeof habit.color === 'string' && habit.color.trim() ? habit.color.trim() : '--success'
  };
  if (habit.petSlot === true) normalized.petSlot = true;
  return normalized;
}

function normalizeCompletion(item) {
  if (!item || typeof item.habitId !== 'string' || typeof item.date !== 'string') return null;
  return {
    habitId: item.habitId,
    date: item.date,
    timestamp: Number(item.timestamp) || Date.now(),
    dayOfWeek: typeof item.dayOfWeek === 'string' ? item.dayOfWeek : DAY_NAMES[parseDateKey(item.date).getDay()]
  };
}

function createDefaultHabits() {
  const now = Date.now();
  return DEFAULT_HABITS.map((habit, index) => ({
    id: generateUUID(),
    name: habit.name,
    emoji: habit.emoji,
    frequency: habit.frequency,
    createdAt: now + index,
    color: '--success'
  }));
}

function readOnboardedFlag() {
  return load(ONBOARDED_KEY) === true;
}

function loadHabitsFromStorage() {
  const data = load(HABITS_KEY, []);
  return Array.isArray(data) ? data.map(normalizeHabit).filter(Boolean) : [];
}

function migrateLegacyOnboarding() {
  if (readOnboardedFlag()) return;
  if (loadHabitsFromStorage().length > 0) {
    save(ONBOARDED_KEY, true);
  }
}

function buildPetHabitDef(kind, trimmedName) {
  if (!kind || kind === 'none') return null;
  if (kind === 'dog') {
    return {
      emoji: '🐕',
      name: trimmedName ? `Sortir ${trimmedName} 🐕` : 'Sortir mon chien 🐕',
      frequency: 'daily'
    };
  }
  if (kind === 'cat') {
    return {
      emoji: '🐱',
      name: trimmedName ? `Litière de ${trimmedName} 🐱` : 'Litière du chat 🐱',
      frequency: 'every2days'
    };
  }
  if (kind === 'other') {
    return {
      emoji: '🐾',
      name: trimmedName ? `Soins de ${trimmedName} 🐾` : 'Soins de mon animal 🐾',
      frequency: 'daily'
    };
  }
  return null;
}

function buildInitialHabitsFromOnboarding(kind, nameRaw) {
  const trimmed = (nameRaw || '').trim();
  const petDef = buildPetHabitDef(kind, trimmed);
  const now = Date.now();
  const genericRows = DEFAULT_HABITS.map((habit, index) => ({
    id: generateUUID(),
    name: habit.name,
    emoji: habit.emoji,
    frequency: habit.frequency,
    createdAt: now + 10 + index,
    color: '--success'
  }));
  if (!petDef) return genericRows;
  const petHabit = {
    id: generateUUID(),
    name: petDef.name,
    emoji: petDef.emoji,
    frequency: petDef.frequency,
    createdAt: now,
    color: '--success',
    petSlot: true
  };
  return [petHabit, ...genericRows];
}

function readHabits() {
  const normalized = loadHabitsFromStorage();
  if (normalized.length) return normalized;
  if (!readOnboardedFlag()) return [];
  const defaults = createDefaultHabits();
  save(HABITS_KEY, defaults);
  return defaults;
}

function readCompletions() {
  const data = load(COMPLETIONS_KEY, []);
  return Array.isArray(data) ? data.map(normalizeCompletion).filter(Boolean) : [];
}

function persistHabits() {
  save(HABITS_KEY, habits);
}

function persistCompletions() {
  const validIds = new Set(habits.map((habit) => habit.id));
  completions = completions.filter((entry) => validIds.has(entry.habitId));
  save(COMPLETIONS_KEY, completions);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiffLocal(fromDate, toDate) {
  const a = startOfLocalDay(fromDate).getTime();
  const b = startOfLocalDay(toDate).getTime();
  return Math.round((b - a) / 86400000);
}

function habitScheduledOnDate(habit, date) {
  if (habit.frequency === 'every2days') {
    const anchor = new Date(Number(habit.createdAt) || Date.now());
    const diff = daysDiffLocal(anchor, date);
    if (diff < 0) return false;
    return diff % 2 === 0;
  }
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return !isWeekend(date);
  return isWeekend(date);
}

function isCompletedOnDate(habitId, dateKey) {
  return completions.some((item) => item.habitId === habitId && item.date === dateKey);
}

function toggleCompletion(habitId, checked) {
  const date = new Date();
  const dateKey = toDateKey(date);
  const dayOfWeek = DAY_NAMES[date.getDay()];

  if (checked) {
    if (isCompletedOnDate(habitId, dateKey)) return;
    completions.push({
      habitId,
      date: dateKey,
      timestamp: Date.now(),
      dayOfWeek
    });
    persistCompletions();
    return;
  }

  completions = completions.filter((item) => !(item.habitId === habitId && item.date === dateKey));
  persistCompletions();
}

function getCompletionRateForDate(date) {
  const dateKey = toDateKey(date);
  const expectedHabits = habits.filter((habit) => habitScheduledOnDate(habit, date));
  if (!expectedHabits.length) return 0;
  const doneCount = expectedHabits.filter((habit) => isCompletedOnDate(habit.id, dateKey)).length;
  return Math.round((doneCount / expectedHabits.length) * 100);
}

function getCurrentWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  const shift = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - shift);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getConsecutiveDays(habitId) {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const dateKey = toDateKey(cursor);
    if (!isCompletedOnDate(habitId, dateKey)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getWeeklyCount(habitId) {
  const week = getCurrentWeekDates();
  return week.filter((date) => isCompletedOnDate(habitId, toDateKey(date))).length;
}

function getStreakData(habit) {
  const consecutiveDays = getConsecutiveDays(habit.id);
  const weeklyCount = getWeeklyCount(habit.id);
  const weekStatuses = getCurrentWeekDates().map((date) => {
    const dateKey = toDateKey(date);
    const scheduled = habitScheduledOnDate(habit, date);
    return {
      done: isCompletedOnDate(habit.id, dateKey),
      scheduled
    };
  });

  if (weeklyCount >= consecutiveDays) {
    return {
      text: `${weeklyCount} jours cette semaine`,
      weekStatuses
    };
  }

  return {
    text: `${consecutiveDays} jours de suite`,
    weekStatuses
  };
}

function getMonthCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ date: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const rate = getCompletionRateForDate(date);
    let toneClass = 'tone-0';
    if (rate > 0 && rate < 50) toneClass = 'tone-warning';
    if (rate >= 50 && rate < 100) toneClass = 'tone-accent';
    if (rate === 100) toneClass = 'tone-success';

    cells.push({
      date: toDateKey(date),
      dayNumber: day,
      label: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      toneClass
    });
  }

  return cells;
}

function getHistoryDetails(dateKey) {
  if (!dateKey) return null;
  const date = parseDateKey(dateKey);
  const doneSet = new Set(
    completions.filter((item) => item.date === dateKey).map((item) => item.habitId)
  );
  const items = habits
    .filter((habit) => doneSet.has(habit.id))
    .map((habit) => ({ name: habit.name, emoji: habit.emoji }));

  return {
    label: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    items
  };
}

function moveHabit(habitId, direction) {
  const index = habits.findIndex((item) => item.id === habitId);
  if (index === -1) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= habits.length) return;
  const [item] = habits.splice(index, 1);
  habits.splice(targetIndex, 0, item);
  persistHabits();
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
    persistHabits();
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
  persistHabits();
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

      return {
        ...source,
        emoji: emojiValue,
        name: nameValue,
        frequency
      };
    })
    .filter(Boolean);

  if (nextHabits.length !== habits.length) return false;
  habits = nextHabits;
  persistHabits();
  return true;
}

function deleteHabit(habitId) {
  const before = habits.length;
  habits = habits.filter((habit) => habit.id !== habitId);
  if (habits.length === before) return;
  completions = completions.filter((entry) => entry.habitId !== habitId);
  const petId = load(PET_HABIT_ID_KEY);
  if (petId === habitId) {
    save(PET_PROFILE_KEY, null);
    remove(PET_HABIT_ID_KEY);
  }
  persistHabits();
  persistCompletions();
}

function completeOnboarding(kind, nameRaw) {
  const k = kind || 'none';
  habits = buildInitialHabitsFromOnboarding(k, nameRaw);
  persistHabits();
  const trimmed = (nameRaw || '').trim();
  const petHabit = habits.find((h) => h.petSlot);
  save(ONBOARDED_KEY, true);
  if (petHabit) {
    save(PET_PROFILE_KEY, { kind: k, name: trimmed });
    save(PET_HABIT_ID_KEY, petHabit.id);
  } else {
    save(PET_PROFILE_KEY, null);
    remove(PET_HABIT_ID_KEY);
  }
  showOnboarding = false;
  onboardingPetKind = null;
  render();
}

function applyPetSettings(kind, nameRaw) {
  const trimmed = (nameRaw || '').trim();
  const petHabitId = load(PET_HABIT_ID_KEY);
  const existingById =
    typeof petHabitId === 'string' && petHabitId ? habits.find((h) => h.id === petHabitId) : null;
  const existing = existingById || habits.find((h) => h.petSlot === true) || null;

  if (!kind || kind === 'none') {
    if (existing) deleteHabit(existing.id);
    else {
      save(PET_PROFILE_KEY, null);
      remove(PET_HABIT_ID_KEY);
    }
    petSettingsOpen = false;
    render();
    return;
  }

  const def = buildPetHabitDef(kind, trimmed);
  if (!def) {
    petSettingsOpen = false;
    render();
    return;
  }

  if (existing) {
    existing.emoji = def.emoji;
    existing.name = def.name;
    existing.frequency = def.frequency;
    existing.petSlot = true;
    persistHabits();
    save(PET_PROFILE_KEY, { kind, name: trimmed });
    save(PET_HABIT_ID_KEY, existing.id);
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
    persistHabits();
    save(PET_PROFILE_KEY, { kind, name: trimmed });
    save(PET_HABIT_ID_KEY, newHabit.id);
  }
  petSettingsOpen = false;
  render();
}

function getViewModel() {
  const todayKey = toDateKey(new Date());
  const todayDate = new Date();
  const groupedItems = {
    daily: [],
    every2days: [],
    weekdays: [],
    weekend: []
  };

  for (const habit of habits) {
    const frequencyKey = ['daily', 'every2days', 'weekdays', 'weekend'].includes(habit.frequency)
      ? habit.frequency
      : 'daily';
    groupedItems[frequencyKey].push({
      habit,
      frequencyShortLabel: FREQUENCY_SHORT_LABELS[habit.frequency] || FREQUENCY_SHORT_LABELS.daily,
      completed: isCompletedOnDate(habit.id, todayKey),
      isScheduledToday: habitScheduledOnDate(habit, todayDate),
      streak: getStreakData(habit)
    });
  }

  const completionRate = getCompletionRateForDate(new Date());
  const editHabit = editHabitId ? habits.find((habit) => habit.id === editHabitId) || null : null;

  return {
    completionRate,
    groupedItems,
    showOnboarding,
    onboardingPetKind,
    petSettingsOpen,
    petProfile: load(PET_PROFILE_KEY),
    panelOpen,
    manageHabits: habits.map((habit) => ({
      ...habit,
      frequencyLabel: FREQUENCY_LABELS[habit.frequency] || FREQUENCY_LABELS.daily
    })),
    editHabit,
    bulkEditMode,
    historyDays: getMonthCalendar(),
    historyDetails: getHistoryDetails(selectedHistoryDate)
  };
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createHabitsView(getViewModel());
}

function bindEvents() {
  if (!rootContainer) return;

  onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-habit-toggle]')) return;
    const habitId = target.dataset.habitToggle;
    if (!habitId) return;
    toggleCompletion(habitId, target.checked);
    render();
  };

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const onboardingPick = target.closest('[data-onboarding-pick]');
    if (onboardingPick instanceof HTMLElement) {
      const k = onboardingPick.dataset.onboardingPick || 'none';
      onboardingPetKind = k;
      render();
      return;
    }

    const onboardingSkip = target.closest('[data-onboarding-skip]');
    if (onboardingSkip) {
      completeOnboarding('none', '');
      return;
    }

    const onboardingStart = target.closest('[data-onboarding-start]');
    if (onboardingStart && rootContainer) {
      const nameInput = rootContainer.querySelector('[data-onboarding-pet-name]');
      const nameRaw = nameInput instanceof HTMLInputElement ? nameInput.value : '';
      completeOnboarding(onboardingPetKind || 'none', nameRaw);
      return;
    }

    const openPetSettings = target.closest('[data-open-pet-settings]');
    if (openPetSettings) {
      petSettingsOpen = true;
      panelOpen = false;
      editHabitId = null;
      render();
      return;
    }

    const closePetSettings = target.closest('[data-pet-settings-close]');
    if (closePetSettings) {
      petSettingsOpen = false;
      render();
      return;
    }

    const openPanelButton = target.closest('[data-open-habits-panel]');
    if (openPanelButton) {
      panelOpen = true;
      petSettingsOpen = false;
      editHabitId = null;
      render();
      return;
    }

    const closePanelButton = target.closest('[data-habits-panel-close]');
    if (closePanelButton) {
      panelOpen = false;
      editHabitId = null;
      bulkEditMode = false;
      render();
      return;
    }

    const toggleBulkEditButton = target.closest('[data-habits-bulk-edit-toggle]');
    if (toggleBulkEditButton) {
      bulkEditMode = !bulkEditMode;
      editHabitId = null;
      render();
      return;
    }

    const historyDayButton = target.closest('[data-history-day]');
    if (historyDayButton instanceof HTMLButtonElement) {
      selectedHistoryDate = historyDayButton.dataset.historyDay || null;
      render();
      return;
    }

    const editButton = target.closest('[data-habit-edit]');
    if (editButton instanceof HTMLButtonElement) {
      editHabitId = editButton.dataset.habitEdit || null;
      bulkEditMode = false;
      panelOpen = true;
      petSettingsOpen = false;
      render();
      return;
    }

    const deleteButton = target.closest('[data-habit-delete]');
    if (deleteButton instanceof HTMLButtonElement) {
      const habitId = deleteButton.dataset.habitDelete;
      if (!habitId) return;
      deleteHabit(habitId);
      if (editHabitId === habitId) editHabitId = null;
      render();
      return;
    }

    const upButton = target.closest('[data-habit-move-up]');
    if (upButton instanceof HTMLButtonElement) {
      const habitId = upButton.dataset.habitMoveUp;
      if (!habitId) return;
      moveHabit(habitId, 'up');
      render();
      return;
    }

    const downButton = target.closest('[data-habit-move-down]');
    if (downButton instanceof HTMLButtonElement) {
      const habitId = downButton.dataset.habitMoveDown;
      if (!habitId) return;
      moveHabit(habitId, 'down');
      render();
      return;
    }
  };

  onSubmit = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (target.matches('[data-habit-form]')) {
      event.preventDefault();
      const result = upsertHabit(target);
      if (!result.ok) return;
      editHabitId = null;
      bulkEditMode = false;
      if (result.created) {
        // Ferme le panneau après ajout pour rendre la nouvelle habitude visible immédiatement.
        panelOpen = false;
      }
      render();
      return;
    }

    if (target.matches('[data-habits-bulk-form]')) {
      event.preventDefault();
      const ok = saveAllHabitsFromBulkForm(target);
      if (!ok) return;
      bulkEditMode = false;
      render();
      return;
    }

    if (target.matches('[data-pet-settings-form]')) {
      event.preventDefault();
      const kind = target.querySelector('[data-pet-settings-kind]')?.value || 'none';
      const nameInput = target.querySelector('[data-pet-settings-name]');
      const nameRaw = nameInput instanceof HTMLInputElement ? nameInput.value : '';
      applyPetSettings(kind, nameRaw);
    }
  };

  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('submit', onSubmit);

  onSyncComplete = () => {
    habits = readHabits();
    completions = readCompletions();
    render();
  };
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
    showOnboarding = !readOnboardedFlag() && habits.length === 0;
    onboardingPetKind = null;
    petSettingsOpen = false;
    panelOpen = false;
    editHabitId = null;
    bulkEditMode = false;
    selectedHistoryDate = null;
    render();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onChange) rootContainer.removeEventListener('change', onChange);
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onSubmit) rootContainer.removeEventListener('submit', onSubmit);
    if (onSyncComplete) document.removeEventListener('ancrage:sync-complete', onSyncComplete);

    onChange = null;
    onClick = null;
    onSubmit = null;
    onSyncComplete = null;
    panelOpen = false;
    editHabitId = null;
    bulkEditMode = false;
    selectedHistoryDate = null;
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
