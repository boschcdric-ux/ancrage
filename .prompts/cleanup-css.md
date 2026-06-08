# Template — Nettoyage CSS / couleurs

> Copie ce prompt dans Cursor pour uniformiser les couleurs d'un module.

---

```
Lis DESIGN_SYSTEM.md en entier.
Lis src/modules/[NOM_MODULE]/style.css
et src/modules/[NOM_MODULE]/view.js.

Avant de coder, liste :
1. Toutes les couleurs hardcodées dans style.css
   (#, rgb, rgba, white, black)
2. Tous les styles inline dans view.js
   (style="color:..." ou style="background:...")
   Ces styles inline écrasent le CSS quoi qu'il arrive.

PROBLÈME :
[Décrire les problèmes visuels observés
en mode chaud/sombre/clair]

CORRECTION :
Remplace toutes les couleurs hardcodées 
par les variables CSS correspondantes :

- Fonds clairs → var(--bg-secondary) ou var(--bg-tertiary)
- Texte foncé → var(--text-primary)
- Texte secondaire → var(--text-secondary)
- Bordures → var(--border)
- Boutons primaires → var(--accent)
- Boutons danger → var(--danger)
- Succès → var(--success)
- Avertissement → var(--warning)
- Texte sur fond coloré → var(--text-on-accent)
- rgba(x,x,x,0.N) → color-mix(in srgb, var(--bg-primary) N%, transparent)

Clause de non-régression :
Liste tous les sélecteurs modifiés.
Confirme qu'aucune couleur hardcodée 
ne subsiste après correction.

Clause de périmètre :
Ne touche qu'à src/modules/[NOM_MODULE]/style.css
et src/modules/[NOM_MODULE]/view.js si nécessaire.
```
