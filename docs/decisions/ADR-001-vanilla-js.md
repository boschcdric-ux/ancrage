# ADR-001 — Vanilla JavaScript plutôt qu'un framework

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

Au démarrage du projet, le choix s'est posé entre utiliser un framework JavaScript moderne (React, Vue, Svelte) ou rester en JavaScript vanilla avec Vite comme bundler.

## Décision

Nous avons choisi **JavaScript vanilla + Vite**, sans framework.

## Raisons

- **Compatibilité vibe coding** — les IA (Claude, Cursor) génèrent du vanilla JS cohérent et lisible. Les frameworks introduisent des patterns (hooks, réactivité, composants) que les IA ont tendance à mélanger ou à utiliser de façon incohérente sur la durée.
- **Lisibilité** — chaque module est du HTML/CSS/JS standard. N'importe quel développeur peut lire le code sans connaître un framework spécifique.
- **Performance** — pas de virtual DOM, pas de runtime de framework. L'app s'ouvre instantanément, ce qui est critique pour un usage TDAH (ouverture rapide quand l'énergie est basse).
- **Stabilité** — vanilla JS ne se déprécie pas. React v18 → v19 casse des patterns. Vanilla JS de 2026 sera lisible en 2030.
- **Légèreté** — bundle final ~750Ko. Avec React, on serait à 1.5Mo+ pour les mêmes fonctionnalités.

## Conséquences acceptées

- Pas de réactivité automatique — les mises à jour UI sont gérées manuellement via `render()` dans chaque module.
- Pas de composants réutilisables formalisés — la réutilisabilité passe par le design system et les conventions.
- Pas de TypeScript (cohérent avec ce choix) — voir ADR-003.
- Les fonctions de rendu peuvent devenir longues — compensé par la séparation `index.js / view.js`.

## Alternatives considérées

- **React** — écarté pour la complexité du vibe coding et la taille du bundle.
- **Svelte** — intéressant mais moins connu des IA, risque de code incohérent.
- **Vue** — même raison que Svelte.
