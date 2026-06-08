import './style.css';
import { save, load } from '../../core/storage.js';
import { navigate } from '../../core/router.js';
import { createFocusView, createAmbienceButtons, createSuggestedTasks } from './view.js';

const FOCUS_THEME_KEY = 'focus:theme';
const POMODORO_STATE_KEY = 'pomodoro:state';
const POMODORO_SETTINGS_KEY = 'pomodoro:settings';
const POMODORO_SELECTION_KEY = 'pomodoro:selection';
const TASKS_STORAGE_KEY = 'adhd-app:tasks:items';
const AUTO_ENTER_KEY = 'focus:auto-enter';

const AMBIENCES = [
  { id: 'midnight', label: 'Minuit', emoji: '🌑' },
  { id: 'ocean', label: 'Océan', emoji: '🌊' },
  { id: 'forest', label: 'Forêt', emoji: '🌲' },
  { id: 'cosmos', label: 'Cosmos', emoji: '🟣' }
];

let rootContainer = null;
let isActive = false;
let selectedTheme = 'midnight';
let onClick = null;
let onKeyDown = null;
let onFullscreenChange = null;
let refreshIntervalId = null;

function formatTime(seconds) {
  const safeValue = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeValue / 60)
    .toString()
    .padStart(2, '0');
  const sec = Math.floor(safeValue % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${sec}`;
}

function parseJson(text, fallback = null) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

function getPomodoroState() {
  const raw = localStorage.getItem(POMODORO_STATE_KEY);
  const parsed = parseJson(raw, null);
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed;
}

function getPomodoroSettings() {
  const fromModule = load(POMODORO_SETTINGS_KEY, null);
  if (fromModule && typeof fromModule === 'object') return fromModule;
  const raw = parseJson(localStorage.getItem(POMODORO_SETTINGS_KEY), {});
  return raw && typeof raw === 'object' ? raw : {};
}

function setPomodoroSettings(nextSettings) {
  save(POMODORO_SETTINGS_KEY, nextSettings);
  localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(nextSettings));
}

function getPomodoroSelection() {
  const fromModule = load(POMODORO_SELECTION_KEY, null);
  if (fromModule && typeof fromModule === 'object') return fromModule;
  const raw = parseJson(localStorage.getItem(POMODORO_SELECTION_KEY), {});
  return raw && typeof raw === 'object' ? raw : {};
}

function setPomodoroSelection(selection) {
  save(POMODORO_SELECTION_KEY, selection);
  localStorage.setItem(POMODORO_SELECTION_KEY, JSON.stringify(selection));
}

function readIncompleteTasks() {
  const parsed = parseJson(localStorage.getItem(TASKS_STORAGE_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (task) => task && typeof task.id === 'string' && typeof task.text === 'string' && task.completed !== true
  );
}

function getSelectedTaskData() {
  const tasks = readIncompleteTasks();
  const selection = getPomodoroSelection();
  const selectedTaskId = typeof selection?.taskId === 'string' ? selection.taskId : '';
  const selectedSubtaskId = typeof selection?.subtaskId === 'string' ? selection.subtaskId : '';
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const selectedSubtask =
    selectedTask && Array.isArray(selectedTask.subtasks)
      ? selectedTask.subtasks.find(
          (subtask) =>
            subtask && typeof subtask.id === 'string' && subtask.id === selectedSubtaskId && subtask.completed !== true
        ) || null
      : null;

  return {
    selectedTaskText: selectedTask?.text || '',
    selectedSubtaskText: selectedSubtask?.text || '',
    suggestions: selectedTask ? [] : tasks.slice(0, 3)
  };
}

function getModeLabel(mode) {
  if (mode === 'shortBreak' || mode === 'longBreak') return 'Pause';
  return 'Travail';
}

function buildState() {
  const pomodoroState = getPomodoroState();
  const pomodoroSettings = getPomodoroSettings();
  const taskData = getSelectedTaskData();

  return {
    isActive,
    theme: selectedTheme,
    hasPomodoroState: Boolean(pomodoroState),
    modeLabel: getModeLabel(pomodoroState?.mode),
    formattedTime: formatTime(pomodoroState?.remainingSeconds ?? 0),
    soundEnabled: pomodoroSettings?.soundEnabled !== false,
    selectedTaskText: taskData.selectedTaskText,
    selectedSubtaskText: taskData.selectedSubtaskText,
    suggestionButtons: createSuggestedTasks(taskData.suggestions),
    ambienceButtons: createAmbienceButtons(selectedTheme, AMBIENCES)
  };
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createFocusView(buildState());
}

function refreshDynamicContent() {
  if (!rootContainer || !isActive) return;
  const state = buildState();
  const root = rootContainer.querySelector('[data-focus-root]');
  if (root) root.setAttribute('data-focus-theme', state.theme);

  const timeNode = rootContainer.querySelector('[data-focus-time]');
  const modeNode = rootContainer.querySelector('[data-focus-mode]');
  const taskNode = rootContainer.querySelector('[data-focus-task]');
  const subtaskNode = rootContainer.querySelector('[data-focus-subtask]');
  const suggestionNode = rootContainer.querySelector('[data-focus-suggestions]');
  const soundButton = rootContainer.querySelector('[data-focus-sound-toggle]');
  const ambienceWrap = rootContainer.querySelector('[data-focus-ambiences]');

  if (timeNode) timeNode.textContent = state.formattedTime;
  if (modeNode) modeNode.textContent = state.modeLabel;
  if (taskNode) taskNode.textContent = state.selectedTaskText;
  if (subtaskNode) subtaskNode.textContent = state.selectedSubtaskText;
  if (suggestionNode) suggestionNode.innerHTML = state.suggestionButtons;
  if (soundButton) soundButton.textContent = state.soundEnabled ? '🔔' : '🔕';
  if (ambienceWrap) ambienceWrap.innerHTML = state.ambienceButtons;
}

async function enterFullscreen() {
  if (document.fullscreenElement) return;
  if (!document.documentElement.requestFullscreen) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch (_error) {
    // Ignore: some browsers block fullscreen without direct gesture.
  }
}

async function exitFullscreen() {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch (_error) {
    // Ignore: browser may reject when already exiting.
  }
}

function applyGlobalFocusState(active) {
  document.documentElement.dataset.focusActive = active ? 'true' : 'false';
}

async function activateFocus() {
  isActive = true;
  applyGlobalFocusState(true);
  render();
  await enterFullscreen();
}

async function deactivateFocus() {
  isActive = false;
  applyGlobalFocusState(false);
  await exitFullscreen();
  render();
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const enterButton = target.closest('[data-focus-enter]');
    if (enterButton instanceof HTMLButtonElement) {
      activateFocus();
      return;
    }

    const exitButton = target.closest('[data-focus-exit]');
    if (exitButton instanceof HTMLButtonElement) {
      deactivateFocus();
      return;
    }

    const soundButton = target.closest('[data-focus-sound-toggle]');
    if (soundButton instanceof HTMLButtonElement) {
      const current = getPomodoroSettings();
      setPomodoroSettings({
        ...current,
        soundEnabled: current?.soundEnabled === false
      });
      refreshDynamicContent();
      return;
    }

    const ambienceButton = target.closest('[data-focus-ambience]');
    if (ambienceButton instanceof HTMLButtonElement) {
      const ambienceId = ambienceButton.dataset.focusAmbience;
      if (!ambienceId) return;
      if (!AMBIENCES.some((ambience) => ambience.id === ambienceId)) return;
      selectedTheme = ambienceId;
      save(FOCUS_THEME_KEY, selectedTheme);
      refreshDynamicContent();
      return;
    }

    const openPomodoroButton = target.closest('[data-focus-open-pomodoro]');
    if (openPomodoroButton instanceof HTMLButtonElement) {
      navigate('pomodoro');
      return;
    }

    const selectTaskButton = target.closest('[data-focus-select-task]');
    if (selectTaskButton instanceof HTMLButtonElement) {
      const taskId = selectTaskButton.dataset.focusSelectTask;
      if (!taskId) return;
      setPomodoroSelection({ taskId, subtaskId: '' });
      refreshDynamicContent();
    }
  };

  onKeyDown = (event) => {
    if (event.key === 'Escape' && isActive) {
      deactivateFocus();
    }
  };

  onFullscreenChange = () => {
    if (isActive && !document.fullscreenElement) {
      isActive = false;
      applyGlobalFocusState(false);
      render();
    }
  };

  rootContainer.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('fullscreenchange', onFullscreenChange);
}

function unbindEvents() {
  if (rootContainer && onClick) {
    rootContainer.removeEventListener('click', onClick);
  }
  if (onKeyDown) {
    document.removeEventListener('keydown', onKeyDown);
  }
  if (onFullscreenChange) {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  }
  onClick = null;
  onKeyDown = null;
  onFullscreenChange = null;
}

const focusModule = {
  id: 'focus',
  label: 'Focus',
  icon: '🎯',

  init(container) {
    rootContainer = container;
    selectedTheme = load(FOCUS_THEME_KEY, 'midnight');
    if (!AMBIENCES.some((ambience) => ambience.id === selectedTheme)) {
      selectedTheme = 'midnight';
    }
    isActive = localStorage.getItem(AUTO_ENTER_KEY) === '1';
    localStorage.removeItem(AUTO_ENTER_KEY);

    render();
    bindEvents();
    refreshIntervalId = window.setInterval(refreshDynamicContent, 500);

    if (isActive) {
      activateFocus();
    }
  },

  destroy() {
    unbindEvents();
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    applyGlobalFocusState(false);
    if (isActive) {
      exitFullscreen();
    }
    isActive = false;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    return null;
  }
};

export default focusModule;
