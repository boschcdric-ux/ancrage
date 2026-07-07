# Checklist de sortie — à passer à la fin de chaque module refondu

Porte de validation rapide (~5 min), PAS une mission. À vérifier avant de
considérer un module comme "terminé", tant que le contexte est frais.

## Hygiène de code
- [ ] Aucun fichier du module > ~400 lignes (sinon découper : view/logic/style
      ou sous-modules par responsabilité). Rappel dette ancienne à traiter en
      fin de chantier : budget/index.js (1333L), recipes/index.js (1177L).
- [ ] Zéro `!important` dans le CSS du module.
- [ ] Zéro couleur en dur : tout passe par les tokens de thème.
- [ ] Tout élément de fond déclare un `background` token (jamais implicite —
      invisible en thème clair, cassé en thème sombre).

## Containment (anti-débordement)
- [ ] `box-sizing:border-box` + `max-width:100%` sur les conteneurs.
- [ ] Grilles en `minmax(0,1fr)`, jamais `1fr` seul.
- [ ] Champs `<input type=date/time>` : `-webkit-appearance:none` (iOS).
- [ ] Champs de saisie ≥ 16px (évite le zoom iOS).
- [ ] Testé à ≤ 375px de large ET sur grand écran.

## Modales (si présentes)
- [ ] `<dialog>` ouvert par `showModal()` JS uniquement — jamais `open` en HTML.
- [ ] Jamais animer le `<dialog>` lui-même — animer un wrapper interne.
- [ ] `width:min(...);margin:auto` — jamais `width:100%` sur le dialog.
- [ ] **Panneaux/panels PRÉEXISTANTS non touchés par la refonte** (ex. un
      `<aside>` en `position:fixed` avec `top/right/bottom` codés en dur,
      un ancien menu de gestion, un réglage secondaire) : vérifier s'ils
      utilisent encore l'ancien pattern (pas de centrage, pas de backdrop).
      Une refonte ne doit pas laisser de côté les fenêtres annexes du
      module sous prétexte qu'elles existaient avant — les recenser
      explicitement et les convertir au pattern `<dialog>` dans la même
      mission, ou noter la dette si reportée à une mission dédiée.

## Animations
- [ ] Élément animé PERSISTANT (pas recréé par un innerHTML/re-render).
- [ ] Un tap sur un simple sélecteur ne déclenche jamais un re-render global
      si un élément à état interne (canvas, moteur JS) est présent.
- [ ] `prefers-reduced-motion` respecté (positions correctes, sans animation).
- [ ] Canvas/boucle : régime de repos léger ou arrêt au repos selon le cas.

## Fidélité & non-régression
- [ ] Rituel vert : smoke + unit + lint + build.
- [ ] Modèle de données inchangé (ou migration explicite et justifiée).
- [ ] Widget dashboard du module non régressé.
- [ ] Testé sur les 4 thèmes.
