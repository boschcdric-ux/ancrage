import './style.css';
import { load, save, generateUUID } from '../../core/storage.js';
import { createCalendarView, createCalendarWidget, createDefaultForm, formatInputDate } from './view.js';

const STORAGE_KEY = 'calendar:events';
const TASKS_STORAGE_KEY = 'tasks:items';
const NOTIFICATION_PROMPT_KEY = 'calendar:notifications:prompted';
const SEMANTIC_COLORS = ['accent', 'success', 'warning', 'danger', 'info'];
const HOURS = Array.from({ length: 15 }, (_, index) => index + 8);
const DAY_TIMELINE_START_HOUR = 7;
const DAY_TIMELINE_END_HOUR = 23;
const DAY_TIMELINE_HOUR_COUNT = DAY_TIMELINE_END_HOUR - DAY_TIMELINE_START_HOUR + 1;

let rootContainer = null;
let events = [];
let viewMode = 'month';
let referenceDate = new Date();
let detailPanel = { open: false, eventId: null };
let eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
let clickHandler = null;
let submitHandler = null;
let changeHandler = null;
let notificationTimers = [];
let midnightRefreshTimer = null;
let jumpMenuOpen = false;

function toDateTime(dateStr, timeStr) {
  const time = timeStr || '00:00';
  return new Date(`${dateStr}T${time}`);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const base = startOfDay(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return base;
}

function endOfWeek(date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function toYmd(date) {
  return formatInputDate(date);
}

function parseReminder(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 1440);
}

function normalizeEvent(item) {
  if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') return null;
  if (!item.startDate || !item.startTime) return null;

  const recurrenceType = item.recurrence?.type;
  const safeRecurrence = ['none', 'daily', 'weekly', 'monthly'].includes(recurrenceType)
    ? recurrenceType
    : 'none';
  const color = SEMANTIC_COLORS.includes(item.color) ? item.color : 'accent';

  return {
    id: item.id,
    title: item.title.trim(),
    description: typeof item.description === 'string' ? item.description : '',
    startDate: item.startDate,
    startTime: item.startTime,
    endDate: item.endDate || '',
    endTime: item.endTime || '',
    color,
    taskId: typeof item.taskId === 'string' && item.taskId ? item.taskId : null,
    recurrence: {
      type: safeRecurrence,
      endDate: item.recurrence?.endDate || null
    },
    reminder: parseReminder(item.reminder),
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now()
  };
}

function readEvents() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeEvent).filter(Boolean);
}

function persistEvents() {
  save(STORAGE_KEY, events);
}

function readIncompleteTasks() {
  const list = load(TASKS_STORAGE_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((task) => task && typeof task.id === 'string' && !task.completed && typeof task.text === 'string');
}

function getOccurrenceEnd(event, startDateTime) {
  if (event.endDate && event.endTime) {
    return toDateTime(event.endDate, event.endTime);
  }
  return startDateTime;
}

function getMonthlyOccurrenceDate(eventStart, targetYear, targetMonth) {
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(eventStart.getDate(), maxDay);
  return new Date(targetYear, targetMonth, day);
}

function matchesRecurrence(event, date) {
  const eventStart = toDateTime(event.startDate, event.startTime);
  const dayStart = startOfDay(date);
  if (dayStart < startOfDay(eventStart)) return false;

  const recurrenceEnd = event.recurrence.endDate ? endOfDay(new Date(event.recurrence.endDate)) : null;
  if (recurrenceEnd && dayStart > recurrenceEnd) return false;

  switch (event.recurrence.type) {
    case 'none':
      return toYmd(dayStart) === event.startDate;
    case 'daily':
      return true;
    case 'weekly':
      return dayStart.getDay() === eventStart.getDay();
    case 'monthly': {
      const occurrence = getMonthlyOccurrenceDate(eventStart, dayStart.getFullYear(), dayStart.getMonth());
      return toYmd(dayStart) === toYmd(occurrence);
    }
    default:
      return false;
  }
}

function getOccurrencesInRange(rangeStart, rangeEnd) {
  const occurrences = [];
  const cursor = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  while (cursor <= end) {
    for (const event of events) {
      if (!matchesRecurrence(event, cursor)) continue;

      const startDateTime = toDateTime(toYmd(cursor), event.startTime);
      const endDateTime = getOccurrenceEnd(event, startDateTime);
      occurrences.push({
        id: event.id,
        baseEventId: event.id,
        occurrenceDate: toYmd(cursor),
        occurrenceDateTime: startDateTime.toISOString(),
        startDateTime,
        endDateTime: endDateTime >= startDateTime ? endDateTime : startDateTime,
        title: event.title,
        color: event.color,
        hasTask: Boolean(event.taskId),
        isRecurring: event.recurrence.type !== 'none',
        event
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences.sort((a, b) => a.startDateTime - b.startDateTime);
}

function getVisibleRange() {
  if (viewMode === 'day') {
    return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
  }
  if (viewMode === 'week') return { start: startOfWeek(referenceDate), end: endOfWeek(referenceDate) };

  const startMonth = startOfMonth(referenceDate);
  const endMonth = endOfMonth(referenceDate);
  const start = startOfWeek(startMonth);
  const end = endOfWeek(endMonth);
  return { start, end };
}

function createMonthModel(occurrences, range) {
  const today = toYmd(new Date());
  const map = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.occurrenceDate;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(occurrence);
  }

  const days = [];
  const cursor = new Date(range.start);
  const monthIndex = referenceDate.getMonth();

  while (cursor <= range.end) {
    const ymd = toYmd(cursor);
    days.push({
      date: ymd,
      dayNumber: cursor.getDate(),
      inMonth: cursor.getMonth() === monthIndex,
      isToday: ymd === today,
      events: (map.get(ymd) || []).map((item) => ({
        id: item.baseEventId,
        occurrenceDateTime: item.occurrenceDateTime,
        title: item.title,
        color: item.color,
        hasTask: item.hasTask,
        isRecurring: item.isRecurring
      }))
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weekdays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(referenceDate), index));
  return { days, weekdays };
}

function parseYmdLocal(ymd) {
  const parts = String(ymd).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function createDayModel(occurrences, dayDate) {
  const dayYmd = toYmd(startOfDay(dayDate));
  const today = toYmd(new Date());
  const hours = Array.from({ length: DAY_TIMELINE_HOUR_COUNT }, (_, index) => DAY_TIMELINE_START_HOUR + index);
  const timelineStart = toDateTime(dayYmd, `${String(DAY_TIMELINE_START_HOUR).padStart(2, '0')}:00`);
  const timelineEnd = new Date(timelineStart.getTime() + DAY_TIMELINE_HOUR_COUNT * 60 * 60 * 1000);
  const totalMs = timelineEnd - timelineStart;

  const dayOccurrences = occurrences.filter((item) => item.occurrenceDate === dayYmd);

  const events = dayOccurrences
    .map((item) => {
      const rawStart = item.startDateTime;
      const rawEnd = item.endDateTime > item.startDateTime ? item.endDateTime : item.startDateTime;
      const clipStart = rawStart < timelineStart ? timelineStart : rawStart;
      const clipEnd = rawEnd > timelineEnd ? timelineEnd : rawEnd;
      if (clipEnd <= timelineStart || clipStart >= timelineEnd) return null;

      const topPercent = ((clipStart - timelineStart) / totalMs) * 100;
      const heightPercent = ((clipEnd - clipStart) / totalMs) * 100;
      const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(rawStart);

      return {
        id: item.baseEventId,
        occurrenceDateTime: item.occurrenceDateTime,
        title: item.title,
        color: item.color,
        hasTask: item.hasTask,
        isRecurring: item.isRecurring,
        timeLabel,
        topPercent,
        heightPercent: Math.max(heightPercent, 2.8)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.topPercent - b.topPercent);

  let nowLinePercent = null;
  if (dayYmd === today) {
    const now = new Date();
    if (now >= timelineStart && now <= timelineEnd) {
      nowLinePercent = ((now - timelineStart) / totalMs) * 100;
    }
  }

  return { dayYmd, isToday: dayYmd === today, hours, events, nowLinePercent };
}

function createWeekModel(occurrences, range) {
  const today = toYmd(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(range.start, index);
    return {
      date: toYmd(date),
      dateObject: date,
      isToday: toYmd(date) === today
    };
  });

  const weekEvents = occurrences
    .filter((item) => {
      const hour = item.startDateTime.getHours();
      return hour >= 8 && hour <= 22;
    })
    .map((item) => {
      const hour = item.startDateTime.getHours();
      const minutes = item.startDateTime.getMinutes();
      const column = new Date(item.occurrenceDate).getDay() || 7;
      const durationMs = Math.max(item.endDateTime - item.startDateTime, 30 * 60 * 1000);
      const rowStart = Math.max(1, (hour - 8) * 2 + Math.floor(minutes / 30) + 1);
      const rowSpan = Math.max(1, Math.round(durationMs / (30 * 60 * 1000)));

      return {
        id: item.baseEventId,
        occurrenceDateTime: item.occurrenceDateTime,
        title: item.title,
        color: item.color,
        column,
        rowStart,
        rowSpan,
        hasTask: item.hasTask,
        isRecurring: item.isRecurring,
        timeLabel: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(item.startDateTime)
      };
    });

  return { days, hours: HOURS, events: weekEvents };
}

function getTaskLabel(taskId) {
  if (!taskId) return '';
  const task = readIncompleteTasks().find((item) => item.id === taskId);
  return task?.text || '';
}

function recurrenceLabel(type) {
  switch (type) {
    case 'daily':
      return 'Quotidien';
    case 'weekly':
      return 'Hebdomadaire';
    case 'monthly':
      return 'Mensuel';
    default:
      return 'Aucune';
  }
}

function getUpcoming(limit = 3) {
  const now = new Date();
  const rangeEnd = addDays(now, 45);
  return getOccurrencesInRange(now, rangeEnd)
    .filter((item) => item.startDateTime >= now)
    .slice(0, limit);
}

function formatWhenLabel(date) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const d = startOfDay(date);
  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === tomorrow.getTime()) return 'Demain';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
}

function openCreatePanel(date, time = '08:00') {
  const draftDate = toDateTime(date, time);
  const form = createDefaultForm(draftDate);
  detailPanel = { open: false, eventId: null };
  eventForm = { open: true, mode: 'create', eventId: null, form };
  render();
}

function openDetailPanel(eventId) {
  detailPanel = { open: true, eventId };
  render();
}

function openEditPanel(eventId) {
  const event = events.find((item) => item.id === eventId);
  if (!event) return;
  detailPanel = { open: false, eventId: null };
  eventForm = {
    open: true,
    mode: 'edit',
    eventId,
    form: {
      title: event.title,
      startDate: event.startDate,
      startTime: event.startTime,
      endDate: event.endDate,
      endTime: event.endTime,
      description: event.description,
      color: event.color,
      taskId: event.taskId || '',
      recurrenceType: event.recurrence.type,
      recurrenceEndDate: event.recurrence.endDate || '',
      reminder: event.reminder
    }
  };
  render();
}

function closeDetailPanel() {
  detailPanel = { open: false, eventId: null };
  render();
}

function closeEventForm() {
  eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
  render();
}

function createEventFromForm(formData, eventId = null) {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;

  const startDate = String(formData.get('startDate') || '');
  const startTime = String(formData.get('startTime') || '');
  if (!startDate || !startTime) return null;

  const endDate = String(formData.get('endDate') || '');
  const endTime = String(formData.get('endTime') || '');
  const recurrenceType = String(formData.get('recurrenceType') || 'none');
  const reminder = parseReminder(formData.get('reminder'));
  const now = Date.now();

  return {
    id: eventId || generateUUID(),
    title,
    description: String(formData.get('description') || '').trim(),
    startDate,
    startTime,
    endDate,
    endTime,
    color: SEMANTIC_COLORS.includes(String(formData.get('color'))) ? String(formData.get('color')) : 'accent',
    taskId: String(formData.get('taskId') || '') || null,
    recurrence: {
      type: ['none', 'daily', 'weekly', 'monthly'].includes(recurrenceType) ? recurrenceType : 'none',
      endDate: String(formData.get('recurrenceEndDate') || '') || null
    },
    reminder,
    createdAt: eventId ? events.find((item) => item.id === eventId)?.createdAt || now : now,
    updatedAt: now
  };
}

function savePanelEvent(formElement) {
  const payload = createEventFromForm(
    new FormData(formElement),
    eventForm.mode === 'edit' ? eventForm.eventId : null
  );
  if (!payload) {
    const titleInput = formElement.querySelector('input[name="title"]');
    if (titleInput instanceof HTMLInputElement) {
      titleInput.classList.remove('animate-shake');
      requestAnimationFrame(() => titleInput.classList.add('animate-shake'));
      titleInput.focus();
    }
    return;
  }

  if (eventForm.mode === 'edit') {
    events = events.map((item) => (item.id === payload.id ? payload : item));
  } else {
    events.push(payload);
  }
  persistEvents();
  scheduleNotifications();
  closeEventForm();
}

function deleteEvent(eventId) {
  const before = events.length;
  events = events.filter((item) => item.id !== eventId);
  if (events.length === before) return;
  persistEvents();
  scheduleNotifications();
  detailPanel = { open: false, eventId: null };
  eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
  render();
}

function requestNotificationPermissionOnce() {
  if (typeof Notification === 'undefined') return;
  const alreadyPrompted = load(NOTIFICATION_PROMPT_KEY, false);
  if (alreadyPrompted) return;
  save(NOTIFICATION_PROMPT_KEY, true);
  Notification.requestPermission().catch(() => {});
}

function clearNotificationTimers() {
  notificationTimers.forEach((timerId) => clearTimeout(timerId));
  notificationTimers = [];
}

function scheduleNotifications() {
  clearNotificationTimers();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = new Date();
  const future = addDays(now, 7);
  const upcoming = getOccurrencesInRange(now, future).filter((occ) => occ.event.reminder > 0);
  for (const occ of upcoming) {
    const notifyAt = new Date(occ.startDateTime.getTime() - occ.event.reminder * 60 * 1000);
    const delay = notifyAt.getTime() - Date.now();
    if (delay <= 0) continue;
    const messageTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
      occ.startDateTime
    );
    const timerId = setTimeout(() => {
      new Notification(occ.title, { body: `Début à ${messageTime}` });
    }, delay);
    notificationTimers.push(timerId);
  }
}

function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  midnightRefreshTimer = setTimeout(() => {
    scheduleNotifications();
    scheduleMidnightRefresh();
  }, msUntilMidnight);
}

function navigatePeriod(direction) {
  jumpMenuOpen = false;
  if (direction === 'today') {
    referenceDate = new Date();
    render();
    return;
  }
  const copy = new Date(referenceDate);
  if (viewMode === 'month') {
    copy.setMonth(copy.getMonth() + (direction === 'next' ? 1 : -1));
  } else if (viewMode === 'day') {
    copy.setDate(copy.getDate() + (direction === 'next' ? 1 : -1));
  } else {
    copy.setDate(copy.getDate() + (direction === 'next' ? 7 : -7));
  }
  referenceDate = copy;
  render();
}

function jumpToPeriod(monthValue, yearValue) {
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(month) || month < 0 || month > 11) return;
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return;
  const next = new Date(referenceDate);
  next.setFullYear(year, month, 1);
  referenceDate = next;
  jumpMenuOpen = false;
  render();
}

const FORM_COLOR_OPTIONS = [
  { value: 'accent', label: 'Accent' },
  { value: 'success', label: 'Succès' },
  { value: 'warning', label: 'Attention' },
  { value: 'danger', label: 'Important' },
  { value: 'info', label: 'Information' }
];

function buildDetailPanelModel() {
  if (!detailPanel.open) return { open: false };
  const event = events.find((item) => item.id === detailPanel.eventId);
  if (!event) return { open: false };
  return {
    open: true,
    event: {
      ...event,
      taskLabel: getTaskLabel(event.taskId),
      recurrenceLabel: recurrenceLabel(event.recurrence.type)
    }
  };
}

function buildEventFormModel() {
  if (!eventForm.open) return { open: false };
  return {
    open: true,
    mode: eventForm.mode,
    eventId: eventForm.eventId,
    form: eventForm.form,
    colorOptions: FORM_COLOR_OPTIONS,
    taskOptions: readIncompleteTasks()
  };
}

function buildViewModel() {
  const eventFormModel = buildEventFormModel();
  if (eventFormModel.open) {
    return { eventForm: eventFormModel, detailPanel: { open: false } };
  }

  const range = getVisibleRange();
  const occurrences = getOccurrencesInRange(range.start, range.end);
  const upcoming = getUpcoming(3).map((occurrence) => ({
    whenLabel: formatWhenLabel(occurrence.startDateTime),
    title: occurrence.title,
    timeLabel: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(occurrence.startDateTime)
  }));

  const monthModel = viewMode === 'month' ? createMonthModel(occurrences, range) : null;
  const weekModel = viewMode === 'week' ? createWeekModel(occurrences, range) : null;
  const dayModel = viewMode === 'day' ? createDayModel(occurrences, referenceDate) : null;

  return {
    eventForm: eventFormModel,
    viewMode,
    referenceDate: referenceDate.toISOString(),
    month: monthModel,
    week: weekModel,
    day: dayModel,
    upcoming,
    jumpMenuOpen,
    detailPanel: buildDetailPanelModel()
  };
}

function syncCalendarFormMorePanelAfterRender() {
  const panel = rootContainer?.querySelector('[data-calendar-form-more-panel]');
  const btn = rootContainer?.querySelector('[data-calendar-form-more]');
  if (!(panel instanceof HTMLElement) || !(btn instanceof HTMLButtonElement)) return;
  const isWide = typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches;
  if (isWide) {
    panel.classList.add('is-open');
    panel.removeAttribute('aria-hidden');
  } else {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = "+ Plus d'options ▾";
  }
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createCalendarView(buildViewModel());
  syncCalendarFormMorePanelAfterRender();
}

function bindEvents() {
  if (!rootContainer) return;

  clickHandler = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const viewBtn = target.closest('[data-view-mode]');
    if (viewBtn instanceof HTMLButtonElement) {
      const nextMode = viewBtn.dataset.viewMode;
      if (nextMode === 'month' || nextMode === 'week' || nextMode === 'day') {
        viewMode = nextMode;
        render();
      }
      return;
    }

    const navBtn = target.closest('[data-nav]');
    if (navBtn instanceof HTMLButtonElement) {
      navigatePeriod(navBtn.dataset.nav);
      return;
    }

    const jumpMenuToggleBtn = target.closest('[data-open-jump-menu]');
    if (jumpMenuToggleBtn instanceof HTMLButtonElement) {
      jumpMenuOpen = !jumpMenuOpen;
      render();
      return;
    }

    const jumpApplyBtn = target.closest('[data-jump-apply]');
    if (jumpApplyBtn instanceof HTMLButtonElement) {
      const monthSelect = rootContainer?.querySelector('[data-jump-month]');
      const yearSelect = rootContainer?.querySelector('[data-jump-year]');
      if (monthSelect instanceof HTMLSelectElement && yearSelect instanceof HTMLSelectElement) {
        jumpToPeriod(monthSelect.value, yearSelect.value);
      }
      return;
    }

    if (jumpMenuOpen) {
      const clickedInsideMenu = target.closest('[data-jump-menu]');
      if (!clickedInsideMenu) {
        jumpMenuOpen = false;
        render();
      }
      return;
    }

    const openEvent = target.closest('[data-event-open]');
    if (openEvent instanceof HTMLElement && openEvent.dataset.eventOpen) {
      event.stopPropagation();
      openDetailPanel(openEvent.dataset.eventOpen);
      return;
    }

    const dayCell = target.closest('[data-day-cell]');
    if (dayCell instanceof HTMLElement && dayCell.dataset.dayCell) {
      if (viewMode === 'month' || viewMode === 'week') {
        referenceDate = parseYmdLocal(dayCell.dataset.dayCell);
        viewMode = 'day';
        jumpMenuOpen = false;
        render();
        return;
      }
      openCreatePanel(dayCell.dataset.dayCell, '09:00');
      return;
    }

    const dayEmptyAdd = target.closest('[data-day-empty-add]');
    if (dayEmptyAdd instanceof HTMLElement && dayEmptyAdd.dataset.dayEmptyAdd) {
      openCreatePanel(dayEmptyAdd.dataset.dayEmptyAdd, '09:00');
      return;
    }

    const slot = target.closest('[data-slot-date]');
    if (slot instanceof HTMLElement && slot.dataset.slotDate && slot.dataset.slotTime) {
      openCreatePanel(slot.dataset.slotDate, slot.dataset.slotTime);
      return;
    }

    const moreBtn = target.closest('[data-calendar-form-more]');
    if (moreBtn instanceof HTMLButtonElement) {
      const panel = rootContainer?.querySelector('[data-calendar-form-more-panel]');
      if (panel instanceof HTMLElement) {
        const open = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', open);
        moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        moreBtn.textContent = open ? "− Moins d'options ▴" : "+ Plus d'options ▾";
        if (open) {
          panel.removeAttribute('aria-hidden');
          const first = panel.querySelector('[data-calendar-more-first]');
          if (first instanceof HTMLElement) {
            requestAnimationFrame(() => first.focus());
          }
        } else {
          panel.setAttribute('aria-hidden', 'true');
        }
      }
      return;
    }

    const closeBtn = target.closest('[data-panel-close]');
    if (closeBtn) {
      closeDetailPanel();
      return;
    }

    const formBackBtn = target.closest('[data-calendar-form-back]');
    if (formBackBtn) {
      closeEventForm();
      return;
    }

    const formDeleteBtn = target.closest('[data-calendar-form-delete]');
    if (formDeleteBtn instanceof HTMLButtonElement && formDeleteBtn.dataset.calendarFormDelete) {
      deleteEvent(formDeleteBtn.dataset.calendarFormDelete);
      return;
    }

    const editBtn = target.closest('[data-event-edit]');
    if (editBtn instanceof HTMLButtonElement && editBtn.dataset.eventEdit) {
      openEditPanel(editBtn.dataset.eventEdit);
      return;
    }

    const deleteBtn = target.closest('[data-event-delete]');
    if (deleteBtn instanceof HTMLButtonElement && deleteBtn.dataset.eventDelete) {
      deleteEvent(deleteBtn.dataset.eventDelete);
    }
  };

  submitHandler = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.matches('[data-calendar-form]')) return;
    event.preventDefault();
    savePanelEvent(target);
  };

  changeHandler = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches('[data-jump-month], [data-jump-year]')) return;

    const monthSelect = rootContainer?.querySelector('[data-jump-month]');
    const yearSelect = rootContainer?.querySelector('[data-jump-year]');
    if (!(monthSelect instanceof HTMLSelectElement) || !(yearSelect instanceof HTMLSelectElement)) return;
    jumpToPeriod(monthSelect.value, yearSelect.value);
  };

  rootContainer.addEventListener('click', clickHandler);
  rootContainer.addEventListener('submit', submitHandler);
  rootContainer.addEventListener('change', changeHandler);
}

function formatWidgetLine(occurrence) {
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
    .format(occurrence.startDateTime)
    .replace('.', '');
  const hour = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .format(occurrence.startDateTime)
    .replace(':', 'h');
  return `${day} · ${hour} · ${occurrence.title}`;
}

const calendarModule = {
  id: 'calendar',
  label: 'Calendrier',
  icon: '📅',

  init(container) {
    rootContainer = container;
    events = readEvents();
    requestNotificationPermissionOnce();
    render();
    bindEvents();
    scheduleNotifications();
    scheduleMidnightRefresh();
  },

  destroy() {
    if (rootContainer && clickHandler) rootContainer.removeEventListener('click', clickHandler);
    if (rootContainer && submitHandler) rootContainer.removeEventListener('submit', submitHandler);
    if (rootContainer && changeHandler) rootContainer.removeEventListener('change', changeHandler);
    clearNotificationTimers();
    if (midnightRefreshTimer != null) {
      clearTimeout(midnightRefreshTimer);
      midnightRefreshTimer = null;
    }

    clickHandler = null;
    submitHandler = null;
    changeHandler = null;
    jumpMenuOpen = false;
    detailPanel = { open: false, eventId: null };
    eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
    events = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const lines = getUpcoming(3).map(formatWidgetLine);
    return {
      title: 'Prochains rendez-vous',
      content: createCalendarWidget(lines)
    };
  }
};

export default calendarModule;
