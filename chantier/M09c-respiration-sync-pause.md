# M09c — Respiration : synchroniser l'eau avec l'état réel (démarrage + pause)

**Prérequis :** M09b ✅ (l'eau anime enfin en cours de séance normale).
Ce correctif règle les deux cas limites : le tout premier instant, et la
pause. **Fonctionne déjà bien sans pause** (confirmé par Cédric) — la
cause est isolée à ces deux transitions d'état précises.
**Durée attendue :** ~1 h. **Risque :** faible, deux points isolés.

---

## Diagnostic (audité sur le code réel, cause commune)

Une transition CSS (`transition: height ...`) tourne sur l'horloge du
NAVIGATEUR dès qu'elle démarre — elle est totalement indépendante du
minuteur JS (`setInterval`). Le moteur pilote l'eau en lui donnant des
ordres (« va à HIGH en 4s ») mais ne reprend jamais la main dessus une
fois l'ordre donné. Deux angles morts en découlent :

### Bug 1 — au démarrage, l'eau est déjà en haut
`startSession()` (index.js ~l.465-483) : `waterLevel = WATER_LOW; render({
applyPhase: true })`. Dans `render()`, l'élément mer est inséré via
`innerHTML` à l'état LOW, puis, **dans la même exécution synchrone**,
`onPhaseStart('inhale', dur)` → `setWater(HIGH, ...)` change la propriété
CSS vers HIGH. Le navigateur n'a jamais peint l'état LOW avant qu'on lui
redemande HIGH : il n'a rien à partir de quoi interpoler, donc il saute
directement à HIGH sans transition visible (même famille que le flash de
popover — élément neuf + mutation immédiate = pas d'animation).

### Bug 2 — la pause ne gèle pas l'eau
`pauseSession()` (~l.487-492) arrête `tick`/le son mais n'écrit RIEN sur
`--level` ni sur la transition. La transition CSS lancée au début de la
phase (avec la durée PLEINE de la phase) continue de tourner sur son
horloge propre jusqu'à son terme, ignorant totalement la pause — d'où
l'eau qui continue son mouvement, indépendamment du bouton.

---

## Correctifs attendus (code à transplanter, protocole v2)

### Correctif 1 — démarrage : laisser peindre LOW avant de viser HIGH

Dans `startSession()`, séparer le rendu initial (LOW) de l'ouverture de
la première phase (HIGH), avec un `requestAnimationFrame` ENTRE LES DEUX
— garantissant que le navigateur peint LOW avant de recevoir l'ordre HIGH :

```js
function startSession() {
  if (soundEnabled) { initAudio(); void resumeAudioIfNeeded(); }
  reducedMotion = prefersReducedMotion();
  const s = readSettings();
  durationMin = s.durationMin;
  soundEnabled = s.soundEnabled;
  programId = s.programId;
  totalCycles = computeTotalCycles();
  cycleIndex = 1;
  const phases = getActivePhases();
  phase = phases[0];
  phaseRemainingMs = getPhaseDurationSec(phase) * 1000;
  screen = 'running';
  waterLevel = WATER_LOW;

  render();                          // peint l'état LOW, SANS déclencher la phase
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {    // 2 rAF : garantit une peinture réelle entre les deux
      if (screen !== 'running') return;   // session annulée entre-temps ?
      onPhaseStart(phase, phaseRemainingMs / 1000);
      updateLiveDom();
    });
  });

  clearTick();
  tickId = window.setInterval(tick, 250);
}
```

(Le double rAF est délibéré : un seul peut parfois se produire avant la
peinture réelle selon le navigateur — c'est la marge de sécurité qui a
réglé des bugs de même famille par le passé sur ce chantier.)

### Correctif 2 — pause : geler la valeur réelle, reprise : repartir du point gelé

**Au moment de la pause**, lire la hauteur RÉELLEMENT peinte (le navigateur
interpole `height` en continu, donc `getComputedStyle` donne la valeur
exacte à l'instant T) et la figer sans transition :

```js
function freezeWaterAtCurrentPosition() {
  const sea = rootContainer?.querySelector('[data-breathing-sea]');
  if (!(sea instanceof HTMLElement)) return;
  const card = sea.closest('[data-breathing-sea-card]');
  if (!(card instanceof HTMLElement)) return;
  const currentPx = parseFloat(getComputedStyle(sea).height);
  const cardPx = card.getBoundingClientRect().height;
  const pct = cardPx > 0 ? (currentPx / cardPx) * 100 : waterLevel;
  sea.style.transition = 'none';
  sea.style.setProperty('--level', `${pct}%`);
  waterLevel = pct;
  void sea.offsetHeight; // force l'application avant tout futur changement
  sea.style.transition = '';
}

function pauseSession() {
  if (screen !== 'running') return;
  screen = 'paused';
  clearTick();
  stopSound();
  if (!reducedMotion) freezeWaterAtCurrentPosition();
  applyPhaseToDom();
}
```

**À la reprise**, relancer une transition depuis ce point gelé vers la
cible de la phase en cours, avec pour durée le temps RESTANT (pas la
durée pleine de la phase) :

```js
function resumeSession() {
  if (screen !== 'paused') return;
  screen = 'running';
  const durSec = phaseRemainingMs / 1000;
  applyPhaseToDom({ applyPhase: true, phaseDurSec: durSec });
  tickId = window.setInterval(tick, 250);
}
```

(`resumeSession` appelle déjà `applyPhaseToDom({applyPhase:true,
phaseDurSec: durSec})` qui elle-même appelle `onPhaseStart(phase, durSec)`
→ `setWater(cible, durSec, easing)` — donc une NOUVELLE transition démarre
depuis la valeur gelée vers la cible, sur la durée restante seulement.
Vérifier que ce chemin existant fonctionne bien conjointement avec le gel :
c'est le gel qui manquait, le redémarrage était déjà correct.)

**Cas `hold`/`holdAfterExhale` :** ces phases ne changent pas `--level`
(l'eau ne bouge pas pendant la rétention) — `freezeWaterAtCurrentPosition`
peut s'appliquer sans effet visible dans ce cas, c'est sans risque.

---

## Périmètre
**IN :** `breathing/index.js` uniquement — `startSession()`,
`pauseSession()`, nouvelle fonction `freezeWaterAtCurrentPosition()`.
**OUT :** tout le reste (moteur de phases, son, vue, CSS, autres modules).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] `git diff` : quelques dizaines de lignes dans un seul fichier.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - **Démarrage** : toucher l'eau → elle part VISIBLEMENT du bas et monte
    (plus jamais déjà en haut au premier instant), sur les 3 programmes ;
  - **Pause en pleine inspiration** : l'eau s'arrête EXACTEMENT là où elle
    est, ne continue pas vers le haut ;
  - **Pause en pleine expiration** : idem, arrêt net, ne continue pas vers
    le bas ;
  - **Reprendre** : l'eau repart du point gelé vers la cible de la phase
    en cours, sur le temps restant (pas un cycle complet relancé) ;
  - **Pause pendant une rétention (hold)** : rien de choquant, l'eau ne
    bouge de toute façon pas ;
  - Terminer une séance complète sans pause : toujours fluide (acquis
    M09b, ne pas régresser) ;
  - Mouvement réduit : aucun changement requis ici (déjà sans animation).

## Note ETAT.md
Consigner la leçon : **une transition CSS déclenchée doit être reprise en
main explicitement pour toute pause** — geler la valeur RÉELLEMENT peinte
(`getComputedStyle`) avant de couper, relancer depuis ce point avec la
durée RESTANTE à la reprise. Et : **laisser un état initial se peindre
(rAF) avant de déclencher la transition suivante sur un élément neuf** —
la même règle que pour le flash du popover, désormais vérifiée deux fois
sur ce chantier. Marque la fin (espérée) de la saga Respiration ; validation
groupée M09 + M09b + M09c à la fin.
