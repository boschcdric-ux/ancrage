# ADR-004 — Architecture modulaire en îles

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

L'application comprend 19 modules avec des fonctionnalités très différentes. La question s'est posée d'organiser le code de façon à permettre l'ajout de modules sans risque de régression.

## Décision

Chaque module est une **île indépendante** dans `src/modules/`. Il ne connaît pas l'existence des autres modules et communique uniquement via `storage.js`.

Structure imposée pour chaque module :
```
src/modules/nom-du-module/
├── index.js     — logique + export standard
├── view.js      — génération HTML
├── style.css    — styles (variables CSS uniquement)
└── README.md    — description pour les IA et contributeurs
```

Export standard obligatoire :
```javascript
export default {
  id, label, icon,
  init(container) {},
  destroy() {},
  getDashboardWidget() {}
}
```

## Raisons

- **Isolation des régressions** — modifier un module ne peut pas casser un autre. La règle d'or ("ne jamais modifier un module qui fonctionne pour en améliorer un autre") est rendue possible par cette architecture.
- **Vibe coding parallèle** — chaque module peut être demandé à Cursor indépendamment, avec son propre contexte.
- **Désactivation par module** — les utilisateurs peuvent désactiver les modules inutiles. Cela réduit la charge cognitive visuelle, principe central du design TDAH-first.
- **Extensibilité communautaire** — un contributeur peut créer un nouveau module sans comprendre le reste de l'application. C'est explicitement documenté dans CONTRIBUTING.md.
- **Tests isolés** — les smoke tests vérifient l'export standard de chaque module indépendamment.

## Conséquences acceptées

- **Duplication possible** — certains helpers (formatage de date, normalisation) peuvent être dupliqués entre modules. Acceptable si la duplication est légère.
- **Communication indirecte** — pour qu'un module lise les données d'un autre, il doit passer par `storage.js`. C'est une contrainte mais aussi une garantie de découplage.
- **Pas de composants partagés** — la réutilisation passe par les conventions et le design system, pas par des composants importés.
