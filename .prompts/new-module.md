# Template — Nouveau module

> Copie ce prompt dans Cursor pour créer un nouveau module Ancrage.
> Remplace les [PLACEHOLDERS] par les valeurs réelles.

---

```
Lis attentivement DESIGN_SYSTEM.md en entier.
Lis src/modules/capture/index.js pour 
comprendre la structure d'un module simple.
Lis src/core/storage.js pour comprendre 
comment utiliser save() et load().

Avant de coder, confirme :
1. La structure standard d'un module
2. Comment les autres modules sauvegardent 
   leurs données

OBJECTIF :
Créer le module [NOM_DU_MODULE] dans 
src/modules/[id-du-module]/

DESCRIPTION :
[Description du module en 2-3 phrases.
Quel problème TDAH il résout.]

EXPORT STANDARD :
{
  id: '[id-du-module]',
  label: '[Label affiché]',
  icon: '[emoji]',
  init(container) {},
  destroy() {},
  getDashboardWidget() {}
}

FONCTIONNALITÉS :
[Lister les fonctionnalités une par une,
de la plus importante à la moins importante]

STRUCTURE DES DONNÉES :
Clé '[id]:data' :
{
  [décrire la structure JSON des données]
}

WIDGET DASHBOARD :
getDashboardWidget() retourne :
[Décrire ce que le widget affiche]

STYLE :
- Mobile-first
- Toutes les couleurs via variables CSS
- Boutons min-height: 44px
- Respecte prefers-reduced-motion

POCKETBASE :
Dans src/core/storage.js ajouter :
'adhd-app:[id]:data' → '[collection]'

(Créer la collection '[collection]' dans 
PocketBase avant de lancer ce prompt)

Clause de non-régression :
Les autres modules ne sont pas affectés.

Clause de périmètre :
Crée src/modules/[id-du-module]/
Modifie src/main.js (import + modules[])
Modifie src/core/storage.js (mapping PB)
Ne touche à aucun autre fichier.
```
