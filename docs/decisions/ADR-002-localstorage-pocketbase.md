# ADR-002 — localStorage comme couche primaire + PocketBase comme sync

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

L'application doit fonctionner sur plusieurs appareils (iPhone, Mac, tablette) avec synchronisation des données, tout en restant rapide à l'ouverture et fonctionnelle hors ligne.

## Décision

Architecture **double couche** :
1. **localStorage** — stockage local instantané, source de vérité pour l'affichage
2. **PocketBase** — synchronisation en arrière-plan entre appareils

## Raisons

- **Ouverture instantanée** — localStorage est synchrone et disponible en <1ms. Pas d'attente réseau pour afficher l'app. Critique pour le TDAH : si l'app met 3 secondes à charger, l'utilisateur a oublié pourquoi il l'a ouverte.
- **Fonctionne hors ligne** — si le Pi est éteint ou si on est sans Tailscale, l'app fonctionne normalement. La sync reprend au retour de la connexion.
- **Simplicité** — pas de gestion de cache complexe, pas de service worker critique pour les données.
- **PocketBase sur Pi** — base de données légère (un seul binaire), API REST automatique, ~50Mo de RAM. Idéal pour Raspberry Pi.

## Conséquences acceptées

- **Merge intelligent par id** — pour les collections en tableau, fusion automatique par champ `id` au pull et au push. En cas de conflit sur le même id, la version avec le `updatedAt` le plus récent est conservée. Risque résiduel sur les objets non-tableaux.
- **Quota localStorage** (~5-10Mo) — pour les modules volumineux (Journal), à surveiller. Migration vers IndexedDB prévue si dépassement.
- **Fusion automatique implémentée** — merge par `id` en place depuis juin 2026. UI de résolution manuelle toujours absente (prévue en v2).
- **Données en clair dans localStorage** — acceptable car l'accès à l'appareil est lui-même protégé.

## Mitigations implémentées (juin 2026)

- **Merge intelligent** — `mergeArrayById()` au pull pour toutes les collections tableau ; `mergeTasksData()` spécifique aux tâches
- **Garde-fou anti-écrasement** — `resolvePushPayload()` avant chaque PATCH : si le remote fait >1,5× la taille du local, merge automatique au lieu d'écraser
- **Backup quotidien automatique** — `runDailyAutoBackupIfNeeded()` après sync, snapshot complet de toutes les données, rétention 7 jours (`adhd-app:backup:YYYY-MM-DD`)

## Alternatives considérées

- **IndexedDB seul** — plus puissant mais API complexe, pas adapté au vibe coding.
- **PocketBase seul** — dépendance réseau totale, app inutilisable hors ligne.
- **SQLite local** — pas accessible depuis le navigateur sans WASM lourd.
- **Supabase / Firebase** — données chez un tiers, contraire à la philosophie de souveraineté.
