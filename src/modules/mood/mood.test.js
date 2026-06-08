import { describe, expect, test } from 'vitest';
import { normalizeEntry } from './index.js';

describe('normalizeEntry (mood)', () => {
  test('retourne null si entrée invalide', () => {
    expect(normalizeEntry(null)).toBeNull();
    expect(normalizeEntry({})).toBeNull();
    expect(normalizeEntry({ date: '2026-06-01' })).toBeNull();
  });

  test('ajoute un id stable basé sur la date si absent', () => {
    const entry = {
      date: '2026-06-01',
      mood: 4,
      energy: 3,
      timestamp: 1234567890
    };
    const result = normalizeEntry(entry);
    expect(result.id).toBe('mood-2026-06-01');
  });

  test('conserve un id existant', () => {
    const entry = {
      id: 'mood-custom-id',
      date: '2026-06-01',
      mood: 4,
      energy: 3,
      timestamp: 1234567890
    };
    const result = normalizeEntry(entry);
    expect(result.id).toBe('mood-custom-id');
  });

  test('clamp mood et energy entre 1 et 5', () => {
    const entry = {
      date: '2026-06-01',
      mood: 10,
      energy: 0,
      timestamp: 1234567890
    };
    const result = normalizeEntry(entry);
    expect(result.mood).toBe(5);
    expect(result.energy).toBe(1);
  });
});
