# ADR-005 — Méthode de développement : vibe coding de troisième génération

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

L'auteur du projet (Cédric) n'a pas de formation en programmation. L'intégralité du code a été générée via des descriptions en langage naturel données à des IA. La question s'est posée de comment garantir la qualité et la cohérence du code produit.

## Décision

Méthode structurée en **séparation stricte des rôles** :

- **Claude (Anthropic)** — stratégie, architecture, prompts, conseil d'experts
- **Cursor** — exécution du code uniquement, jamais de décisions stratégiques
- **Cédric** — tests réels sur iPhone, validation, retours d'usage quotidien

Complétée par des **pratiques de qualité** :
- Prompts chirurgicaux (une seule chose à la fois, clause de non-régression, clause de périmètre)
- Conseil d'experts multi-agents pour challenger les décisions
- Validation croisée avec d'autres IA (ChatGPT, Gemini, Claude Opus)
- DESIGN_SYSTEM.md comme référence obligatoire pour toutes les IA
- Règle des 3 itérations : après 3 échecs sur un bug, lire le code soi-même
- Spec-first development (`.prompts/spec-feature.md`)
- Templates de prompts dans `.prompts/` (new-module, bug-fix, refactoring, cleanup-css, spec-feature)
- Tests unitaires Vitest (`npm run test:unit`)
- ESLint (`npm run lint`, 0 erreur)
- Lazy loading des modules lourds
- Mise à jour des fichiers `docs/` après chaque session significative

## Raisons

- **La séparation des rôles évite la confusion** — Cursor ne prend jamais de décision stratégique, Claude ne touche jamais au code.
- **Le conseil d'experts simule la friction d'une équipe** — il force à challenger les décisions depuis plusieurs angles avant de coder.
- **Les clauses de non-régression** donnent à Cursor un contrat clair : liste les fonctions avant/après, confirme qu'elles sont toujours là.
- **Le DESIGN_SYSTEM.md** garantit la cohérence visuelle quelle que soit l'IA ou la session.

## Conséquences acceptées

- **Dette technique inhérente** — le code généré par IA est fonctionnel mais peut manquer d'élégance. Compensé par des passes de refactoring régulières.
- **Dépendance aux IA** — si les modèles changent ou si les services sont indisponibles, le développement s'arrête.
- **Tests unitaires Vitest sur storage.js + smoke tests sur les 20 modules ; tests manuels iPhone toujours centraux**
- **Bus factor de 1** — Cédric est le seul à connaître l'intention derrière chaque décision. Compensé par les ADR et la documentation.

## Génération 3 — en place

- Spec-first ✅ (`.prompts/spec-feature.md`)
- Test-driven prompting ✅ (Vitest)
- Templates `.prompts/` ✅ (5 fichiers)
- Environnement dev séparé ✅ (dev.ancrage.local, `.env.dev`, `npm run dev:dev`)
