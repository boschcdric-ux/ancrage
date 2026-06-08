# Contribuer à Ancrage ⚓

Merci de l'intérêt pour Ancrage ! Ce guide explique comment contribuer,
même si tu n'as **aucune connaissance en programmation**.

---

## La philosophie de contribution

Ancrage est développé par **vibe coding** — une méthode où l'humain
décrit ce qu'il veut en langage naturel, et une IA génère le code.

> **Tu n'as pas besoin de savoir coder pour contribuer.**
> Tu as besoin d'une idée, d'une IA, et de tester sur ton téléphone.

---

## Comment contribuer sans coder

### Option 1 — Signaler un bug ou une idée

Le plus simple ! Ouvre une [Issue GitHub](https://github.com/boschcdric-ux/ancrage/issues)
et décris :
- Ce que tu as observé (bug) ou ce que tu aimerais (idée)
- Sur quel appareil (iPhone, Android, Mac, PC)
- Une capture d'écran si possible

Pas besoin de savoir coder. Une bonne description suffit.

### Option 2 — Créer un nouveau module avec une IA

C'est là que ça devient intéressant. Tu peux créer un module complet
en décrivant ton idée à une IA. Voici comment :

#### Étape 1 — Installe les outils

- **Claude** (claude.ai) ou **ChatGPT** ou autre IA — pour la stratégie
- **Cursor** (cursor.sh) — pour l'exécution du code
  - Télécharge et installe Cursor
  - Ouvre le dossier du projet Ancrage dans Cursor

#### Étape 2 — Prépare l'IA

Partage le fichier `docs/ANCRAGE-CONTEXT.md` à ton IA préférée.
Ce document lui explique tout sur Ancrage — architecture, conventions, règles.

Ensuite, copie-colle ce prompt de démarrage :

```
Tu vas m'aider à contribuer au projet Ancrage,
une application PWA TDAH-first open source
développée par vibe coding.

Je viens de te partager le document 
ANCRAGE-CONTEXT.md qui contient tout 
ce dont tu as besoin pour comprendre 
le projet.

Mon rôle : tester sur iPhone/Android, 
          valider, donner les retours d'usage
Ton rôle : stratégie, architecture,
          générer les prompts pour Cursor
Cursor   : exécution du code uniquement

Ce que je veux créer aujourd'hui :
[Décris ici ton idée de module ou de modification]

Avant de commencer, pose-moi les questions
dont tu as besoin pour bien comprendre 
ce que je veux.
```

#### Étape 3 — Laisse l'IA te guider

L'IA va :
1. Te poser des questions pour clarifier ton idée
2. Générer des prompts à copier dans Cursor
3. Vérifier que le code respecte les conventions Ancrage
4. T'indiquer comment tester

Toi, tu :
1. Copies les prompts dans Cursor
2. Testes le résultat sur ton téléphone
3. Donnes tes retours à l'IA
4. Répètes jusqu'à ce que ce soit parfait

#### Étape 4 — Propose ta contribution

Une fois que ton module fonctionne :
1. Crée une Pull Request sur GitHub
2. Décris ce que ton module fait
3. Quel problème TDAH il adresse
4. Joins des screenshots

---

## Règles à respecter

Ces règles sont là pour que personne ne casse ce qui fonctionne.

### 🔴 Règles absolues

- **Ne jamais modifier un module qui fonctionne** pour en améliorer un autre
- **Toujours lancer les smoke tests** après une modification : `npm run test:smoke`
- **Toutes les couleurs via variables CSS** — jamais de valeurs en dur (#, rgb...)
- **L'export standard est obligatoire** pour chaque module (id, label, icon, init, destroy, getDashboardWidget)

### 🟡 Règles importantes

- Une seule modification à la fois dans Cursor
- Tester sur un vrai téléphone, pas seulement dans le navigateur
- Le langage doit être accessible — pas de jargon technique dans l'interface
- Tutoiement systématique dans les textes de l'app

### 🟢 Bonnes pratiques

- Commence simple — un module minimal qui fonctionne vaut mieux qu'un module complexe qui plante
- Documente le problème TDAH que ton module adresse
- Ajoute un texte d'aide dans `src/core/module-help.js`

---

## Idées de contributions bienvenues

Tu cherches une idée ? Voici ce qui manque encore :

### Modules
- 🎙️ **Notes vocales** — dicter une idée plutôt qu'écrire
- 🏃 **Activité physique** — suivi des séances de sport
- 🧘 **Méditation guidée** — séances courtes
- 📚 **Lecture** — suivi des livres en cours
- 🌿 **Hydratation** — rappels doux pour boire de l'eau

### Améliorations existantes
- 🌍 **Traductions** — Anglais, Espagnol, Allemand...
- ♿ **Accessibilité** — améliorer la navigation clavier
- 🐳 **Docker** — simplifier l'installation

---

## Structure d'un bon module TDAH-first

Avant de créer ton module, réponds à ces questions :

```
1. Quel problème TDAH adresse-t-il ?
   (mémoire de travail, time blindness, 
   dysrégulation émotionnelle, initiation...)

2. Quelle est l'action principale ?
   (une seule chose, pas dix)

3. Comment évite-t-il la culpabilisation ?
   (pas de punition si on rate un jour)

4. Peut-on le désactiver si on n'en a pas besoin ?
   (oui, toujours)
```

---

## Questions fréquentes

**Je ne sais pas du tout coder — je peux quand même contribuer ?**
Oui ! L'idée de module "Notes vocales" a été proposée par quelqu'un
qui n'avait jamais écrit une ligne de code. Si tu as une idée et
un téléphone pour tester, tu peux contribuer.

**Quelle IA utiliser ?**
Claude (Anthropic) fonctionne très bien avec Ancrage — c'est avec lui
que le projet a été développé. ChatGPT et Gemini fonctionnent aussi.
L'important c'est de bien partager le fichier ANCRAGE-CONTEXT.md.

**Mon module doit-il forcément être pour les TDAH ?**
Oui — c'est la philosophie du projet. Chaque module doit adresser
un problème réel des personnes TDAH, même si d'autres peuvent en bénéficier.

**Je peux proposer des améliorations à un module existant ?**
Oui, via une Issue ou une Pull Request. Mais attention à la règle d'or :
ne pas casser ce qui fonctionne pour les utilisateurs actuels.

---

## Ressources

| Ressource | Description |
|-----------|-------------|
| `docs/ANCRAGE-CONTEXT.md` | Document complet à partager à ton IA |
| `DESIGN_SYSTEM.md` | Règles visuelles et de langage |
| `docs/decisions/` | Pourquoi ces choix techniques |
| `.prompts/` | Templates de prompts réutilisables |
| `src/modules/capture/` | Module le plus simple à étudier |
| `INSTALL.md` | Guide d'installation complet |

---

## Code de conduite

Ancrage est un projet bienveillant, comme l'app elle-même.

- Toute contribution est la bienvenue, quel que soit le niveau
- Pas de moquerie sur les questions "basiques"
- Les personnes TDAH qui utilisent l'app sont les meilleures expertes de leurs besoins
- La bienveillance avant la perfection technique

---

*Ancrage est développé avec ❤️ et Claude (Anthropic) + Cursor.*
*Licence MIT — libre d'utilisation, modification et distribution.*
