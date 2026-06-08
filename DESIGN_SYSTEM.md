# DESIGN SYSTEM — ADHD App
## Fichier de référence obligatoire pour toutes les IA

> **IMPORTANT** : Avant de générer du code pour ce projet, lis ce fichier en entier.
> Tout nouveau module doit respecter ces règles sans exception.
> Ne réinvente pas les variables — utilise celles qui existent déjà.

---

## 1. Principes fondateurs (TDAH-first)

- **Une seule action principale par vue** — ne jamais surcharger l'écran
- **Hiérarchie visuelle forte** — l'œil doit savoir immédiatement où aller
- **Feedback immédiat** — chaque action de l'utilisateur déclenche une réponse visuelle
- **Espace généreux** — mieux vaut trop d'espace que pas assez
- **Couleur = signal** — les couleurs ont une signification, elles ne sont pas décoratives
- **Animations rapides et significatives** — jamais lentes, jamais gratuites

---

## 2. Système de couleurs (CSS variables)

### Thème sombre (défaut — actif de 20h à 7h)
```css
--bg-primary: #0f0f13;
--bg-secondary: #1a1a24;
--bg-tertiary: #252535;
--bg-hover: #2e2e42;

--text-primary: #f0f0f5;
--text-secondary: #9898b0;
--text-muted: #55556a;

--accent: #7c6af7;
--accent-hover: #9585ff;
--accent-soft: rgba(124, 106, 247, 0.15);

--success: #4caf82;
--warning: #f0a05a;
--danger: #e05c7a;
--info: #5ab4f0;

--border: rgba(255,255,255,0.07);
--shadow: 0 4px 24px rgba(0,0,0,0.4);
--shadow-soft: 0 2px 12px rgba(0,0,0,0.2);
```

### Thème clair (actif de 7h à 20h)
```css
--bg-primary: #f5f5fa;
--bg-secondary: #ffffff;
--bg-tertiary: #ebebf5;
--bg-hover: #e0e0f0;

--text-primary: #1a1a2e;
--text-secondary: #5a5a7a;
--text-muted: #9898b0;

--accent: #6c5ce7;
--accent-hover: #5a4bd6;
--accent-soft: rgba(108, 92, 231, 0.1);

--success: #3d9e6e;
--warning: #e08840;
--danger: #c94468;
--info: #3a9fd6;

--border: rgba(0,0,0,0.08);
--shadow: 0 4px 24px rgba(0,0,0,0.08);
--shadow-soft: 0 2px 12px rgba(0,0,0,0.04);
```

### Thème chaud (soirée / lecture)
```css
--bg-primary: #12100e;
--bg-secondary: #1e1a16;
--bg-tertiary: #2a2420;
--accent: #d4875a;
--text-primary: #f0e8d8;
```

---

## 3. Typographie

Police principale : Inter (Google Fonts)
Police alternative : Nunito

```css
--font-family: 'Inter', 'Nunito', system-ui, sans-serif;

--text-xs:   0.75rem;
--text-sm:   0.875rem;
--text-base: 1rem;
--text-lg:   1.125rem;
--text-xl:   1.25rem;
--text-2xl:  1.5rem;
--text-3xl:  2rem;

--font-normal:   400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

---

## 4. Espacements (multiples de 4px)

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## 5. Bordures et rayons

```css
--radius-sm:   6px;
--radius-md:   12px;
--radius-lg:   18px;
--radius-xl:   24px;
--radius-full: 9999px;
```

---

## 6. Animations

Règle absolue : respecter prefers-reduced-motion.

```css
--duration-fast:   150ms;
--duration-normal: 250ms;
--duration-slow:   400ms;
--duration-xslow:  600ms;

--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
```

Classes disponibles : .animate-fade-in, .animate-slide-up, .animate-scale-in, .animate-bounce-in, .animate-shake

---

## 7. Structure d'un module

```
src/modules/nom-du-module/
├── index.js
├── view.js
├── style.css
└── README.md
```

Chaque module exporte :
```javascript
export default {
  id: 'nom-du-module',
  label: 'Nom Affiché',
  icon: '🎯',
  init(container),
  destroy(),
  getDashboardWidget()
}
```

---

## 8. Thème automatique

```javascript
function getAutoTheme() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 20) return 'light';
  return 'dark';
}
// Vérification toutes les minutes
// Choix manuel mémorisé jusqu'au lendemain
```

---

## 9. Ton visuel (pour calibrer une IA rapidement)

> "Interface moderne et douce, TDAH-first, espaces généreux, animations subtiles et satisfaisantes.
> Violet comme couleur d'accent. Pas de design corporate. Chaleureux sans être enfantin.
> Minimaliste mais pas froid. Chaque interaction doit donner une réponse visuelle immédiate."

---

## Langage et Ton

### Principe fondamental
Ancrage s'adresse à des personnes TDAH,
pas à des développeurs ou des spécialistes.
Chaque mot doit être compris par quelqu'un
qui n'a jamais entendu parler de tech ou
de psychologie clinique.

### Mots et expressions à éviter
Ces termes sont du jargon — les remplacer
systématiquement :

| À éviter | Remplacer par |
|----------|---------------|
| Streaks | Jours consécutifs / compteur de jours |
| Widget | Aperçu / résumé |
| Module | Outil / section |
| Sync / Synchronisation | Mise à jour / sauvegarde |
| Onboarding | Bienvenue / configuration |
| Push notification | Rappel / alerte |
| PWA | Application |
| Dashboard | Tableau de bord / accueil |
| localStorage | Mémoire locale |
| Cache | Données sauvegardées |
| Timer | Minuterie / compte à rebours |
| Pattern | Rythme / schéma |

### Ton général
- Tutoiement systématique
- Phrases courtes (max 15 mots)
- Jamais de culpabilisation
- Toujours bienveillant et encourageant
- Expliquer le "pourquoi" pas seulement 
  le "comment"
- Célébrer les petites victoires
- Dédramatiser les oublis et les ratés

### Exemples
❌ "Vos streaks ont été réinitialisés"
✅ "Pas grave si tu as raté hier — 
    tu reprends aujourd'hui !"

❌ "Synchronisation avec le serveur"
✅ "Tes données sont à jour ✓"

❌ "Module désactivé"
✅ "Cet outil est masqué pour l'instant"
