# M02 — Fiabiliser la sauvegarde (jamais de perte silencieuse)

**Prérequis :** M01 ✅ dans ETAT.md.
**Durée attendue :** une session (~2 h).
**Risque :** faible, mais le fichier touché est critique — discipline maximale.

---

## Contexte (le problème, mesuré)

L'app promet « jamais perdre une pensée ». Or, trois faits mesurés :

1. `save()` dans `core/storage.js` retourne `false` en cas d'échec —
   et **aucun des ~60 appelants ne vérifie ce retour**. Un échec de
   sauvegarde est aujourd'hui invisible.
2. **Aucune gestion de `QuotaExceededError`** dans tout le code.
3. `runDailyAutoBackupIfNeeded()` conserve **7 snapshots quotidiens
   complets** de toutes les données : jusqu'à 8× l'occupation réelle,
   sur un quota localStorage d'environ 5 Mo. Le journal et les notes
   grandissant sans limite, le plafond est atteignable — et le jour venu,
   chaque nouvelle entrée échouera en silence.

---

## Objectif

Un échec de sauvegarde devient impossible à rater : l'app se défend
d'abord toute seule (purge, retry), puis prévient visiblement si elle
n'y arrive pas. La rétention des backups devient raisonnable.

---

## Périmètre

**IN :**
- `src/core/storage.js` : fonction `save()`, fonction
  `runDailyAutoBackupIfNeeded()`, ajout d'une gestion de quota.
- Un mécanisme de notification d'échec (réutiliser le toast existant
  de `main.js` via un CustomEvent — voir étape 3).
- Tests unitaires dans `src/core/storage.test.js`.

**OUT (interdit) :**
- Modifier les clés localStorage, le mapping des collections, ou la
  logique de sync PocketBase (`pushToPocketBase`, `syncFromPocketBase`,
  merges) — on ne touche QUE le chemin d'écriture locale et les backups.
- Introduire du debouncing ou du batching des écritures (interdit par
  les règles du chantier : la sauvegarde reste synchrone et immédiate).
- Toucher aux appelants de `save()` dans les modules (le signalement
  d'échec doit être centralisé dans storage.js, pas dispersé).

---

## Étapes

### 1. Rétention des backups : 7 → 3
Dans `runDailyAutoBackupIfNeeded()`, la boucle de purge conserve 7
snapshots (`while (backupKeys.length > 7)`). Passer à 3. PocketBase reste
la ceinture de sécurité longue durée.

### 2. Gestion du quota dans `save()`
Dans le `catch` de `save()`, détecter l'erreur de quota
(`e.name === 'QuotaExceededError'` — vérifier aussi le fallback historique
`e.code === 22` pour Safari). Séquence de défense, dans l'ordre :
1. Supprimer le snapshot de backup le plus ancien (s'il en existe).
2. Réessayer l'écriture une fois.
3. Si nouvel échec : supprimer TOUS les snapshots de backup, réessayer
   une dernière fois.
4. Si échec final : émettre l'événement d'échec (étape 3) et retourner
   `false`.
Chaque purge de défense est consignée en `console.warn` explicite.

### 3. Signalement visible et centralisé
En cas d'échec final de `save()` (quota ou autre), émettre un
`CustomEvent` sur `document` (ex. `ancrage:save-failed`, détail :
`{ key, reason }`). Dans `main.js`, écouter cet événement et afficher
le toast existant avec un message clair, non culpabilisant et actionnable,
par exemple : « La sauvegarde a échoué — l'espace local est plein.
Tes données récentes sont à risque : fais un export depuis Réglages. »
Le toast d'échec ne doit jamais s'empiler en double si plusieurs échecs
surviennent en rafale (garder une trace du dernier affichage, fenêtre
de 10 s).

### 4. Tests unitaires
Dans `storage.test.js`, ajouter au minimum :
- `save()` réussit → retourne `true`, la méta est mise à jour (existant
  probable, vérifier).
- `save()` avec un localStorage plein simulé (mock de `setItem` qui lance
  `QuotaExceededError`) → purge des backups tentée, retry effectué,
  événement `ancrage:save-failed` émis si tout échoue, retour `false`.
- La rétention des backups purge bien au-delà de 3.

---

## Critères d'acceptation

- [ ] Rituel de contrôle : tout vert, y compris les nouveaux tests.
- [ ] Simulation manuelle documentée dans ETAT.md : procédure suivie pour
      simuler un quota plein en dev (mock ou remplissage), toast constaté.
- [ ] Aucune modification des fonctions de sync PocketBase
      (`git diff` sur storage.js relu ligne à ligne : seuls `save`,
      la gestion backup et les ajouts quota apparaissent).
- [ ] Aucun debouncing/batching introduit.
- [ ] Bundle : taille inchangée à ±2 KB près.
