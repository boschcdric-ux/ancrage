# M13 — Refonte du module Météo : le ciel se lit comme l'eau

**Régime : Mission** (plusieurs fichiers, nouvel appel API enrichi, état
supplémentaire pour la recherche "ailleurs"). Premier chantier mené sous
`00-REGLES.md` v2 — voir en particulier §5 (bugs de rendu), §6 (maquettes)
et la règle anti-certitude (§2) appliquées ci-dessous.

**Prérequis :** aucun. **Durée attendue :** session moyenne (2-3 h).

> Ajouter la ligne M13 au tableau de bord d'`ETAT.md` (format cadré §9 —
> une ligne, pas un roman).

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M13-meteo.html`** — validée visuellement
par Cédric (disposition, hiérarchie, 4 thèmes, mouvement réduit non
vérifié explicitement — à contrôler quand même par défaut).

### Étiquetage de la maquette (règle §6 — appliqué pour la première fois)
- **Le VISUEL et la disposition** (structure de la carte, jauge
  thermique, courbe SVG de la marée thermique, cartes des jours, grille
  des stats, ligne ciel étoilé) : **code à transplanter**, la mise en
  page et les calculs de tracé (SVG, dégradés, positionnement du
  marqueur) sont directement réutilisables.
- **La LOGIQUE DE DONNÉES** (mapping des vraies réponses Open-Meteo vers
  ces éléments visuels) : **hypothèse à vérifier en réel**, pas du code à
  transplanter tel quel — la maquette utilise des données FIGÉES en dur
  (une journée type). Voir Hypothèses ci-dessous.

---

## Le concept (rappel, la maquette fait foi pour le détail visuel)

Le module actuel affiche le minimum (température actuelle + 5 jours en
liste plate). Refonte complète dans le thème d'Ancrage : "le ciel se lit
comme l'eau". Ordre de lecture voulu par Cédric, du plus important au
moins important : (1) le lieu, (2) la jauge thermique verticale
("froid en bas, chaud en haut" — écho de la ligne de flottaison des
Tâches), (3) la courbe horaire ("marée thermique" du jour), (4) les
jours à venir. Une carte unifiée "conditions du moment" (températures
réelle/ressentie + soleil/lune/vent/humidité + une ligne dérivée sur la
qualité du ciel pour l'observation des étoiles) remplace deux anciennes
cartes surdimensionnées. Un conseil discret (1-2 lignes, jamais
culpabilisant) complète l'ensemble. Une recherche "Ailleurs" permet de
consulter la météo d'une autre ville PONCTUELLEMENT (ex. avant une
rando) sans écraser la ville par défaut.

---

## ⚠️ Hypothèses à vérifier (règle anti-certitude, §2 de 00-REGLES v2)

**Aucune de ces hypothèses n'a été vérifiée par un appel réel à l'API**
(l'environnement de conception n'a pas accès à `api.open-meteo.com`).
Le module réel, lui, appelle déjà cette API avec succès (`current` et
`daily` fonctionnent en production) — seuls les paramètres NOUVEAUX
ci-dessous sont non vérifiés :

- **H1 — Paramètre `hourly`** : `temperature_2m` (et optionnellement
  `apparent_temperature`, `weathercode`) sur `hourly` devrait renvoyer un
  tableau de 24 valeurs par jour demandé, aligné sur `hourly.time`
  (format ISO horaire). À VÉRIFIER : structure exacte de la réponse,
  et surtout comment isoler les 24 valeurs du jour courant (l'API
  renvoie l'horaire sur toute la plage `forecast_days`, pas juste
  aujourd'hui — un filtrage sur la date du jour sera nécessaire).
- **H2 — Lever/coucher du soleil** : `daily=sunrise,sunset` devrait
  exister (paramètres standards documentés Open-Meteo). À VÉRIFIER :
  format de l'heure retournée (ISO avec ou sans timezone déjà appliqué,
  vu que `timezone=auto` est déjà utilisé par le module).
- **H3 — Données lunaires** : Open-Meteo ne fournit PAS nativement la
  phase lunaire dans l'endpoint `forecast` standard (à confirmer en
  premier, avant tout le reste de H3). Si absente, deux options : (a) un
  calcul de phase lunaire côté client (algorithme classique à base de
  date, pas besoin d'API — âge du cycle synodique ≈ 29,53 jours depuis
  une nouvelle lune de référence connue), ou (b) chercher si un paramètre
  dédié existe dans la documentation Open-Meteo actuelle. **Si aucune
  des deux ne se confirme rapidement (< 15 min de recherche) : STOP sur
  ce point précis, proposer à Cédric de livrer le reste de la mission
  SANS la carte lunaire plutôt que de improviser une donnée fausse.**
  Le lever/coucher de lune (utilisé par la ligne "ciel étoilé") dépend
  de la même incertitude.
- **H4 — Vent et humidité** : `windspeed_10m` et `relativehumidity_2m`
  sont DÉJÀ utilisés avec succès dans `current` (code existant, l.190) —
  pas une hypothèse, un fait acquis. Aucune vérification nécessaire ici.
- **H5 — Couverture nuageuse** (pour la ligne "ciel étoilé") :
  `cloudcover` est un paramètre standard documenté Open-Meteo, présumé
  disponible sur `current` et/ou `hourly`. À vérifier en même temps que H1.

**Pour chaque hypothèse confirmée fausse ou incomplète à l'usage :** ne
pas improviser un correctif sur place si ça sort du périmètre de
compréhension immédiate — noter dans ETAT.md (Découvertes) et, si ça
bloque une fonctionnalité entière (ex. H3), appliquer le repli décrit
plutôt que d'inventer une donnée.

---

## Périmètre

**IN :**
- `weather/index.js` — nouveaux paramètres API (`hourly`, `sunrise`,
  `sunset`, `cloudcover` a minima ; lune selon issue de H3), état pour la
  recherche "ailleurs" éphémère (NE PAS toucher `CITY_STORAGE_KEY` — la
  recherche ailleurs ne persiste pas, c'est un état de session volatile),
  réutilisation de la fonction de géocodage existante (déjà présente,
  l.265+, ne pas la dupliquer).
- `weather/view.js` — nouveau template suivant la maquette (carte lieu,
  carte conditions unifiée, jauge thermique SVG/CSS, courbe marée
  thermique SVG, cartes jours, ligne ciel étoilé).
- `weather/style.css` — nouveaux styles, 4 thèmes, palette thermique
  commune (voir maquette : `tempColor()` et ses stops de dégradé, à
  reprendre tels quels, ce sont des constantes visuelles pas des
  données).
- `weather/README.md` — **actuellement un gabarit vide** (jamais rempli).
  Le remplir correctement fait partie de la mission (description,
  données stockées, interactions avec d'autres modules — noter que ce
  module est un candidat FUTUR pour Jarvis, sans rien coder pour Jarvis
  maintenant).

**OUT :** tout autre module. Qualité de l'air (explicitement écartée par
Cédric — pas dans cette mission, ni maintenant ni "vite fait en passant").

---

## Modèle de données

**Conservé :** `CITY_STORAGE_KEY` (ville par défaut), `ONBOARDED_KEY`,
`normalizeCity`, le flux d'onboarding existant ("Utiliser ma position" /
recherche / "Passer" — visible dans l'état actuel de l'app, NE PAS le
refondre, seule la vue "météo chargée" change).

**Nouveau, non persisté :** un état `elsewhereCity` (ou nom similaire)
qui n'écrit JAMAIS dans `CITY_STORAGE_KEY` — la recherche "Ailleurs"
affiche temporairement la météo d'une autre ville, revient à la ville
par défaut à la fermeture du panneau ou à la navigation hors du module
(comportement exact à choisir par Cursor selon ce qui s'intègre le plus
proprement dans l'état existant — PAS un point de blocage, trancher et
documenter le choix dans le compte-rendu).

---

## Détails de fidélité
- Jauge thermique : bornes min/max = min/max du jour (`temperature_2m_min/max`
  déjà récupérés), le marqueur se positionne selon la température
  actuelle (`current.temperature_2m`) — PAS besoin d'une échelle globale
  fixe, relative au jour comme dans la maquette.
- Courbe horaire : isoler les heures du jour EN COURS uniquement (voir H1),
  marquer l'heure actuelle avec le point et l'étiquette.
- Grille de stats : `minmax(0,1fr)`, ellipsis sur les valeurs longues
  (leçon anti-débordement transverse du chantier).
- Ligne ciel étoilé : reprendre la logique de `describeStargazing()` de
  la maquette (seuils sur couverture nuageuse + luminosité lunaire),
  l'adapter aux vraies données une fois H3/H5 résolues.
- Conseils discrets : 1-2 lignes, ton bienveillant jamais culpabilisant
  (règle transverse du chantier, déjà appliquée partout ailleurs).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke/unit/lint/build verts.
- [ ] **Taille de fichier — preuve requise** (règle checklist durcie) :
      coller la sortie de `wc -l src/modules/weather/*.js` dans le
      compte-rendu de clôture. Découper si > ~300 lignes par fichier.
- [ ] Chaque hypothèse H1-H5 : résultat noté dans le compte-rendu
      (confirmée / infirmée / contournée), PAS juste "ça marche" sans
      détail — c'est la première application concrète de la règle
      anti-certitude, elle doit être visible dans le rendu.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - lieu par défaut affiché correctement, bascule "Ailleurs" fonctionnelle
    et NE MODIFIE PAS la ville par défaut après navigation ;
  - carte conditions : températures + 4 stats + ligne ciel étoilé,
    aucun débordement ;
  - jauge thermique : marqueur cohérent avec la température actuelle ;
  - courbe : 24h du jour courant, heure actuelle marquée ;
  - jours à venir : cohérents avec les données déjà existantes ;
  - conseil discret présent et non culpabilisant ;
  - `prefers-reduced-motion` : pas d'animation surprise (peu
    d'animation prévue sur ce module, vérifier quand même) ;
  - onboarding existant ("Utiliser ma position"/"Passer") non régressé.
- [ ] `README.md` du module rempli (plus un gabarit vide).

## Note ETAT.md (format cadré §9 — court)
Consigner en une ligne au tableau de bord + un résumé court : Météo
refondu, 7e emploi de l'eau (mesure/accueille/guide/situe/traduit
l'intérieur/accueille le retour/**lit le ciel**). Premier chantier sous
règles v2 : noter si le régime Mission était bien choisi (aurait-il pu
être un Ticket plus léger ?) et si la règle anti-certitude a changé
quelque chose de concret dans l'exécution — ce retour d'expérience
compte autant que le résultat visuel pour la suite du chantier.
