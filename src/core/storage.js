// core/storage.js — localStorage + synchronisation PocketBase (double stockage)
//
// PocketBase : chaque collection listée doit avoir un champ JSON nommé « payload »
// (même contenu que dans localStorage). Règles API + CORS : autoriser l’origine de l’app.

const PREFIX = 'adhd-app:';
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

function getPocketBaseUrl() {
  return POCKETBASE_URL;
}

/** Clés localStorage réelles (préfixe adhd-app:) → collection PocketBase */
const LOGICAL_KEY_TO_COLLECTION = {
  'adhd-app:capture:items': 'captures',
  'adhd-app:tasks:items': 'tasks',
  'adhd-app:notes:items': 'notes',
  'adhd-app:memo:data': 'memo',
  'adhd-app:mood:entries': 'mood_entries',
  'adhd-app:habits:list': 'habits',
  'adhd-app:habits:completions': 'habit_completions',
  'adhd-app:journal:entries': 'journal_entries',
  'adhd-app:calendar:events': 'calendar_events',
  'adhd-app:pomodoro:history': 'pomodoro_history',
  'adhd-app:recipes:list': 'recipes',
  'adhd-app:shopping:stores': 'shopping',
  'adhd-app:shopping:history': 'shopping_history',
  'adhd-app:budget:config': 'budget_config',
  'adhd-app:budget:expenses': 'budget_expenses',
  'adhd-app:budget:savings': 'budget_savings',
  'adhd-app:breathing:sessions': 'breathing',
  'adhd-app:medications:list': 'medications',
  'adhd-app:medications:history': 'medications_history',
  'adhd-app:ancrage-planning-boulot': 'planning_boulot'
};

/** Collection → clé localStorage complète */
const COLLECTION_TO_LOGICAL_KEY = {
  tasks: 'adhd-app:tasks:items',
  captures: 'adhd-app:capture:items',
  notes: 'adhd-app:notes:items',
  memo: 'adhd-app:memo:data',
  mood_entries: 'adhd-app:mood:entries',
  habits: 'adhd-app:habits:list',
  habit_completions: 'adhd-app:habits:completions',
  journal_entries: 'adhd-app:journal:entries',
  calendar_events: 'adhd-app:calendar:events',
  pomodoro_history: 'adhd-app:pomodoro:history',
  recipes: 'adhd-app:recipes:list',
  shopping: 'adhd-app:shopping:stores',
  shopping_history: 'adhd-app:shopping:history',
  budget_config: 'adhd-app:budget:config',
  budget_expenses: 'adhd-app:budget:expenses',
  budget_savings: 'adhd-app:budget:savings',
  breathing: 'adhd-app:breathing:sessions',
  medications: 'adhd-app:medications:list',
  medications_history: 'adhd-app:medications:history',
  planning_boulot: 'adhd-app:ancrage-planning-boulot'
};

const META_KEY = `${PREFIX}__storage_sync_meta__`;
const MIGRATION_KEY = `${PREFIX}__pb_migration_v1_done__`;
const RECORD_IDS_KEY = `${PREFIX}__pb_record_ids__`;
const LAST_AUTO_BACKUP_KEY = `${PREFIX}last-auto-backup`;
const BACKUP_KEY_PREFIX = `${PREFIX}backup:`;

const PAYLOAD_FIELD = 'payload';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let pocketBaseReachable = false;
const pendingRemoteSaves = new Set();
let syncListenersBound = false;
let migrationRanThisSession = false;

function normalizeLogicalKey(key) {
  if (typeof key !== 'string') return key;
  return key.startsWith('adhd-app:') ? key.slice(9) : key;
}

function toFullLocalStorageKey(key) {
  if (typeof key !== 'string') return key;
  return key.startsWith(PREFIX) ? key : PREFIX + normalizeLogicalKey(key);
}

function getCollectionForKey(key) {
  const fullKey = toFullLocalStorageKey(key);
  return LOGICAL_KEY_TO_COLLECTION[fullKey] ?? null;
}

function fullStorageKey(logicalKey) {
  return PREFIX + normalizeLogicalKey(logicalKey);
}

function emitSyncState() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('adhd-storage-sync', { detail: getSyncIndicatorState() })
    );
  }
}

function getMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setMetaAt(logicalKey, atMs) {
  try {
    const m = getMeta();
    m[toFullLocalStorageKey(logicalKey)] = { at: atMs };
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function getRecordIds() {
  try {
    const raw = localStorage.getItem(RECORD_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setRecordId(collection, id) {
  try {
    const m = getRecordIds();
    m[collection] = id;
    localStorage.setItem(RECORD_IDS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function clearRecordId(collection) {
  try {
    const m = getRecordIds();
    delete m[collection];
    localStorage.setItem(RECORD_IDS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function pbTimeToMs(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

async function pbFetch(path, options = {}) {
  const url = `${getPocketBaseUrl()}/api${path}`;
  const init = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  try {
    return await fetch(url, init);
  } catch {
    return null;
  }
}

async function probePocketBase() {
  const res = await pbFetch('/health', { method: 'GET' });
  pocketBaseReachable = Boolean(res && res.ok);
  emitSyncState();
  return pocketBaseReachable;
}

/**
 * Retourne true si PocketBase était joignable au dernier test (synchrone).
 */
function isOnline() {
  return pocketBaseReachable;
}

async function fetchLatestRecord(collection) {
  const res = await pbFetch(
    `/collections/${encodeURIComponent(collection)}/records?page=1&perPage=1&sort=-updated`,
    { method: 'GET' }
  );
  if (!res || !res.ok) return null;
  try {
    const body = await res.json();
    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[0];
  } catch {
    return null;
  }
}

async function fetchRecordById(collection, recordId) {
  const res = await pbFetch(
    `/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(recordId)}`,
    { method: 'GET' }
  );
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function runDailyAutoBackupIfNeeded() {
  try {
    const today = todayDateString();
    const lastBackup = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    if (lastBackup === today) return;

    const snapshot = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      if (key.startsWith(BACKUP_KEY_PREFIX)) continue;
      snapshot[key] = localStorage.getItem(key);
    }

    localStorage.setItem(`${BACKUP_KEY_PREFIX}${today}`, JSON.stringify(snapshot));
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, today);

    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) backupKeys.push(key);
    }
    backupKeys.sort();
    while (backupKeys.length > 7) {
      localStorage.removeItem(backupKeys.shift());
    }
  } catch (e) {
    console.error('[storage] Backup automatique impossible', e);
  }
}

async function resolvePushPayload(collection, recordId, localData) {
  const record = await fetchRecordById(collection, recordId);
  if (!record) return localData;

  const remotePayload = decodePayloadFromRecord(record);
  if (
    Array.isArray(remotePayload) &&
    Array.isArray(localData) &&
    remotePayload.length > localData.length * 1.5
  ) {
    return mergeArrayById(remotePayload, localData);
  }
  return localData;
}

async function countRecords(collection) {
  const res = await pbFetch(
    `/collections/${encodeURIComponent(collection)}/records?page=1&perPage=1`,
    { method: 'GET' }
  );
  if (!res || !res.ok) return -1;
  try {
    const body = await res.json();
    return typeof body.totalItems === 'number' ? body.totalItems : 0;
  } catch {
    return -1;
  }
}

function readLocalRaw(logicalKey) {
  return localStorage.getItem(fullStorageKey(logicalKey));
}

/** Valeur du champ JSON PocketBase (objet déjà parsé ou chaîne JSON). */
function decodePayloadFromRecord(record) {
  if (!record || !Object.prototype.hasOwnProperty.call(record, PAYLOAD_FIELD)) {
    return undefined;
  }
  const p = record[PAYLOAD_FIELD];
  if (typeof p === 'string') {
    try {
      return JSON.parse(p);
    } catch {
      return p;
    }
  }
  return p;
}

/** Données exploitables pour sync / migration : tableau ou objet non vide. */
function isNonEmptySyncPayload(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

function mergeArrayById(remote, local) {
  if (!remote.length && !local.length) return [];

  const getKey = (item) => {
    if (item?.id !== undefined) return item.id;
    if (item?.date !== undefined && item?.habitId !== undefined) {
      return `${item.date}::${item.habitId}`;
    }
    if (item?.date !== undefined) return item.date;
    return item?.timestamp;
  };

  const map = new Map();

  for (const item of remote) {
    const key = getKey(item);
    if (key !== undefined) map.set(key, item);
  }

  for (const item of local) {
    const key = getKey(item);
    if (key === undefined) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const localTime = item.updatedAt || item.timestamp || item.createdAt || 0;
      const remoteTime = existing.updatedAt || existing.timestamp || existing.createdAt || 0;
      if (localTime > remoteTime) {
        map.set(key, item);
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    const ta = a.timestamp || a.createdAt || (a.date ? new Date(a.date).getTime() : 0);
    const tb = b.timestamp || b.createdAt || (b.date ? new Date(b.date).getTime() : 0);
    return tb - ta;
  });
}

function mergeTasksData(remote, local) {
  if (!local || !Array.isArray(local)) return remote;
  if (!remote || !Array.isArray(remote)) return local;

  return remote.map((remoteTask) => {
    const localTask = local.find((t) => t && t.id === remoteTask?.id);
    if (
      localTask &&
      (!remoteTask.subtasks || remoteTask.subtasks.length === 0) &&
      localTask.subtasks &&
      localTask.subtasks.length > 0
    ) {
      return { ...remoteTask, subtasks: localTask.subtasks };
    }
    return remoteTask;
  });
}

async function deleteNullPayloadRecordsInCollection(collection) {
  const perPage = 80;
  let page = 1;
  const cachedId = getRecordIds()[collection];

  while (true) {
    const res = await pbFetch(
      `/collections/${encodeURIComponent(collection)}/records?page=${page}&perPage=${perPage}`,
      { method: 'GET' }
    );
    if (!res || !res.ok) return;

    let body;
    try {
      body = await res.json();
    } catch {
      return;
    }

    const items = Array.isArray(body.items) ? body.items : [];

    for (const rec of items) {
      if (rec[PAYLOAD_FIELD] != null) continue;
      const id = rec.id;
      if (!id) continue;

      const del = await pbFetch(
        `/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (del && (del.ok || del.status === 404) && id === cachedId) {
        clearRecordId(collection);
      }
    }

    if (items.length < perPage) break;
    page += 1;
  }
}

async function deleteAllNullPayloadRecords() {
  for (const collection of Object.keys(COLLECTION_TO_LOGICAL_KEY)) {
    try {
      await deleteNullPayloadRecordsInCollection(collection);
    } catch {
      /* ignore */
    }
  }
}

async function runMigrationOnce() {
  const online = await probePocketBase();
  if (!online) return;

  await deleteAllNullPayloadRecords();

  for (const collection of Object.keys(COLLECTION_TO_LOGICAL_KEY)) {
    const n = await countRecords(collection);
    if (n !== 0) continue;

    const logicalKey = COLLECTION_TO_LOGICAL_KEY[collection];
    const raw = readLocalRaw(logicalKey);
    if (raw === null || String(raw).trim() === '') continue;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!isNonEmptySyncPayload(payload)) continue;

    const res = await pbFetch(`/collections/${encodeURIComponent(collection)}/records`, {
      method: 'POST',
      body: JSON.stringify({ [PAYLOAD_FIELD]: payload })
    });

    if (res && res.ok) {
      try {
        const created = await res.json();
        if (created && created.id) setRecordId(collection, created.id);
        const remoteMs = pbTimeToMs(created.updated);
        setMetaAt(logicalKey, remoteMs || Date.now());
      } catch {
        setMetaAt(logicalKey, Date.now());
      }
    }
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}

async function pullCollectionIntoLocal(collection) {
  const record = await fetchLatestRecord(collection);
  const storageKey = COLLECTION_TO_LOGICAL_KEY[collection];
  if (!storageKey || !record) return;

  if (!Object.prototype.hasOwnProperty.call(record, PAYLOAD_FIELD)) return;

  const payload = decodePayloadFromRecord(record);
  if (!isNonEmptySyncPayload(payload)) return;

  let nextPayload = payload;
  let localPayload = null;
  try {
    const rawLocal = localStorage.getItem(storageKey);
    localPayload = rawLocal ? JSON.parse(rawLocal) : null;
  } catch {
    localPayload = null;
  }

  if (Array.isArray(payload) && Array.isArray(localPayload)) {
    nextPayload = mergeArrayById(payload, localPayload);
    if (collection === 'tasks') {
      nextPayload = mergeTasksData(nextPayload, localPayload);
    }
  }

  const serialized = JSON.stringify(nextPayload);

  try {
    localStorage.setItem(storageKey, serialized);
    const remoteMs = pbTimeToMs(record.updated);
    setMetaAt(storageKey, remoteMs);
    if (record.id) setRecordId(collection, record.id);
  } catch (e) {
    console.error('[PocketBase sync] Écriture impossible', storageKey, e);
  }
}

/**
 * Charge les enregistrements PocketBase vers localStorage (données distantes plus récentes).
 */
async function syncFromPocketBase() {
  if (!migrationRanThisSession) {
    try {
      localStorage.removeItem(MIGRATION_KEY);
    } catch {
      /* ignore */
    }
    migrationRanThisSession = true;
  }

  await runMigrationOnce();

  const online = await probePocketBase();
  if (online) {
    for (const collection of Object.keys(COLLECTION_TO_LOGICAL_KEY)) {
      try {
        await pullCollectionIntoLocal(collection);
      } catch {
        /* une collection manquante ne doit pas faire échouer le reste */
      }
    }

    if (pocketBaseReachable && pendingRemoteSaves.size > 0) {
      void flushPendingRemoteSaves();
    }
  }

  emitSyncState();

  const scheduleBackup = () => runDailyAutoBackupIfNeeded();
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(scheduleBackup);
    } else {
      setTimeout(scheduleBackup, 3000);
    }
  }
}

async function pushToPocketBase(logicalKey, data) {
  const collection = getCollectionForKey(logicalKey);
  if (!collection) return;

  const normKey = toFullLocalStorageKey(logicalKey);
  pendingRemoteSaves.add(normKey);
  emitSyncState();

  const online = await probePocketBase();
  if (!online) {
    emitSyncState();
    return;
  }

  let recordId = getRecordIds()[collection];
  let res = null;
  let payloadToSend = data;

  const patch = (id, payload) =>
    pbFetch(`/collections/${encodeURIComponent(collection)}/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [PAYLOAD_FIELD]: payload })
    });

  const post = (payload) =>
    pbFetch(`/collections/${encodeURIComponent(collection)}/records`, {
      method: 'POST',
      body: JSON.stringify({ [PAYLOAD_FIELD]: payload })
    });

  if (recordId) {
    payloadToSend = await resolvePushPayload(collection, recordId, data);
    res = await patch(recordId, payloadToSend);
    if (res && res.status === 404) {
      clearRecordId(collection);
      recordId = null;
      payloadToSend = data;
    }
  }

  if (!res || !res.ok) {
    const latest = await fetchLatestRecord(collection);
    if (latest && latest.id) {
      recordId = latest.id;
      setRecordId(collection, recordId);
      payloadToSend = await resolvePushPayload(collection, recordId, data);
      res = await patch(recordId, payloadToSend);
    }
  }

  if (!res || !res.ok) {
    res = await post(payloadToSend);
  }

  try {
    if (res && res.ok) {
      const body = await res.json();
      if (body && body.id) setRecordId(collection, body.id);
      const remoteMs = pbTimeToMs(body.updated);
      setMetaAt(normKey, remoteMs || Date.now());
      pendingRemoteSaves.delete(normKey);
    }
  } catch {
    /* ignore */
  }

  emitSyncState();
}

async function flushPendingRemoteSaves() {
  if (!pocketBaseReachable) return;
  const keys = [...pendingRemoteSaves];
  for (const normKey of keys) {
    const collection = getCollectionForKey(normKey);
    if (!collection) {
      pendingRemoteSaves.delete(normKey);
      continue;
    }
    const raw = readLocalRaw(normKey);
    if (raw === null) continue;
    try {
      const data = JSON.parse(raw);
      await pushToPocketBase(normKey, data);
    } catch {
      /* ignore */
    }
  }
}

function bindConnectivityFlush() {
  if (syncListenersBound || typeof window === 'undefined') return;
  syncListenersBound = true;
  window.addEventListener('online', () => {
    void (async () => {
      await probePocketBase();
      if (pocketBaseReachable) await flushPendingRemoteSaves();
      emitSyncState();
    })();
  });
}

bindConnectivityFlush();

function save(key, data) {
  const logicalKey = normalizeLogicalKey(key);
  const storageKey = fullStorageKey(logicalKey);
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    setMetaAt(logicalKey, Date.now());
  } catch (e) {
    console.error('Erreur de sauvegarde:', e);
    return false;
  }

  const collection = getCollectionForKey(logicalKey);
  if (collection) {
    void pushToPocketBase(logicalKey, data);
  }

  return true;
}

function load(key, fallback = null) {
  try {
    const logicalKey = normalizeLogicalKey(key);
    const item = localStorage.getItem(fullStorageKey(logicalKey));
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function remove(key) {
  const logicalKey = normalizeLogicalKey(key);
  localStorage.removeItem(fullStorageKey(logicalKey));

  const collection = getCollectionForKey(logicalKey);
  if (collection) {
    const metaFullKey = toFullLocalStorageKey(logicalKey);
    try {
      const m = getMeta();
      delete m[metaFullKey];
      delete m[logicalKey];
      localStorage.setItem(META_KEY, JSON.stringify(m));
    } catch {
      /* ignore */
    }

    const recordId = getRecordIds()[collection];
    if (recordId) {
      void (async () => {
        const online = await probePocketBase();
        if (!online) return;
        const res = await pbFetch(
          `/collections/${encodeURIComponent(collection)}/records/${recordId}`,
          { method: 'DELETE' }
        );
        if (res && (res.ok || res.status === 404)) clearRecordId(collection);
        emitSyncState();
      })();
    }
    pendingRemoteSaves.delete(metaFullKey);
    emitSyncState();
  }
}

function getSyncIndicatorState() {
  if (!pocketBaseReachable) {
    return {
      mode: 'offline',
      emoji: '🔴',
      label: 'Hors ligne — données en local uniquement'
    };
  }
  if (pendingRemoteSaves.size > 0) {
    return {
      mode: 'pending',
      emoji: '🟡',
      label: 'Synchronisation en attente avec PocketBase'
    };
  }
  return {
    mode: 'synced',
    emoji: '🟢',
    label: 'Synchronisé avec PocketBase'
  };
}

export {
  save,
  load,
  remove,
  generateUUID,
  syncFromPocketBase,
  isOnline,
  getSyncIndicatorState,
  mergeArrayById,
  runDailyAutoBackupIfNeeded,
  resolvePushPayload
};
