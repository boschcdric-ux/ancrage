import { describe, it, expect } from 'vitest';
import { computeTideProgress, tideLabel } from './view.js';

describe('computeTideProgress', () => {
  it('retourne 0 pour une liste vide', () => {
    expect(computeTideProgress([])).toBe(0);
  });

  it('retourne 1 quand toutes les tâches sont faites', () => {
    const tasks = [
      { completed: true, subtasks: [] },
      { completed: true, subtasks: [] }
    ];
    expect(computeTideProgress(tasks)).toBe(1);
  });

  it('compte les sous-tâches partielles à 60 % du poids', () => {
    const tasks = [
      {
        completed: false,
        subtasks: [{ completed: true }, { completed: false }]
      }
    ];
    expect(computeTideProgress(tasks)).toBeCloseTo(0.3);
  });

  it('moyenne sur plusieurs tâches hétérogènes', () => {
    const tasks = [
      { completed: true, subtasks: [] },
      { completed: false, subtasks: [] },
      {
        completed: false,
        subtasks: [{ completed: true }, { completed: true }, { completed: false }]
      }
    ];
    // 1 + 0 + (2/3)*0.6 = 1.4 / 3
    expect(computeTideProgress(tasks)).toBeCloseTo(1.4 / 3);
  });
});

describe('tideLabel', () => {
  it('retourne journée tenue quand tout est fait', () => {
    expect(tideLabel(1, true)).toBe('journée tenue');
    expect(tideLabel(0, true)).toBe('journée tenue');
  });

  it('retourne mer étale pour une progression quasi nulle', () => {
    expect(tideLabel(0, false)).toBe('mer étale');
    expect(tideLabel(0.02, false)).toBe('mer étale');
  });

  it('retourne la mer monte en dessous de 0,45', () => {
    expect(tideLabel(0.1, false)).toBe('la mer monte');
    expect(tideLabel(0.44, false)).toBe('la mer monte');
  });

  it('retourne la marée est belle entre 0,45 et 0,85', () => {
    expect(tideLabel(0.45, false)).toBe('la marée est belle');
    expect(tideLabel(0.84, false)).toBe('la marée est belle');
  });

  it('retourne presque marée haute à partir de 0,85', () => {
    expect(tideLabel(0.85, false)).toBe('presque marée haute');
    expect(tideLabel(0.99, false)).toBe('presque marée haute');
  });
});
