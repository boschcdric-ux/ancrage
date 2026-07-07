import { describe, expect, it } from 'vitest';
import {
  assignLanes,
  computeTideNowY,
  eventHeightPx,
  occurrenceEndMinutes,
  occurrenceStartMinutes,
  timeToMinutes
} from './tide.js';

function occ(id, start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const base = new Date(2026, 0, 15);
  const startDateTime = new Date(base);
  startDateTime.setHours(sh, sm, 0, 0);
  const endDateTime = new Date(base);
  endDateTime.setHours(eh, em, 0, 0);
  return { id, startDateTime, endDateTime };
}

describe('assignLanes', () => {
  it('assigne un couloir par événement sans chevauchement', () => {
    const lanes = assignLanes([occ('a', '09:00', '10:00'), occ('b', '11:00', '12:00')]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get('b')).toEqual({ lane: 0, lanes: 1 });
  });

  it('partage la largeur quand deux événements se chevauchent', () => {
    const lanes = assignLanes([occ('a', '15:00', '15:45'), occ('b', '15:15', '16:00')]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
  });
});

describe('computeTideNowY', () => {
  it('positionne la marée à midi', () => {
    const noon = 12 * 60;
    expect(computeTideNowY(noon)).toBe((12 - 7) * 44);
  });

  it('borne la marée dans la plage jour', () => {
    expect(computeTideNowY(5 * 60)).toBe(0);
    expect(computeTideNowY(25 * 60)).toBe((23 - 7) * 44);
  });
});

describe('occurrence minutes', () => {
  it('déduit la fin par défaut sans heure de fin', () => {
    const start = new Date(2026, 0, 15, 18, 30);
    const item = { id: 'x', startDateTime: start, endDateTime: start };
    expect(occurrenceStartMinutes(item)).toBe(18 * 60 + 30);
    expect(occurrenceEndMinutes(item)).toBe(occurrenceStartMinutes(item) + 45);
  });

  it('convertit une heure HH:MM', () => {
    expect(timeToMinutes('15:15')).toBe(15 * 60 + 15);
  });

  it('calcule une hauteur minimale', () => {
    expect(eventHeightPx(timeToMinutes('09:00'), timeToMinutes('09:10'))).toBe(30);
  });
});
