# M01 — Restaurer le code-splitting (registry de métadonnées)

**Prérequis :** M00 ✅ dans ETAT.md.
**Durée attendue :** une session (2–4 h).
**Risque :** moyen — c'est la mission la plus structurante du chantier.

---

## Contexte (le problème, mesuré)

Le build de production produit **un seul chunk JS de ~856 KB** alors que
`main.js` définit 7 imports dynamiques. Cause, confirmée par le build en
mode debug :

```
(!) src/modules/budget/index.js is dynamically imported by src/main.js
    but also statically imported by src/modules/settings/index.js
```

- `src/modules/settings/index.js` (lignes ~16–34) importe **statiquement
  les 20 modules** pour construire la liste des modules activables.
- `src/modules/dashboard/index.js` (lignes ~7–15) importe statiquement
  **9 modules** pour appeler leur `getDashboardWidget()`.
- `src/modules/journal/index.js` importe statiquement **TipTap**
  (~362 KB, 42 % du bundle), et journal est lui-même importé statiquement
  dans `main.js`.

Ces imports statiques neutralisent tout le code-splitting.

---

## Objectif

Bundle initial < 450 KB brut, au moins 6 chunks JS, aucun avertissement
« dynamically imported but also statically imported » au build, zéro
régression fonctionnelle.

---

## Périmètre

**IN :**
- Création de `src/modules/registry.js` (nouveau fichier).
- Modification de `src/modules/settings/index.js` (imports uniquement +
  consommation du registry).
- Modification de `src/modules/dashboard/index.js` (stratégie widgets).
- Modification de `src/main.js` (journal passe en lazy ; consommation
  du registry si utile).
- Tests unitaires du registry.

**OUT (interdit) :**
- Toute modification de la logique métier interne des modules.
- Toute modification de `core/storage.js`.
- Tout changement visuel ou de CSS.
- Le découpage des fichiers monolithes (missions ultérieures).

---

## Étapes

### 1. Créer `src/modules/registry.js`
Un manifeste **sans aucun import de module** : pour chaque module, ses
métadonnées pures :

```js
export const MODULES_META = [
  { id: 'now', label: 'Maintenant', icon: '…', lazy: false, hasWidget: true },
  { id: 'budget', label: 'Budget', icon: '…', lazy: true, hasWidget: true },
  // … les 20 modules
];
```

Les valeurs exactes (labels, icônes) sont à extraire des modules existants —
les copier fidèlement, ne rien inventer. Ajouter un test unitaire simple :
20 entrées, ids uniques, champs requis présents.

### 2. Réécrire les imports de `settings/index.js`
Remplacer les ~20 imports statiques de modules par un import du registry.
La liste activable/désactivable se construit depuis `MODULES_META`.
Attention : si settings utilise autre chose que id/label/icon des modules
importés, le consigner dans ETAT.md et adapter le registry en conséquence.

### 3. Traiter `dashboard/index.js`
Le dashboard appelle `getDashboardWidget()` sur 9 modules importés
statiquement. Stratégie imposée :
- Pour les modules **non lazy** (déjà dans le chunk d'entrée : pomodoro,
  weather, mood, habits, now) : conserver l'import statique — il ne coûte rien.
- Pour les modules **lazy** (medications, journal, calendar, recipes) :
  remplacer par un `import()` dynamique déclenché à l'affichage du dashboard,
  avec un placeholder de widget pendant le chargement, rempli à la résolution.
  Réutiliser le pattern de proxy existant dans `main.js` comme référence.

### 4. Passer `journal` en lazy dans `main.js`
Ajouter journal à `MODULE_LOADERS`, retirer son import statique, l'ajouter
à la liste des proxys lazy. TipTap suivra automatiquement dans le chunk
journal.

### 5. Build de vérification
`npm run build` : compter les chunks, noter les tailles. Vérifier l'absence
totale des avertissements « also statically imported ».
Si un avertissement subsiste : identifier l'importeur fautif avec
`DEBUG=vite:* npx vite build 2>&1 | grep "statically imported"` et le traiter.

### 6. Test visuel guidé (à faire faire à Cédric en fin de mission)
Ouvrir `npm run preview` : dashboard s'affiche avec tous ses widgets
(placeholders puis contenu pour les lazy), settings liste bien les 20
modules avec activation/désactivation fonctionnelle, journal s'ouvre et
l'éditeur fonctionne (première ouverture : spinner attendu, c'est normal
et nouveau).

---

## Critères d'acceptation

- [ ] `npm run build` : **≥ 6 chunks JS**, chunk d'entrée **< 450 KB brut**.
- [ ] Aucun avertissement « dynamically imported but also statically
      imported » au build.
- [ ] TipTap/ProseMirror absent du chunk d'entrée (vérifiable :
      `grep -c prosemirror dist/assets/index-*.js` retourne 0).
- [ ] Smoke 20/20, unit tous verts (+ le nouveau test registry), lint 0.
- [ ] `registry.js` < 300 lignes, aucun import de module dedans.
- [ ] Métriques avant/après consignées dans ETAT.md.
