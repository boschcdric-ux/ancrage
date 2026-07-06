# 00 — RÈGLES DU CHANTIER ANCRAGE

> **Ce document est lu par l'agent (Cursor) au début de CHAQUE mission.**
> Il prime sur toute autre instruction. En cas de conflit entre ce document
> et un document de mission, ce document gagne. En cas de doute : STOP
> (voir Protocole de blocage).

---

## 1. Le principe du chantier

Le travail est découpé en **missions numérotées** (`M00`, `M01`, `M02`…).
**Une conversation = une mission = un document.** Rien de plus.

L'agent n'a aucune mémoire entre les conversations. La mémoire du chantier
vit dans le dépôt, dans deux fichiers que l'agent doit lire au démarrage
et mettre à jour à la fin de chaque mission :

- `chantier/ETAT.md` — l'état courant : missions faites, en cours,
  décisions prises, problèmes rencontrés, métriques.
- `CHANGELOG.md` — l'historique des modifications, format existant du projet.

**Séquence obligatoire de démarrage d'une mission :**
1. Lire `chantier/00-REGLES.md` (ce fichier).
2. Lire `chantier/ETAT.md`.
3. Lire le document de mission indiqué par Cédric (ex. `chantier/M01-code-splitting.md`).
4. Vérifier que les prérequis de la mission sont cochés dans ETAT.md.
   S'ils ne le sont pas : STOP, le signaler, ne rien faire.
5. Exécuter le rituel de contrôle (§4) pour établir l'état AVANT.

---

## 2. Périmètre et interdictions globales

### Toujours interdit, quelle que soit la mission
- ❌ Modifier quoi que ce soit **hors du périmètre IN** du document de mission.
  Si un problème est découvert hors périmètre : le NOTER dans ETAT.md
  (section « Découvertes »), ne pas le corriger.
- ❌ Ajouter une dépendance npm sans qu'elle soit listée dans la mission.
- ❌ Modifier les clés localStorage existantes ou le mapping
  `LOGICAL_KEY_TO_COLLECTION` dans `core/storage.js` (données de production
  + sync PocketBase : toute modification casse des données réelles).
- ❌ Supprimer ou modifier un test existant pour le faire passer.
  Un test qui casse = un problème à comprendre, pas à faire taire.
- ❌ Toucher à `deploy.example.sh`, `netlify.toml`, aux secrets, aux fichiers `.env`.
- ❌ Reformater massivement des fichiers non touchés par la mission
  (pas de « prettier sur tout le projet » en passant).
- ❌ Push vers `origin`. Le travail reste local. Cédric pousse lui-même.

### Standards de code (identité technique du projet)
- Aucun nouveau fichier > ~300 lignes. Si la mission produit plus, découper.
- Tout nouveau fichier de logique métier non triviale reçoit un test.
- Tout nouveau fichier de test doit être exécuté par `npm run test:unit`.
  Si le script ne le couvre pas encore, l'y inclure fait partie de la
  mission, et la modification de `package.json` est autorisée à cette
  seule fin.
- Commentaires uniquement sur la logique non évidente.
- Commits atomiques, format `type: description courte` en français
  (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- Un commit par étape logique de la mission, jamais un commit fourre-tout final.

### Philosophie produit (non négociable)
- TDAH-first : jamais de friction ajoutée à la capture, jamais de
  culpabilisation dans les textes d'interface, jamais de perte de données
  silencieuse.
- La sauvegarde locale reste **synchrone** (localStorage). Aucun debouncing,
  aucun batching des écritures : la garantie « jamais perdre une pensée »
  prime sur la micro-performance.
- `prefers-reduced-motion` respecté sur toute nouvelle animation.

---

## 3. Environnement de travail

- Le chantier se fait dans un **clone séparé** du dépôt de production,
  sur la branche `chantier/redesign` (créée en M00).
- La version de production (dossier d'origine + Netlify) ne doit jamais
  être touchée par ce chantier.

---

## 4. Rituel de contrôle (AVANT et APRÈS chaque mission)

Exécuter ces commandes et consigner les résultats dans ETAT.md :

```bash
npm run test:smoke     # attendu : 20/20 modules OK, 4/4 shell OK
npm run test:unit      # attendu : tous les tests passent
npm run lint           # attendu : 0 erreur
npm run build          # consigner : taille des fichiers dist/assets/*
```

**Règle d'or : aucune métrique ne doit régresser.** Si les tests passaient
avant et échouent après, ou si le bundle grossit sans justification écrite
dans la mission → revenir en arrière (`git checkout`) et STOP.

---

## 5. Protocole de blocage (STOP)

L'agent s'arrête et n'improvise JAMAIS quand :
- Un prérequis de mission n'est pas rempli.
- Une instruction de mission est ambiguë ou contradictoire avec le code réel.
- Une étape échoue deux fois de suite.
- La correction d'un problème exigerait de sortir du périmètre IN.

En cas de STOP : écrire dans `chantier/ETAT.md`, section « Blocages »,
ce qui bloque, ce qui a été tenté, et la question précise à poser à Cédric.
Puis terminer la conversation proprement (commit du travail partiel si stable,
sinon `git stash` avec un nom explicite).

**Un STOP propre est une réussite. Une improvisation est un échec.**

---

## 6. Rituel de fin de mission

1. Rituel de contrôle (§4), résultats APRÈS consignés.
2. Mettre à jour `chantier/ETAT.md` :
   - mission passée en ✅ avec date,
   - métriques avant/après,
   - décisions prises et leurs raisons,
   - découvertes hors périmètre (sans les corriger).
3. Mettre à jour `CHANGELOG.md`.
4. Commit final : `chore: cloture mission MXX`.
5. Rédiger dans la conversation un résumé de 10 lignes max pour Cédric :
   ce qui a été fait, les métriques, ce qu'il doit vérifier visuellement.

---

## 7. Checklist de validation humaine (pour Cédric, entre deux missions)

*~15 minutes. Aucune mission suivante ne démarre sans cette validation.*

- [ ] `git log --oneline` : les commits racontent une histoire lisible.
- [ ] Rituel de contrôle relancé à la main : tout passe.
- [ ] `npm run preview` : vérification visuelle sur iPhone (2 min de navigation,
      cocher une tâche, capturer une pensée, changer de module).
- [ ] `chantier/ETAT.md` lu : les décisions prises sont acceptables,
      les découvertes sont notées.
- [ ] Si tout est vert : ouvrir la conversation suivante avec le prompt
      d'amorçage (§8).

---

## 8. Prompt d'amorçage d'une mission (à copier-coller dans Cursor)

```
Lis dans l'ordre : chantier/00-REGLES.md, chantier/ETAT.md,
puis chantier/MXX-<nom>.md. Vérifie les prérequis. Exécute le rituel
de contrôle AVANT. Puis exécute la mission MXX en respectant strictement
son périmètre. Applique le protocole STOP au moindre doute.
```
