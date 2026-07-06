# ÉTAT DU CHANTIER — Ancrage

> Ce fichier est la mémoire du chantier. L'agent le lit au début de chaque
> mission et le met à jour à la fin. Il doit rester factuel et concis.

**Dernière mise à jour :** 2026-07-06 — M00

---

## Tableau de bord

| Mission | Intitulé | Statut | Date |
|---|---|---|---|
| M00 | Baseline et branche de chantier | ✅ faite et validée par Cédric | 2026-07-06 |
| M01 | Restaurer le code-splitting (registry) | ⬜ à faire | — |
| M02 | Fiabiliser la sauvegarde | ⬜ à faire | — |
| M03 | Ménage : code mort et duplications | ⬜ à faire | — |

Statuts : ⬜ à faire · 🔶 en cours · ✅ faite et validée par Cédric · 🛑 bloquée

---

## Métriques de référence

*Renseignées en M00, mises à jour à chaque mission. Aucune ne doit régresser
sans justification écrite.*

| Métrique | Baseline (M00) | Dernière valeur | Mission |
|---|---|---|---|
| Smoke tests | 20/20 modules, 4/4 shell | 20/20 modules, 4/4 shell | M00 |
| Tests unitaires | 22/22 passés (2 fichiers) | 22/22 passés (2 fichiers) | M00 |
| Lint | 0 erreur | 0 erreur | M00 |
| JS initial (dist, brut) | 856 KB (`index-DsV8hCcK.js`) | 856 KB | M00 |
| JS initial (gzip) | 243 KB | 243 KB | M00 |
| CSS (dist, brut) | 219 KB (`index-BZJK38el.css`) | 219 KB | M00 |
| Nombre de chunks JS | 1 | 1 | M00 |

### Détail build M00 (`dist/assets/`)

| Fichier | Brut | Gzip |
|---|---|---|
| `index-DsV8hCcK.js` | 858 796 o (855,68 kB) | 243 341 o (243,32 kB) |
| `index-BZJK38el.css` | 219 158 o (219,15 kB) | 31 323 o (31,30 kB) |

---

## Décisions prises

*Une ligne par décision : quoi, pourquoi, quelle mission.*

- M00 : chantier installé sur branche `chantier/redesign` dans le clone
  `ancrage-chantier` — baseline mesurée avant toute modification applicative.

---

## Découvertes hors périmètre (à ne PAS corriger sans mission dédiée)

*L'agent note ici tout problème constaté hors du périmètre de sa mission.*

- M00 : Vite signale 7 modules importés à la fois dynamiquement (`main.js`)
  et statiquement (`dashboard`, `settings`) — le code-splitting ne s'applique
  pas à ces modules (cible M01).
- M00 : chunk JS unique > 500 kB — avertissement Rollup attendu en l'état.

---

## Blocages

*Rempli uniquement en cas de STOP. Vidé une fois le blocage levé par Cédric.*

- —
