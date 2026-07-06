# M03 — Ménage : code mort et duplications

**Prérequis :** M02 ✅ dans ETAT.md.
**Durée attendue :** une session courte (~1 h 30).
**Risque :** faible si les garde-fous sont respectés.

---

## Contexte (les faits, mesurés)

1. `src/style/tokens.css` et `src/style/themes.css` ne sont **importés
   nulle part** (aucun `@import`, aucun import JS, aucun `<link>`).
   Ce sont des fichiers morts. Danger : ils redéfinissent 22 variables
   du vrai fichier (`core/styles.css`) avec des valeurs divergentes
   (ex. `--radius-md: 10px` contre `12px`) — un jour, quelqu'un les
   éditera en croyant agir sur l'app.
2. `escapeHtml` existe dans `core/format.js` et est correctement importé
   par ~10 modules… mais **10 autres view.js en redéfinissent une copie
   locale** (shopping, focus, recipes, planning-boulot, breathing, notes,
   settings, weather, medications, pomodoro).
3. `formatDate` est défini localement dans 3 fichiers (journal/index.js,
   mood/view.js, budget/index.js) ; `localDateString` dans 2
   (tasks/index.js, dashboard/index.js).

---

## Périmètre

**IN :**
- Suppression de `src/style/tokens.css` et `src/style/themes.css`.
- Remplacement des `escapeHtml` locaux par l'import depuis `core/format.js`.
- Déduplication de `localDateString` vers `core/format.js`.
- Traitement conditionnel de `formatDate` (voir garde-fou n°2).

**OUT (interdit) :**
- Unifier les conventions de clés localStorage (`'calendar:events'` /
  `'adhd-app:tasks:items'` / `'ancrage-planning-boulot'`) : cela demande
  une migration de données réelles — hors de question dans une mission
  de ménage. C'est noté comme dette assumée, pas comme travail à faire.
- Réduire les `!important` (traité module par module dans les missions
  de design, pas ici).
- Tout refactoring au-delà des remplacements listés.

---

## Étapes et garde-fous

### 1. Supprimer les fichiers morts
Avant suppression, re-vérifier qu'ils sont bien orphelins :
```bash
grep -rn "tokens.css\|themes.css" src index.html --include='*.js' --include='*.html' --include='*.css'
```
Résultat attendu : aucune occurrence (hors les fichiers eux-mêmes).
Si une occurrence apparaît : STOP, consigner, ne pas supprimer.
Sinon : `git rm src/style/tokens.css src/style/themes.css` (et le dossier
`src/style/` s'il devient vide). Commit dédié.

### 2. GARDE-FOU duplication : comparer avant de fusionner
**Deux fonctions qui portent le même nom ne font pas forcément la même
chose.** Pour chaque duplication :
1. Afficher côte à côte la version de `core/format.js` (ou la version de
   référence) et chaque copie locale.
2. Si le comportement est **strictement identique** (mêmes entrées →
   mêmes sorties, mêmes cas limites) : remplacer la copie locale par
   l'import. Un commit par module modifié ou par petit groupe cohérent.
3. Si le comportement **diverge** (ex. un `formatDate` qui affiche
   « lun. 6 juil. » et un autre « 06/07/2026ྭ ») : NE PAS fusionner.
   Renommer localement la fonction pour refléter son vrai rôle
   (ex. `formatDateShort`) et consigner la divergence dans ETAT.md.
   La fusion forcée de deux fonctions divergentes est le bug classique
   de cette catégorie de mission.

### 3. `localDateString`
Déplacer l'implémentation dans `core/format.js` (avec export), importer
depuis tasks et dashboard, supprimer les copies. Ajouter un test unitaire
(date connue → chaîne attendue, y compris le padding des mois < 10).

### 4. Vérification finale
Rituel de contrôle complet + un grep de contrôle :
```bash
grep -rn "function escapeHtml" src/modules --include='*.js'   # attendu : 0
grep -rn "function localDateString" src/modules --include='*.js'  # attendu : 0
```

---

## Critères d'acceptation

- [ ] `src/style/` ne contient plus tokens.css ni themes.css (ou n'existe plus).
- [ ] Zéro `function escapeHtml` restante dans src/modules.
- [ ] Zéro `function localDateString` restante dans src/modules.
- [ ] Chaque fusion effectuée = comportements vérifiés identiques
      (mention dans ETAT.md) ; chaque divergence = renommage + consignation.
- [ ] Rituel de contrôle : tout vert, bundle stable à ±2 KB.
- [ ] L'app s'affiche identiquement (aucun changement visuel attendu —
      c'est le critère : si quelque chose change visuellement, un fichier
      « mort » ne l'était pas → revert et STOP).
