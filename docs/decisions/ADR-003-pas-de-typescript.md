# ADR-003 — Pas de TypeScript

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

TypeScript est devenu le standard de facto pour les projets JavaScript sérieux. La question s'est posée de l'adopter pour améliorer la robustesse du code.

## Décision

Nous restons en **JavaScript pur**, sans TypeScript.

## Raisons

- **Cohérence avec ADR-001** — vanilla JS + Vite sans transpilation TypeScript garde la chaîne de build simple.
- **Vibe coding plus fluide** — les IA génèrent du JS et du TS, mais mélangent souvent les patterns dans un projet TS. Les types implicites dans les prompts créent des ambiguïtés. En JS, le contrat est dans les conventions et le design system.
- **Pas d'auteur humain** — TypeScript apporte le plus de valeur quand plusieurs développeurs travaillent sur la même base. Ici, les "développeurs" sont des IA qui relisent le design system à chaque prompt.
- **Complexité de config** — tsconfig, types tiers, erreurs de compilation sont une friction réelle qui ralentit le vibe coding.
- **La normalisation compense** — les fonctions `normalizeTask()`, `normalizeHabit()` etc. jouent le rôle de validation de type à l'entrée des données.

## Conséquences acceptées

- Pas de vérification de type à la compilation — les erreurs de type sont détectées à l'exécution.
- Pas d'autocomplétion TypeScript dans l'IDE — compensé par les conventions de nommage et les commentaires JSDoc sur les fonctions complexes.
- Moins attractif pour certains contributeurs qui préfèrent TypeScript.

## Alternatives considérées

- **TypeScript strict** — écarté pour les raisons ci-dessus.
- **JSDoc avec types** — compromis possible, à envisager pour les fonctions les plus critiques (storage.js notamment).
- **TypeScript progressif** — ajouter TS module par module. À reconsidérer si la communauté de contributeurs grandit.
