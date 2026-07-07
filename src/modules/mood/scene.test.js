import { describe, expect, test } from 'vitest';
import { buildGalleryBuckets } from './scene.js';

describe('buildGalleryBuckets', () => {
  const entries = [
    { date: '2026-07-01', mood: 2, energy: 2, note: '' },
    { date: '2026-07-02', mood: 3, energy: 3, note: '' },
    { date: '2026-07-03', mood: 4, energy: 4, note: 'Belle journée' },
    { date: '2026-07-04', mood: 5, energy: 5, note: '' },
    { date: '2026-07-05', mood: 3, energy: 2, note: '' },
    { date: '2026-07-06', mood: 4, energy: 3, note: '' },
    { date: '2026-07-07', mood: 5, energy: 4, note: 'Top' }
  ];

  test('semaine : 7 cellules dont aujourd’hui', () => {
    const buckets = buildGalleryBuckets(entries, 'week', '2026-07-07');
    expect(buckets).toHaveLength(7);
    expect(buckets[6].today).toBe(true);
    expect(buckets[6].m).toBe(5);
  });

  test('mois : agrège en moyennes arrondies', () => {
    const buckets = buildGalleryBuckets(entries, 'month', '2026-07-07');
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.every((b) => b.m >= 1 && b.m <= 5)).toBe(true);
  });
});
