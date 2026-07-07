import { save, load, generateUUID, remove } from '../../core/storage.js';
import { DAY_NAMES, parseDateKey } from './logic.js';

const HABITS_KEY = 'habits:list';
const COMPLETIONS_KEY = 'habits:completions';
const ONBOARDED_KEY = 'habits:onboarded';
const PET_PROFILE_KEY = 'habits:petProfile';
const PET_HABIT_ID_KEY = 'habits:petHabitId';

const FREQUENCY_LABELS = {
  daily: 'Quotidien',
  weekdays: 'Jours de semaine',
  weekend: 'Weekend',
  every2days: 'Tous les 2 jours'
};

const DEFAULT_HABITS = [
  { emoji: '💧', name: "Boire suffisamment d'eau", frequency: 'daily' },
  { emoji: '📵', name: '10 min sans écran le matin', frequency: 'daily' },
  { emoji: '🌿', name: '5 min de lumière naturelle', frequency: 'daily' },
  { emoji: '😴', name: 'Coucher avant minuit', frequency: 'daily' }
];

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

function persistHabits(habits) {
  save(HABITS_KEY, habits);
}

function persistCompletions(habits, completions) {
  const validIds = new Set(habits.map((habit) => habit.id));
  const filtered = completions.filter((entry) => validIds.has(entry.habitId));
  save(COMPLETIONS_KEY, filtered);
  return filtered;
}

function saveOnboardingResult(kind, nameRaw, habits) {
  const trimmed = (nameRaw || '').trim();
  const petHabit = habits.find((h) => h.petSlot);
  save(ONBOARDED_KEY, true);
  if (petHabit) {
    save(PET_PROFILE_KEY, { kind, name: trimmed });
    save(PET_HABIT_ID_KEY, petHabit.id);
  } else {
    save(PET_PROFILE_KEY, null);
    remove(PET_HABIT_ID_KEY);
  }
}

function readPetProfile() {
  return load(PET_PROFILE_KEY);
}

function clearPetProfile() {
  save(PET_PROFILE_KEY, null);
  remove(PET_HABIT_ID_KEY);
}

function readPetHabitId() {
  return load(PET_HABIT_ID_KEY);
}

function savePetProfile(kind, name, habitId) {
  save(PET_PROFILE_KEY, { kind, name });
  save(PET_HABIT_ID_KEY, habitId);
}

export {
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
};
