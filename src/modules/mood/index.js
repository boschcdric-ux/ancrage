import './style.css';
import { save, load } from '../../core/storage.js';
import {
  WEEKDAY_SHORT,
  createMoodView,
  createDashboardMoodWidget,
  createHistory,
  formatDateFr
} from './view.js';

const STORAGE_KEY = 'mood:entries';

const MOOD_LEVELS = [
  { value: 1, emoji: '😴', label: 'Épuisé' },
  { value: 2, emoji: '😕', label: 'Difficile' },
  { value: 3, emoji: '😐', label: 'Moyen' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '⚡', label: 'En feu' }
];

const ENERGY_LEVELS = [
  { value: 1, emoji: '🪫', label: 'Vide' },
  { value: 2, emoji: '😮‍💨', label: 'Faible' },
  { value: 3, emoji: '🔋', label: 'Correct' },
  { value: 4, emoji: '⚡', label: 'Chargé' },
  { value: 5, emoji: '🚀', label: 'Optimal' }
];

const PERIOD_OPTIONS = [
  { id: '7', label: '7 jours', days: 7 },
  { id: '30', label: '30 jours', days: 30 },
  { id: '90', label: '3 mois', days: 90 },
  { id: '365', label: '1 an', days: 365 },
  { id: 'all', label: 'Tout', days: null }
];

const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

let rootContainer = null;
let entries = [];
let selectedMood = 3;
let selectedEnergy = 3;
let noteText = '';
let selectedPeriod = '7';
let historyDisplayCount = 40;
let onRootClick = null;
let onFormSubmit = null;
let onRootInput = null;
let onPointHover = null;
let onHistoryScroll = null;

function getIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.date !== 'string') return null;
  if (typeof entry.mood !== 'number' || typeof entry.energy !== 'number') return null;

  return {
    id: entry.id || `mood-${entry.date}`,
    date: entry.date,
    timestamp: Number(entry.timestamp) || Date.now(),
    mood: Math.min(5, Math.max(1, Number(entry.mood))),
    moodLabel: String(entry.moodLabel || ''),
    moodEmoji: String(entry.moodEmoji || ''),
    energy: Math.min(5, Math.max(1, Number(entry.energy))),
    energyLabel: String(entry.energyLabel || ''),
    energyEmoji: String(entry.energyEmoji || ''),
    note: String(entry.note || ''),
    dayOfWeek: String(entry.dayOfWeek || ''),
    hour: Number.isFinite(Number(entry.hour)) ? Number(entry.hour) : 0
  };
}

function readEntries() {
  const raw = load(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  let needsSave = false;
  const normalized = raw
    .map((e) => {
      const entry = normalizeEntry(e);
      if (!entry) return null;
      if (!e?.id) needsSave = true;
      return entry;
    })
    .filter(Boolean);
  if (needsSave) {
    save(STORAGE_KEY, normalized);
  }
  return normalized.sort((a, b) => b.timestamp - a.timestamp);
}

function persistEntries() {
  save(STORAGE_KEY, entries);
}

function getLevel(levels, value) {
  return levels.find((item) => item.value === value) || levels[2];
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getSelectedPeriodDays() {
  return PERIOD_OPTIONS.find((option) => option.id === selectedPeriod)?.days ?? 7;
}

function getPeriodCutoffIso(nbDays) {
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (nbDays - 1));
  return getIsoDate(cutoff);
}

function getEntriesInDays(nbDays) {
  const cutoffIso = getPeriodCutoffIso(nbDays);
  return entries.filter((entry) => entry.date >= cutoffIso);
}

function buildEntry() {
  const now = new Date();
  const moodLevel = getLevel(MOOD_LEVELS, selectedMood);
  const energyLevel = getLevel(ENERGY_LEVELS, selectedEnergy);

  return {
    date: getIsoDate(now),
    timestamp: now.getTime(),
    mood: moodLevel.value,
    moodLabel: moodLevel.label,
    moodEmoji: moodLevel.emoji,
    energy: energyLevel.value,
    energyLabel: energyLevel.label,
    energyEmoji: energyLevel.emoji,
    note: noteText.trim(),
    dayOfWeek: WEEKDAY_LONG[now.getDay()],
    hour: now.getHours()
  };
}

function findTodayEntry() {
  const today = getIsoDate();
  return entries.find((entry) => entry.date === today) || null;
}

function getRecentHistory(periodDays) {
  let filtered = [...entries];
  if (periodDays !== null) {
    const cutoffIso = getPeriodCutoffIso(periodDays);
    filtered = filtered.filter((entry) => entry.date >= cutoffIso);
  }
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

function enrichChartPoint(base) {
  const moodRounded = base.mood != null ? Math.min(5, Math.max(1, Math.round(base.mood))) : null;
  const energyRounded = base.energy != null ? Math.min(5, Math.max(1, Math.round(base.energy))) : null;

  return {
    ...base,
    moodEmoji: base.moodEmoji || (moodRounded ? getLevel(MOOD_LEVELS, moodRounded).emoji : ''),
    energyEmoji: base.energyEmoji || (energyRounded ? getLevel(ENERGY_LEVELS, energyRounded).emoji : '')
  };
}

function getWeekStartIso(date) {
  const weekStart = new Date(`${getIsoDate(date)}T12:00:00`);
  const weekday = weekStart.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  weekStart.setDate(weekStart.getDate() + diff);
  return getIsoDate(weekStart);
}

function formatMonthShort(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace(/\.$/, '');
}

function getChartDaysDaily(nbDays) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const days = [];

  for (let offset = nbDays - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const iso = getIsoDate(date);
    const dayEntry = byDate.get(iso);

    days.push(
      enrichChartPoint({
        date: iso,
        dayShort: nbDays <= 7 ? WEEKDAY_SHORT[date.getDay()] : String(date.getDate()),
        mood: dayEntry?.mood ?? null,
        energy: dayEntry?.energy ?? null,
        note: dayEntry?.note || '',
        moodEmoji: dayEntry?.moodEmoji || '',
        energyEmoji: dayEntry?.energyEmoji || '',
        hasData: Boolean(dayEntry),
        isWeekly: false
      })
    );
  }

  return days;
}

function getChartWeeks(nbDays) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let rangeStart;
  if (nbDays === null) {
    const sortedDates = [...entries].map((entry) => entry.date).sort();
    rangeStart = sortedDates[0] ? new Date(`${sortedDates[0]}T12:00:00`) : new Date(today);
  } else {
    rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (nbDays - 1));
  }

  let cursorIso = getWeekStartIso(rangeStart);
  const todayIso = getIsoDate(today);
  const weeks = [];

  while (cursorIso <= todayIso) {
    const weekEntries = [];
    const cursorDate = new Date(`${cursorIso}T12:00:00`);

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(cursorDate);
      day.setDate(day.getDate() + offset);
      const iso = getIsoDate(day);
      if (iso > todayIso) break;
      const dayEntry = byDate.get(iso);
      if (dayEntry) weekEntries.push(dayEntry);
    }

    const avgMood = average(weekEntries.map((entry) => entry.mood));
    const avgEnergy = average(weekEntries.map((entry) => entry.energy));
    const notes = weekEntries
      .map((entry) => String(entry.note || '').trim())
      .filter(Boolean);

    weeks.push(
      enrichChartPoint({
        date: cursorIso,
        dayShort: formatMonthShort(cursorIso),
        mood: avgMood,
        energy: avgEnergy,
        note: notes.join(' · '),
        hasData: weekEntries.length > 0,
        isWeekly: true
      })
    );

    const nextWeek = new Date(`${cursorIso}T12:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    cursorIso = getIsoDate(nextWeek);
  }

  let lastMonth = '';
  return weeks.map((week) => {
    const month = formatMonthShort(week.date);
    const label = month !== lastMonth ? month : '';
    lastMonth = month;
    return { ...week, dayShort: label };
  });
}

function getChartDays(nbDays = 7) {
  const aggregateWeekly = nbDays === null || nbDays >= 90;
  if (aggregateWeekly) return getChartWeeks(nbDays);
  return getChartDaysDaily(nbDays);
}

function computeMoodTrend() {
  const weekEntries = getEntriesInDays(7).sort((a, b) => a.date.localeCompare(b.date));
  if (weekEntries.length < 2) return 'stable';

  const midpoint = Math.floor(weekEntries.length / 2);
  const firstHalf = average(weekEntries.slice(0, midpoint).map((entry) => entry.mood));
  const secondHalf = average(weekEntries.slice(midpoint).map((entry) => entry.mood));
  if (firstHalf == null || secondHalf == null) return 'stable';

  const diff = secondHalf - firstHalf;
  if (diff >= 0.4) return 'up';
  if (diff <= -0.4) return 'down';
  return 'stable';
}

function computeDominantMoodEmoji() {
  const weekEntries = getEntriesInDays(7);
  if (!weekEntries.length) return null;

  const counts = new Map();
  for (const entry of weekEntries) {
    const emoji = entry.moodEmoji || getLevel(MOOD_LEVELS, entry.mood).emoji;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  }

  let dominant = null;
  let bestCount = 0;
  for (const [emoji, count] of counts) {
    if (count > bestCount) {
      dominant = emoji;
      bestCount = count;
    }
  }
  return dominant;
}

function updateTooltipFromPoint(target) {
  if (!rootContainer || !(target instanceof SVGElement)) return;
  const tooltip = rootContainer.querySelector('[data-mood-tooltip]');
  if (!(tooltip instanceof HTMLElement)) return;

  const hasData = target.dataset.hasData === 'true';
  const date = target.dataset.date || '';
  const isWeekly = target.dataset.isWeekly === 'true';

  if (!hasData) {
    tooltip.textContent = `${formatDateFr(date)} · Pas de donnée pour ce jour.`;
    return;
  }

  const moodRaw = target.dataset.mood || '-';
  const energyRaw = target.dataset.energy || '-';
  const moodDisplay = isWeekly && Number.isFinite(Number(moodRaw)) ? Number(moodRaw).toFixed(1) : moodRaw;
  const energyDisplay = isWeekly && Number.isFinite(Number(energyRaw)) ? Number(energyRaw).toFixed(1) : energyRaw;
  const moodEmoji = target.dataset.moodEmoji || '';
  const energyEmoji = target.dataset.energyEmoji || '';
  const note = (target.dataset.note || '').trim();
  const prefix = isWeekly ? 'Semaine du ' : '';

  tooltip.textContent = `${prefix}${formatDateFr(date)} · ${moodEmoji} Humeur ${moodDisplay}/5 · ${energyEmoji} Énergie ${energyDisplay}/5 · ${note || 'Sans note'}`;
}

function updateHistoryList() {
  if (!rootContainer) return;

  const periodDays = getSelectedPeriodDays();
  const allHistory = getRecentHistory(periodDays);
  const visibleHistory = allHistory.slice(0, historyDisplayCount);
  const hasMore = allHistory.length > visibleHistory.length;

  const historySection = rootContainer.querySelector('[data-mood-history]');
  if (!(historySection instanceof HTMLElement)) return;

  const title = historySection.querySelector('[data-mood-history-title]');
  const periodLabel = PERIOD_OPTIONS.find((option) => option.id === selectedPeriod)?.label || '7 jours';
  if (title) title.textContent = `Historique · ${periodLabel}`;

  const body = historySection.querySelector('[data-mood-history-body]');
  if (!(body instanceof HTMLElement)) return;

  const previousList = body.querySelector('[data-mood-history-list]');
  const previousScrollTop = previousList instanceof HTMLElement ? previousList.scrollTop : 0;

  body.innerHTML = createHistory(visibleHistory, { hasMore });

  const nextList = body.querySelector('[data-mood-history-list]');
  if (nextList instanceof HTMLElement) nextList.scrollTop = previousScrollTop;
}

function refreshView({ preserveHistoryScroll = false } = {}) {
  if (!rootContainer) return;

  const historyList = rootContainer.querySelector('[data-mood-history-list]');
  const previousScrollTop = preserveHistoryScroll && historyList instanceof HTMLElement ? historyList.scrollTop : 0;

  const periodDays = getSelectedPeriodDays();
  const allHistory = getRecentHistory(periodDays);
  const todayEntry = findTodayEntry();

  rootContainer.innerHTML = createMoodView({
    todayEntry,
    moodLevels: MOOD_LEVELS,
    energyLevels: ENERGY_LEVELS,
    selectedMood,
    selectedEnergy,
    note: noteText,
    chartDays: getChartDays(periodDays),
    history: allHistory.slice(0, historyDisplayCount),
    historyTotal: allHistory.length,
    periodOptions: PERIOD_OPTIONS,
    selectedPeriod,
    chartIsWeekly: periodDays === null || periodDays >= 90
  });

  if (preserveHistoryScroll) {
    const nextList = rootContainer.querySelector('[data-mood-history-list]');
    if (nextList instanceof HTMLElement) nextList.scrollTop = previousScrollTop;
  }
}

function applyTodayEntryToForm() {
  const todayEntry = findTodayEntry();
  if (!todayEntry) return;
  selectedMood = todayEntry.mood;
  selectedEnergy = todayEntry.energy;
  noteText = todayEntry.note || '';
  refreshView();
}

function saveTodayEntry() {
  const nextEntry = buildEntry();
  const todayIndex = entries.findIndex((entry) => entry.date === nextEntry.date);
  if (todayIndex >= 0) {
    entries[todayIndex] = nextEntry;
  } else {
    entries.push(nextEntry);
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);
  persistEntries();
  noteText = '';
  refreshView();
}

function bindEvents() {
  if (!rootContainer) return;

  onRootClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const periodChip = target.closest('[data-mood-period]');
    if (periodChip instanceof HTMLButtonElement) {
      const nextPeriod = periodChip.dataset.moodPeriod;
      if (!nextPeriod || nextPeriod === selectedPeriod) return;
      selectedPeriod = nextPeriod;
      historyDisplayCount = 40;
      refreshView();
      return;
    }

    const chartPoint = target.closest('[data-mood-point]');
    if (chartPoint instanceof SVGElement) {
      updateTooltipFromPoint(chartPoint);
      return;
    }

    if (!(target instanceof HTMLElement)) return;

    const selectButton = target.closest('[data-mood-select]');
    if (selectButton instanceof HTMLButtonElement) {
      const kind = selectButton.dataset.moodSelect;
      const value = Number(selectButton.dataset.value);
      if (!Number.isFinite(value)) return;
      if (kind === 'mood') selectedMood = Math.min(5, Math.max(1, value));
      if (kind === 'energy') selectedEnergy = Math.min(5, Math.max(1, value));
      refreshView();
      return;
    }

    const editTodayButton = target.closest('[data-mood-edit-today]');
    if (editTodayButton instanceof HTMLButtonElement) {
      applyTodayEntryToForm();
      rootContainer.querySelector('[data-mood-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  onRootInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (!target.matches('[data-mood-note]')) return;
    noteText = target.value;
  };

  onFormSubmit = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.matches('[data-mood-form]')) return;
    event.preventDefault();

    const noteField = target.querySelector('[data-mood-note]');
    if (noteField instanceof HTMLTextAreaElement) noteText = noteField.value;
    saveTodayEntry();
  };

  onPointHover = (event) => {
    const target = event.target;
    if (!(target instanceof SVGElement)) return;
    if (!target.matches('[data-mood-point]')) return;
    updateTooltipFromPoint(target);
  };

  onHistoryScroll = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[data-mood-history-list]')) return;
    if (target.dataset.hasMore !== 'true') return;
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 48) return;

    const periodDays = getSelectedPeriodDays();
    const total = getRecentHistory(periodDays).length;
    if (historyDisplayCount >= total) return;

    historyDisplayCount = Math.min(total, historyDisplayCount + 40);
    updateHistoryList();
  };

  rootContainer.addEventListener('click', onRootClick);
  rootContainer.addEventListener('input', onRootInput);
  rootContainer.addEventListener('submit', onFormSubmit);
  rootContainer.addEventListener('mouseover', onPointHover);
  rootContainer.addEventListener('focusin', onPointHover);
  rootContainer.addEventListener('scroll', onHistoryScroll, true);
}

const moodModule = {
  id: 'mood',
  label: 'Humeur',
  icon: '🙂',

  init(container) {
    rootContainer = container;
    entries = readEntries();
    const today = findTodayEntry();
    selectedMood = today?.mood || 3;
    selectedEnergy = today?.energy || 3;
    noteText = today?.note || '';
    selectedPeriod = '7';
    historyDisplayCount = 40;
    refreshView();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onRootClick) rootContainer.removeEventListener('click', onRootClick);
    if (rootContainer && onRootInput) rootContainer.removeEventListener('input', onRootInput);
    if (rootContainer && onFormSubmit) rootContainer.removeEventListener('submit', onFormSubmit);
    if (rootContainer && onPointHover) {
      rootContainer.removeEventListener('mouseover', onPointHover);
      rootContainer.removeEventListener('focusin', onPointHover);
    }
    if (rootContainer && onHistoryScroll) {
      rootContainer.removeEventListener('scroll', onHistoryScroll, true);
    }

    onRootClick = null;
    onRootInput = null;
    onFormSubmit = null;
    onPointHover = null;
    onHistoryScroll = null;
    entries = [];
    selectedMood = 3;
    selectedEnergy = 3;
    noteText = '';
    selectedPeriod = '7';
    historyDisplayCount = 40;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const localEntries = readEntries();
    const today = localEntries.find((entry) => entry.date === getIsoDate()) || null;
    const savedEntries = entries;
    entries = localEntries;

    const widget = createDashboardMoodWidget({
      todayEntry: today,
      chartDays: getChartDays(7),
      moodTrend: computeMoodTrend(),
      dominantMoodEmoji: computeDominantMoodEmoji()
    });

    entries = savedEntries;
    return widget;
  }
};

export { normalizeEntry };
export default moodModule;
