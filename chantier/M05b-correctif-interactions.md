# M05b — Correctif : interactions sous-tâches et tag cassées par M05

**Prérequis :** M05 exécutée (⏳ en attente de validation — cette mission
la débloque). NE PAS valider M05 avant que M05b soit passée et testée.
**Durée attendue :** courte (~45 min).
**Risque :** faible, périmètre chirurgical.

---

## Le bug (diagnostiqué, reproductible)

Depuis M05, dans le module Tâches :
1. Impossible d'ajouter une sous-tâche : cliquer dans le champ d'ajout
   **replie la tâche** et fait disparaître le champ.
2. Le bouton tag ne répond plus correctement (même famille de cause).

**Cause racine.** Le handler « clic en dehors » `onPointerDown` de
`tasks/index.js` (autour de la ligne 813) replie la tâche dépliée
(`expandedTaskId = null` + `renderList()`) quand le clic ne tombe pas
dans une liste de zones « à garder ouvert ». Cette liste est :

```js
const keepExpanded =
  target.closest('[data-task-expand]') ||
  target.closest('.tasks__item-actions') ||
  target.closest('[data-task-toggle]') ||
  target.closest('.tasks__tag-menu');
```

M05 a réécrit la présentation. Le contenu déplié comprend désormais la
zone sous-tâches (`.tasks__subtasks`, avec `.tasks__subtask-form`,
`.tasks__subtask-input`, `[data-subtask-submit]`) et le menu tag
(`.tasks__tag-wrap` / `.tasks__tag-menu`). Ces zones ne figurent pas
toutes dans `keepExpanded` : cliquer dedans est donc traité comme un
clic « en dehors », d'où le repli intempestif.

C'est une couture présentation↔logique que le périmètre de M05 n'avait
pas couverte. Ce correctif la referme, sans rien changer d'autre.

---

## Périmètre

**IN :**
- `src/modules/tasks/index.js` : **uniquement** le handler `onPointerDown`
  (la construction de `keepExpanded`, et par symétrie la garde du menu
  tag juste au-dessus si nécessaire). Rien d'autre dans ce fichier.

**OUT (interdit) :**
- Toute autre partie de `index.js`.
- `view.js`, `style.css`, tout autre fichier, tout autre module.
- Toute modification des animations ou de l'apparence.

---

## Correctif attendu

Élargir la condition `keepExpanded` pour inclure TOUTES les zones
interactives du contenu déplié. Se baser sur les classes réellement
produites par le `view.js` actuel (les vérifier par lecture directe
avant d'écrire) :

```js
const keepExpanded =
  target.closest('[data-task-expand]') ||
  target.closest('.tasks__item-actions') ||
  target.closest('[data-task-toggle]') ||
  target.closest('.tasks__tag-menu') ||
  target.closest('.tasks__tag-wrap') ||
  target.closest('.tasks__subtasks') ||
  target.closest('.tasks__subtask-form') ||
  target.closest('[data-subtask-toggle]') ||
  target.closest('[data-subtask-edit]') ||
  target.closest('[data-subtask-delete]') ||
  target.closest('[data-subtask-input]') ||
  target.closest('[data-subtask-submit]');
```

**Vérification préalable obligatoire** : lister par grep les classes et
`data-*` réellement présents dans le contenu déplié de `view.js`
(sous-tâches, formulaire, actions, menu tag) et s'assurer que
`keepExpanded` couvre bien chacune des zones cliquables. Si une zone
existe dans le HTML mais manque dans la liste ci-dessus, l'ajouter. Si
une classe listée ci-dessus n'existe pas dans le HTML, la retirer.
La liste finale doit correspondre exactement au HTML réel.

Vérifier aussi la garde du menu tag (bloc `if (openTagMenuTaskId)` au
début de `onPointerDown`) : un clic sur un élément du menu tag
(`[data-task-tag-pick]`) ou sur le bouton d'ouverture
(`[data-task-tag-toggle]`) ne doit pas refermer le menu avant que le
handler de sélection ait pu s'exécuter. Si le menu se ferme trop tôt,
inclure `.tasks__tag-menu` et `[data-task-tag-toggle]` dans la zone
« garder ouvert » de cette garde.

---

## Critères d'acceptation

- [ ] Rituel de contrôle complet : smoke 20/20, unit tous verts, lint 0,
      build stable (delta nul attendu, c'est une correction de logique JS
      de quelques lignes).
- [ ] `git diff src/modules/tasks/index.js` : seul le handler
      `onPointerDown` apparaît. Aucun autre fichier au `git diff --stat`.
- [ ] Test manuel (Cédric, iPhone + Mac) :
  - déplier une tâche, cliquer dans le champ sous-tâche → le champ
    RESTE ouvert, on peut taper ;
  - ajouter une sous-tâche → elle apparaît, la tâche reste dépliée ;
  - cocher / éditer / supprimer une sous-tâche → OK, pas de repli ;
  - ouvrir le menu tag, choisir un tag → le tag s'applique ;
  - cliquer réellement AILLEURS (fond de liste, autre tâche) → la tâche
    se replie normalement (le comportement voulu est préservé).
- [ ] Les animations M05 (montée d'eau, anneaux, ancre) fonctionnent
      toujours à l'identique.

---

## Note pour ETAT.md (à consigner en fin de mission)

Décision : le périmètre « présentation seule » de M05 était trop étroit —
il ne couvrait pas les handlers de logique qui dépendent des noms de
structure HTML. Leçon pour les futures missions signatures : quand une
maquette change les enveloppes/classes du contenu interactif, prévoir
explicitement dans le périmètre la mise à jour des handlers de délégation
(`closest(...)`) qui s'appuient sur ces classes.
