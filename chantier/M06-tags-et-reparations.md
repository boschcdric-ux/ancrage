# M06 — Tâches : réparer le tag, la bordure, et poser un tag à la création

**Prérequis :** M05 + M05b exécutées (⏳ en attente de validation — M06 les
débloque, la validation se fera sur l'ensemble M05 + M05b + M06).
**Durée attendue :** une session (~2 h 30).
**Risque :** moyen. Deux parties nettement séparées (réparer / ajouter),
un commit distinct par partie pour garder le diff lisible.

> Avant de commencer : ajouter la ligne M06 au tableau de bord d'ETAT.md.

---

## Contexte : audit du module Tâches après M05

Trois problèmes identifiés, de deux natures différentes :

**A. Régressions introduites par M05 (à réparer) :**
1. **Menu tag invisible.** Le menu (`.tasks__tag-menu`) s'ouvre bien au
   clic (le JS fonctionne, la classe `is-open` s'applique), mais il est
   en `position:absolute` DANS `.tasks__item-detail` qui porte
   `overflow:hidden` (nécessaire à l'animation `max-height` du dépliement).
   Le menu déborde de cette zone et se fait couper → il est là mais
   invisible, d'où « je clique et rien ne se passe ».
2. **Double bordure dans la barre d'ajout.** Le conteneur du formulaire
   `.tasks__form` et l'input `.tasks__input` ont chacun une bordure, d'où
   le « rectangle dans un rectangle ».

**B. Fonctionnalité absente (à ajouter) :**
3. **Impossible de poser un tag au moment de créer une tâche.** Le tag
   n'est accessible que sur une tâche existante, une fois dépliée.
   `createTask(text)` existe déjà avec `tagId: null` : le modèle est prêt,
   il manque l'interface et le câblage.

---

## Périmètre

**IN :**
- `src/modules/tasks/style.css` : correction du menu tag (partie A1),
  correction de la double bordure (partie A2), styles du sélecteur de tag
  de création (partie B).
- `src/modules/tasks/view.js` : structure du menu tag si nécessaire pour
  A1 ; markup du sélecteur de tag dans la barre d'ajout (partie B).
- `src/modules/tasks/index.js` : câblage du tag de création uniquement
  (partie B) — état du tag sélectionné, passage à `createTask`,
  réinitialisation après ajout. Aucune autre modification.

**OUT (interdit) :**
- Toute autre partie de `index.js` (le handler d'ajout `onFormSubmit`
  n'est touché QUE pour passer le tagId à `createTask` et réinitialiser).
- `createTask` : sa signature évolue (voir B), mais sa logique interne
  et les autres champs ne changent pas.
- Le modèle de données, les clés de stockage, la sync, l'archivage,
  l'amnistie, les animations M05 (houle, anneaux, ancre).
- Tout autre module.

---

## PARTIE A — Réparations (premier commit : `fix:`)

### A1. Rendre le menu tag visible

Le conflit est structurel : `overflow:hidden` (pour l'animation de
dépliement) contre `position:absolute` (le menu qui doit déborder).
Choisir UNE des approches suivantes, par ordre de préférence :

- **Préféré — neutraliser l'overflow quand un menu est ouvert :** quand
  une tâche a son menu tag ouvert, sa carte (`.tasks__item--expanded`
  ou un modificateur dédié `.tasks__item--tag-open`) passe en
  `overflow: visible`. L'animation de dépliement est déjà terminée à ce
  moment (le menu ne s'ouvre que sur une tâche déjà dépliée), donc lever
  l'overflow ne casse pas la transition. Ajouter la classe côté vue quand
  `openTagMenuTaskId === task.id` (donnée déjà disponible dans view.js).
- Alternative si la première pose problème : ancrer le menu autrement
  (au-dessus du bouton plutôt qu'en dessous) en restant dans la zone
  visible, sans overflow à lever.

Critère : le menu tag s'affiche entièrement, cliquable, dans les 4 thèmes,
sur mobile (largeur ≤ 380 px) sans déborder hors de l'écran.

### A2. Supprimer la double bordure de la barre d'ajout

Dans `style.css`, décider quel élément porte la bordure : le conteneur
`.tasks__form` OU l'input `.tasks__input`, pas les deux. Conserver
l'anneau de focus (`:focus-within` ou `:focus`) sur l'élément retenu.
Résultat visuel : un seul rectangle net, cohérent avec la maquette M05
(le conteneur porte la bordure, l'input est nu à l'intérieur).

---

## PARTIE B — Tag à la création (second commit : `feat:`)

### Intention
Permettre de choisir un tag AVANT de poser la tâche, dans la barre
d'ajout, sans friction. Le comportement par défaut reste « aucun tag » :
poser une tâche sans y penser doit rester aussi rapide qu'aujourd'hui
(principe TDAH : la capture ne s'alourdit jamais).

### Interface (view.js)
Dans la barre d'ajout `.tasks__form`, ajouter un déclencheur de tag
discret (un bouton 🏷 à gauche ou à droite de l'input, avant « Poser »).
Au clic, il ouvre un petit sélecteur des 6 tags + « Aucun » — réutiliser
`PREDEFINED_TAGS` et le même rendu visuel que le menu tag existant pour
la cohérence. Le tag choisi s'affiche dans le déclencheur (pastille
colorée + éventuellement label court). État par défaut : aucun tag.

Contrainte d'accessibilité : le déclencheur est un `<button type="button">`
avec `aria-label` clair et `aria-expanded` ; les items sont des boutons ;
navigation clavier fonctionnelle ; focus visible.

### Câblage (index.js) — strictement limité à ceci
- Une variable d'état module `pendingCreateTagId` (défaut `null`).
- Un handler qui ouvre/ferme le sélecteur de création et met à jour
  `pendingCreateTagId` à la sélection, puis `renderList()`.
- `createTask` évolue : `createTask(text, tagId = null)` — le seul
  changement interne autorisé est `tagId: tagId ?? null` au lieu de
  `tagId: null`. Rien d'autre.
- Dans `onFormSubmit` : `tasks.unshift(createTask(value, pendingCreateTagId));`
  puis remettre `pendingCreateTagId = null` (le tag ne « colle » pas à la
  tâche suivante — chaque tâche repart d'un tag vierge, choix délibéré).
- Fermer ce sélecteur via le même mécanisme `onPointerDown` que le menu
  tag des tâches (clic en dehors), en ajoutant sa zone à la garde.

### Ce qu'il ne faut PAS faire
- Pas de nouveau tag persistant, pas de tags personnalisés, pas de
  multi-tags : on réutilise exactement les 6 `PREDEFINED_TAGS`.
- Le tag choisi ne se mémorise pas entre deux créations.

---

## Critères d'acceptation

- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable (±2 KB gzip).
- [ ] Deux commits distincts : un `fix:` (partie A), un `feat:` (partie B).
- [ ] `git diff src/modules/tasks/index.js` relu : uniquement le câblage
      du tag de création + la signature de `createTask`. Le reste d'index.js
      intact.
- [ ] Test manuel (Cédric, iPhone + Mac) :
  - **Menu tag** : déplier une tâche, cliquer 🏷 → le menu s'affiche
    entièrement ; choisir un tag → il s'applique et se voit sur la tâche ;
    « Aucun tag » → le retire. Testé dans les 4 thèmes.
  - **Barre d'ajout** : un seul rectangle net, plus de double bordure.
  - **Tag à la création** : choisir un tag dans la barre, poser la tâche
    → la tâche apparaît AVEC le tag ; le sélecteur repart sur « aucun » ;
    poser une tâche sans choisir de tag → rapide, tâche sans tag.
  - Les sous-tâches (réparées en M05b) marchent toujours ; les animations
    M05 (montée d'eau, anneaux, ancre) intactes.
- [ ] Mobile ≤ 380 px : le menu tag et le sélecteur de création ne
      débordent pas hors de l'écran.
- [ ] `prefers-reduced-motion` respecté (le sélecteur peut apparaître
      sans animation).

---

## Note ETAT.md (fin de mission)
Consigner : M06 clôt la série Tâches (M05 + M05b + M06). Leçon retenue et
déjà notée en M05b — les missions signatures doivent inclure dans leur
périmètre les handlers et les contraintes d'overflow liés aux éléments
en position absolue (menus, popovers), sous peine de régression
d'interaction. À rappeler lors de la conception des prochaines signatures.
