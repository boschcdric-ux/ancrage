# M10b — Agenda : modale centrée, boutons lisibles + espacement haut (socle)

**Prérequis :** M10 exécutée (⏳ — M10b la finalise ; validation groupée
M10 + M10b). Deux correctifs Agenda + un correctif de SOCLE qui bénéficie
à toute l'app (début de l'harmonisation demandée).
**Durée :** ~1 h 30. **Risque :** faible (le correctif socle est petit mais
transversal — tester quelques modules).

> Ajouter la ligne M10b au tableau de bord d'ETAT.md.

---

## Correctif 1 — Modales non centrées verticalement (Agenda)

**Symptôme :** détail et « + Poser » apparaissent en HAUT de l'écran ; il
faut scroller pour les voir. Centrage horizontal OK, vertical cassé.

**Cause (auditée) :** le CSS `.cal__detail/.cal__composer` a bien
`margin:auto` + `width:min(...)`, et le JS utilise `showModal()`. Mais
l'animation d'entrée applique un `transform` (`cal-modal-in`:
`translateY(...) scale(...)`) SUR l'élément `<dialog>` lui-même. Un
`transform` sur un dialog en top layer interfère avec le centrage calculé
par `margin:auto` du navigateur → l'élément se cale en haut.

**Correctif :** ne jamais animer le `<dialog>` directement. Déplacer
l'animation d'entrée sur un enfant wrapper (`.cal__detail-card` /
`.cal__composer-card` — déjà présents d'après la maquette), et laisser le
`<dialog>` gérer uniquement le centrage :

```css
.cal__detail,
.cal__composer {
  border: none; padding: 0; background: transparent;
  color: var(--text-primary);
  width: min(380px, calc(100vw - 32px));
  margin: auto;            /* centrage natif — NE RIEN AJOUTER dessus */
}
/* plus d'animation ni de transform sur le dialog lui-même */
.cal__detail[open] .cal__detail-card,
.cal__composer[open] .cal__composer-card {
  animation: cal-modal-in var(--duration-normal) var(--ease-out) both;
}
.cal__detail[open]::backdrop,
.cal__composer[open]::backdrop {
  animation: cal-fade-in var(--duration-normal) ease both;
}
```

Si le markup n'a pas de wrapper `-card` interne, l'ajouter dans view.js
(un `<div class="cal__detail-card">` / `cal__composer-card` enveloppant le
contenu du dialog). Vérifier ensuite : la modale s'ouvre CENTRÉE, quelle
que soit la position de scroll, sur les deux vues et les 4 thèmes.

---

## Correctif 2 — Boutons illisibles (Agenda)

**Symptôme :** dans le composeur/détail, boutons « Annuler »/« Poser » au
texte quasi invisible (contraste cassé, cf. capture).

**Cause (auditée) :** `.cal__btn` définit `color: var(--text-secondary)`
mais son `background` (`--bg-tertiary`) et sa couleur ne sont pas garantis
lisibles sur tous les thèmes ; la variante primary passe en `--accent` +
`--text-on-accent` mais le rendu montre un texte peu contrasté (le fond
accent + texte hérité au lieu de `--text-on-accent` dans certains états).

**Correctif :** rendre les trois variantes explicites et contrastées :
```css
.cal__btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);        /* était --text-secondary : trop pâle */
  border: 1px solid var(--border);
  /* ...reste inchangé... */
}
.cal__btn--primary {
  background: var(--accent);
  color: var(--text-on-accent);      /* forcer, y compris :hover/:active */
  border-color: transparent;
}
.cal__btn--primary:hover { background: var(--accent-hover); color: var(--text-on-accent); }
.cal__btn--danger {
  background: var(--bg-tertiary);
  color: var(--danger);
  border-color: var(--danger);
}
```
Vérifier le contraste du texte dans les 4 thèmes (notamment Garrigue et
Marée, clairs).

---

## Correctif 3 — Espacement haut de l'app (SOCLE — bénéficie à tout)

**Symptôme (Cédric) :** l'app est trop haute, collée au bord supérieur de
l'écran ; gêne pour appuyer sur les boutons du haut (Jour/Semaine/Mois).

**Cause (auditée) :** `src/core/styles.css` ~l.704,
`#app[data-nav-layout="mobile-bar"] #app-module-content` a
`padding-top: 0`. Aucune marge haute ni prise en compte de la safe-area
supérieure (encoche / barre d'état iOS).

**Correctif (socle, appliqué une fois pour tous les modules) :**
```css
#app[data-nav-layout="mobile-bar"] #app-module-content {
  /* ... */
  padding-top: calc(env(safe-area-inset-top, 0px) + var(--space-4));
}
```
Ceci résout le problème pour l'Agenda ET tous les autres modules d'un
coup — première pierre de l'harmonisation. Ne PAS ajouter de padding-top
par module (éviter les doublons). Vérifier que le padding s'applique bien
sous l'encoche sur iPhone et ne crée pas de double-marge avec un module
qui aurait déjà son propre espacement (si un module en a un en dur, le
noter pour la future mission balai, ne pas le corriger ici).

---

## Périmètre
**IN :** `calendar/style.css` (modale + boutons), `calendar/view.js` (wrapper
`-card` si absent), `core/styles.css` (padding-top, 1 ligne).
**OUT :** logique métier Agenda, autres modules (juste les TESTER pour le
padding), moteur de vues.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - modale détail ET « + Poser » : CENTRÉES à l'écran quelle que soit la
    position de scroll (haut, milieu, bas de journée/semaine) ;
  - boutons Annuler/Poser/Enregistrer/Supprimer/Fermer/Modifier :
    texte lisible, bon contraste, dans les 4 thèmes ;
  - le haut de l'app n'est plus collé au bord : les boutons Jour/Semaine/
    Mois et l'ancre sont accessibles confortablement, sous l'encoche ;
  - vérifier 2-3 AUTRES modules (Tâches, Capture, Respiration) : le
    padding-top les améliore aussi et ne casse rien.
- [ ] Mouvement réduit : modales sans animation, centrées.

## Note ETAT.md
Consigner : (a) patron modale — **ne jamais animer le `<dialog>` lui-même**
(transform casse le centrage top layer) ; animer un wrapper interne.
Compléter le patron canonique des modales. (b) Padding-top de safe-area
ajouté au socle → **première pierre de l'harmonisation**. Planifier la
mission balai `--module-max-width` + revue des espacements de TOUS les
modules pour finir l'harmonisation demandée par Cédric.
