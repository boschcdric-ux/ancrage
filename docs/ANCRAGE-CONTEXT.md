# Ancrage — Document de contexte pour IA

> Ce document est destiné à être partagé avec une IA (Claude, ChatGPT, Gemini...)
> pour qu'elle puisse t'accompagner dans la contribution au projet Ancrage.
> 
> **Comment l'utiliser :** Copie ce document et colle-le dans ta conversation
> avec l'IA, puis utilise le prompt de démarrage à la fin de ce document.

---

## Qu'est-ce qu'Ancrage ?

Ancrage est une application de productivité **TDAH-first** — conçue spécifiquement
pour les personnes atteintes de TDAH (Trouble du Déficit de l'Attention avec ou
sans Hyperactivité).

**La philosophie en une phrase :**
> "L'app s'adapte à ton cerveau, pas l'inverse."

**Ce qui rend Ancrage unique :**
- 20 modules modulaires — l'utilisateur active seulement ceux dont il a besoin
- Le module "Que faire ?" propose UNE seule action selon l'énergie et l'heure
- Pas de culpabilisation — les habitudes ne punissent pas si on rate un jour
- Données 100% privées — tout tourne sur ton propre Raspberry Pi
- Construit entièrement par vibe coding — sans écrire une seule ligne de code

---

## Architecture technique

### Stack

```
Frontend  : HTML/CSS/JavaScript vanilla + Vite
Éditeur   : Tiptap (module Journal uniquement)
Stockage  : localStorage (instantané) + PocketBase (sync)
Serveur   : Nginx sur Raspberry Pi 5
Réseau    : Tailscale (VPN mesh chiffré)
```

### Principe de fonctionnement

```
1. L'app charge depuis localStorage (instantané, hors ligne)
2. En arrière-plan, sync avec PocketBase sur le Pi
3. Les données ne quittent jamais le domicile
```

### Structure des fichiers

```
src/
├── main.js              ← Point d'entrée, orchestration
├── core/
│   ├── storage.js       ← Abstraction localStorage + PocketBase
│   ├── router.js        ← Navigation entre modules
│   ├── theme.js         ← Gestion thèmes clair/sombre/chaud
│   ├── format.js        ← Utilitaires partagés (escapeHtml, truncate...)
│   ├── viewport.js      ← Utilitaires responsive
│   ├── styles.css       ← Design system global
│   └── module-help.js   ← Textes d'aide TDAH par module
├── shell/
│   ├── onboarding.js    ← Questionnaire premier lancement
│   ├── nav-modules.js   ← Gestion modules actifs/désactivés
│   ├── navigation.js    ← Rendu barre navigation
│   ├── gestures.js      ← Orchestration gestes tactiles
│   ├── bottom-sheets.js ← Gestion modales par swipe
│   ├── swipe-detection.js ← Détection direction swipe
│   └── module-transitions.js ← Transitions + renderModule
└── modules/
    └── [nom-module]/
        ├── index.js     ← Logique + export standard OBLIGATOIRE
        ├── view.js      ← Génération HTML
        ├── style.css    ← Styles (variables CSS uniquement)
        └── README.md    ← Description du module
```

---

## La règle la plus importante

> **"Ne jamais modifier un module qui fonctionne pour en améliorer un autre."**

Cette règle est absolue. Chaque module est une île indépendante.

---

## L'export standard — obligatoire pour chaque module

Chaque module DOIT exporter exactement ceci :

```javascript
export default {
  id: 'mon-module',        // identifiant unique, kebab-case
  label: 'Mon Module',     // nom affiché dans la navigation
  icon: '🎯',              // emoji affiché dans la navigation
  
  init(container) {
    // Appelé quand l'utilisateur navigue vers ce module
    // container est le div DOM où afficher le contenu
  },
  
  destroy() {
    // Appelé quand l'utilisateur quitte ce module
    // IMPORTANT : nettoyer les timers, event listeners
  },
  
  getDashboardWidget() {
    // Retourne une chaîne HTML pour le widget du tableau de bord
    // Retourner null si pas de widget
    return null;
  }
}
```

---

## Comment sauvegarder des données

Utiliser UNIQUEMENT les fonctions de `storage.js` — jamais `localStorage` directement.

```javascript
import { save, load } from '../../core/storage.js';

// Sauvegarder
save('mon-module:data', { items: [...] });

// Charger (avec valeur par défaut)
const data = load('mon-module:data', { items: [] });
```

Les clés suivent le format : `[module-id]:[type-de-donnée]`

---

## Le Design System

**Toutes les couleurs via variables CSS — jamais de valeurs en dur.**

```css
/* ✅ Correct */
color: var(--text-primary);
background: var(--bg-secondary);
border: 1px solid var(--border);

/* ❌ Interdit */
color: #333333;
background: #f5f5f5;
```

### Variables CSS principales

```css
/* Textes */
--text-primary      /* Texte principal */
--text-secondary    /* Texte secondaire, gris */
--text-on-accent    /* Texte sur fond coloré */

/* Fonds */
--bg-primary        /* Fond principal */
--bg-secondary      /* Fond cartes, sections */
--bg-tertiary       /* Fond chips, badges */
--bg-hover          /* Fond au survol */

/* Accent (violet Ancrage) */
--accent            /* Couleur principale */
--accent-soft       /* Version douce pour fonds */
--accent-hover      /* Version hover */

/* États */
--success           /* Vert - validé */
--warning           /* Orange - attention */
--danger            /* Rouge - erreur/suppression */

/* Interface */
--border            /* Bordures */
--radius-sm/md/lg/xl/full  /* Arrondis */
--space-1 à --space-16     /* Espacements (×4px) */
```

### Tailles de police

```css
--text-xs    /* 12px */
--text-sm    /* 14px */
--text-base  /* 16px */
--text-lg    /* 18px */
--text-xl    /* 20px */
--text-2xl   /* 24px */
```

### Règles mobile-first

- Boutons : `min-height: 44px` minimum (cibles tactiles)
- Padding mobile : `var(--space-3)` ou `var(--space-4)`
- Toujours tester sur iPhone en PWA

---

## Langage et ton — IMPORTANT

Ancrage s'adresse à des personnes TDAH, pas à des développeurs.

### Mots à éviter → remplacer par

| ❌ Éviter | ✅ Utiliser |
|----------|-----------|
| Streaks | Jours consécutifs |
| Widget | Aperçu / résumé |
| Module | Outil / section |
| Sync | Mise à jour |
| Onboarding | Bienvenue |
| Dashboard | Tableau de bord |
| Timer | Minuterie |
| Pattern | Rythme |

### Ton général
- Tutoiement systématique
- Phrases courtes (max 15 mots)
- Jamais de culpabilisation
- Célébrer les petites victoires
- Expliquer le "pourquoi" pas seulement le "comment"

---

## Les 20 modules existants

| Module | ID | Icône | Problème TDAH adressé |
|--------|-----|-------|----------------------|
| Que faire ? | `now` | 🧭 | Paralysie décisionnelle |
| Accueil | `dashboard` | 🏠 | Vue d'ensemble |
| Tâches | `tasks` | ✅ | Mémoire de travail |
| Mémo | `memo` | 🗒️ | Perte d'informations |
| Agenda | `calendar` | 📅 | Time blindness |
| Météo | `weather` | 🌤️ | Planification |
| Minuterie | `pomodoro` | 🍅 | Concentration |
| Humeur | `mood` | 😊 | Dysrégulation émotionnelle |
| Habitudes | `habits` | 🌱 | Maintien des routines |
| Journal | `journal` | 📓 | Expression, traitement émotionnel |
| Capture rapide | `capture` | ⚡ | Mémoire de travail |
| Focus | `focus` | 🎯 | Distractibilité |
| Courses | `shopping` | 🛒 | Oubli en magasin |
| Budget | `budget` | 💶 | Impulsivité financière |
| Recettes | `recipes` | 📖 | Difficulté à décider |
| Respiration | `breathing` | 🫁 | Régulation émotionnelle |
| Médicaments | `medications` | 💊 | Oubli du traitement |
| Bloc-notes | `notes` | 🗒️ | Post-its numériques |
| Planning | `planning-boulot` | 🏢 | Organisation pro |
| Réglages | `settings` | ⚙️ | Configuration |

---

## Méthode de développement — Vibe Coding (génération 3)

Ancrage est développé par **vibe coding de troisième génération** :
- Aucune ligne de code écrite manuellement
- L'humain décrit ce qu'il veut en langage naturel
- L'IA génère le code
- L'humain teste et valide

### Séparation des rôles

```
Claude (ou autre IA) → Stratégie, architecture, prompts
Cursor              → Exécution du code uniquement
Toi                 → Tests réels, validation, retours d'usage
```

### Les prompts chirurgicaux

Chaque modification suit ces règles :
1. **Une seule chose à la fois**
2. **Analyser avant de coder** ("Avant de coder, identifie...")
3. **Clause de non-régression** ("Le comportement ne change pas")
4. **Clause de périmètre** ("Ne touche qu'à ces fichiers")
5. **Toujours lancer les smoke tests** après modification
6. **Spec-first** — remplir `.prompts/spec-feature.md` avant de coder une fonctionnalité
7. **Templates** — utiliser les prompts standardisés dans `.prompts/`
8. **Mise à jour docs** — mettre à jour les fichiers `docs/` après chaque session significative

### La règle des 3 itérations

> Si un bug résiste après 3 prompts → arrête.
> Ouvre le fichier, lis-le toi-même ligne par ligne.
> Le problème nécessite une lecture attentive, pas plus de génération.

---

## Méthode de travail — Guide du contributeur

### Avant de commencer une session

**1. Faire une sauvegarde**
Toujours avant une modification importante :
```bash
cd ~/ton-dossier
zip -r ancrage-backup-$(date +%Y%m%d).zip adhd-app/
```
Si quelque chose casse → tu as un filet de sécurité.

**2. Déployer sur l'environnement dev**
Ne jamais tester directement en prod.
```bash
./deploy-dev.sh   # déploie sur dev.ancrage.local
./deploy.sh       # déploie en prod (seulement quand ça marche)
```

**3. Vérifier que les tests passent**
```bash
npm run test:smoke  # 20/20 modules OK
npm run test:unit   # 5/5 tests storage
npm run lint        # 0 erreur ESLint
```
Si un test échoue au départ → corriger
avant de toucher quoi que ce soit.

---

### Pendant une session de travail

**La règle des prompts chirurgicaux**

Chaque prompt envoyé à Cursor doit contenir :

1. **Les fichiers à lire** en premier
   ```
   Lis src/modules/mon-module/index.js
   et src/core/storage.js en entier.
   ```

2. **Un diagnostic avant le code**
   ```
   Avant de coder, identifie exactement :
   1. Où se trouve X ?
   2. Comment fonctionne Y ?
   NE MODIFIE AUCUN FICHIER.
   ```

3. **Une clause de non-régression**
   ```
   Clause de non-régression :
   - Le comportement ne change pas
   - Les fonctions existantes fonctionnent
   - npm run test:smoke passe
   ```

4. **Une clause de périmètre**
   ```
   Clause de périmètre :
   Ne touche qu'à src/modules/mon-module/
   Liste les fichiers modifiés à la fin.
   ```

**La règle des 3 itérations**
> Si un bug résiste après 3 prompts → ARRÊTE.
> Ouvre le fichier, lis-le toi-même.
> Mets un console.log au bon endroit.
> Le problème nécessite une lecture attentive,
> pas plus de génération de code.

**Un seul chat Cursor par tâche**
Chaque modification importante = nouveau chat.
Cela évite que Cursor "oublie" les contraintes
au fil de la conversation.

---

### Les audits réguliers

Les audits sont ce qui maintient la qualité
du projet sur la durée. En voici les types :

**Audit avant une modification risquée**
```
Lis [FICHIER].
AUDIT UNIQUEMENT - ne modifie rien.
Identifie :
1. Les fonctions > 50 lignes
2. Les dépendances entre fonctions
3. Les variables d'état partagées
4. Les risques si on modifie X
NE MODIFIE AUCUN FICHIER.
```

**Audit de qualité global**
À faire tous les 2-3 mois :
```
Lis [LISTE DE FICHIERS].
AUDIT UNIQUEMENT - ne modifie rien.
Pour chaque fichier :
1. Note de qualité /10
2. Fonctions > 50 lignes
3. Code mort
4. console.log oubliés
5. Duplications avec d'autres fichiers
TOP 5 corrections prioritaires.
NE MODIFIE AUCUN FICHIER.
```

**Audit de sécurité**
```
Lis src/core/storage.js en entier.
AUDIT UNIQUEMENT - ne modifie rien.
Vérifie :
1. Y a-t-il des données sensibles
   en clair dans le code ?
2. Les clés localStorage sont-elles
   toutes préfixées 'adhd-app:' ?
3. Les backups fonctionnent-ils ?
   (cherche runDailyAutoBackupIfNeeded)
4. Le garde-fou anti-écrasement
   est-il en place ?
   (cherche resolvePushPayload)
NE MODIFIE AUCUN FICHIER.
```

---

### Le journal de bord

Tenir un journal de bord est une bonne
pratique — elle sert à :
- Se souvenir de ce qui a été fait
- Documenter les bugs résolus
- Préparer la prochaine session
- Alimenter les fichiers de documentation

**Format recommandé :**
```
## Session du [DATE]

### Ce qui a été fait
- ✅ [Fonctionnalité ou correction]
- ✅ [Fonctionnalité ou correction]

### Bugs résolus
- [Description du bug + cause + solution]

### Ce qui reste à faire
- 🔲 [Priorité haute]
- 🔲 [Priorité moyenne]
- 🔲 [Plus tard]

### Notes pour la prochaine session
[Contexte important à ne pas oublier]
```

---

### Après une session de travail

**1. Lancer les tests**
```bash
npm run test:smoke  # obligatoire
npm run test:unit   # obligatoire
npm run lint        # obligatoire
```

**2. Déployer sur dev d'abord**
```bash
./deploy-dev.sh
```
Tester sur iPhone ou Android avant la prod.

**3. Déployer en prod seulement si tout va bien**
```bash
./deploy.sh
```

**4. Mettre à jour la documentation**
Si tu as fait des changements importants,
mettre à jour les fichiers concernés :
- `docs/ANCRAGE-CONTEXT.md` — nouvelles
  fonctionnalités, modules, méthode
- `docs/decisions/ADR-*.md` — nouvelles
  décisions architecturales
- `README.md` — nouvelles fonctionnalités
  visibles par les utilisateurs
- `DESIGN_SYSTEM.md` — nouvelles règles
  visuelles ou de langage

---

### Si quelque chose casse

**Étape 1 — Ne pas paniquer**
Tout est sauvegardé à plusieurs endroits :
- Backup zip créé avant la session
- Backup quotidien automatique dans localStorage
- PocketBase sur le Pi

**Étape 2 — Revenir en arrière**
```bash
# Restaurer depuis le backup zip
cd ~/ton-dossier
unzip ancrage-backup-YYYYMMDD.zip
cd adhd-app && ./deploy.sh
```

**Étape 3 — Diagnostiquer avec Git**
Si tu utilises Git :
```bash
git diff          # voir ce qui a changé
git stash         # mettre de côté les changements
git checkout .    # revenir à la dernière version
```

**Étape 4 — Demander à l'IA**
Partage le message d'erreur exact
et le fichier concerné à l'IA.
Ne pas deviner — lire le message d'erreur
mot par mot.

---

### Sécurités en place

Ancrage a plusieurs niveaux de protection
contre la perte de données :

| Protection | Où | Comment |
|------------|-----|---------|
| Backup zip manuel | Ton Mac/PC | Avant chaque session risquée |
| Backup auto quotidien | localStorage | 7 derniers jours automatiquement |
| PocketBase | Raspberry Pi | Sync permanente |
| Merge anti-écrasement | storage.js | Fusionne au lieu d'écraser |
| Garde-fou push | storage.js | Vérifie avant d'envoyer à PocketBase |
| Smoke tests | CI/CD | 20/20 modules à chaque build |

---

### Prompts utiles à garder

**Pour créer un nouveau module**
→ Voir `.prompts/new-module.md`

**Pour corriger un bug**
→ Voir `.prompts/bug-fix.md`

**Pour refactoriser du code**
→ Voir `.prompts/refactoring.md`

**Pour un audit rapide d'un fichier**
```
Lis [FICHIER] en entier.
AUDIT UNIQUEMENT - ne modifie rien.
Note de qualité /10, fonctions > 50 lignes,
code mort, console.log oubliés.
NE MODIFIE AUCUN FICHIER.
```

**Pour vérifier qu'on n'a rien cassé**
```
Lance npm run test:smoke
Lance npm run test:unit
Lance npm run lint
Confirme les résultats.
```

---

## Les tests

Après chaque modification, lancer :

```bash
npm run test:smoke
npm run test:unit
npm run lint
```

Résultat attendu : **20/20 modules OK**, tests unitaires passants, 0 erreur ESLint.

Si un test échoue → ne pas déployer, corriger d'abord.

---

## Fonctionnalités importantes à connaître

### Questionnaire d'onboarding

Au premier lancement, 3 questions configurent automatiquement les modules actifs selon le profil de l'utilisateur.
Clé : `adhd-app:profile:done`

### Bouton d'aide contextuelle

Chaque module a un bouton « ? » qui affiche une explication TDAH-first.
Textes dans `src/core/module-help.js`
Pour ajouter un texte à ton module : ajouter une entrée dans `MODULES_HELP` avec les champs : `title`, `problem`, `why`, `tip`

### Backup quotidien automatique

Au démarrage, snapshot complet du localStorage sous `adhd-app:backup:YYYY-MM-DD`
Rétention : 7 derniers jours

### Lazy loading

7 modules lourds chargés à la demande : `budget`, `calendar`, `recipes`, `shopping`, `planning-boulot`, `notes`, `medications`
Les autres sont chargés au démarrage.

---

## Créer un nouveau module — étapes

### 1. Définir le module

Avant de coder, répondre à ces questions :
- Quel problème TDAH ce module adresse-t-il ?
- Quelles données doit-il sauvegarder ?
- Quel sera son widget sur le tableau de bord ?

### 2. Structure des fichiers

```bash
src/modules/mon-module/
├── index.js
├── view.js
├── style.css
└── README.md
```

### 3. Template index.js minimal

```javascript
import { save, load } from '../../core/storage.js';
import { escapeHtml } from '../../core/format.js';
import { createMonModuleView } from './view.js';

const STORAGE_KEY = 'mon-module:data';

let rootContainer = null;
let data = [];

function readData() {
  return load(STORAGE_KEY, []);
}

function persistData() {
  save(STORAGE_KEY, data);
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createMonModuleView(data);
}

function bindEvents() {
  // Attacher les event listeners
}

function unbindEvents() {
  // Détacher les event listeners
}

export default {
  id: 'mon-module',
  label: 'Mon Module',
  icon: '🎯',

  init(container) {
    rootContainer = container;
    data = readData();
    render();
    bindEvents();
  },

  destroy() {
    unbindEvents();
    rootContainer = null;
    data = [];
  },

  getDashboardWidget() {
    return null; // ou HTML du widget
  }
}
```

### 4. Ajouter dans main.js

Pour les modules légers (< 500 lignes) : import statique dans `main.js`.
Pour les modules lourds (> 500 lignes) : ajouter dans `MODULE_LOADERS` avec `createLazyModuleProxy()` — voir les exemples existants dans `main.js`.

### 5. Ajouter la collection PocketBase

Dans `storage.js`, ajouter dans `LOGICAL_KEY_TO_COLLECTION` :

```javascript
'mon-module:data': 'mon_module',
```

Et créer la collection `mon_module` dans PocketBase admin
avec un champ JSON `payload`.

---

## Ressources

- `DESIGN_SYSTEM.md` — bible visuelle obligatoire
- `docs/decisions/` — pourquoi ces choix techniques
- `.prompts/` — templates de prompts réutilisables
- `src/modules/capture/` — module le plus simple à étudier
- `src/modules/mood/` — bon exemple de module avec graphiques

---

## Prompt de démarrage — à copier dans ton IA

```
Tu vas m'aider à contribuer au projet Ancrage,
une application PWA TDAH-first open source
développée par vibe coding.

Je viens de te partager le document 
ANCRAGE-CONTEXT.md qui contient tout 
ce dont tu as besoin pour comprendre 
le projet : architecture, conventions,
règles, modules existants, méthode de
développement.

Mon rôle : tester sur iPhone, valider,
          donner les retours d'usage
Ton rôle : stratégie, architecture,
          générer les prompts pour Cursor
Cursor   : exécution du code uniquement

Règles absolues :
- Une seule modification à la fois
- Toujours analyser avant de coder
- Clause de non-régression dans chaque prompt
- Clause de périmètre dans chaque prompt
- npm run test:smoke, test:unit et lint après chaque modification
- Ne jamais modifier un module qui fonctionne
  pour en améliorer un autre

Ce que je veux faire aujourd'hui :
[Décris ici ce que tu veux créer ou modifier]

Avant de commencer, pose-moi les questions
dont tu as besoin pour bien comprendre 
ce que je veux.
```

---

*Document maintenu par la communauté Ancrage.*
*Dernière mise à jour : juin 2026*
