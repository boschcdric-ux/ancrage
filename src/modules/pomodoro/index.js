import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import { navigate } from '../../core/router.js';
import {
  createPomodoroView,
  formatTime,
  createTaskOptions,
  createSubtaskOptions,
  createCompletionHistory
} from './view.js';

const SETTINGS_KEY = 'pomodoro:settings';
const HISTORY_KEY = 'pomodoro:history';
const SELECTION_KEY = 'pomodoro:selection';
const STATE_KEY = 'pomodoro:state';
const MODE_WORK = 'work';
const MODE_SHORT_BREAK = 'shortBreak';
const MODE_LONG_BREAK = 'longBreak';
const MINUTES_STEP = 5;
const MIN_DURATION_MINUTES = 5;
const MIN_SESSIONS_BEFORE_LONG = 2;
const MAX_SESSIONS_BEFORE_LONG = 8;
const CIRCLE_RADIUS = 96;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const DEFAULT_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  soundEnabled: true
};

let rootContainer = null;
let timerId = null;
let onClick = null;
let onChange = null;
let onVisibilityChange = null;

let mode = MODE_WORK;
let remainingSeconds = DEFAULT_SETTINGS.workMinutes * 60;
let sessionTotalSeconds = DEFAULT_SETTINGS.workMinutes * 60;
let isRunning = false;
let lastTickTimestamp = null;
let selectedTaskId = '';
let selectedSubtaskId = '';
let settings = { ...DEFAULT_SETTINGS };
let completedWorkSessions = 0;
let history = createTodayHistory();
let completionEntries = [];

function emitPomodoroStateChange() {
  persistPomodoroState();
  window.dispatchEvent(new CustomEvent('pomodoro:state-changed'));
}

function persistPomodoroState() {
  const snapshot = {
    mode,
    remainingSeconds,
    sessionTotalSeconds,
    isRunning,
    label: getModeLabel(),
    timestamp: Date.now()
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
}

function createTodayHistory() {
  const dateKey = new Date().toISOString().slice(0, 10);
  return {
    dateKey,
    completedSessions: 0,
    totalFocusSeconds: 0
  };
}

function ensureTodayHistory() {
  const dateKey = new Date().toISOString().slice(0, 10);
  if (history.dateKey !== dateKey) {
    history = createTodayHistory();
    persistHistory();
  }
}

function loadSettings() {
  const stored = load(SETTINGS_KEY, DEFAULT_SETTINGS);
  const normalizeMinutes = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(MIN_DURATION_MINUTES, Math.round(parsed / MINUTES_STEP) * MINUTES_STEP);
  };

  const rawSessions = Number(stored?.sessionsBeforeLongBreak);
  const sessionsBeforeLongBreak = Number.isFinite(rawSessions)
    ? Math.min(MAX_SESSIONS_BEFORE_LONG, Math.max(MIN_SESSIONS_BEFORE_LONG, Math.round(rawSessions)))
    : DEFAULT_SETTINGS.sessionsBeforeLongBreak;

  settings = {
    workMinutes: normalizeMinutes(stored?.workMinutes, DEFAULT_SETTINGS.workMinutes),
    shortBreakMinutes: normalizeMinutes(stored?.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: normalizeMinutes(stored?.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes),
    sessionsBeforeLongBreak,
    soundEnabled: stored?.soundEnabled !== false
  };
}

function loadHistory() {
  const stored = load(HISTORY_KEY, createTodayHistory());
  history = {
    dateKey: typeof stored?.dateKey === 'string' ? stored.dateKey : createTodayHistory().dateKey,
    completedSessions: Number(stored?.completedSessions) || 0,
    totalFocusSeconds: Number(stored?.totalFocusSeconds) || 0
  };
  ensureTodayHistory();
}

function persistSettings() {
  save(SETTINGS_KEY, settings);
}

function persistHistory() {
  save(HISTORY_KEY, history);
}

function loadSelection() {
  const stored = load(SELECTION_KEY, { taskId: '', subtaskId: '' });
  selectedTaskId = typeof stored?.taskId === 'string' ? stored.taskId : '';
  selectedSubtaskId = typeof stored?.subtaskId === 'string' ? stored.subtaskId : '';
}

function persistSelection() {
  save(SELECTION_KEY, {
    taskId: selectedTaskId,
    subtaskId: selectedSubtaskId
  });
}

function getModeDurationSeconds(nextMode = mode) {
  if (nextMode === MODE_SHORT_BREAK) return settings.shortBreakMinutes * 60;
  if (nextMode === MODE_LONG_BREAK) return settings.longBreakMinutes * 60;
  return settings.workMinutes * 60;
}

function getModeLabel() {
  if (mode === MODE_SHORT_BREAK) return 'Pause courte';
  if (mode === MODE_LONG_BREAK) return 'Pause longue';
  return 'Travail';
}

function getProgressPercent() {
  if (!sessionTotalSeconds) return 0;
  const elapsed = sessionTotalSeconds - remainingSeconds;
  return Math.max(0, Math.min(100, (elapsed / sessionTotalSeconds) * 100));
}

function readAvailableTasks() {
  try {
    const raw = localStorage.getItem('adhd-app:tasks:items');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (task) =>
        task &&
        typeof task.id === 'string' &&
        typeof task.text === 'string' &&
        task.completed !== true
    );
  } catch (_error) {
    return [];
  }
}

function getSelectedTask(tasks) {
  return tasks.find((task) => task.id === selectedTaskId) || null;
}

function readActiveSubtasks(task) {
  if (!task || !Array.isArray(task.subtasks)) return [];
  return task.subtasks.filter(
    (subtask) => subtask && typeof subtask.id === 'string' && typeof subtask.text === 'string' && !subtask.completed
  );
}

function updateRing() {
  if (!rootContainer) return;
  const ring = rootContainer.querySelector('[data-pomodoro-ring]');
  if (!(ring instanceof SVGCircleElement)) return;

  ring.style.strokeDasharray = String(CIRCLE_CIRCUMFERENCE);
  const progress = getProgressPercent() / 100;
  const offset = CIRCLE_CIRCUMFERENCE - CIRCLE_CIRCUMFERENCE * progress;
  ring.style.strokeDashoffset = String(offset);
}

function updateDisplay() {
  if (!rootContainer) return;

  const tasks = readAvailableTasks();
  const selectedTask = getSelectedTask(tasks);
  if (!selectedTask) {
    selectedTaskId = '';
    selectedSubtaskId = '';
    persistSelection();
  }
  const availableSubtasks = readActiveSubtasks(selectedTask);
  if (!availableSubtasks.some((subtask) => subtask.id === selectedSubtaskId)) {
    selectedSubtaskId = '';
    persistSelection();
  }

  const timeNode = rootContainer.querySelector('[data-pomodoro-time]');
  const modeNode = rootContainer.querySelector('[data-pomodoro-mode]');
  const sessionNode = rootContainer.querySelector('[data-pomodoro-session]');
  const cycleHintNode = rootContainer.querySelector('[data-pomodoro-cycle-hint]');
  const taskSelect = rootContainer.querySelector('[data-pomodoro-task-select]');
  const subtaskSelect = rootContainer.querySelector('[data-pomodoro-subtask-select]');
  const taskFocus = rootContainer.querySelector('[data-pomodoro-task-focus]');
  const taskTitle = rootContainer.querySelector('[data-pomodoro-task-title]');
  const subtaskTitle = rootContainer.querySelector('[data-pomodoro-subtask-title]');
  const completionContainer = rootContainer.querySelector('[data-pomodoro-completion-container]');
  const completeTaskButton = rootContainer.querySelector('[data-pomodoro-complete-task]');
  const soundButton = rootContainer.querySelector('[data-pomodoro-sound-toggle]');
  const historySessions = rootContainer.querySelector('[data-pomodoro-history-sessions]');
  const historyFocus = rootContainer.querySelector('[data-pomodoro-history-focus]');
  const durationValues = rootContainer.querySelectorAll('[data-duration-value]');
  const startButton = rootContainer.querySelector('[data-pomodoro-start]');
  const pauseButton = rootContainer.querySelector('[data-pomodoro-pause]');

  const cycleLen = settings.sessionsBeforeLongBreak;

  if (timeNode) timeNode.textContent = formatTime(remainingSeconds);
  if (modeNode) modeNode.textContent = getModeLabel();
  if (sessionNode) sessionNode.textContent = `Session ${(completedWorkSessions % cycleLen) + 1}/${cycleLen}`;
  if (cycleHintNode instanceof HTMLElement) {
    if (mode === MODE_WORK) {
      cycleHintNode.hidden = false;
      const nextIsLongBreak = (completedWorkSessions + 1) % cycleLen === 0;
      cycleHintNode.textContent = nextIsLongBreak
        ? '→ Pause longue après cette session ✨'
        : '→ Pause courte après cette session';
      cycleHintNode.classList.toggle('pomodoro__cycle-hint--long', nextIsLongBreak);
    } else {
      cycleHintNode.hidden = true;
      cycleHintNode.textContent = '';
      cycleHintNode.classList.remove('pomodoro__cycle-hint--long');
    }
  }
  if (taskSelect instanceof HTMLSelectElement) {
    taskSelect.innerHTML = createTaskOptions(tasks, selectedTaskId);
    taskSelect.value = selectedTaskId || '';
  }
  if (subtaskSelect instanceof HTMLSelectElement) {
    subtaskSelect.innerHTML = createSubtaskOptions(availableSubtasks, selectedSubtaskId);
    subtaskSelect.value = selectedSubtaskId || '';
    subtaskSelect.disabled = !selectedTaskId;
  }
  const selectedSubtask = availableSubtasks.find((subtask) => subtask.id === selectedSubtaskId) || null;
  const hasProgrammedTask = Boolean(selectedTask);
  if (taskTitle) {
    if (selectedTask) {
      taskTitle.textContent = selectedTask.text;
    } else {
      taskTitle.textContent = 'Aucune tâche liée.';
    }
  }
  if (subtaskTitle) {
    if (selectedSubtask) {
      subtaskTitle.textContent = `→ ${selectedSubtask.text}`;
    } else {
      subtaskTitle.textContent = '';
    }
  }
  if (completionContainer) {
    completionContainer.innerHTML = hasProgrammedTask ? createCompletionHistory(completionEntries) : '';
  }
  if (taskFocus) {
    taskFocus.hidden = !hasProgrammedTask;
    taskFocus.classList.toggle('is-selected', hasProgrammedTask);
    taskFocus.classList.toggle('animate-slide-up', hasProgrammedTask);
  }
  if (completeTaskButton instanceof HTMLButtonElement) {
    completeTaskButton.disabled = !selectedTaskId;
  }
  if (soundButton) {
    soundButton.textContent = settings.soundEnabled ? '🔔 Son activé' : '🔕 Son désactivé';
  }
  if (historySessions) {
    historySessions.textContent = `${history.completedSessions} sessions complétées`;
  }
  if (historyFocus) {
    const totalMinutes = Math.round(history.totalFocusSeconds / 60);
    historyFocus.textContent = `${totalMinutes} min de concentration`;
  }
  durationValues.forEach((node) => {
    const key = node.getAttribute('data-duration-value');
    if (key === MODE_WORK) node.textContent = `${settings.workMinutes} min`;
    if (key === MODE_SHORT_BREAK) node.textContent = `${settings.shortBreakMinutes} min`;
    if (key === MODE_LONG_BREAK) node.textContent = `${settings.longBreakMinutes} min`;
    if (key === 'sessionsBeforeLongBreak') node.textContent = String(settings.sessionsBeforeLongBreak);
  });
  if (startButton instanceof HTMLButtonElement) startButton.disabled = isRunning;
  if (pauseButton instanceof HTMLButtonElement) pauseButton.disabled = !isRunning;

  const root = rootContainer.querySelector('[data-pomodoro-root]');
  if (root) {
    root.classList.remove('pomodoro--work', 'pomodoro--shortBreak', 'pomodoro--longBreak');
    root.classList.add(`pomodoro--${mode}`);
  }
  updateRing();
}

function setNotification(message) {
  if (!rootContainer) return;
  const node = rootContainer.querySelector('[data-pomodoro-notification]');
  if (!node) return;

  node.textContent = message;
  node.classList.toggle('is-visible', Boolean(message));
}

function playFinishSound() {
  if (!settings.soundEnabled) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;

  const context = new Context();
  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  const oscA = context.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.setValueAtTime(523.25, now);
  oscA.frequency.exponentialRampToValueAtTime(783.99, now + 0.3);
  oscA.connect(gain);
  oscA.start(now);
  oscA.stop(now + 0.35);

  const oscB = context.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.setValueAtTime(659.25, now + 0.18);
  oscB.connect(gain);
  oscB.start(now + 0.18);
  oscB.stop(now + 0.68);

  window.setTimeout(() => {
    context.close().catch(() => {});
  }, 900);
}

function switchMode(nextMode) {
  mode = nextMode;
  sessionTotalSeconds = getModeDurationSeconds(nextMode);
  remainingSeconds = sessionTotalSeconds;
  lastTickTimestamp = null;
  isRunning = false;
  updateDisplay();
  emitPomodoroStateChange();
}

function completeLinkedTask() {
  if (!selectedTaskId) return;
  try {
    const raw = localStorage.getItem('adhd-app:tasks:items');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    const selectedTask = parsed.find((task) => task?.id === selectedTaskId) || null;
    const selectedSubtask =
      selectedTask && Array.isArray(selectedTask.subtasks)
        ? selectedTask.subtasks.find((subtask) => subtask?.id === selectedSubtaskId) || null
        : null;

    const completionEntry = {
      id: generateUUID(),
      taskId: selectedTaskId,
      taskText: selectedTask?.text || 'Tâche',
      previousTaskCompleted: Boolean(selectedTask?.completed),
      previousTaskCompletedAt: selectedTask?.completedAt ?? null,
      subtaskId: selectedSubtaskId || '',
      subtaskText: selectedSubtask?.text || '',
      previousSubtaskCompleted: Boolean(selectedSubtask?.completed),
      previousSubtaskCompletedAt: selectedSubtask?.completedAt ?? null
    };
    completionEntries.unshift(completionEntry);

    const updated = parsed.map((task) => {
      if (task?.id !== selectedTaskId) return task;
      if (selectedSubtaskId && Array.isArray(task.subtasks)) {
        return {
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask?.id === selectedSubtaskId
              ? { ...subtask, completed: true, completedAt: now }
              : subtask
          )
        };
      }
      return { ...task, completed: true, completedAt: now };
    });
    localStorage.setItem('adhd-app:tasks:items', JSON.stringify(updated));
    if (selectedSubtaskId) {
      selectedSubtaskId = '';
      persistSelection();
      setNotification('');
    } else {
      selectedTaskId = '';
      persistSelection();
      setNotification('');
    }
    updateDisplay();
    emitPomodoroStateChange();
  } catch (_error) {
    setNotification('Impossible de mettre la tâche à jour.');
  }
}

function undoCompletionById(entryId) {
  const entry = completionEntries.find((item) => item.id === entryId);
  if (!entry) return;
  try {
    const raw = localStorage.getItem('adhd-app:tasks:items');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    const updated = parsed.map((task) => {
      if (task?.id !== entry.taskId) return task;
      if (entry.subtaskId && Array.isArray(task.subtasks)) {
        return {
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask?.id === entry.subtaskId
              ? {
                  ...subtask,
                  completed: entry.previousSubtaskCompleted,
                  completedAt: entry.previousSubtaskCompletedAt
                }
              : subtask
          )
        };
      }
      return {
        ...task,
        completed: entry.previousTaskCompleted,
        completedAt: entry.previousTaskCompletedAt
      };
    });

    localStorage.setItem('adhd-app:tasks:items', JSON.stringify(updated));
    selectedTaskId = entry.taskId;
    selectedSubtaskId = entry.subtaskId;
    persistSelection();
    completionEntries = completionEntries.filter((item) => item.id !== entry.id);
    setNotification('Action annulée.');
    updateDisplay();
    emitPomodoroStateChange();
  } catch (_error) {
    setNotification('Impossible d’annuler.');
  }
}

function onTimerCompleted() {
  const timeNode = rootContainer?.querySelector('[data-pomodoro-time]');
  if (timeNode) {
    timeNode.classList.remove('is-finished');
    requestAnimationFrame(() => timeNode.classList.add('is-finished'));
  }
  playFinishSound();

  if (mode === MODE_WORK) {
    completedWorkSessions += 1;
    ensureTodayHistory();
    history.completedSessions += 1;
    history.totalFocusSeconds += sessionTotalSeconds;
    persistHistory();

    const shouldLongBreak = completedWorkSessions % settings.sessionsBeforeLongBreak === 0;
    setNotification(shouldLongBreak ? 'Session finie. Pause longue proposée.' : 'Session finie. Pause courte.');
    switchMode(shouldLongBreak ? MODE_LONG_BREAK : MODE_SHORT_BREAK);
  } else {
    setNotification('Pause terminée. Retour au travail.');
    switchMode(MODE_WORK);
  }
}

function tick() {
  if (!isRunning) return;
  const now = Date.now();
  if (lastTickTimestamp == null) {
    lastTickTimestamp = now;
    return;
  }

  const elapsed = Math.floor((now - lastTickTimestamp) / 1000);
  if (elapsed <= 0) return;
  lastTickTimestamp += elapsed * 1000;
  remainingSeconds = Math.max(0, remainingSeconds - elapsed);
  updateDisplay();
  emitPomodoroStateChange();

  if (remainingSeconds <= 0) {
    stopTimer();
    onTimerCompleted();
  }
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  setNotification('');
  lastTickTimestamp = null;
  if (timerId) clearInterval(timerId);
  timerId = window.setInterval(tick, 250);
  updateDisplay();
  emitPomodoroStateChange();
}

function stopTimer() {
  isRunning = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  updateDisplay();
  emitPomodoroStateChange();
}

function resetTimer() {
  stopTimer();
  remainingSeconds = getModeDurationSeconds(mode);
  sessionTotalSeconds = remainingSeconds;
  setNotification('Timer réinitialisé.');
  updateDisplay();
  emitPomodoroStateChange();
}

function changeDuration(modeKey, direction) {
  const step = direction > 0 ? MINUTES_STEP : -MINUTES_STEP;
  if (modeKey === MODE_WORK) {
    settings.workMinutes = Math.max(MIN_DURATION_MINUTES, settings.workMinutes + step);
  } else if (modeKey === MODE_SHORT_BREAK) {
    settings.shortBreakMinutes = Math.max(MIN_DURATION_MINUTES, settings.shortBreakMinutes + step);
  } else if (modeKey === MODE_LONG_BREAK) {
    settings.longBreakMinutes = Math.max(MIN_DURATION_MINUTES, settings.longBreakMinutes + step);
  } else {
    return;
  }
  persistSettings();

  if (mode === modeKey && !isRunning) {
    remainingSeconds = getModeDurationSeconds(mode);
    sessionTotalSeconds = remainingSeconds;
  }
  updateDisplay();
  emitPomodoroStateChange();
}

function changeSessionsBeforeLongBreak(delta) {
  const next = settings.sessionsBeforeLongBreak + delta;
  if (next < MIN_SESSIONS_BEFORE_LONG || next > MAX_SESSIONS_BEFORE_LONG) return;
  settings.sessionsBeforeLongBreak = next;
  persistSettings();
  updateDisplay();
  emitPomodoroStateChange();
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const start = target.closest('[data-pomodoro-start]');
    if (start instanceof HTMLButtonElement) {
      startTimer();
      return;
    }

    const pause = target.closest('[data-pomodoro-pause]');
    if (pause instanceof HTMLButtonElement) {
      stopTimer();
      setNotification('Timer en pause.');
      return;
    }

    const reset = target.closest('[data-pomodoro-reset]');
    if (reset instanceof HTMLButtonElement) {
      resetTimer();
      return;
    }

    const soundToggle = target.closest('[data-pomodoro-sound-toggle]');
    if (soundToggle instanceof HTMLButtonElement) {
      settings.soundEnabled = !settings.soundEnabled;
      persistSettings();
      updateDisplay();
      return;
    }

    const completeTask = target.closest('[data-pomodoro-complete-task]');
    if (completeTask instanceof HTMLButtonElement) {
      completeLinkedTask();
      return;
    }

    const undoComplete = target.closest('[data-pomodoro-undo-complete]');
    if (undoComplete instanceof HTMLButtonElement) {
      const completionId = undoComplete.dataset.pomodoroUndoComplete;
      if (completionId) undoCompletionById(completionId);
      return;
    }

    const durationButton = target.closest('[data-duration-change]');
    if (durationButton instanceof HTMLButtonElement) {
      const raw = durationButton.dataset.durationChange;
      if (!raw) return;
      const [modeKey, directionRaw] = raw.split(':');
      const direction = Number(directionRaw);
      if (!Number.isFinite(direction)) return;
      changeDuration(modeKey, direction);
      return;
    }

    const sessionsCycleBtn = target.closest('[data-pomodoro-sessions-cycle]');
    if (sessionsCycleBtn instanceof HTMLButtonElement) {
      const raw = sessionsCycleBtn.dataset.pomodoroSessionsCycle;
      const delta = Number(raw);
      if (!Number.isFinite(delta)) return;
      changeSessionsBeforeLongBreak(delta);
      return;
    }

    const openFocusButton = target.closest('[data-pomodoro-open-focus]');
    if (openFocusButton instanceof HTMLButtonElement) {
      persistPomodoroState();
      localStorage.setItem('focus:auto-enter', '1');
      navigate('focus');
    }
  };

  onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.matches('[data-pomodoro-task-select]')) {
      selectedTaskId = target.value;
      selectedSubtaskId = '';
      persistSelection();
      updateDisplay();
      return;
    }
    if (target.matches('[data-pomodoro-subtask-select]')) {
      selectedSubtaskId = target.value;
      persistSelection();
      updateDisplay();
    }
  };

  onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      tick();
      updateDisplay();
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

const pomodoroModule = {
  id: 'pomodoro',
  label: 'Pomodoro',
  icon: '🍅',

  init(container) {
    rootContainer = container;
    loadSettings();
    loadHistory();
    loadSelection();
    ensureTodayHistory();

    if (!sessionTotalSeconds || sessionTotalSeconds < 1) {
      sessionTotalSeconds = getModeDurationSeconds(mode);
    }
    if (!isRunning && remainingSeconds < 1) {
      remainingSeconds = getModeDurationSeconds(mode);
      sessionTotalSeconds = remainingSeconds;
    }

    rootContainer.innerHTML = createPomodoroView({
      mode,
      remainingSeconds,
      progressPercent: getProgressPercent(),
      settings,
      availableTasks: readAvailableTasks(),
      selectedTaskId,
      selectedSubtaskId,
      availableSubtasks: [],
      selectedTaskText: '',
      selectedSubtaskText: '',
      completionEntries: [],
      soundEnabled: settings.soundEnabled,
      completedWorkSessions,
      todayCompletedSessions: history.completedSessions,
      todayFocusMinutes: Math.round(history.totalFocusSeconds / 60)
    });

    if (isRunning && !timerId) {
      timerId = window.setInterval(tick, 250);
    }
    updateDisplay();
    persistPomodoroState();
    bindEvents();
  },

  destroy() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (rootContainer && onClick) {
      rootContainer.removeEventListener('click', onClick);
    }
    if (rootContainer && onChange) {
      rootContainer.removeEventListener('change', onChange);
    }
    if (onVisibilityChange) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    onClick = null;
    onChange = null;
    onVisibilityChange = null;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    if (!isRunning) {
      return {
        title: 'Pomodoro',
        content: 'Aucune session active'
      };
    }

    return {
      title: 'Pomodoro',
      content: `${getModeLabel()} en cours - ${formatTime(remainingSeconds)} restant`
    };
  }
};

export default pomodoroModule;
