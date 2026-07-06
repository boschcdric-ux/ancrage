import { describe, expect, it } from 'vitest';
import { MODULES_META, MODULES_META_FOR_SETTINGS } from './registry.js';

const REQUIRED_FIELDS = ['id', 'label', 'icon', 'lazy', 'hasWidget'];

describe('registry.js', () => {
  it('contient 20 entrées avec ids uniques et champs requis', () => {
    expect(MODULES_META).toHaveLength(20);

    const ids = MODULES_META.map((meta) => meta.id);
    expect(new Set(ids).size).toBe(20);

    for (const meta of MODULES_META) {
      for (const field of REQUIRED_FIELDS) {
        expect(meta).toHaveProperty(field);
      }
      expect(typeof meta.id).toBe('string');
      expect(meta.id.length).toBeGreaterThan(0);
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.icon).toBe('string');
      expect(typeof meta.lazy).toBe('boolean');
      expect(typeof meta.hasWidget).toBe('boolean');
    }
  });

  it('expose 19 modules pour les réglages (sans settings)', () => {
    expect(MODULES_META_FOR_SETTINGS).toHaveLength(19);
    expect(MODULES_META_FOR_SETTINGS.some((meta) => meta.id === 'settings')).toBe(false);
  });
});
