# Template — Refactoring

> Copie ce prompt dans Cursor pour refactoriser du code.
> Remplace les [PLACEHOLDERS] par les valeurs réelles.

---

## Étape 1 — Audit avant refactoring

```
Lis [FICHIER_À_REFACTORISER].

AUDIT UNIQUEMENT - ne modifie rien.

Identifie dans ce fichier :
1. Les fonctions de plus de 50 lignes
2. Le code dupliqué
3. Les variables non utilisées
4. Les console.log oubliés
5. Les couleurs hardcodées (#, rgb, rgba)
6. Les dépendances externes utilisées

Donne une note de qualité sur 10.
Liste les 3 problèmes les plus urgents.

NE MODIFIE AUCUN FICHIER.
```

---

## Étape 2 — Refactoring ciblé

```
Lis [FICHIER_À_REFACTORISER].

PROBLÈMES IDENTIFIÉS :
[Coller le résultat de l'audit]

REFACTORING DEMANDÉ :
[Décrire précisément ce qui doit être 
refactorisé — une chose à la fois]

RÈGLES ABSOLUES :
- Le comportement ne change pas
- Zéro régression fonctionnelle
- Pas de nouvelles dépendances

Clause de non-régression :
Avant de modifier, liste toutes les 
fonctions exportées et leurs signatures.
Après modification, confirme que chaque 
export est toujours présent et identique.

Clause de périmètre :
Ne touche qu'à [FICHIERS_AUTORISÉS].
Liste les fichiers modifiés à la fin
avec le nombre de lignes avant/après.
```

---

## Après le refactoring

Toujours lancer les smoke tests :
```bash
npm run test:smoke
```
