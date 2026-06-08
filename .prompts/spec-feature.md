# Template — Spec d'une nouvelle fonctionnalité

> À remplir AVANT de demander à Cursor de coder.
> C'est le contrat. Si l'IA reformule à sa sauce,
> on a une référence pour corriger.

---

## Spec : [NOM DE LA FONCTIONNALITÉ]

**Date :** [DATE]  
**Module concerné :** [NOM DU MODULE]  
**Priorité :** Haute / Moyenne / Basse

---

### Ce que la fonctionnalité fait

[Décrire en langage naturel ce que l'utilisateur 
peut faire avec cette fonctionnalité.
Maximum 5 phrases.]

### Ce que la fonctionnalité ne fait PAS

[Explicitement lister ce qui est hors scope.
Très important pour éviter la sur-ingénierie.]

- Ne fait pas X
- Ne remplace pas Y
- Ne modifie pas Z

### Interaction avec les autres modules

[Comment cette fonctionnalité interagit-elle 
avec le reste de l'application ?]

- Lit les données de : [modules]
- Écrit les données de : [clés storage]
- Déclenche des événements : [événements custom]

### Cas limites identifiés

[Que se passe-t-il dans ces situations ?]

- Si les données sont vides : [comportement]
- Si l'utilisateur est hors ligne : [comportement]
- Si l'action échoue : [comportement]

### Critères de validation

[Comment savoir que c'est réussi ?]

- [ ] Critère 1
- [ ] Critère 2
- [ ] Smoke tests passent : `npm run test:smoke`

---

## Prompt Cursor généré depuis cette spec

[Une fois la spec remplie, générer le prompt 
en utilisant le template new-module.md 
ou bug-fix.md selon le cas]
