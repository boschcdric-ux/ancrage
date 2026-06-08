import './style.css';
import { save, load } from '../../core/storage.js';
import {
  createMainView,
  createConfigView,
  createDayEditModal,
  createDashboardWidgetHtml
} from './view.js';

const STORAGE_KEY = 'ancrage-planning-boulot';

const DEFAULT_SITES = [
  { id: 'site-a', name: 'Site A' },
  { id: 'site-b', name: 'Site B' },
  { id: 'site-c', name: 'Site C' }
];
const WEEKDAY_KEYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WORK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAY_SHORT = {
  lundi: 'Lun',
  mardi: 'Mar',
  mercredi: 'Mer',
  jeudi: 'Jeu',
  vendredi: 'Ven',
  samedi: 'Sam'
};

const DEFAULT_HOLIDAYS_SCHEDULE = [];

function cloneDefaultHolidaysSchedule() {
  if (!Array.isArray(DEFAULT_HOLIDAYS_SCHEDULE) || DEFAULT_HOLIDAYS_SCHEDULE.length === 0) {
    return createDefaultWeek();
  }
  return JSON.parse(JSON.stringify(DEFAULT_HOLIDAYS_SCHEDULE));
}

let rootContainer = null;
let data = null;
let screen = 'main';
let configWeekTab = 0;
let dayModalOpen = false;
let dayModalSlot2Open = false;
let onClick = null;
let onChange = null;
let onSubmit = null;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekdayKey(date) {
  return WEEKDAY_KEYS[date.getDay()];
}

function getMondayOfWeek(date) {
  const d = startOfLocalDay(date);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

function createEmptySlot() {
  return { site: '', start: '', end: '' };
}

function createEmptyDay(off = false) {
  return {
    off: Boolean(off),
    slot1: createEmptySlot(),
    slot2: createEmptySlot()
  };
}

function isLegacyDayShape(raw) {
  return (
    raw &&
    typeof raw === 'object' &&
    ('site' in raw || 'start' in raw || 'end' in raw) &&
    !('slot1' in raw)
  );
}

function normalizeSlot(raw) {
  return {
    site: typeof raw?.site === 'string' ? raw.site : '',
    start: typeof raw?.start === 'string' ? raw.start : '',
    end: typeof raw?.end === 'string' ? raw.end : ''
  };
}

function migrateLegacyDay(raw, defaultOff = false) {
  if (!raw || typeof raw !== 'object') return createEmptyDay(defaultOff);
  if (isLegacyDayShape(raw)) {
    return {
      off: raw.off === true || (defaultOff && raw.off === undefined),
      slot1: {
        site: typeof raw.site === 'string' ? raw.site : '',
        start: typeof raw.start === 'string' ? raw.start : '',
        end: typeof raw.end === 'string' ? raw.end : ''
      },
      slot2: createEmptySlot()
    };
  }
  const off = raw.off === true || (defaultOff && raw.off === undefined);
  return {
    off,
    slot1: normalizeSlot(raw.slot1),
    slot2: normalizeSlot(raw.slot2)
  };
}

function normalizeDay(raw, defaultOff = false) {
  return migrateLegacyDay(raw, defaultOff);
}

function normalizeWeek(raw) {
  const week = createDefaultWeek();
  for (const day of WORK_DAYS) {
    if (raw && raw[day]) week[day] = normalizeDay(raw[day], day === 'samedi');
  }
  return week;
}

function normalizeOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [dateKey, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !value || typeof value !== 'object') continue;
    const day = migrateLegacyDay(value, false);
    out[dateKey] = {
      ...day,
      overtime: value.overtime === true
    };
  }
  return out;
}

function createDefaultWeek() {
  return {
    lundi: createEmptyDay(false),
    mardi: createEmptyDay(false),
    mercredi: createEmptyDay(false),
    jeudi: createEmptyDay(false),
    vendredi: createEmptyDay(false),
    samedi: createEmptyDay(true)
  };
}

function normalizeHolidayPeriod(raw) {
  if (!raw || typeof raw.start !== 'string' || typeof raw.end !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.start) || !/^\d{4}-\d{2}-\d{2}$/.test(raw.end)) return null;
  const start = raw.start;
  const end = raw.end;
  if (start > end) return null;
  return { start, end };
}

function normalizeHolidayPeriods(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeHolidayPeriod).filter(Boolean);
}

function isDateInHolidayPeriods(dateKey, periods) {
  if (!dateKey || !Array.isArray(periods)) return false;
  return periods.some((p) => dateKey >= p.start && dateKey <= p.end);
}

function countHolidayDaysBetween(startDateKey, endDateKey, periods) {
  if (!periods.length || startDateKey > endDateKey) return 0;
  let count = 0;
  const cursor = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);
  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor);
    if (isDateInHolidayPeriods(key, periods)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function shouldUseVacationSchedule(date, store) {
  if (!store) return false;
  if (store.holidays_mode === true) return true;
  return isDateInHolidayPeriods(toDateKey(date), store.holiday_periods || []);
}

function createDefaultData() {
  const monday = getMondayOfWeek(new Date());
  return {
    reference_date: toDateKey(monday),
    current_week_override: null,
    holidays_mode: false,
    holiday_periods: [],
    weeks: Array.from({ length: 5 }, () => createDefaultWeek()),
    holidays_schedule: cloneDefaultHolidaysSchedule(),
    overrides: {}
  };
}

function normalizeData(raw) {
  const base = createDefaultData();
  if (!raw || typeof raw !== 'object') return base;

  const weeks = Array.isArray(raw.weeks)
    ? raw.weeks.slice(0, 5).map((w) => normalizeWeek(w))
    : base.weeks;
  while (weeks.length < 5) weeks.push(createDefaultWeek());

  const holidays = cloneDefaultHolidaysSchedule();
  if (raw.holidays_schedule && typeof raw.holidays_schedule === 'object') {
    for (const day of WORK_DAYS) {
      if (raw.holidays_schedule[day]) {
        holidays[day] = normalizeDay(raw.holidays_schedule[day], day === 'samedi');
      }
    }
  }

  let referenceDate = typeof raw.reference_date === 'string' ? raw.reference_date : base.reference_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) referenceDate = base.reference_date;
  const refMonday = getMondayOfWeek(parseDateKey(referenceDate));
  referenceDate = toDateKey(refMonday);

  let override = raw.current_week_override;
  if (override !== null && override !== undefined) {
    const n = Number(override);
    override = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  } else {
    override = null;
  }

  return {
    reference_date: referenceDate,
    current_week_override: override,
    holidays_mode: raw.holidays_mode === true,
    holiday_periods: normalizeHolidayPeriods(raw.holiday_periods),
    weeks,
    holidays_schedule: holidays,
    overrides: normalizeOverrides(raw.overrides)
  };
}

function readData() {
  return normalizeData(load(STORAGE_KEY, null));
}

function persistData() {
  save(STORAGE_KEY, data);
}

function getEffectiveDaysSinceReference(referenceDateKey, today = new Date(), holidayPeriods = []) {
  const ref = startOfLocalDay(parseDateKey(referenceDateKey));
  const now = startOfLocalDay(today);
  const diffDays = Math.floor((now.getTime() - ref.getTime()) / 86400000);
  if (diffDays < 0) return 0;
  const todayKey = toDateKey(today);
  const holidayDays = countHolidayDaysBetween(referenceDateKey, todayKey, holidayPeriods);
  return Math.max(0, diffDays - holidayDays);
}

function getFullWeeksSinceReference(referenceDateKey, today = new Date(), holidayPeriods = []) {
  const effectiveDays = getEffectiveDaysSinceReference(referenceDateKey, today, holidayPeriods);
  return Math.floor(effectiveDays / 7);
}

export function getCurrentWeekIndex(store = data, today = new Date()) {
  if (!store) return 0;
  if (store.current_week_override != null) {
    return store.current_week_override - 1;
  }
  const periods = store.holiday_periods || [];
  const fullWeeks = getFullWeeksSinceReference(store.reference_date, today, periods);
  return ((fullWeeks % 5) + 5) % 5;
}

function getCycleScheduleForDay(dayKey, store = data, today = new Date()) {
  if (!store || !WORK_DAYS.includes(dayKey)) {
    return createEmptyDay(true);
  }
  if (shouldUseVacationSchedule(today, store)) {
    return normalizeDay(store.holidays_schedule[dayKey], dayKey === 'samedi');
  }
  const weekIndex = getCurrentWeekIndex(store, today);
  const week = store.weeks[weekIndex] || createDefaultWeek();
  return normalizeDay(week[dayKey], dayKey === 'samedi');
}

export function getDaySchedule(date, store = data) {
  if (!store) return createEmptyDay(true);
  const dateKey = toDateKey(date);
  const override = store.overrides[dateKey];
  if (override) {
    return {
      off: override.off === true,
      slot1: normalizeSlot(override.slot1),
      slot2: normalizeSlot(override.slot2),
      overtime: override.overtime === true
    };
  }
  const dayKey = getWeekdayKey(date);
  if (dayKey === 'dimanche') {
    return createEmptyDay(true);
  }
  return getCycleScheduleForDay(dayKey, store, date);
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function getDurationHours(start, end) {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null || endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

function isSlotFilled(slot) {
  return Boolean(slot?.site && String(slot.site).trim());
}

function getTotalDurationHours(schedule) {
  if (!schedule || schedule.off) return 0;
  return getDurationHours(schedule.slot1?.start, schedule.slot1?.end)
    + getDurationHours(schedule.slot2?.start, schedule.slot2?.end);
}

function formatDurationHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return '';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function formatTimeDisplay(timeStr) {
  const min = parseTimeToMinutes(timeStr);
  if (min === null) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function formatSlotSummary(slot) {
  if (!isSlotFilled(slot)) return '';
  const start = formatTimeDisplay(slot.start);
  const end = formatTimeDisplay(slot.end);
  const time = start && end ? `${start}→${end}` : '';
  return time ? `${slot.site} ${time}` : slot.site;
}

function formatSlotsSummary(schedule) {
  if (!schedule || schedule.off) return '';
  return [formatSlotSummary(schedule.slot1), formatSlotSummary(schedule.slot2)].filter(Boolean).join(' · ');
}

function hasOvertime(schedule) {
  if (!schedule || schedule.off) return false;
  return schedule.overtime === true;
}

function isDayConfigured(schedule) {
  if (!schedule || schedule.off) return false;
  return isSlotFilled(schedule.slot1) || isSlotFilled(schedule.slot2);
}

function slotsMatch(a, b) {
  return (
    (a?.site || '').trim() === (b?.site || '').trim() &&
    (a?.start || '') === (b?.start || '') &&
    (a?.end || '') === (b?.end || '')
  );
}

function schedulesMatch(a, b) {
  return (
    Boolean(a?.off) === Boolean(b?.off) &&
    slotsMatch(a?.slot1, b?.slot1) &&
    slotsMatch(a?.slot2, b?.slot2)
  );
}

function getNormalScheduleForDate(date, store = data) {
  const dayKey = getWeekdayKey(date);
  if (dayKey === 'dimanche') {
    return createEmptyDay(true);
  }
  return getCycleScheduleForDay(dayKey, store, date);
}

function formatLongDate(date) {
  const raw = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function readSlotFromForm(form, slotNum) {
  const siteEl = form.querySelector(`[data-planning-day-site="${slotNum}"]`);
  const startEl = form.querySelector(`[data-planning-day-start="${slotNum}"]`);
  const endEl = form.querySelector(`[data-planning-day-end="${slotNum}"]`);
  const siteRaw = siteEl instanceof HTMLSelectElement ? siteEl.value : '';
  return {
    site: siteRaw === '—' || siteRaw === '' ? '' : siteRaw,
    start: startEl instanceof HTMLInputElement ? startEl.value : '',
    end: endEl instanceof HTMLInputElement ? endEl.value : ''
  };
}

function readHolidayPeriodsFromForm(form) {
  const rows = form.querySelectorAll('[data-planning-holiday-row]');
  const periods = [];
  rows.forEach((row) => {
    const startEl = row.querySelector('[data-planning-holiday-start]');
    const endEl = row.querySelector('[data-planning-holiday-end]');
    if (!(startEl instanceof HTMLInputElement) || !(endEl instanceof HTMLInputElement)) return;
    const period = normalizeHolidayPeriod({ start: startEl.value, end: endEl.value });
    if (period) periods.push(period);
  });
  return periods;
}

function readConfigSlotFromForm(form, week, day, slotNum) {
  const siteEl = form.querySelector(
    `[data-planning-config-site="${week}"][data-day="${day}"][data-slot="${slotNum}"]`
  );
  const startEl = form.querySelector(
    `[data-planning-config-start="${week}"][data-day="${day}"][data-slot="${slotNum}"]`
  );
  const endEl = form.querySelector(
    `[data-planning-config-end="${week}"][data-day="${day}"][data-slot="${slotNum}"]`
  );
  const siteRaw = siteEl instanceof HTMLSelectElement ? siteEl.value : '';
  return {
    site: siteRaw === '—' ? '' : siteRaw,
    start: startEl instanceof HTMLInputElement ? startEl.value : '',
    end: endEl instanceof HTMLInputElement ? endEl.value : ''
  };
}

function buildTodayCard(today = new Date()) {
  const schedule = getDaySchedule(today, data);
  const weekIndex = getCurrentWeekIndex(data, today);
  const durationH = schedule.off ? 0 : getTotalDurationHours(schedule);

  return {
    dateLabel: formatLongDate(today),
    weekLabel: `Semaine ${weekIndex + 1}`,
    cycleLabel: 'Cycle 5 semaines',
    schedule,
    off: schedule.off,
    configured: isDayConfigured(schedule),
    slotsSummary: formatSlotsSummary(schedule),
    durationLabel: durationH > 0 ? formatDurationHours(durationH) : '',
    hasOvertime: hasOvertime(schedule),
    dateKey: toDateKey(today)
  };
}

function buildWeekRows(today = new Date()) {
  const monday = getMondayOfWeek(today);
  const rows = [];

  for (let i = 0; i < 6; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayKey = WORK_DAYS[i];
    const schedule = getDaySchedule(date, data);
    const isSaturday = dayKey === 'samedi';
    if (isSaturday && schedule.off && !isDayConfigured(schedule)) continue;

    const dateKey = toDateKey(date);
    const todayKey = toDateKey(today);
    const isToday = dateKey === todayKey;
    const isPast = startOfLocalDay(date).getTime() < startOfLocalDay(today).getTime();

    rows.push({
      dayKey,
      shortLabel: DAY_SHORT[dayKey],
      schedule,
      off: schedule.off,
      configured: isDayConfigured(schedule),
      slotsSummary: formatSlotsSummary(schedule),
      hasOvertime: hasOvertime(schedule),
      isToday,
      isPast
    });
  }

  return rows;
}

function getViewModel() {
  const today = new Date();
  const schedule = getDaySchedule(today, data);
  return {
    screen,
    todayCard: buildTodayCard(today),
    weekRows: buildWeekRows(today),
    holidaysMode: data.holidays_mode,
    configWeekTab,
    configData: data,
    dayModalOpen,
    dayModalSlot2Open: dayModalSlot2Open || isSlotFilled(schedule.slot2),
    dayModalDateKey: toDateKey(today),
    sites: DEFAULT_SITES
  };
}

function render() {
  if (!rootContainer || !data) return;
  rootContainer.innerHTML =
    screen === 'config' ? createConfigView(getViewModel()) : createMainView(getViewModel());

  if (dayModalOpen) {
    const today = new Date();
    const dateKey = toDateKey(today);
    const schedule = getDaySchedule(today, data);
    const modalHost = document.createElement('div');
    modalHost.innerHTML = createDayEditModal({
      dateKey,
      dateLabel: formatLongDate(today),
      schedule,
      slot2Open: dayModalSlot2Open || isSlotFilled(schedule.slot2),
      sites: DEFAULT_SITES
    });
    const modal = modalHost.firstElementChild;
    if (modal) rootContainer.appendChild(modal);
  }
}

function toggleHolidaysMode() {
  data.holidays_mode = !data.holidays_mode;
  persistData();
  render();
}

function openConfig() {
  screen = 'config';
  configWeekTab = getCurrentWeekIndex(data);
  render();
}

function closeConfig() {
  screen = 'main';
  render();
}

function openDayModal() {
  const today = new Date();
  const schedule = getDaySchedule(today, data);
  dayModalSlot2Open = isSlotFilled(schedule.slot2);
  dayModalOpen = true;
  render();
}

function closeDayModal() {
  dayModalOpen = false;
  dayModalSlot2Open = false;
  render();
}

function setDayBlockDisabled(dayBlock, disabled) {
  if (!(dayBlock instanceof HTMLElement)) return;
  dayBlock.querySelectorAll('select, input[type="time"]').forEach((el) => {
    if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
      el.disabled = disabled;
    }
  });
  const slot2 = dayBlock.querySelector('[data-planning-config-slot2]');
  if (slot2 instanceof HTMLElement) {
    slot2.classList.toggle('is-muted', !disabled);
  }
}

function saveDayOverride(form) {
  const dateKey = form.querySelector('[data-planning-day-date]')?.value?.trim();
  if (!dateKey) return;

  const off = form.querySelector('[data-planning-day-off]')?.checked === true;
  const overtimeChecked = form.querySelector('[data-planning-day-overtime]')?.checked === true;
  const slot2Panel = form.querySelector('[data-planning-slot2-panel]');
  const slot2Enabled =
    slot2Panel instanceof HTMLElement && slot2Panel.classList.contains('is-open');

  const override = {
    off,
    slot1: off ? createEmptySlot() : readSlotFromForm(form, '1'),
    slot2: off || !slot2Enabled ? createEmptySlot() : readSlotFromForm(form, '2'),
    overtime: overtimeChecked
  };

  const date = parseDateKey(dateKey);
  const normal = getNormalScheduleForDate(date, data);
  const comparable = {
    off: override.off,
    slot1: override.slot1,
    slot2: override.slot2
  };

  if (schedulesMatch(comparable, normal) && !overtimeChecked) {
    delete data.overrides[dateKey];
  } else {
    data.overrides[dateKey] = override;
  }

  persistData();
  dayModalOpen = false;
  dayModalSlot2Open = false;
  render();
}

function saveConfigForm(form) {
  const stored = readData();
  const weekIndex = configWeekTab;
  if (weekIndex < 0 || weekIndex >= 5) return;

  let referenceDate = stored.reference_date;
  const refInput = form.querySelector('[data-planning-ref-date]');
  if (refInput instanceof HTMLInputElement && refInput.value) {
    const monday = getMondayOfWeek(parseDateKey(refInput.value));
    referenceDate = toDateKey(monday);
  }

  const updatedWeek = createDefaultWeek();
  for (const day of WORK_DAYS) {
    const offEl = form.querySelector(`[data-planning-config-off="${weekIndex}"][data-day="${day}"]`);
    const off = offEl instanceof HTMLInputElement ? offEl.checked : false;
    const slot1 = readConfigSlotFromForm(form, weekIndex, day, '1');
    const slot2 = readConfigSlotFromForm(form, weekIndex, day, '2');

    updatedWeek[day] = {
      off,
      slot1: off ? createEmptySlot() : slot1,
      slot2: off ? createEmptySlot() : slot2
    };
  }

  const weeks = stored.weeks.map((week, index) => (index === weekIndex ? updatedWeek : week));

  data = {
    ...stored,
    reference_date: referenceDate,
    weeks,
    holiday_periods: readHolidayPeriodsFromForm(form)
  };

  persistData();
  screen = 'main';
  render();
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-planning-open-config]')) {
      openConfig();
      return;
    }

    if (target.closest('[data-planning-close-config]')) {
      closeConfig();
      return;
    }

    if (target.closest('[data-planning-toggle-holidays]')) {
      toggleHolidaysMode();
      return;
    }

    if (target.closest('[data-planning-add-holiday-period]')) {
      if (!data.holiday_periods) data.holiday_periods = [];
      data.holiday_periods.push({ start: '', end: '' });
      render();
      return;
    }

    const deleteHolidayBtn = target.closest('[data-planning-holiday-delete]');
    if (deleteHolidayBtn instanceof HTMLButtonElement) {
      const idx = Number(deleteHolidayBtn.dataset.planningHolidayDelete);
      if (Number.isFinite(idx) && Array.isArray(data.holiday_periods) && idx >= 0) {
        data.holiday_periods = data.holiday_periods.filter((_, i) => i !== idx);
        render();
      }
      return;
    }

    if (target.closest('[data-planning-edit-day]')) {
      openDayModal();
      return;
    }

    if (target.closest('[data-planning-modal-cancel]')) {
      closeDayModal();
      return;
    }

    const slot2Toggle = target.closest('[data-planning-slot2-toggle]');
    if (slot2Toggle) {
      const panel = rootContainer.querySelector('[data-planning-slot2-panel]');
      if (panel instanceof HTMLElement) {
        panel.classList.toggle('is-open');
        dayModalSlot2Open = panel.classList.contains('is-open');
      }
      return;
    }

    const tabBtn = target.closest('[data-planning-week-tab]');
    if (tabBtn instanceof HTMLButtonElement) {
      const idx = Number(tabBtn.dataset.planningWeekTab);
      if (Number.isFinite(idx) && idx >= 0 && idx < 5) {
        configWeekTab = idx;
        render();
      }
      return;
    }

    if (target.closest('[data-planning-modal-backdrop]')) {
      closeDayModal();
    }
  };

  onChange = (event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.matches('[data-planning-day-off]')) {
      const form = target.closest('[data-planning-day-form]');
      if (!(form instanceof HTMLFormElement)) return;
      const disabled = target.checked;
      form.querySelectorAll('[data-planning-day-site], [data-planning-day-start], [data-planning-day-end]').forEach((el) => {
        if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
          el.disabled = disabled;
        }
      });
      return;
    }

    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-planning-config-off]')) return;

    const dayBlock = target.closest('[data-planning-config-day]');
    setDayBlockDisabled(dayBlock, target.checked);
  };

  onSubmit = (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.matches('[data-planning-day-form]')) {
      event.preventDefault();
      saveDayOverride(form);
      return;
    }

    if (form.matches('[data-planning-config-form]')) {
      event.preventDefault();
      saveConfigForm(form);
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('submit', onSubmit);
}

const planningBoulotModule = {
  id: 'planning-boulot',
  label: 'Planning',
  icon: '🏢',
  category: 'boulot',

  init(container) {
    rootContainer = container;
    data = readData();
    screen = 'main';
    configWeekTab = 0;
    dayModalOpen = false;
    dayModalSlot2Open = false;
    render();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onChange) rootContainer.removeEventListener('change', onChange);
    if (rootContainer && onSubmit) rootContainer.removeEventListener('submit', onSubmit);

    onClick = null;
    onChange = null;
    onSubmit = null;
    rootContainer = null;
    data = null;
    screen = 'main';
    dayModalOpen = false;
    dayModalSlot2Open = false;
  },

  getDashboardWidget() {
    const store = readData();
    const today = new Date();
    const schedule = getDaySchedule(today, store);

    if (schedule.off) {
      return {
        title: '🏢 Boulot aujourd\'hui',
        content: createDashboardWidgetHtml({ state: 'off' })
      };
    }

    if (!isDayConfigured(schedule)) {
      return {
        title: '🏢 Boulot aujourd\'hui',
        content: createDashboardWidgetHtml({ state: 'unconfigured' })
      };
    }

    return {
      title: '🏢 Boulot aujourd\'hui',
      content: createDashboardWidgetHtml({
        state: 'work',
        slotsSummary: formatSlotsSummary(schedule),
        hasOvertime: hasOvertime(schedule)
      })
    };
  }
};

export default planningBoulotModule;
