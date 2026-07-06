# M00 — Baseline et installation du chantier

**Prérequis :** aucun. C'est la première mission.
**Durée attendue :** 30 minutes.
**Risque :** nul (aucune modification de code applicatif).

---

## Objectif

Établir l'état de référence mesuré du projet et installer l'infrastructure
du chantier. À la fin de cette mission, toute régression future sera
détectable par comparaison chiffrée.

---

## Périmètre

**IN :**
- Création de la branche `chantier/redesign`.
- Vérification de la présence du dossier `chantier/` et de ses documents.
- Exécution du rituel de contrôle et consignation complète des métriques.
- Un commit d'installation.

**OUT (interdit) :**
- Toute modification d'un fichier sous `src/`, `public/`, `scripts/`.
- Toute modification de configuration (`vite.config.js`, `package.json`, etc.).

---

## Étapes

1. Vérifier qu'on est bien dans le clone de chantier (pas le dossier de
   production) : `git remote -v` doit pointer vers le dépôt GitHub, et le
   chemin du dossier doit contenir le nom choisi par Cédric pour le chantier.
   En cas de doute : STOP.
2. `git checkout -b chantier/redesign`
3. `npm ci` (installation propre depuis le lockfile).
4. Rituel de contrôle complet :
   - `npm run test:smoke` — consigner le score exact.
   - `npm run test:unit` — consigner le nombre de tests et le résultat.
   - `npm run lint` — consigner le résultat.
   - `npm run build` — consigner la taille exacte de chaque fichier de
     `dist/assets/` (brut et gzip) et le **nombre de chunks JS**.
5. Remplir intégralement la section « Métriques de référence » de
   `chantier/ETAT.md` avec ces valeurs.
6. Passer M00 en ✅ dans le tableau de bord d'ETAT.md.
7. Commit : `chore: installation chantier + baseline M00`.

---

## Critères d'acceptation

- [ ] La branche `chantier/redesign` existe et est active.
- [ ] Toutes les cases « Métriques de référence » d'ETAT.md sont remplies
      avec des valeurs mesurées (aucun tiret restant).
- [ ] Les valeurs attendues sont retrouvées : smoke 20/20, unit tous verts,
      lint 0 erreur, **1 seul chunk JS d'environ 856 KB** (c'est le point
      de départ connu — si les valeurs diffèrent fortement, le consigner
      sans s'alarmer, la base a pu évoluer).
- [ ] Un commit unique, aucun fichier de `src/` modifié
      (`git diff main --stat` ne montre que `chantier/` et éventuellement
      `CHANGELOG.md`).
