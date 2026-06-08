import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import { createMainView, createConfigView, MOMENT_ORDER } from './view.js';

const LIST_KEY = 'medications:list';
const TAKEN_KEY = 'medications:taken';
const HISTORY_KEY = 'medications:history';

const MOMENT_LABEL_FR = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir'
};

const DEFAULT_REMINDERS = {
  morning: '08:00',
  noon: '13:00',
  evening: '21:00'
};

let rootContainer = null;
let meds = [];
let takenByDate = {};
let historyEntries = [];
let screen = 'main';
let notificationTimers = [];
let onClick = null;
let onChange = null;
let onInput = null;
let inputDebounceTimer = null;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function normalizeMoments(arr) {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const m of arr) {
    if (MOMENT_ORDER.includes(m)) set.add(m);
  }
  return MOMENT_ORDER.filter((m) => set.has(m));
}

function normalizeReminders(raw, moments) {
  const out = { ...DEFAULT_REMINDERS };
  if (raw && typeof raw === 'object') {
    for (const k of MOMENT_ORDER) {
      if (typeof raw[k] === 'string' && /^\d{1,2}:\d{2}$/.test(raw[k])) {
        const [h, mi] = raw[k].split(':');
        out[k] = `${String(Number(h)).padStart(2, '0')}:${mi.padStart(2, '0')}`;
      }
    }
  }
  for (const m of MOMENT_ORDER) {
    if (!moments.includes(m)) delete out[m];
  }
  for (const m of moments) {
    if (!out[m]) out[m] = DEFAULT_REMINDERS[m];
  }
  return out;
}

function normalizeMed(raw) {
  if (!raw || typeof raw.id !== 'string') return null;
  const nameRaw = typeof raw.name === 'string' ? raw.name.trim() : '';
  const name = nameRaw || 'Sans nom';
  const dosage = typeof raw.dosage === 'string' ? raw.dosage.trim() : '';
  const moments = normalizeMoments(raw.moments);
  const reminders = normalizeReminders(raw.reminders, moments);
  return {
    id: raw.id,
    name,
    dosage,
    moments,
    reminders,
    active: raw.active !== false,
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function readList() {
  const data = load(LIST_KEY, []);
  const list = Array.isArray(data) ? data.map(normalizeMed).filter(Boolean) : [];
  return list;
}

function persistList() {
  save(LIST_KEY, meds);
}

function readTaken() {
  const data = load(TAKEN_KEY, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? { ...data } : {};
}

function persistTaken() {
  save(TAKEN_KEY, takenByDate);
}

function readHistory() {
  const data = load(HISTORY_KEY, []);
  return Array.isArray(data) ? data : [];
}

function persistHistory() {
  save(HISTORY_KEY, historyEntries.slice(-2000));
}

function appendHistoryEntry(entry) {
  historyEntries.push(entry);
  persistHistory();
}

function slotKey(medId, moment) {
  return `${medId}:${moment}`;
}

function parseSlotKey(slotKeyStr) {
  for (let i = MOMENT_ORDER.length - 1; i >= 0; i -= 1) {
    const moment = MOMENT_ORDER[i];
    const suf = `:${moment}`;
    if (slotKeyStr.endsWith(suf)) {
      return { medId: slotKeyStr.slice(0, -suf.length), moment };
    }
  }
  return null;
}

function isSlotTakenFromStore(dateKey, medId, moment) {
  const store = readTaken();
  const day = store[dateKey];
  if (!day || typeof day !== 'object') return false;
  return Boolean(day[slotKey(medId, moment)]);
}

function isSlotTaken(dateKey, medId, moment) {
  const day = takenByDate[dateKey];
  if (!day || typeof day !== 'object') return false;
  return Boolean(day[slotKey(medId, moment)]);
}

function setSlotTaken(dateKey, medId, moment, checked) {
  if (!takenByDate[dateKey]) takenByDate[dateKey] = {};
  const key = slotKey(medId, moment);
  if (checked) {
    takenByDate[dateKey][key] = true;
  } else {
    delete takenByDate[dateKey][key];
    if (Object.keys(takenByDate[dateKey]).length === 0) {
      delete takenByDate[dateKey];
    }
  }
  persistTaken();
}

function getTodayRows() {
  const todayKey = toDateKey(new Date());
  const rows = [];
  for (const med of meds) {
    if (med.active === false) continue;
    for (const moment of med.moments) {
      rows.push({
        med,
        moment,
        momentLabel: MOMENT_LABEL_FR[moment] || moment,
        slotKey: slotKey(med.id, moment),
        checked: isSlotTaken(todayKey, med.id, moment)
      });
    }
  }
  return rows;
}

function getFooterMessage(total, done) {
  if (total === 0) return "Quand tu seras prêt, configure un rappel doux.";
  if (done === 0) return "N'oublie pas ton traitement 🌿";
  if (done === total) return "C'est fait pour aujourd'hui ✨";
  return 'Continue, tu y es presque 💪';
}

function buildMainModel() {
  const today = new Date();
  const rows = getTodayRows();
  const total = rows.length;
  const done = rows.filter((r) => r.checked).length;
  return {
    formattedDate: formatDisplayDate(today),
    rows,
    footerMessage: getFooterMessage(total, done),
    hasMeds: meds.some((m) => m.active !== false && m.moments.length > 0)
  };
}

function clearNotificationTimers() {
  notificationTimers.forEach((id) => clearTimeout(id));
  notificationTimers = [];
}

function parseHm(hm) {
  if (typeof hm !== 'string' || !/^\d{1,2}:\d{2}$/.test(hm)) return null;
  const [a, b] = hm.split(':');
  const h = Number(a);
  const m = Number(b);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function momentLabelForNotif(moment) {
  return MOMENT_LABEL_FR[moment] || moment;
}

function scheduleMedicationNotifications() {
  clearNotificationTimers();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const nowMs = Date.now();
  const list = readList().filter((m) => m.active !== false);

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    const dateKey = toDateKey(day);

    for (const med of list) {
      for (const moment of med.moments) {
        const hm = med.reminders?.[moment];
        const parsed = parseHm(hm || '');
        if (!parsed) continue;

        const at = new Date(day);
        at.setHours(parsed.h, parsed.m, 0, 0);
        const delay = at.getTime() - nowMs;
        if (delay <= 0) continue;

        const medId = med.id;
        const medName = med.name;
        const momentKey = moment;
        const fireDateKey = dateKey;

        const timerId = setTimeout(() => {
          if (isSlotTakenFromStore(fireDateKey, medId, momentKey)) return;
          try {
            new Notification(`💊 ${medName}`, {
              body: `N'oublie pas ton traitement de ${momentLabelForNotif(momentKey)}`
            });
          } catch {
            /* ignore */
          }
        }, delay);

        notificationTimers.push(timerId);
      }
    }
  }
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML =
    screen === 'config' ? createConfigView(meds.filter((m) => m.active !== false)) : createMainView(buildMainModel());
}

function toggleSlot(slotKeyStr, checked) {
  const parsed = parseSlotKey(slotKeyStr);
  if (!parsed) return;
  const { medId, moment } = parsed;
  const med = meds.find((m) => m.id === medId);
  if (!med) return;

  const todayKey = toDateKey(new Date());
  setSlotTaken(todayKey, medId, moment, checked);

  if (checked) {
    appendHistoryEntry({
      date: todayKey,
      medicationId: medId,
      name: med.name,
      taken: true,
      moment,
      takenAt: Date.now()
    });
  }

  scheduleMedicationNotifications();
  render();
}

function syncConfigFromDom() {
  if (!rootContainer || screen !== 'config') return;
  const rows = rootContainer.querySelectorAll('[data-med-config-row]');
  for (const li of rows) {
    if (!(li instanceof HTMLElement)) continue;
    const id = li.dataset.medConfigRow;
    if (!id) continue;
    const med = meds.find((m) => m.id === id);
    if (!med) continue;

    const nameIn = li.querySelector('input[data-med-field="name"]');
    const doseIn = li.querySelector('input[data-med-field="dosage"]');
    if (nameIn instanceof HTMLInputElement) {
      med.name = nameIn.value.trim() || med.name;
    }
    if (doseIn instanceof HTMLInputElement) {
      med.dosage = doseIn.value.trim();
    }

    const moments = [];
    for (const m of MOMENT_ORDER) {
      const cb = li.querySelector(`[data-med-config-moment="${m}"]`);
      if (cb instanceof HTMLInputElement && cb.checked) moments.push(m);
    }
    med.moments = moments;
    med.reminders = normalizeReminders(med.reminders, moments);

    for (const m of moments) {
      const timeIn = li.querySelector(`input[data-med-reminder][data-moment="${m}"]`);
      if (timeIn instanceof HTMLInputElement && timeIn.value) {
        med.reminders[m] = timeIn.value;
      }
    }
  }

  meds = meds.map(normalizeMed).filter(Boolean);
  persistList();
  scheduleMedicationNotifications();
}

function deleteMed(medId) {
  const index = meds.findIndex((m) => m.id === medId);
  if (index === -1) return;
  const removed = meds[index];
  const snapshot = JSON.stringify(removed);
  meds = meds.filter((m) => m.id !== medId);

  for (const dk of Object.keys(takenByDate)) {
    const day = takenByDate[dk];
    if (!day || typeof day !== 'object') continue;
    for (const m of MOMENT_ORDER) {
      delete day[slotKey(medId, m)];
    }
    if (Object.keys(day).length === 0) delete takenByDate[dk];
  }
  persistTaken();
  persistList();
  scheduleMedicationNotifications();
  render();

  if (typeof window.showUndoToast === 'function') {
    window.showUndoToast('Médicament supprimé.', () => {
      try {
        const prev = JSON.parse(snapshot);
        const n = normalizeMed(prev);
        if (n) {
          meds.splice(index, 0, n);
          persistList();
          scheduleMedicationNotifications();
          render();
        }
      } catch {
        /* ignore */
      }
    });
  }
}

function addMed() {
  syncConfigFromDom();
  const id = generateUUID();
  meds.push(
    normalizeMed({
      id,
      name: 'Nouveau',
      dosage: '',
      moments: ['morning'],
      reminders: { morning: DEFAULT_REMINDERS.morning },
      active: true,
      createdAt: Date.now()
    })
  );
  persistList();
  scheduleMedicationNotifications();
  render();
}

function goMain() {
  syncConfigFromDom();
  screen = 'main';
  render();
}

function goConfig() {
  screen = 'config';
  render();
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-med-open-config]')) {
      goConfig();
      return;
    }
    if (target.closest('[data-med-config-back]')) {
      goMain();
      return;
    }
    if (target.closest('[data-med-add]')) {
      addMed();
      return;
    }

    const delBtn = target.closest('[data-med-delete]');
    if (delBtn instanceof HTMLElement && delBtn.dataset.medDelete) {
      deleteMed(delBtn.dataset.medDelete);
    }
  };

  onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-med-toggle]') && target instanceof HTMLInputElement) {
      const sk = target.dataset.medToggle;
      if (sk) toggleSlot(sk, target.checked);
      return;
    }

    if (screen !== 'config') return;
    if (
      target.matches('[data-med-config-moment]') ||
      target.matches('input[data-med-reminder]')
    ) {
      syncConfigFromDom();
      render();
    }
  };

  onInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (screen !== 'config') return;
    if (target.matches('[data-med-field]')) {
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = window.setTimeout(() => {
        inputDebounceTimer = null;
        syncConfigFromDom();
      }, 400);
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('input', onInput);
}

const medicationsModule = {
  id: 'medications',
  label: 'Médocs',
  icon: '💊',

  init(container) {
    rootContainer = container;
    meds = readList();
    takenByDate = readTaken();
    historyEntries = readHistory();
    screen = 'main';
    render();
    bindEvents();
    scheduleMedicationNotifications();
  },

  destroy() {
    clearNotificationTimers();
    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer);
      inputDebounceTimer = null;
    }
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onChange) rootContainer.removeEventListener('change', onChange);
    if (rootContainer && onInput) rootContainer.removeEventListener('input', onInput);

    onClick = null;
    onChange = null;
    onInput = null;
    screen = 'main';
    meds = [];
    takenByDate = {};
    historyEntries = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const list = readList().filter((m) => m.active !== false && m.moments.length > 0);
    if (!list.length) return null;

    const todayKey = toDateKey(new Date());
    const dayTaken = readTaken()[todayKey] || {};

    const momentsInUse = MOMENT_ORDER.filter((mo) => list.some((m) => m.moments.includes(mo)));
    if (!momentsInUse.length) return null;

    let allDone = true;
    const parts = [];
    for (const mo of momentsInUse) {
      const medsFor = list.filter((m) => m.moments.includes(mo));
      const done = medsFor.every((m) => Boolean(dayTaken[slotKey(m.id, mo)]));
      if (!done) allDone = false;
      parts.push(`${MOMENT_LABEL_FR[mo]} ${done ? '✓' : '○'}`);
    }

    const content = allDone ? "💊 Tout pris aujourd'hui ✨" : `💊 ${parts.join(' · ')}`;

    return {
      title: 'Médicaments',
      content: `<p class="dashboard__meds-preview">${content}</p>`
    };
  }
};

export default medicationsModule;
