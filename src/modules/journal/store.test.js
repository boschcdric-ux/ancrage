import { describe, it, expect } from 'vitest';
import {
  normalizeTagId,
  normalizeEntry,
  getSortedEntries,
  getVisibleEntries,
  createEntry,
  countWords
} from './store.js';

describe('journal/store — tags', () => {
  it('accepte les tags connus (dont nature, ajouté en M14)', () => {
    expect(normalizeTagId('boulot')).toBe('boulot');
    expect(normalizeTagId('nature')).toBe('nature');
    expect(normalizeTagId('projets')).toBe('projets');
  });

  it('rejette jardin (retiré en M14) et les valeurs vides/inconnues', () => {
    expect(normalizeTagId('jardin')).toBeNull();
    expect(normalizeTagId('inconnu')).toBeNull();
    expect(normalizeTagId('')).toBeNull();
    expect(normalizeTagId(null)).toBeNull();
  });
});

describe('journal/store — normalizeEntry', () => {
  it('dérive contentText, wordCount et normalise le tag', () => {
    const entry = normalizeEntry({
      id: 'a',
      title: 'Titre',
      content: '<p>Deux mots</p>',
      createdAt: 1000,
      tagId: 'jardin'
    });
    expect(entry.contentText).toBe('Deux mots');
    expect(entry.wordCount).toBe(2);
    expect(entry.tagId).toBeNull();
  });

  it('rejette une entrée sans id', () => {
    expect(normalizeEntry({ title: 'x' })).toBeNull();
    expect(normalizeEntry(null)).toBeNull();
  });
});

describe('journal/store — tri et visibilité', () => {
  const base = [
    { id: 'a', title: 'Alpha', content: '<p>mer calme</p>', createdAt: 1, updatedAt: 1, date: '2026-07-01', tagId: 'boulot' },
    { id: 'b', title: 'Bravo', content: '<p>vent fort</p>', createdAt: 2, updatedAt: 2, date: '2026-07-05', tagId: 'nature' },
    { id: 'c', title: 'Charlie', content: '<p>marée basse</p>', createdAt: 3, updatedAt: 3, date: '2026-07-03', tagId: 'boulot' }
  ].map(normalizeEntry);

  it('trie par date décroissante puis croissante', () => {
    expect(getSortedEntries(base, 'desc').map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(getSortedEntries(base, 'asc').map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('filtre par tag et ajoute formattedDate', () => {
    const boulot = getVisibleEntries(base, { tagFilter: 'boulot', dateSort: 'desc' });
    expect(boulot.map((e) => e.id)).toEqual(['c', 'a']);
    expect(typeof boulot[0].formattedDate).toBe('string');
    expect(boulot[0].formattedDate.length).toBeGreaterThan(0);
  });

  it('recherche dans le titre et le texte', () => {
    expect(getVisibleEntries(base, { searchQuery: 'marée' }).map((e) => e.id)).toEqual(['c']);
    expect(getVisibleEntries(base, { searchQuery: 'bravo' }).map((e) => e.id)).toEqual(['b']);
  });
});

describe('journal/store — createEntry / countWords', () => {
  it('crée une entrée vierge cohérente', () => {
    const entry = createEntry();
    expect(typeof entry.id).toBe('string');
    expect(entry.content).toBe('<p></p>');
    expect(entry.wordCount).toBe(0);
    expect(entry.tagId).toBeNull();
  });

  it('countWords gère le vide', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('un deux trois')).toBe(3);
  });
});
