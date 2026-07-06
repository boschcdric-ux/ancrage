import { describe, expect, test } from 'vitest';
import { getCapturesToPersist } from './index.js';

describe('getCapturesToPersist (capture)', () => {
  test('ne tronque pas la liste au-delà de 100 entrées', () => {
    const items = Array.from({ length: 150 }, (_, i) => ({
      id: `cap-${i}`,
      text: `Pensée ${i}`,
      createdAt: i,
      tagId: null
    }));

    const persisted = getCapturesToPersist(items);
    expect(persisted).toHaveLength(150);
    expect(persisted[0].id).toBe('cap-0');
    expect(persisted[149].id).toBe('cap-149');
  });

  test('retourne un tableau vide inchangé', () => {
    expect(getCapturesToPersist([])).toEqual([]);
  });
});
