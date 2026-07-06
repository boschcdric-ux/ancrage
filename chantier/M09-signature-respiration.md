# M09 — Signature du module Respiration : respirer avec la mer

**Prérequis :** saga Capture (M07 → M08e) ✅ validée dans ETAT.md.
**Durée attendue :** une session (3–4 h).
**Risque :** moyen. Présentation + câblage marée + moteur audio.
Protocole v2 : tout ce qui est délicat est fourni en code à copier.

> Avant de commencer : ajouter la ligne M09 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M09-respiration.html`** — validée par Cédric
(design ET son). L'utiliser AVANT de coder : lancer les 3 programmes aux
rythmes différents (Calmer l'angoisse 4-6, Dormir 4-7-8, Concentration
box), activer le « Son des vagues », tester pause/reprendre/terminer,
les 4 thèmes, le mouvement réduit.

**RÈGLE DE LECTURE :**
- HTML/CSS = référence à transposer (structures, tokens, textes, timings).
- JS = démonstration jetable, SAUF DEUX BLOCS À TRANSPLANTER TELS QUELS
  (adapter uniquement les noms/intégration, pas la logique) :
  1. **Le moteur audio** : `initAudio()`, `waveSound(phase, dur)`,
     `stopSound()` — bruit adouci + lowpass + enveloppes par phase.
  2. **La commande de marée** : `setWater(level, seconds, easing)` et les
     variables CSS `--level`, `--breath-ms`, `--breath-ease` sur `.sea`,
     avec LOW=22 / HIGH=82 et les easings exacts de la maquette.
- Le module réel GARDE son moteur de phases existant (timers, ordre
  inhale→hold→exhale→holdAfterExhale, calcul des cycles) : on branche la
  marée et le son SUR ce moteur, on ne le réécrit pas.

---

## L'intention

L'orbe disparaît. **La mer devient le guide** : elle monte à l'inspiration
(easing `cubic-bezier(.35,0,.35,1)`, durée = durée de la phase), se tient
pendant la rétention (halo `--water-glow`, houle ralentie, classe
`holding`), redescend à l'expiration (`cubic-bezier(.45,0,.55,1)`).
Toucher l'eau démarre la séance ; toucher en cours = pause.
Labels de phase : Inspire / Retiens / Expire / Poumons vides.
Fine ligne de progression de session en haut. Compteur « cycle N / M ».
Fin : **« Mer étale. »** + « Séance tenue. », l'eau redescend en ~3 s.
Écran d'attente : « Respire avec la mer » / « Touche l'eau pour commencer ».

## Le son des vagues (remplace le son actuel)

Le bip existant est remplacé par le moteur de la maquette : bruit filtré
dont volume et clarté suivent la marée — la vague arrive à l'inspiration
(gain→0.16, filtre→900 Hz sur la durée de la phase), se retire à
l'expiration (descente vers 0.015, 240 Hz), nappe basse en rétention
(0.05, 320 Hz). Le réglage existant Activé/Désactivé est CONSERVÉ
(persistance actuelle incluse). Contraintes : `AudioContext` créé au
premier geste utilisateur ; `resume()` si suspendu ; `stopSound()` en
pause et en fin de séance.

---

## Périmètre

**IN :**
- `src/modules/breathing/view.js` : structure (carte-mer, phase, ligne de
  session, cycles, programmes, réglages durée + son).
- `src/modules/breathing/style.css` : réécriture vers la maquette.
  Résorber la couleur en dur `#a78bfa` et toute autre → tokens. Zéro
  `!important`. **Largeur standard `min(420px, 100%)` centrée** — première
  brique de l'harmonisation des largeurs (mission balai à suivre).
- `src/modules/breathing/index.js` : câblage marée + audio sur le moteur
  de phases existant ; suppression de la logique de taille d'orbe
  (`orbSizePx` etc.) devenue morte.

**OUT (interdit) :**
- Le moteur de phases/timers/calcul de cycles (il fonctionne).
- Les 5 programmes (ids, libellés, rythmes, descriptions) et la
  persistance des réglages/sessions.
- Le widget dashboard du module (s'il existe) : ne pas le casser ;
  adaptation minimale si des classes partagées changent.
- Tout autre module, le shell.

---

## Leçons appliquées d'office
- Pas de menu flottant ici — aucun risque popover. Si un besoin de menu
  apparaissait : patron canonique `composant-popover-tag.html`, jamais
  `popovertarget` + handler JS ensemble.
- `prefers-reduced-motion` ET le réglage interne éventuel : AUCUNE
  animation d'eau ni houle ; le guide devient le compte à rebours textuel
  (déjà présent dans la maquette : phase + « N s », affiché en toutes
  circonstances). La fonction reste entière sans la mer.
- La carte-mer est cliquable (`role="button"`, tabindex, Enter/Espace) —
  reprendre les attributs de la maquette.
- Couche décorative : l'eau vit DANS la carte (`overflow:hidden` sur la
  carte est ici légitime, rien d'interactif ne doit en déborder).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable (±3 KB gzip — l'audio ajoute un peu).
- [ ] `git diff` relu : breathing/ uniquement ; moteur de phases intact.
- [ ] `grep -n "a78bfa" src/modules/breathing/` → aucune occurrence.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - 3 programmes aux rythmes distincts : la mer suit fidèlement les durées
    (montée 4 s, tenue 7 s, descente 8 s sur le programme Dormir) ;
  - toucher l'eau : démarre ; re-toucher : pause ; Reprendre ; Terminer ;
  - « Mer étale. Séance tenue. » en fin de session complète ;
  - son des vagues : arrive/se retire avec la marée, réglage on/off
    conservé entre sessions, aucun son si désactivé ;
  - largeur du module alignée (420 px max, centré) ;
  - mouvement réduit : aucune animation, compte à rebours textuel guide
    la séance de bout en bout.

## Note ETAT.md
Consigner : Respiration = 3e signature (l'eau qui mesure → l'eau qui
accueille → l'eau qui guide). Largeur standard posée — planifier la
mission balai d'harmonisation des largeurs de TOUS les modules juste
après. Protocole v2 en vigueur (audit avant correctif, code à copier,
correctifs groupés, rapports allégés).
