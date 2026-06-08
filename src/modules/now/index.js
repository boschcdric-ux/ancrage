import './style.css';
import { save, load } from '../../core/storage.js';
import { navigate } from '../../core/router.js';
import { createNowView, createDashboardNowCompact, escapeHtml } from './view.js';

const MOOD_KEY = 'mood:entries';
const TASKS_KEY = 'tasks:items';
const HABITS_KEY = 'habits:list';
const COMPLETIONS_KEY = 'habits:completions';
const OTHER_STATE_KEY = 'now:other-state';

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const ENERGY_EMOJI = {
  1: '🪫',
  2: '😮‍💨',
  3: '🔋',
  4: '⚡',
  5: '🚀'
};

const PAUSE_SLEEP = { key: 'pause:sleep', kind: 'pause', text: 'Prépare-toi à dormir 🌙' };
const PAUSE_FORCED = { key: 'pause:forced', kind: 'pause', text: 'Tu mérites une vraie pause ☕' };
const FALLBACK_IDEA = { key: 'pause:idea', kind: 'pause', text: 'Rien d\'urgent — capture une idée qui traîne ⚡' };
const FALLBACK_YOU = { key: 'pause:you', kind: 'pause', text: 'Prends 5 minutes pour toi 🌿' };
const PAUSE_LOW_LIGHT = {
  key: 'pause:lowlight',
  kind: 'pause',
  text: 'Ton énergie est basse — 5 min de lumière naturelle 🌿'
};

const BREATHING_HINT = {
  key: 'breathing:coherence',
  kind: 'breathing',
  text: '5 min de cohérence cardiaque 🫁',
  subtext: "Réduit l'impulsivité en quelques minutes"
};

const DEFAULT_SUGGESTION = {
  key: 'fallback:calme',
  kind: 'pause',
  text: 'Prends un moment pour toi 🌿',
  subtext: '',
  taskId: '',
  habitId: ''
};

let rootContainer = null;
let onClick = null;
let refreshTimerId = null;
let celebrationTimerId = null;
let nextSuggestionTimerId = null;

let currentResolved = null;
let celebrating = false;
let taskPrompt = { visible: false, taskId: '', title: '' };
let fadeNonce = 0;

function getIsoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function habitScheduledOnDate(habit, date) {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return !isWeekend(date);
  return isWeekend(date);
}

function normalizeHabit(habit) {
  if (!habit || typeof habit.id !== 'string' || typeof habit.name !== 'string') return null;
  const frequency = ['daily', 'weekdays', 'weekend'].includes(habit.frequency) ? habit.frequency : 'daily';
  const name = habit.name.trim();
  if (!name) return null;
  const emoji =
    typeof habit.emoji === 'string' && habit.emoji.trim() ? habit.emoji.trim() : '✨';
  return { id: habit.id, name, emoji, frequency };
}

function normalizeTask(task) {
  if (!task || typeof task.id !== 'string' || typeof task.text !== 'string') return null;
  return {
    id: task.id,
    text: task.text.trim(),
    completed: Boolean(task.completed),
    priority: Boolean(task.priority)
  };
}

function normalizeCompletion(item) {
  if (!item || typeof item.habitId !== 'string' || typeof item.date !== 'string') return null;
  return {
    habitId: item.habitId,
    date: item.date,
    timestamp: Number(item.timestamp) || Date.now(),
    dayOfWeek: typeof item.dayOfWeek === 'string' ? item.dayOfWeek : ''
  };
}

function readHabits() {
  const data = load(HABITS_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeHabit).filter(Boolean);
}

function readCompletions() {
  const data = load(COMPLETIONS_KEY, []);
  return Array.isArray(data) ? data.map(normalizeCompletion).filter(Boolean) : [];
}

function readTasks() {
  const data = load(TASKS_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeTask).filter(Boolean);
}

function readTodayEnergy() {
  const data = load(MOOD_KEY, []);
  if (!Array.isArray(data)) return null;
  const today = getIsoDate();
  const entry = data.find((e) => e && e.date === today);
  if (!entry || typeof entry.energy !== 'number') return null;
  return Math.min(5, Math.max(1, Number(entry.energy)));
}

function getTimeSlot(hour) {
  if (hour >= 22 || hour < 6) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

function taskPomodoroVariant(taskId) {
  let h = 0;
  for (let i = 0; i < taskId.length; i += 1) h = (h + taskId.charCodeAt(i)) % 10;
  return h < 5;
}

function resolveDisplayText(item, energyLevel) {
  if (item.kind === 'breathing' && item.text) return item.text;
  if (item.text) return item.text;
  if (item.kind === 'habit' && item.habit) {
    const h = item.habit;
    const label = `${h.name} ${h.emoji}`.trim();
    if (energyLevel <= 2) {
      return `Petite victoire facile : ${label}`;
    }
    return `Maintenant : ${label}`;
  }
  if (item.kind === 'task' && item.task) {
    const t = item.task;
    if (taskPomodoroVariant(t.id)) {
      return `Lance un Pomodoro sur : ${t.text} 📋`;
    }
    return `Maintenant : ${t.text}`;
  }
  return 'Respire un coup — tu gères 💜';
}

function resolveItem(item, energyLevel) {
  return {
    key: item.key,
    kind: item.kind,
    text: resolveDisplayText(item, energyLevel),
    subtext: typeof item.subtext === 'string' ? item.subtext : '',
    taskId: item.task?.id || '',
    habitId: item.habit?.id || ''
  };
}

function buildCandidateList() {
  const now = new Date();
  const hour = now.getHours();
  const slot = getTimeSlot(hour);
  const energyLevel = readTodayEnergy() ?? 3;

  if (slot === 'night') {
    const nightBase = [PAUSE_SLEEP, FALLBACK_IDEA, FALLBACK_YOU].map((x) =>
      resolveItem({ ...x, kind: 'pause' }, energyLevel)
    );
    if (energyLevel <= 2) {
      nightBase.splice(1, 0, resolveItem({ ...BREATHING_HINT }, energyLevel));
    }
    return nightBase;
  }

  const habits = readHabits();
  const completions = readCompletions();
  const todayKey = toDateKey(now);
  const doneSet = new Set(completions.filter((c) => c.date === todayKey).map((c) => c.habitId));
  const incompleteHabits = habits.filter((h) => habitScheduledOnDate(h, now) && !doneSet.has(h.id));

  const allTasks = readTasks().filter((t) => !t.completed);
  const lowEnergy = energyLevel <= 2;
  const taskPool = lowEnergy ? allTasks.filter((t) => !t.priority) : allTasks;
  const priorityTasks = taskPool.filter((t) => t.priority);
  const normalTasks = taskPool.filter((t) => !t.priority);

  const ordered = [];

  if (energyLevel <= 2) {
    ordered.push({ ...PAUSE_LOW_LIGHT, kind: 'pause' });
    ordered.push({ ...BREATHING_HINT });
  }

  const pushHabit = (h) => {
    ordered.push({ key: `habit:${h.id}`, kind: 'habit', habit: h });
  };
  const pushTask = (t) => {
    ordered.push({ key: `task:${t.id}`, kind: 'task', task: t });
  };

  if (slot === 'morning') {
    incompleteHabits.forEach(pushHabit);
    taskPool.forEach(pushTask);
  } else if (slot === 'day') {
    priorityTasks.forEach(pushTask);
    normalTasks.forEach(pushTask);
    incompleteHabits.forEach(pushHabit);
  } else {
    incompleteHabits.forEach(pushHabit);
    normalTasks.forEach(pushTask);
    priorityTasks.forEach(pushTask);
  }

  const seen = new Set();
  const deduped = [];
  for (const raw of ordered) {
    if (seen.has(raw.key)) continue;
    if (raw.kind === 'task' && raw.task && lowEnergy && raw.task.priority) continue;
    seen.add(raw.key);
    deduped.push(raw);
  }

  deduped.push({ ...FALLBACK_IDEA, kind: 'pause' });
  deduped.push({ ...FALLBACK_YOU, kind: 'pause' });

  return deduped.map((x) => resolveItem(x, energyLevel));
}

function readOtherState() {
  const raw = load(OTHER_STATE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { windowStart: Date.now(), otherCount: 0, usedKeys: [] };
  }
  const windowStart = Number(raw.windowStart) || Date.now();
  if (Date.now() - windowStart > 30 * 60 * 1000) {
    return { windowStart: Date.now(), otherCount: 0, usedKeys: [] };
  }
  return {
    windowStart,
    otherCount: Math.max(0, Number(raw.otherCount) || 0),
    usedKeys: Array.isArray(raw.usedKeys) ? raw.usedKeys.filter((k) => typeof k === 'string') : []
  };
}

function writeOtherState(state) {
  save(OTHER_STATE_KEY, state);
}

function pickFirstUnused(candidates, usedKeys) {
  const list = Array.isArray(candidates) ? candidates : [];
  const used = Array.isArray(usedKeys) ? usedKeys : [];
  const picked =
    list.find((c) => c && typeof c === 'object' && !used.includes(c.key)) || list[0] || null;
  if (picked && typeof picked === 'object' && typeof picked.text === 'string' && picked.text.trim()) {
    return picked;
  }
  try {
    return resolveItem({ ...FALLBACK_IDEA, kind: 'pause' }, readTodayEnergy() ?? 3);
  } catch {
    return { ...DEFAULT_SUGGESTION };
  }
}

/**
 * Suggestion affichable ; ne renvoie jamais null/undefined.
 */
function getSuggestion() {
  try {
    const list = buildCandidateList();
    if (!Array.isArray(list) || list.length === 0) {
      return { ...DEFAULT_SUGGESTION };
    }
    const s = pickFirstUnused(list, []);
    if (!s || typeof s !== 'object') {
      return { ...DEFAULT_SUGGESTION };
    }
    const text = s.text != null ? String(s.text).trim() : '';
    if (!text) {
      return { ...DEFAULT_SUGGESTION };
    }
    return {
      key: typeof s.key === 'string' && s.key ? s.key : DEFAULT_SUGGESTION.key,
      kind:
        s.kind === 'task' || s.kind === 'habit' || s.kind === 'pause' || s.kind === 'breathing' ? s.kind : 'pause',
      text,
      subtext: typeof s.subtext === 'string' ? s.subtext : '',
      taskId: typeof s.taskId === 'string' ? s.taskId : '',
      habitId: typeof s.habitId === 'string' ? s.habitId : ''
    };
  } catch (e) {
    // Erreur silencieuse en prod : suggestion par défaut
    return { ...DEFAULT_SUGGESTION };
  }
}

function computePrimarySuggestion() {
  return getSuggestion();
}

function applySuggestion(resolved) {
  currentResolved = resolved;
  taskPrompt = { visible: false, taskId: '', title: '' };
  celebrating = false;
  fadeNonce += 1;
  render();
}

function completeHabit(habitId) {
  const habits = readHabits();
  if (!habits.some((h) => h.id === habitId)) return;
  const completions = readCompletions();
  const todayKey = toDateKey(new Date());
  if (completions.some((c) => c.habitId === habitId && c.date === todayKey)) return;
  completions.push({
    habitId,
    date: todayKey,
    timestamp: Date.now(),
    dayOfWeek: DAY_NAMES[new Date().getDay()]
  });
  save(COMPLETIONS_KEY, completions);
}

function completeTask(taskId) {
  const tasks = readTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.completed) return;
  task.completed = true;
  task.completedAt = Date.now();
  save(TASKS_KEY, tasks);
}

function resetOtherState() {
  const s = readOtherState();
  writeOtherState({
    windowStart: s.windowStart,
    otherCount: 0,
    usedKeys: []
  });
}

function render() {
  if (!rootContainer) return;

  try {
    const now = new Date();
    const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(now);
    const energy = readTodayEnergy();
    const energyEmoji = energy != null ? ENERGY_EMOJI[energy] || '' : '';
    const remainingTasks = readTasks().filter((t) => !t.completed).length;

    const metaParts = [];
    if (energyEmoji) metaParts.push(energyEmoji);
    if (remainingTasks > 0) {
      metaParts.push(`${remainingTasks} tâche${remainingTasks > 1 ? 's' : ''} restante${remainingTasks > 1 ? 's' : ''}`);
    } else {
      metaParts.push('Aucune tâche en attente');
    }

    let suggestion = currentResolved || getSuggestion();
    if (!suggestion || typeof suggestion !== 'object' || !suggestion.text || !String(suggestion.text).trim()) {
      suggestion = { ...DEFAULT_SUGGESTION };
    }
    const suggestionType =
      suggestion.kind === 'task'
        ? 'task'
        : suggestion.kind === 'habit'
          ? 'habit'
          : suggestion.kind === 'breathing'
            ? 'breathing'
            : 'pause';

    rootContainer.innerHTML = createNowView({
      timeLabel,
      metaParts,
      suggestionText: suggestion.text,
      suggestionSubtext: typeof suggestion.subtext === 'string' ? suggestion.subtext : '',
      suggestionType,
      fadeKey: `${fadeNonce}-${suggestion.key}`,
      celebrating,
      taskPromptVisible: taskPrompt.visible,
      taskPromptTitle: taskPrompt.title
    });
  } catch (e) {
    // Erreur silencieuse en prod : affichage de l’écran d’erreur utilisateur
    rootContainer.innerHTML = `
      <section class="now now--error" role="alert">
        <p class="now--error__title">Impossible d’afficher le module</p>
        <pre class="now--error__detail">${escapeHtml(String(e && e.message ? e.message : e))}</pre>
      </section>
    `;
  }
}

function handleDone() {
  const s = currentResolved || computePrimarySuggestion();
  if (s.kind === 'breathing') {
    navigate('breathing');
    return;
  }
  celebrating = true;
  taskPrompt = { visible: false, taskId: '', title: '' };

  if (s.kind === 'habit' && s.habitId) {
    completeHabit(s.habitId);
  } else if (s.kind === 'task' && s.taskId) {
    const tasks = readTasks();
    const t = tasks.find((x) => x.id === s.taskId);
    taskPrompt = { visible: true, taskId: s.taskId, title: t?.text || '' };
  }

  render();

  resetOtherState();

  if (celebrationTimerId) clearTimeout(celebrationTimerId);
  if (nextSuggestionTimerId) clearTimeout(nextSuggestionTimerId);

  celebrationTimerId = setTimeout(() => {
    celebrating = false;
    render();
  }, 650);

  const needsTaskAnswer = s.kind === 'task' && Boolean(s.taskId);
  if (!needsTaskAnswer) {
    nextSuggestionTimerId = setTimeout(() => {
      const next = computePrimarySuggestion();
      applySuggestion(next);
    }, 2000);
  }
}

function handleOther() {
  let state = readOtherState();
  if (currentResolved?.key === PAUSE_FORCED.key) {
    resetOtherState();
    state = readOtherState();
    const candidates = buildCandidateList();
    const next = pickFirstUnused(candidates, []);
    state.usedKeys = [next.key];
    writeOtherState(state);
    applySuggestion(next);
    return;
  }

  if (state.otherCount >= 3) {
    applySuggestion(resolveItem({ ...PAUSE_FORCED, kind: 'pause' }, readTodayEnergy() ?? 3));
    return;
  }

  const candidates = buildCandidateList();
  const used = new Set(state.usedKeys);
  if (currentResolved) used.add(currentResolved.key);

  const next =
    candidates.find((c) => !used.has(c.key)) || resolveItem({ ...FALLBACK_YOU, kind: 'pause' }, readTodayEnergy() ?? 3);

  state.otherCount += 1;
  used.add(next.key);
  state.usedKeys = Array.from(used);
  writeOtherState(state);
  applySuggestion(next);
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-now-done]')) {
      handleDone();
      return;
    }

    if (target.closest('[data-now-other]')) {
      handleOther();
      return;
    }

    if (target.closest('[data-now-task-yes]')) {
      if (taskPrompt.taskId) completeTask(taskPrompt.taskId);
      taskPrompt = { visible: false, taskId: '', title: '' };
      resetOtherState();
      render();
      if (nextSuggestionTimerId) clearTimeout(nextSuggestionTimerId);
      nextSuggestionTimerId = setTimeout(() => {
        const next = computePrimarySuggestion();
        applySuggestion(next);
      }, 2000);
      return;
    }

    if (target.closest('[data-now-task-no]')) {
      taskPrompt = { visible: false, taskId: '', title: '' };
      render();
    }
  };

  rootContainer.addEventListener('click', onClick);
}

function tickClock() {
  if (!rootContainer) return;
  const timeEl = rootContainer.querySelector('.now__time');
  if (timeEl) {
    timeEl.textContent = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
      new Date()
    );
  }
}

const nowModule = {
  id: 'now',
  label: 'Que faire ?',
  icon: '🧭',

  /** Exposé pour tests / debug ; retourne toujours un objet suggestion valide. */
  getSuggestion,

  init(container) {
    try {
      if (!(container instanceof HTMLElement)) {
        throw new Error(
          'Container invalide : init() attend un HTMLElement (élément DOM). Reçu : ' + typeof container
        );
      }

      rootContainer = container;
      currentResolved = null;
      taskPrompt = { visible: false, taskId: '', title: '' };
      fadeNonce = 0;

      const first = getSuggestion();
      const state = readOtherState();
      state.otherCount = 0;
      state.usedKeys = [first.key];
      try {
        writeOtherState(state);
      } catch (persistErr) {
        // Erreur silencieuse en prod : persistance ignorée
      }

      applySuggestion(first);

      bindEvents();
      if (refreshTimerId) clearInterval(refreshTimerId);
      refreshTimerId = setInterval(tickClock, 30_000);
    } catch (err) {
      // Erreur silencieuse en prod : écran d’erreur dans le conteneur
      if (container instanceof HTMLElement) {
        container.innerHTML = `
          <section class="now now--error" role="alert">
            <p class="now--error__title">Erreur au chargement de « Que faire ? »</p>
            <pre class="now--error__detail">${escapeHtml(String(err && err.message ? err.message : err))}</pre>
          </section>
        `;
      }
      rootContainer = container instanceof HTMLElement ? container : null;
    }
  },

  destroy() {
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
      refreshTimerId = null;
    }
    if (celebrationTimerId) {
      clearTimeout(celebrationTimerId);
      celebrationTimerId = null;
    }
    if (nextSuggestionTimerId) {
      clearTimeout(nextSuggestionTimerId);
      nextSuggestionTimerId = null;
    }

    if (rootContainer && onClick) {
      rootContainer.removeEventListener('click', onClick);
    }
    onClick = null;
    currentResolved = null;
    taskPrompt = { visible: false, taskId: '', title: '' };
    celebrating = false;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const suggestion = computePrimarySuggestion();
    return {
      title: 'Que faire ?',
      content: createDashboardNowCompact(suggestion.text)
    };
  }
};

export default nowModule;
