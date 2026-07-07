import './style.css';
import { save, load } from '../../core/storage.js';
import { createOceanCanvas } from './ocean-canvas.js';
import {
  SKY_BY_MOOD,
  PERIOD_OPTIONS,
  describeSea,
  buildGalleryBuckets,
  getIsoDate
} from './scene.js';
import {
  WEEKDAY_SHORT,
  createMoodShell,
  createGalleryHtml,
  createDetailHtml,
  createDashboardMoodWidget
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

const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

let rootContainer = null;
let entries = [];
let selectedMood = 3;
let selectedEnergy = 3;
let noteText = '';
let selectedPeriod = 'week';
let ocean = null;
let onRootClick = null;
let onRootInput = null;
let themeObserver = null;

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
    .map((entry) => {
      const normalizedEntry = normalizeEntry(entry);
      if (!normalizedEntry) return null;
      if (!entry?.id) needsSave = true;
      return normalizedEntry;
    })
    .filter(Boolean);
  if (needsSave) save(STORAGE_KEY, normalized);
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

function enrichChartPoint(base) {
  const moodRounded = base.mood != null ? Math.min(5, Math.max(1, Math.round(base.mood))) : null;
  const energyRounded = base.energy != null ? Math.min(5, Math.max(1, Math.round(base.energy))) : null;

  return {
    ...base,
    moodEmoji: base.moodEmoji || (moodRounded ? getLevel(MOOD_LEVELS, moodRounded).emoji : ''),
    energyEmoji: base.energyEmoji || (energyRounded ? getLevel(ENERGY_LEVELS, energyRounded).emoji : '')
  };
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
        hasData: Boolean(dayEntry)
      })
    );
  }

  return days;
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

function queryStage() {
  return rootContainer?.querySelector('[data-mood-stage]') ?? null;
}

function applyMoodToScene() {
  const stage = queryStage();
  if (!(stage instanceof HTMLElement)) return;

  const moodValue = selectedMood ?? 3;
  const energyValue = selectedEnergy ?? 3;
  const sky = SKY_BY_MOOD[moodValue];
  stage.style.setProperty('--sky-top', sky.sky[0]);
  stage.style.setProperty('--sky-bot', sky.sky[1]);
  stage.style.setProperty('--sun', sky.sun);

  const moodLevel = getLevel(MOOD_LEVELS, moodValue);
  const energyLevel = getLevel(ENERGY_LEVELS, energyValue);

  const cap = rootContainer?.querySelector('[data-mood-cap]');
  const sub = rootContainer?.querySelector('[data-mood-sub]');
  if (cap) cap.textContent = describeSea(moodValue, energyValue);
  if (sub) sub.textContent = `${moodLevel.emoji} ${moodLevel.label} · ${energyLevel.emoji} ${energyLevel.label}`;

  ocean?.setEnergyMultiplier(energyValue);
}

function updateSegmentButtons() {
  if (!rootContainer) return;

  for (const button of rootContainer.querySelectorAll('[data-mood-select]')) {
    if (!(button instanceof HTMLButtonElement)) continue;
    const kind = button.dataset.moodSelect;
    const value = Number(button.dataset.value);
    const selected = kind === 'mood' ? selectedMood : selectedEnergy;
    button.setAttribute('aria-pressed', String(value === selected));
  }

  const moodVal = rootContainer.querySelector('[data-mood-val-label]');
  const energyVal = rootContainer.querySelector('[data-energy-val-label]');
  if (moodVal) {
    moodVal.textContent =
      selectedMood != null ? getLevel(MOOD_LEVELS, selectedMood).label : '—';
  }
  if (energyVal) {
    energyVal.textContent =
      selectedEnergy != null ? getLevel(ENERGY_LEVELS, selectedEnergy).label : '—';
  }

  const saveBtn = rootContainer.querySelector('[data-mood-save]');
  if (saveBtn instanceof HTMLButtonElement) {
    saveBtn.disabled = selectedMood == null || selectedEnergy == null;
  }
}

function renderGallery() {
  if (!rootContainer) return;

  const buckets = buildGalleryBuckets(entries, selectedPeriod);
  const gallery = createGalleryHtml(buckets, selectedPeriod, MOOD_LEVELS, ENERGY_LEVELS);
  const title = rootContainer.querySelector('[data-mood-gallery-title]');
  const days = rootContainer.querySelector('[data-mood-days]');
  const periods = rootContainer.querySelector('[data-mood-periods]');

  if (title) title.textContent = gallery.title;
  if (days instanceof HTMLElement) {
    days.style.gridTemplateColumns = `repeat(${gallery.gridCols}, minmax(0, 1fr))`;
    days.innerHTML = gallery.cells;
  }
  if (periods) {
    for (const button of periods.querySelectorAll('[data-mood-period]')) {
      if (!(button instanceof HTMLButtonElement)) continue;
      button.setAttribute('aria-pressed', String(button.dataset.moodPeriod === selectedPeriod));
    }
  }
}

function hideDetail() {
  const detail = rootContainer?.querySelector('[data-mood-detail]');
  if (detail instanceof HTMLElement) {
    detail.hidden = true;
    detail.innerHTML = '';
  }
}

function showDetail(bucket) {
  const detail = rootContainer?.querySelector('[data-mood-detail]');
  if (!(detail instanceof HTMLElement)) return;
  detail.innerHTML = createDetailHtml(bucket, MOOD_LEVELS, ENERGY_LEVELS);
  detail.hidden = false;
}

function mountView() {
  if (!rootContainer) return;

  rootContainer.innerHTML = createMoodShell({
    moodLevels: MOOD_LEVELS,
    energyLevels: ENERGY_LEVELS,
    selectedMood,
    selectedEnergy,
    note: noteText,
    periodOptions: PERIOD_OPTIONS,
    selectedPeriod
  });

  const stage = queryStage();
  const canvas = rootContainer.querySelector('[data-mood-canvas]');
  if (stage instanceof HTMLElement && canvas instanceof HTMLCanvasElement) {
    ocean = createOceanCanvas(stage, canvas, {
      onSaveGestureEnd: () => {
        const saveBtn = rootContainer?.querySelector('[data-mood-save]');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
      }
    });
    ocean.setEnergyMultiplier(selectedEnergy ?? 3);
    ocean.start();
  }

  applyMoodToScene();
  renderGallery();
}

function saveTodayEntry() {
  if (selectedMood == null || selectedEnergy == null) return;

  const nextEntry = buildEntry();
  const todayIndex = entries.findIndex((entry) => entry.date === nextEntry.date);
  if (todayIndex >= 0) entries[todayIndex] = nextEntry;
  else entries.push(nextEntry);
  entries.sort((a, b) => b.timestamp - a.timestamp);
  persistEntries();

  noteText = '';
  const noteField = rootContainer?.querySelector('[data-mood-note]');
  if (noteField instanceof HTMLTextAreaElement) noteField.value = '';

  selectedPeriod = 'week';
  renderGallery();
  hideDetail();

  const ack = rootContainer?.querySelector('[data-mood-ack]');
  if (ack instanceof HTMLElement) {
    ack.classList.remove('mood__stage-ack--go');
    void ack.offsetWidth;
    ack.classList.add('mood__stage-ack--go');
  }

  const saveBtn = rootContainer?.querySelector('[data-mood-save]');
  if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
  ocean?.playSaveAnimation();
}

function bindEvents() {
  if (!rootContainer) return;

  onRootClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const periodBtn = target.closest('[data-mood-period]');
    if (periodBtn instanceof HTMLButtonElement) {
      const nextPeriod = periodBtn.dataset.moodPeriod;
      if (!nextPeriod || nextPeriod === selectedPeriod) return;
      selectedPeriod = nextPeriod;
      hideDetail();
      renderGallery();
      return;
    }

    const selectButton = target.closest('[data-mood-select]');
    if (selectButton instanceof HTMLButtonElement) {
      const kind = selectButton.dataset.moodSelect;
      const value = Number(selectButton.dataset.value);
      if (!Number.isFinite(value)) return;
      if (kind === 'mood') selectedMood = Math.min(5, Math.max(1, value));
      if (kind === 'energy') selectedEnergy = Math.min(5, Math.max(1, value));
      updateSegmentButtons();
      applyMoodToScene();
      return;
    }

    const saveBtn = target.closest('[data-mood-save]');
    if (saveBtn instanceof HTMLButtonElement) {
      saveTodayEntry();
      return;
    }

    const dayBtn = target.closest('[data-mood-day]');
    if (dayBtn instanceof HTMLButtonElement) {
      showDetail({
        m: Number(dayBtn.dataset.mood),
        e: Number(dayBtn.dataset.energy),
        note: dayBtn.dataset.note || '',
        date: dayBtn.dataset.date || '',
        count: Number(dayBtn.dataset.count) || 1
      });
      return;
    }

    if (target.closest('[data-mood-day-empty]')) hideDetail();
  };

  onRootInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (!target.matches('[data-mood-note]')) return;
    noteText = target.value;
  };

  rootContainer.addEventListener('click', onRootClick);
  rootContainer.addEventListener('input', onRootInput);

  themeObserver = new MutationObserver(() => {
    applyMoodToScene();
    ocean?.renderIdleFrame();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

const moodModule = {
  id: 'mood',
  label: 'Humeur',
  icon: '🙂',

  init(container) {
    rootContainer = container;
    entries = readEntries();
    selectedMood = 3;
    selectedEnergy = 3;
    noteText = '';
    selectedPeriod = 'week';

    const todayEntry = entries.find((entry) => entry.date === getIsoDate());
    if (todayEntry) {
      selectedMood = todayEntry.mood;
      selectedEnergy = todayEntry.energy;
      noteText = todayEntry.note || '';
    }

    mountView();
    bindEvents();
  },

  destroy() {
    themeObserver?.disconnect();
    themeObserver = null;

    if (rootContainer && onRootClick) rootContainer.removeEventListener('click', onRootClick);
    if (rootContainer && onRootInput) rootContainer.removeEventListener('input', onRootInput);

    ocean?.destroy();
    ocean = null;
    onRootClick = null;
    onRootInput = null;
    entries = [];
    selectedMood = 3;
    selectedEnergy = 3;
    noteText = '';
    selectedPeriod = 'week';

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
      chartDays: getChartDaysDaily(7),
      moodTrend: computeMoodTrend(),
      dominantMoodEmoji: computeDominantMoodEmoji()
    });

    entries = savedEntries;
    return widget;
  }
};

export { normalizeEntry };
export default moodModule;
