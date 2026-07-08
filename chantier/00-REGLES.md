# 00 — RÈGLES DU CHANTIER ANCRAGE

> **Ce document est lu par l'agent (Cursor) au début de CHAQUE mission ou
> ticket.** Il prime sur toute autre instruction. En cas de conflit entre
> ce document et un document de mission, ce document gagne. En cas de
> doute : STOP (voir Protocole de blocage).
>
> **v2** — révisé après audit externe du workflow (série M12, drag Habitudes).
> Changements principaux : deux régimes de travail (Mission/Ticket),
> protocole spécifique aux bugs visuels/de rendu, règle anti-certitude
> dans les documents, formalisation des maquettes, cadrage d'ETAT.md.

---

## 1. Le principe du chantier

Le travail se fait selon **deux régimes**, choisis avant de commencer :

### Régime Mission
Pour tout travail **structurel** : refonte de module, nouvelle
architecture, état partagé, plusieurs fichiers, moteur complexe (ex.
Canvas). **Une conversation = une mission = un document**, numéroté
(`M00`, `M01`, `M02`…).

### Régime Ticket
Pour un **correctif ≤ 2 fichiers, à cause déjà connue ou rapidement
vérifiable**. Pas de document dédié : un prompt direct dans une
conversation "correctifs" ouverte pour le module concerné. Le rituel de
contrôle (§4) reste obligatoire. Plusieurs essais sont autorisés dans la
même conversation — contrairement au régime Mission, le ticket n'a pas
la contrainte "une conversation = une seule tentative".

**Comment choisir :** si la question "combien de fichiers, et est-ce que
je connais déjà la cause ?" a une réponse claire et petite → Ticket. Si
la réponse est incertaine, floue, ou touche à l'architecture → Mission.
En cas de doute, commencer en Ticket : un ticket qui s'avère plus gros
peut toujours être requalifié en mission (voir §5, escalade).

L'agent n'a aucune mémoire entre les conversations, quel que soit le
régime. La mémoire du chantier vit dans le dépôt, dans deux fichiers que
l'agent doit lire au démarrage et mettre à jour à la fin :

- `chantier/ETAT.md` — l'état courant (voir format cadré, §9).
- `CHANGELOG.md` — l'historique des modifications, format existant du projet.

**Séquence obligatoire de démarrage (régime Mission) :**
1. Lire `chantier/00-REGLES.md` (ce fichier).
2. Lire `chantier/ETAT.md`.
3. Lire le document de mission indiqué par Cédric.
4. Vérifier que les prérequis sont cochés dans ETAT.md. S'ils ne le sont
   pas : STOP, le signaler, ne rien faire.
5. Exécuter le rituel de contrôle (§4) pour établir l'état AVANT.

> **Un document de mission dans `chantier/` ne suffit pas à lui seul.**
> Il doit aussi apparaître comme `⬜ à faire` dans le tableau de bord
> d'`ETAT.md`, avec ses prérequis — sinon l'agent doit STOP (comme prévu
> §7). Ajouter cette ligne fait partie de la livraison de la mission :
> c'est la responsabilité de qui rédige le document (Claude, ou Cédric
> s'il écrit une mission lui-même), à faire AVANT de demander à Cursor
> de la lancer, pas une étape que l'agent doit deviner ou improviser.

**Séquence obligatoire de démarrage (régime Ticket) :**
1. Lire `chantier/00-REGLES.md`.
2. Lire le tableau de bord d'`ETAT.md` (pas tout le fichier — juste la
   partie "état courant", voir §9).
3. Exécuter le rituel de contrôle pour établir l'état AVANT.
4. Traiter le correctif tel que décrit dans le prompt de Cédric.

---

## 2. Périmètre et interdictions globales

*(s'applique aux deux régimes)*

### Toujours interdit
- ❌ Modifier quoi que ce soit **hors du périmètre** annoncé (par la
  mission, ou par le prompt du ticket). Si un problème est découvert hors
  périmètre : le NOTER dans ETAT.md (section « Découvertes »), ne pas le
  corriger.
- ❌ Ajouter une dépendance npm sans qu'elle soit explicitement demandée.
- ❌ Modifier les clés localStorage existantes ou le mapping
  `LOGICAL_KEY_TO_COLLECTION` dans `core/storage.js` (données de production
  + sync PocketBase : toute modification casse des données réelles).
- ❌ Supprimer ou modifier un test existant pour le faire passer.
  Un test qui casse = un problème à comprendre, pas à faire taire.
- ❌ Toucher à `deploy.example.sh`, `netlify.toml`, aux secrets, aux fichiers `.env`.
- ❌ Reformater massivement des fichiers non touchés par la mission/ticket.
- ❌ Push vers `origin`. Le travail reste local. Cédric pousse lui-même.

### Standards de code (identité technique du projet)
- Aucun fichier > ~300 lignes, **y compris quand une mission fait grossir
  un fichier existant par accumulation** (pas seulement les fichiers
  neufs). Si une mission/ticket porte un fichier au-delà, le découper
  fait partie du travail, même si ce n'était pas explicitement demandé —
  le signaler dans le compte-rendu.
- Tout nouveau fichier de logique métier non triviale reçoit un test.
- Commentaires uniquement sur la logique non évidente.
- Commits atomiques, format `type: description courte` en français
  (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- Un commit par étape logique, jamais un commit fourre-tout final.

### Langage de certitude dans les documents (règle anti-fausse-confiance)
Un document de mission ou un message de ticket **ne peut affirmer "cause
identifiée" ou "diagnostic confirmé" que si la cause a été vérifiée
concrètement** (lecture du code réel produisant le bug, reproduction
observée, ou preuve équivalente). Si la cause n'est qu'une hypothèse
plausible, l'écrire comme telle : **"Hypothèse H1 : …"**, et inclure la
vérification de cette hypothèse **dans la même mission/ticket** que le
correctif proposé — jamais un correctif seul basé sur une hypothèse non
vérifiée. Un document qui commence par "diagnostic" doit pouvoir montrer
la preuve, pas juste l'intuition la mieux formulée.

### Philosophie produit (non négociable)
- TDAH-first : jamais de friction ajoutée à la capture, jamais de
  culpabilisation dans les textes d'interface, jamais de perte de données
  silencieuse.
- La sauvegarde locale reste **synchrone** (localStorage). Aucun debouncing,
  aucun batching des écritures : la garantie « jamais perdre une pensée »
  prime sur la micro-performance.
- `prefers-reduced-motion` respecté sur toute nouvelle animation.

---

## 3. Environnement de travail

- Le chantier se fait dans un **clone séparé** du dépôt de production,
  sur la branche `chantier/redesign` (créée en M00).
- La version de production (dossier d'origine + Netlify) ne doit jamais
  être touchée par ce chantier.

---

## 4. Rituel de contrôle (AVANT et APRÈS, les deux régimes)

*Avant de lancer le rituel : vérifier qu'aucun `vite preview`/`esbuild`
résiduel d'une session précédente ne tourne encore (`ps aux | grep -i
"vite\|esbuild"`) — un process resté actif peut faire échouer `npm run
build` (écriture concurrente du service worker Workbox). Cause confirmée
une fois sur ce chantier (voir ETAT.md, M13).*

> ⚠️ **Ne jamais tuer un process `vite preview --host` sans demander
> d'abord à Cédric.** Le flag `--host` signale presque toujours SON
> serveur de test actif (Mac + iPhone sur le même réseau, laissé tourner
> en continu). Un process `vite`/`esbuild` SANS `--host` est plus
> probablement un résidu de build sans risque à arrêter. En cas de doute
> sur un process `--host` : STOP et demander confirmation avant de le
> tuer — l'incident du 2026-07-08 (M13) a coupé le serveur de Cédric
> pendant une session de dépannage, sans lui.

Exécuter ces commandes et consigner les résultats :

```bash
npm run test:smoke     # attendu : 20/20 modules OK, 4/4 shell OK
npm run test:unit      # attendu : tous les tests passent
npm run lint           # attendu : 0 erreur
npm run build          # consigner : taille des fichiers dist/assets/*
```

**Règle d'or : aucune métrique ne doit régresser.** Si les tests passaient
avant et échouent après, ou si le bundle grossit sans justification écrite
→ revenir en arrière (`git checkout`) et STOP.

---

## 5. Bugs visuels et de rendu : protocole spécifique

*(Distinct des bugs de logique. Un bug de logique se prouve et se
corrige par lecture de code. Un bug de rendu/compositing/plateforme ne se
prouve que par observation empirique dans un navigateur réel — le lire
dans le code ne suffit pas.)*

### Avant tout correctif : établir OÙ le bug se reproduit
1. **Se reproduit-il sur Safari desktop (Mac) ?** Si oui : itérer sur Mac,
   sans passer par un aller-retour iPhone à chaque essai. C'est plus
   rapide pour tout le monde, et la majorité des bugs WebKit se
   reproduisent aussi sur desktop.
2. **Sinon, spécifique à iOS ?** Utiliser l'inspecteur web distant de
   Safari (iPhone branché au Mac, Réglages iPhone → Safari → Avancé →
   Inspecteur web ; puis Safari Mac → menu Développer → [nom de
   l'iPhone]) pour observer directement (calques, styles calculés,
   console) plutôt que de deviner depuis le code source.
3. Ne PAS écrire de correctif avant d'avoir établi au moins l'un des deux.

### Échelle d'escalade obligatoire
- **1er correctif** sur une hypothèse claire : autorisé en Ticket.
- **Si ce correctif ne résout pas le bug** : le correctif suivant NE PEUT
  PAS être une deuxième hypothèse non vérifiée. Il doit être une **sonde**
  — une instrumentation ou un test A/B qui PROUVE la cause avant de
  proposer quoi que ce soit (voir §2, langage de certitude). Passer en
  régime Mission si ce n'est pas déjà fait.
- **Si la sonde prouve une cause, mais que le correctif direct dans le
  même contexte crée une régression ou reste fragile** : ne pas empiler
  un 3e correctif dans ce même contexte. Poser la question architecturale
  — *ce comportement doit-il vraiment vivre ici, ou dans un autre
  contexte qui n'a pas le problème ?* (ex. sortir une interaction d'une
  modale plutôt que de continuer à la corriger à l'intérieur).
- Cette échelle s'applique dès le **2e essai raté**, pas après plusieurs
  missions silencieuses sur le même symptôme.

---

## 6. Maquettes de validation

Une maquette HTML autonome, validée visuellement par Cédric avant
rédaction d'une mission, peut être désignée comme **"code à transplanter"**
uniquement si elle reproduit le contexte hôte réel pertinent (ex. : une
interaction destinée à vivre dans une modale scrollable doit être testée
DANS une modale scrollable équivalente, pas dans le vide).

Si la maquette ne reproduit pas ce contexte (prototype rapide, validation
de direction visuelle uniquement), elle doit être explicitement étiquetée
**"validation visuelle uniquement — pas code à transplanter"** dans le
document de mission qui la référence, et la mission doit prévoir un temps
d'intégration/test dans le contexte réel avant de considérer le travail
fini.

---

## 7. Protocole de blocage (STOP)

L'agent s'arrête et n'improvise JAMAIS quand :
- Un prérequis n'est pas rempli.
- Une instruction est ambiguë ou contradictoire avec le code réel.
- Une étape échoue deux fois de suite.
- La correction exigerait de sortir du périmètre.

En cas de STOP : écrire dans `chantier/ETAT.md`, section « Blocages »,
ce qui bloque, ce qui a été tenté, et la question précise à poser à Cédric.
Puis terminer proprement (commit du travail partiel si stable, sinon
`git stash` avec un nom explicite).

**Un STOP propre est une réussite. Une improvisation est un échec.**

---

## 8. Rituel de fin (Mission ou Ticket)

1. Rituel de contrôle (§4), résultats APRÈS consignés.
2. Mettre à jour `chantier/ETAT.md` selon le format cadré (§9) :
   - mission/ticket passé en ✅ avec date,
   - métriques avant/après,
   - décisions prises et leurs raisons,
   - découvertes hors périmètre (sans les corriger).
3. Mettre à jour `CHANGELOG.md`.
4. Commit final : `chore: cloture mission MXX` (ou `chore: ticket <sujet>`).
5. Résumé de 10 lignes max pour Cédric : ce qui a été fait, les
   métriques, ce qu'il doit vérifier visuellement.

---

## 9. Format d'ETAT.md (cadré — économie de contexte)

`ETAT.md` est relu en entier au début de chaque mission : sa taille est
un **coût fixe payé à chaque fois**, pas un espace illimité. Structure
cible :

1. **Tableau de bord** — une ligne par module/mission, statut seulement
   (✅/⬜/⚠️), pas de détail narratif.
2. **Les 3 dernières missions/tickets** — résumé court (5-10 lignes
   chacune).
3. **Décisions actives** — choix de valeurs ou d'architecture qui doivent
   rester connus (ex. retrait du streak sur Habitudes), sans historique
   de comment on y est arrivé.
4. **Blocages en cours**, s'il y en a.

Tout le reste (détail complet d'une mission ancienne, raisonnement pas à
pas, diagnostics dépassés) part dans `chantier/archives/ETAT-historique.md`
ou reste dans le document de mission d'origine (déjà dans le dépôt,
consultable si besoin, pas besoin de dupliquer dans ETAT.md).

*Note : ce cadrage est la cible. La migration d'un ETAT.md existant vers
ce format est un travail à part (mission dédiée), pas une action
automatique de chaque fin de mission.*

---

## 10. Checklist de validation humaine (pour Cédric, entre deux missions)

*~15 minutes pour une Mission. Quelques minutes pour un Ticket (rituel de
contrôle + test visuel ciblé suffisent, pas besoin de tout relire).*

- [ ] `git log --oneline` : les commits racontent une histoire lisible.
- [ ] Rituel de contrôle relancé à la main : tout passe.
- [ ] `npm run preview` : vérification visuelle ciblée (Mission : 2 min de
      navigation générale ; Ticket : juste la zone corrigée).
- [ ] `chantier/ETAT.md` lu (tableau de bord suffit pour un ticket) :
      les décisions sont acceptables, les découvertes sont notées.
- [ ] Si tout est vert : ouvrir la conversation suivante (§11).

---

## 11. Prompts d'amorçage

**Mission :**
```
Lis dans l'ordre : chantier/00-REGLES.md, chantier/ETAT.md,
puis chantier/MXX-<nom>.md. Vérifie les prérequis. Exécute le rituel
de contrôle AVANT. Puis exécute la mission MXX en respectant strictement
son périmètre. Applique le protocole STOP au moindre doute.
```

**Ticket :**
```
Lis chantier/00-REGLES.md (régime Ticket) et le tableau de bord de
chantier/ETAT.md. Rituel de contrôle AVANT. Correctif demandé :
<description précise, fichiers concernés, cause connue ou hypothèse à
vérifier>. Si tu ne peux pas établir la cause avec certitude avant de
corriger, dis-le et propose la sonde de vérification au lieu de patcher
à l'aveugle. Rituel de contrôle APRÈS.
```
