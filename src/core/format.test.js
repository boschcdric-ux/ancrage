import { describe, expect, it } from 'vitest';
import { localDateString } from './format.js';

describe('localDateString', () => {
  it('formate une date avec padding des mois et jours < 10', () => {
    const ts = new Date(2026, 0, 5, 15, 30).getTime();
    expect(localDateString(ts)).toBe('2026-01-05');
  });

  it('formate une date sans padding quand mois et jour >= 10', () => {
    const ts = new Date(2026, 10, 15, 8, 0).getTime();
    expect(localDateString(ts)).toBe('2026-11-15');
  });
});
