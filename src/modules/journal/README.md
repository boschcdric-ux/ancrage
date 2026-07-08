# Module : journal

> Ce fichier doit être lu par toute IA avant de modifier ce module.
> Respecter le DESIGN_SYSTEM.md à la racine du projet.

## Description

Journal personnel à deux ambiances **volontairement contrastées** (M14,
8e emploi de l'eau : *déposer le courant du jour*) :

- **Vue liste** (thématisée) : les entrées apparaissent comme des
  strates/dépôts le long d'un fil vertical. Point d'accent pour les
  entrées récentes (≤ 3 jours), point estompé pour les anciennes.
  Navigation par **tag en priorité** (barre scrollable horizontalement,
  `data-h-scroll`), recherche plein texte, tri par date **secondaire**.
  Typographie de lecture serif (`--font-read`).
- **Vue écriture** (sobre) : fond « papier » (`--paper`), éditeur riche
  Tiptap avec barre d'outils complète. La page s'efface pour laisser
  place au texte.

### Éditeur Tiptap (à préserver intégralement)

Extensions : `StarterKit`, `TextStyle`, `Color`, `Highlight` (multicolor),
`TaskList`, `TaskItem` (nested, classe `journal-task-item`). Définies dans
`editor.js` (`EXTENSIONS`), à conserver à l'identique.

Cycle de vie : `editorCtrl.mount()` détruit toujours l'instance précédente
avant d'en recréer une. Le re-render passe par `destroy()` → `innerHTML`
→ `mount()`. **Ne jamais** garder l'éditeur vivant à travers un `innerHTML`.

Barre d'outils : chaque bouton porte un `data-journal-command` lu par
`events.js` → `controller.runCommand` → `editorCtrl.exec`. Les 18 commandes
(gras, italique, souligné, barré, 3 titres, surlignage, 5 couleurs,
3 listes, citation, séparateur) doivent rester câblées.

## Découpage (règle < ~300 lignes/fichier)

- `store.js` — modèle de données : lecture/écriture localStorage,
  normalisation, tri, filtres, formatage de date, `createEntry`.
- `editor.js` — cycle de vie Tiptap encapsulé (`createJournalEditor`) :
  extensions, `mount`/`destroy`, `exec`, `refreshToolbar`.
- `events.js` — délégation d'événements DOM vers le contrôleur (aucun état).
- `view.js` — gabarits HTML (liste, éditeur, widget) + `PREDEFINED_TAGS`.
- `index.js` — orchestration (état, rendus, ouverture/création/suppression,
  sauvegarde/autosave, cycle de vie du module).

## Données stockées

- `journal:entries` (localStorage) : tableau d'entrées
  `{ id, title, content(HTML), createdAt, updatedAt, date, dayOfWeek,
  wordCount, tagId }`. Sauvegarde synchrone (localStorage), autosave 30 s.

## Interactions avec d'autres modules

- **Tags partagés** : `PREDEFINED_TAGS` est dupliqué à l'identique dans
  `journal/view.js`, `tasks/view.js` et `capture/view.js`. **Tout
  changement de la liste de tags doit être répercuté dans les trois
  modules** (et les couleurs `--shared-tag-tone` dans les `style.css`
  concernés). Couleurs de tonalité au socle : `--tone-violet`,
  `--tone-gold`, `--tone-clay` (`core/styles.css`).
- **Dashboard** : `getDashboardWidget()` affiche la dernière entrée.
- **Shell** : `data-h-scroll` sur la barre de tags exclut le swipe
  inter-modules (mécanisme `shell/swipe-detection.js`).

## Export attendu

```javascript
export default {
  id: 'journal',
  label: 'Journal',
  icon: '📔',
  init(container) {},
  destroy() {},
  getDashboardWidget() { return { title, content }; }
}
```
