import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import {
  load,
  mergeArrayById,
  remove,
  resolvePushPayload,
  runDailyAutoBackupIfNeeded,
  save,
  syncFromPocketBase
} from './storage.js';

const PREFIX = 'adhd-app:';

function clearAdhdStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

function makeQuotaExceededError() {
  const error = new Error('Quota exceeded');
  error.name = 'QuotaExceededError';
  return error;
}

function getNativeLocalStorageSetItem() {
  return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(localStorage), 'setItem').value;
}

describe('storage.js', () => {
  beforeEach(() => {
    clearAdhdStorage();
    vi.restoreAllMocks();
  });

  it('save() + load() — aller-retour JSON', () => {
    const payload = { id: 'a1', text: 'Tâche test', done: false };
    expect(save('tasks:items', payload)).toBe(true);
    expect(load('tasks:items')).toEqual(payload);
  });

  it('save() réussit — retourne true et met à jour la méta', () => {
    const atBefore = Date.now();
    expect(save('memo:data', { sections: [] })).toBe(true);
    const meta = JSON.parse(localStorage.getItem(`${PREFIX}__storage_sync_meta__`));
    expect(meta[`${PREFIX}memo:data`]?.at).toBeGreaterThanOrEqual(atBefore);
  });

  describe('save() — gestion du quota', () => {
    let setItemSpy;

    afterEach(() => {
      setItemSpy?.mockRestore();
      setItemSpy = undefined;
    });

    it('quota plein — purge des backups, retry, ancrage:save-failed si échec final', () => {
      localStorage.setItem(`${PREFIX}backup:2026-05-01`, '{}');
      localStorage.setItem(`${PREFIX}backup:2026-05-02`, '{}');

      const targetKey = `${PREFIX}tasks:items`;
      const nativeSetItem = getNativeLocalStorageSetItem();
      setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === targetKey) {
          throw makeQuotaExceededError();
        }
        return nativeSetItem.call(localStorage, key, value);
      });

      const events = [];
      const onFailed = (event) => events.push(event.detail);
      document.addEventListener('ancrage:save-failed', onFailed);

      expect(save('tasks:items', { id: 'blocked' })).toBe(false);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ key: 'tasks:items', reason: 'QuotaExceededError' });
      expect(getBackupKeys()).toHaveLength(0);

      document.removeEventListener('ancrage:save-failed', onFailed);
    });

    it('quota plein — purge du backup le plus ancien puis réussit', () => {
      localStorage.setItem(`${PREFIX}backup:2026-05-01`, '{}');
      localStorage.setItem(`${PREFIX}backup:2026-05-02`, '{}');

      const targetKey = `${PREFIX}tasks:items`;
      let remainingFailures = 1;
      const nativeSetItem = getNativeLocalStorageSetItem();
      setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === targetKey && remainingFailures > 0) {
          remainingFailures -= 1;
          throw makeQuotaExceededError();
        }
        return nativeSetItem.call(localStorage, key, value);
      });

      expect(save('tasks:items', { id: 'recovered' })).toBe(true);
      expect(localStorage.getItem(`${PREFIX}backup:2026-05-01`)).toBeNull();
      expect(localStorage.getItem(targetKey)).toBe(JSON.stringify({ id: 'recovered' }));
    });
  });

  it('normalizeLogicalKey() — préfixe adhd-app: unifié', () => {
    save('tasks:items', [{ id: '1' }]);
    expect(localStorage.getItem(`${PREFIX}tasks:items`)).toBe(JSON.stringify([{ id: '1' }]));

    save(`${PREFIX}tasks:items`, [{ id: '2' }]);
    expect(load('tasks:items')).toEqual([{ id: '2' }]);
    expect(load(`${PREFIX}tasks:items`)).toEqual([{ id: '2' }]);
  });

  it('migration v1 — données legacy poussées vers PocketBase si collection vide', async () => {
    const posts = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        const path = String(url);

        if (path.endsWith('/health')) {
          return { ok: true };
        }

        if (options.method === 'POST' && path.includes('/records')) {
          posts.push(JSON.parse(options.body));
          return {
            ok: true,
            json: async () => ({
              id: 'rec-test-1',
              updated: '2026-06-03T12:00:00.000Z'
            })
          };
        }

        if (options.method === 'GET' && path.includes('/records')) {
          if (path.includes('perPage=1') && !path.includes('sort=-updated')) {
            return { ok: true, json: async () => ({ totalItems: 0 }) };
          }
          return { ok: true, json: async () => ({ items: [] }) };
        }

        return { ok: true, json: async () => ({}) };
      })
    );

    localStorage.setItem(
      `${PREFIX}tasks:items`,
      JSON.stringify([{ id: 't1', text: 'legacy', subtasks: [] }])
    );

    await syncFromPocketBase();

    expect(localStorage.getItem(`${PREFIX}__pb_migration_v1_done__`)).toBe('1');
    expect(posts.some((body) => Array.isArray(body.payload) && body.payload[0]?.id === 't1')).toBe(
      true
    );
  });

  it('remove() — clé effacée du localStorage', () => {
    save('capture:items', [{ id: 'c1', text: 'note' }]);
    expect(localStorage.getItem(`${PREFIX}capture:items`)).not.toBeNull();

    remove('capture:items');
    expect(localStorage.getItem(`${PREFIX}capture:items`)).toBeNull();
    expect(load('capture:items', null)).toBeNull();
  });

  it('load() avec fallback — retourne le fallback si clé absente', () => {
    expect(load('memo:data', { sections: [] })).toEqual({ sections: [] });
    expect(load('habits:list', [])).toEqual([]);
    expect(load('missing:key', 'defaut')).toBe('defaut');
  });
});

function todayLocalDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getBackupKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${PREFIX}backup:`)) keys.push(key);
  }
  return keys;
}

describe('mergeArrayById', () => {
  test('fusionne par id — local prime si plus récent', () => {
    const remote = [{ id: '1', text: 'remote', updatedAt: 1000 }];
    const local = [{ id: '1', text: 'local', updatedAt: 2000 }];
    const result = mergeArrayById(remote, local);
    expect(result[0].text).toBe('local');
  });

  test('fusionne par id — remote prime si plus récent', () => {
    const remote = [{ id: '1', text: 'remote', updatedAt: 3000 }];
    const local = [{ id: '1', text: 'local', updatedAt: 1000 }];
    const result = mergeArrayById(remote, local);
    expect(result[0].text).toBe('remote');
  });

  test('conserve les entrées locales absentes du remote', () => {
    const remote = [{ id: '1', text: 'A' }];
    const local = [
      { id: '1', text: 'A' },
      { id: '2', text: 'B' }
    ];
    const result = mergeArrayById(remote, local);
    expect(result.length).toBe(2);
  });

  test('fusionne par date si pas de id — cas Humeur', () => {
    const remote = [{ date: '2026-06-01', mood: 3, energy: 3, timestamp: 1000 }];
    const local = [
      { date: '2026-06-01', mood: 4, energy: 4, timestamp: 2000 },
      { date: '2026-06-02', mood: 5, energy: 5, timestamp: 3000 }
    ];
    const result = mergeArrayById(remote, local);
    expect(result.length).toBe(2);
    const june1 = result.find((e) => e.date === '2026-06-01');
    expect(june1.mood).toBe(4);
  });

  test('fusionne par clé composite date+habitId — cas Habitudes', () => {
    const remote = [
      {
        date: '2026-06-08',
        habitId: 'habit-1',
        timestamp: 1000
      }
    ];
    const local = [
      {
        date: '2026-06-08',
        habitId: 'habit-1',
        timestamp: 2000
      },
      {
        date: '2026-06-08',
        habitId: 'habit-2',
        timestamp: 1500
      }
    ];
    const result = mergeArrayById(remote, local);
    expect(result.length).toBe(2);
    const h1 = result.find((e) => e.habitId === 'habit-1');
    expect(h1.timestamp).toBe(2000);
    const h2 = result.find((e) => e.habitId === 'habit-2');
    expect(h2).toBeDefined();
  });

  test('ne duplique pas les entrées identiques', () => {
    const entry = { id: '1', text: 'test', updatedAt: 1000 };
    const result = mergeArrayById([entry], [entry]);
    expect(result.length).toBe(1);
  });
});

describe('runDailyAutoBackupIfNeeded', () => {
  beforeEach(() => {
    clearAdhdStorage();
    vi.restoreAllMocks();
  });

  test("crée un backup si aucun backup aujourd'hui", () => {
    localStorage.setItem(`${PREFIX}test:data`, JSON.stringify({ value: 42 }));
    runDailyAutoBackupIfNeeded();
    const today = todayLocalDateString();
    const backupKey = `${PREFIX}backup:${today}`;
    const backup = localStorage.getItem(backupKey);
    expect(backup).not.toBeNull();
  });

  test("ne crée pas de backup si déjà fait aujourd'hui", () => {
    const today = todayLocalDateString();
    localStorage.setItem(`${PREFIX}last-auto-backup`, today);
    runDailyAutoBackupIfNeeded();
    const backupKey = `${PREFIX}backup:${today}`;
    expect(localStorage.getItem(backupKey)).toBeNull();
  });

  test('garde seulement les 3 derniers backups', () => {
    for (let i = 1; i <= 5; i += 1) {
      const date = `2026-05-${String(i).padStart(2, '0')}`;
      localStorage.setItem(`${PREFIX}backup:${date}`, JSON.stringify({ old: true }));
    }
    localStorage.setItem(`${PREFIX}last-auto-backup`, '2026-01-01');
    runDailyAutoBackupIfNeeded();
    expect(getBackupKeys().length).toBeLessThanOrEqual(3);
  });
});

describe('resolvePushPayload', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('retourne les données locales si fetchRecordById échoue', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const localData = [{ id: '1', text: 'local' }];
    const result = await resolvePushPayload('captures', 'record-123', localData);
    expect(result).toEqual(localData);
  });

  test('retourne les données locales si remote est vide', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'record-123',
        payload: []
      })
    });
    const localData = [
      { id: '1', text: 'local' },
      { id: '2', text: 'local2' }
    ];
    const result = await resolvePushPayload('captures', 'record-123', localData);
    expect(result).toEqual(localData);
  });

  test("merge si remote a beaucoup plus d'entrées que local", async () => {
    const remoteItems = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, text: `r${i}` }));
    const localItems = [
      { id: '0', text: 'local-0' },
      { id: '11', text: 'new-local' },
      { id: '12', text: 'new-local-2' }
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'record-123',
        payload: remoteItems
      })
    });
    const result = await resolvePushPayload('captures', 'record-123', localItems);
    expect(result.length).toBeGreaterThan(3);
    const newLocal = result.find((e) => e.id === '11');
    expect(newLocal).toBeDefined();
  });

  test('retourne local sans merge si remote et local ont taille similaire', async () => {
    const remoteItems = Array.from({ length: 4 }, (_, i) => ({ id: `${i}`, text: `r${i}` }));
    const localItems = Array.from({ length: 3 }, (_, i) => ({ id: `${i}`, text: `l${i}` }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'record-123',
        payload: remoteItems
      })
    });
    const result = await resolvePushPayload('captures', 'record-123', localItems);
    expect(result).toEqual(localItems);
  });
});
