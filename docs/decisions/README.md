# Architecture Decision Records — Ancrage

Ce dossier documente les décisions architecturales importantes du projet Ancrage.

## Format

Chaque ADR contient trois sections :
1. **Contexte** — pourquoi cette question s'est posée
2. **Décision** — ce qu'on a choisi
3. **Conséquences acceptées** — ce qu'on perd en échange

## Index

| ADR | Titre | Statut |
|-----|-------|--------|
| [ADR-001](ADR-001-vanilla-js.md) | Vanilla JavaScript plutôt qu'un framework | Accepté |
| [ADR-002](ADR-002-localstorage-pocketbase.md) | localStorage comme couche primaire + PocketBase comme sync | Accepté |
| [ADR-003](ADR-003-pas-de-typescript.md) | Pas de TypeScript | Accepté |
| [ADR-004](ADR-004-architecture-modulaire.md) | Architecture modulaire en îles | Accepté |
| [ADR-005](ADR-005-vibe-coding.md) | Méthode de développement : vibe coding de deuxième génération | Accepté |
| [ADR-006](ADR-006-infrastructure.md) | Infrastructure : Raspberry Pi + Tailscale | Accepté |

## Comment ajouter un ADR

1. Créer un fichier `ADR-00X-titre-court.md`
2. Utiliser le template ci-dessous
3. Ajouter une ligne dans l'index ci-dessus

## Template

```markdown
# ADR-00X — Titre

**Date :** YYYY  
**Statut :** Proposé | Accepté | Supersédé par ADR-00Y

## Contexte

Pourquoi cette question s'est posée.

## Décision

Ce qu'on a choisi.

## Conséquences acceptées

Ce qu'on perd en échange.

## Alternatives considérées

Ce qu'on a écarté et pourquoi.
```
