# ÉTAT DU CHANTIER — Ancrage

> Ce fichier est la mémoire du chantier. L'agent le lit au début de chaque
> mission et le met à jour à la fin. Il doit rester factuel et concis.

**Dernière mise à jour :** 2026-07-06 — M01

---

## Tableau de bord

| Mission | Intitulé | Statut | Date |
|---|---|---|---|
| M00 | Baseline et branche de chantier | ✅ faite et validée par Cédric | 2026-07-06 |
| M01 | Restaurer le code-splitting (registry) | ✅ faite et validée par Cédric | 2026-07-06 |
| M02 | Fiabiliser la sauvegarde | ⬜ à faire | — |
| M03 | Ménage : code mort et duplications | ⬜ à faire | — |

Statuts : ⬜ à faire · 🔶 en cours · ✅ faite et validée par Cédric · 🛑 bloquée

---

## Métriques de référence

*Renseignées en M00, mises à jour à chaque mission. Aucune ne doit régresser
sans justification écrite.*

| Métrique | Baseline (M00) | Dernière valeur | Mission |
|---|---|---|---|
| Smoke tests | 20/20 modules, 4/4 shell | 20/20 modules, 4/4 shell | M01 |
| Tests unitaires | 22/22 passés (2 fichiers) | 22/22 passés (rituel) + 2/2 registry | M01 |
| Lint | 0 erreur | 0 erreur | M01 |
| JS initial (dist, brut) | 856 KB (`index-DsV8hCcK.js`) | 265 KB (`index-BTqQpe1B.js`) | M01 |
| JS initial (gzip) | 243 KB | 72 KB | M01 |
| CSS (dist, brut) | 219 KB (`index-BZJK38el.css`) | 106 KB (`index-DuW-ywyn.css`, entrée HTML) | M01 |
| Nombre de chunks JS | 1 | 9 | M01 |

### Détail build M01 (`dist/assets/`)

| Fichier | Brut | Gzip | Rôle |
|---|---|---|---|
| `index-BTqQpe1B.js` | 271 158 o (265 kB) | 73 658 o (72 kB) | **Chunk d'entrée** |
| `index-CB53m3ZS.js` | 381 829 o (373 kB) | — | Journal + TipTap/ProseMirror |
| `index-NdBzgBX6.js` | 47 974 o | — | Chunk lazy |
| `index-Dbsz6jK1.js` | 41 523 o | — | Chunk lazy |
| `index-CpwrWMNX.js` | 32 870 o | — | Chunk lazy |
| `index-BjQQRJlm.js` | 28 873 o | — | Chunk lazy |
| `index-Ch6-o2Yt.js` | 23 587 o | — | Chunk lazy |
| `index-BgLK2bhS.js` | 19 527 o | — | Chunk lazy |
| `index-BZVvQZFn.js` | 11 762 o | — | Chunk lazy |
| `index-DuW-ywyn.css` | 105 560 o (106 kB) | 16 160 o | CSS principal (entrée HTML) |

Build M01 : aucun avertissement « dynamically imported but also statically imported ».
ProseMirror absent du chunk d'entrée (`grep -c prosemirror` = 0 sur `index-BTqQpe1B.js`).

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

---

## Découvertes hors périmètre (à ne PAS corriger sans mission dédiée)

*L'agent note ici tout problème constaté hors du périmètre de sa mission.*

- M00 : Vite signale 7 modules importés à la fois dynamiquement (`main.js`)
  et statiquement (`dashboard`, `settings`) — le code-splitting ne s'applique
  pas à ces modules (cible M01). **Résolu en M01.**
- M00 : chunk JS unique > 500 kB — avertissement Rollup attendu en l'état.
  **Résolu en M01** (chunk d'entrée 265 kB).
- M01 : `npm run test:unit` n'inclut pas `src/modules/registry.test.js`
  (script limité à `src/core/` et `src/modules/mood/`) — le test passe via
  `npx vitest run src/modules/registry.test.js`.

---

## Blocages

*Rempli uniquement en cas de STOP. Vidé une fois le blocage levé par Cédric.*

- —
