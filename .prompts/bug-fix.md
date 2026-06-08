# Template — Correction de bug

> Copie ce prompt dans Cursor pour corriger un bug.
> Remplace les [PLACEHOLDERS] par les valeurs réelles.

---

## Étape 1 — Diagnostic d'abord (nouveau chat)

```
Lis [FICHIERS_CONCERNÉS].

DIAGNOSTIC UNIQUEMENT - ne modifie rien.

PROBLÈME OBSERVÉ :
[Décrire exactement ce qui se passe,
sur quel appareil, dans quelle situation]

COMPORTEMENT ATTENDU :
[Décrire ce qui devrait se passer]

Réponds à ces questions précisément :
1. Quelle fonction/ligne est probablement 
   responsable du problème ?
2. Y a-t-il des règles CSS qui pourraient 
   s'écraser mutuellement ?
3. Y a-t-il des variables non définies 
   ou des imports manquants ?
4. Le problème existe-t-il déjà dans 
   le code ou a-t-il été introduit 
   récemment ?

NE MODIFIE AUCUN FICHIER.
```

---

## Étape 2 — Correction ciblée (nouveau chat)

```
Lis [FICHIERS_CONCERNÉS].

DIAGNOSTIC CONFIRMÉ :
[Coller le diagnostic de l'étape 1]

CORRECTION :
[Décrire la correction précise à apporter]

Clause de non-régression :
Avant de modifier, liste les fonctions 
publiques du fichier et leurs signatures.
Après modification, confirme que chaque 
fonction est toujours présente.

Clause de périmètre :
Ne touche qu'à [FICHIERS_AUTORISÉS].
Liste les fichiers modifiés à la fin.
```

---

## Règle des 3 itérations

> Si le bug résiste après **3 prompts**, arrête.
> Ouvre le fichier, lis-le toi-même ligne par ligne.
> Mets un `console.log` au bon endroit.
> Le problème est probablement simple mais nécessite
> une lecture attentive, pas une génération de code.
