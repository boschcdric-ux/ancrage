# Templates de prompts — Ancrage

Ce dossier contient les templates de prompts standardisés pour le développement d'Ancrage via vibe coding.

## Pourquoi des templates ?

- Évite de réécrire les clauses de non-régression et de périmètre à chaque fois
- Garantit une qualité constante quel que soit le moment
- Intègre automatiquement les bonnes pratiques (diagnostic avant correction, règle des 3 itérations)

## Les templates disponibles

| Fichier | Quand l'utiliser |
|---------|-----------------|
| `new-module.md` | Créer un nouveau module |
| `bug-fix.md` | Corriger un bug (diagnostic + correction) |
| `refactoring.md` | Nettoyer ou restructurer du code |
| `cleanup-css.md` | Uniformiser les couleurs d'un module |
| `spec-feature.md` | Écrire la spec AVANT de coder |

## Comment utiliser un template

1. Ouvre le fichier template correspondant
2. Copie le contenu du bloc de code
3. Remplace les `[PLACEHOLDERS]` par les valeurs réelles
4. Colle dans un nouveau chat Cursor (`Cmd + L`)
5. Lance les smoke tests après : `npm run test:smoke`

## La règle des 3 itérations

> Si un bug résiste après **3 prompts**, arrête.
> Ouvre le fichier, lis-le toi-même.
> Le problème nécessite une lecture attentive, pas plus de génération.

## Méthode vibe coding gen 3

1. **Spec-first** — remplir `spec-feature.md` avant de coder
2. **Diagnostic avant correction** — toujours un prompt de diagnostic séparé
3. **Clause de non-régression** — toujours dans le prompt
4. **Clause de périmètre** — toujours dans le prompt
5. **Smoke tests** — toujours après une modification
