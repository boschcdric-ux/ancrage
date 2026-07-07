import { describe, it, expect } from 'vitest';
import {
  getReturnsCount,
  buildConstellationStars,
  getTodayBannerCopy,
  getGaugeOffset,
  habitScheduledOnDate,
  toDateKey
} from './logic.js';

const today = new Date('2026-07-07T12:00:00');
const habit = {
  id: 'h1',
  name: 'Eau',
  emoji: '💧',
  frequency: 'daily',
  createdAt: Date.parse('2026-01-01')
};

describe('getReturnsCount', () => {
  it('compte les retours sur la fenêtre glissante', () => {
    const completions = [
      { habitId: 'h1', date: '2026-07-07' },
      { habitId: 'h1', date: '2026-07-05' },
      { habitId: 'h2', date: '2026-07-07' }
    ];
    expect(getReturnsCount('h1', completions, 30)).toBe(2);
  });
});

describe('buildConstellationStars', () => {
  it('classifie retour, attente et hors fréquence', () => {
    const weekdayHabit = { ...habit, frequency: 'weekdays' };
    const completions = [{ habitId: 'h1', date: '2026-07-07' }];
    const stars = buildConstellationStars(weekdayHabit, completions, today);
    const todayStar = stars.find((s) => s.dateKey === '2026-07-07');
    const sunday = stars.find((s) => s.dateKey === '2026-07-05');
    expect(todayStar.kind).toBe('done');
    expect(sunday.kind).toBe('off');
  });

  it('marque les jours prévus manqués en attente', () => {
    const stars = buildConstellationStars(habit, [], today);
    const todayStar = stars.find((s) => s.dateKey === '2026-07-07');
    expect(todayStar.kind).toBe('waiting');
  });
});

describe('habitScheduledOnDate every2days', () => {
  it('respecte l’ancre createdAt', () => {
    const every2 = { ...habit, frequency: 'every2days', createdAt: Date.parse('2026-07-07') };
    expect(habitScheduledOnDate(every2, today)).toBe(true);
    const next = new Date('2026-07-08T12:00:00');
    expect(habitScheduledOnDate(every2, next)).toBe(false);
  });
});

describe('getTodayBannerCopy', () => {
  it('ne culpabilise jamais', () => {
    expect(getTodayBannerCopy(1, 3).subtitle).toContain('sans pression');
    expect(getTodayBannerCopy(0, 2).subtitle).not.toMatch(/retard/i);
  });
});

describe('getGaugeOffset', () => {
  it('retourne 0 quand tout est fait', () => {
    expect(getGaugeOffset(3, 3)).toBe(0);
  });

  it('retourne 126 quand rien n’est fait', () => {
    expect(getGaugeOffset(0, 4)).toBe(126);
  });
});

describe('toDateKey', () => {
  it('formate en YYYY-MM-DD local', () => {
    expect(toDateKey(today)).toBe('2026-07-07');
  });
});
