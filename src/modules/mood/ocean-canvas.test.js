import { describe, expect, test } from 'vitest';
import { easeOutCubic, energyToAmpMultiplier } from './ocean-canvas.js';

describe('ocean-canvas helpers', () => {
  test('easeOutCubic va de 0 à 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  test('energyToAmpMultiplier couvre les 5 niveaux', () => {
    expect(energyToAmpMultiplier(1)).toBeCloseTo(0.4);
    expect(energyToAmpMultiplier(3)).toBeCloseTo(1.1);
    expect(energyToAmpMultiplier(5)).toBeCloseTo(1.8);
  });
});
