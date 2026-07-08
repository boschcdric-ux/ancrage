# Module : weather

> Ce fichier doit être lu par toute IA avant de modifier ce module.
> Respecter le DESIGN_SYSTEM.md à la racine du projet.

## Description
Le module `weather` affiche la meteo avec une lecture "Ancrage" :
- lieu courant (ville par defaut) + mode ponctuel "Ailleurs" non persistant ;
- carte conditions unifiee (reelle/ressentie, soleil, lune calculee, vent, humidite, ciel etoile) ;
- jauge thermique verticale relative aux min/max du jour ;
- courbe horaire 24h ("maree thermique") et jours a venir.

Le parcours onboarding ("Utiliser ma position", recherche, "Passer") est conserve.

## Données stockées
- `weather:selected-city` : ville par defaut choisie pour le module (persistante).
- `weather:onboarded` : indicateur de passage onboarding.

Le mode "Ailleurs" est volontairement volatile (etat session en memoire uniquement).

## Interactions avec d'autres modules
- Dashboard : `getDashboardWidget()` expose une ligne resumee (ville, icone, temperature, description).
- Shell/navigation : aucune ecriture hors ses cles de stockage ; comportement standard init/destroy.

Candidat futur Jarvis : le snapshot meteo courant est lisible et pourrait alimenter des suggestions contextuelles (sans integration Jarvis codee ici).

## Export attendu
```javascript
export default {
  id: 'weather',
  label: 'Meteo',
  icon: '🌤',
  init(container) {},
  destroy() {},
  getDashboardWidget() { return null; }
}
```
