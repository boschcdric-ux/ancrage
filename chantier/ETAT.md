# ÉTAT DU CHANTIER — Ancrage

> Ce fichier est la mémoire du chantier. L'agent le lit au début de chaque
> mission et le met à jour à la fin. Il doit rester factuel et concis.

**Dernière mise à jour :** 2026-07-06 — M03

---

## Tableau de bord

| Mission | Intitulé | Statut | Date |
|---|---|---|---|
| M00 | Baseline et branche de chantier | ✅ faite et validée par Cédric | 2026-07-06 |
| M01 | Restaurer le code-splitting (registry) | ✅ faite et validée par Cédric | 2026-07-06 |
| M02 | Fiabiliser la sauvegarde | ✅ faite et validée par Cédric | 2026-07-06 |
| M03 | Ménage : code mort et duplications | ✅ faite (en attente validation Cédric) | 2026-07-06 |

Statuts : ⬜ à faire · 🔶 en cours · ✅ faite et validée par Cédric · 🛑 bloquée

---

## Métriques de référence

*Renseignées en M00, mises à jour à chaque mission. Aucune ne doit régresser
sans justification écrite.*

| Métrique | Baseline (M00) | Dernière valeur | Mission |
|---|---|---|---|
| Smoke tests | 20/20 modules, 4/4 shell | 20/20 modules, 4/4 shell | M03 |
| Tests unitaires | 22/22 passés (2 fichiers) | 29/29 passés (4 fichiers) | M03 |
| Lint | 0 erreur | 0 erreur | M03 |
| JS initial (dist, brut) | 856 KB (`index-DsV8hCcK.js`) | 270 KB (`index-B472g6Nm.js`) | M03 |
| JS initial (gzip) | 243 KB | 74 KB | M03 |
| CSS (dist, brut) | 219 KB (`index-BZJK38el.css`) | 106 KB (`index-DuW-ywyn.css`, entrée HTML) | M01 |
| Nombre de chunks JS | 1 | 9 | M01 |

Variation bundle M03 : −0,9 KB sur le chunk d'entrée (270 vs 271 KB M02) — dans la tolérance ±2 KB.

### Rituel AVANT M03 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 27/27 (3 fichiers)
- Lint : 0 erreur
- Build entrée : 271 KB brut (`index-DrIUZi_X.js`), 74 KB gzip

### Rituel APRÈS M03 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 29/29 (4 fichiers, +2 tests `localDateString`)
- Lint : 0 erreur
- Build entrée : 270 KB brut (`index-B472g6Nm.js`), 74 KB gzip
- Grep contrôle : 0 `function escapeHtml` dans `src/modules`, 0 `function localDateString` dans `src/modules`

### Simulation quota plein (procédure dev, M02)

1. `npm run preview`, ouvrir l'app dans le navigateur.
2. Console DevTools — patcher temporairement `localStorage.setItem` :

```js
const nativeSetItem = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(localStorage), 'setItem'
).value;
localStorage.setItem = function (key, value) {
  if (key.startsWith('adhd-app:capture:')) {
    const e = new Error('Quota exceeded');
    e.name = 'QuotaExceededError';
    throw e;
  }
  return nativeSetItem.call(this, key, value);
};
```

3. Capturer une pensée dans le module Capture (ou toute action qui appelle `save()`).
4. **Attendu :** toast « La sauvegarde a échoué — l'espace local est plein… » (un seul toast même en rafale 10 s).
5. Recharger la page pour annuler le patch.

Vérification automatisée équivalente : `npm run test:unit` — tests `save() — gestion du quota` dans `storage.test.js`.

---

## Décisions prises

*Une ligne par décision : quoi, pourquoi, quelle mission.*

- Hors mission (correctif manuel Cédric, après M01) : `test:unit` élargi
  de `src/core/ src/modules/mood/` à `src/` pour couvrir `registry.test.js`,
  créé en M01 mais non branché au filet automatique. Nouvelle règle ajoutée
  à 00-REGLES.md §2 pour éviter que ça se reproduise. `.cursorrules` committé
  à cette occasion.
- M00 : chantier installé sur branche `chantier/redesign` dans le clone
  `ancrage-chantier` — baseline mesurée avant toute modification applicative.
- M01 : `registry.js` expose `navLabel` en plus de `label` — les réglages
  utilisent des libellés courts différents du `label` canonique de certains
  modules (capture, calendrier, notes).
- M01 : widgets dashboard lazy (médicaments, journal, calendrier, recettes)
  affichent « Chargement… » puis se remplissent après `import()` — re-render
  du dashboard à la résolution, cache en mémoire pour les rafraîchissements 30 s.
- M02 : signalement d'échec centralisé via `ancrage:save-failed` + toast dans
  `main.js` (cooldown 10 s) — aucun appelant de `save()` modifié.
- M02 : rétention backups quotidiens réduite de 7 à 3 snapshots — PocketBase
  reste la sauvegarde longue durée.
- M03 : `escapeHtml` — 8 copies identiques (replaceAll + 5 caractères) fusionnées ;
  `settings` et `breathing` avaient une variante sans échappement apostrophe →
  import canonique (comportement enrichi, sans régression visuelle attendue).
- M03 : `formatDateFr` divergent renommé — mood → `formatDateShortFr` (sans année),
  journal → `formatDateFullFr` (Intl long + année) ; budget `formatDateLongFr` inchangé
  (format manuel « d mois y »).
- M03 : `localDateString` identique tasks/dashboard → `core/format.js` + 2 tests.

---

## Découvertes hors périmètre (à ne PAS corriger sans mission dédiée)

*L'agent note ici tout problème constaté hors du périmètre de sa mission.*

- M00 : Vite signale 7 modules importés à la fois dynamiquement (`main.js`)
  et statiquement (`dashboard`, `settings`) — **Résolu en M01.**
- M00 : chunk JS unique > 500 kB — **Résolu en M01.**
- M01 : `npm run test:unit` n'incluait pas `registry.test.js` —
  **Corrigé hors mission par Cédric** (script élargi à `src/`).

---

## Blocages

*Rempli uniquement en cas de STOP. Vidé une fois le blocage levé par Cédric.*

- —
