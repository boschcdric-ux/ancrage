# ADR-006 — Infrastructure : Raspberry Pi + Tailscale

**Date :** Avril 2026  
**Statut :** Accepté

## Contexte

L'application nécessite un serveur pour héberger PocketBase (base de données) et servir les fichiers statiques. La question s'est posée entre une infrastructure cloud (hébergement externe) et une infrastructure locale (auto-hébergement).

## Décision

**Auto-hébergement sur Raspberry Pi 5** (8Go RAM) avec accès distant via **Tailscale** (VPN mesh).

Stack serveur :
- PocketBase — base de données + API REST (port 8090)
- Nginx — serveur web + reverse proxy (port 443 HTTPS)
- Tailscale — VPN mesh chiffré
- mkcert — certificat HTTPS auto-signé

## Raisons

- **Souveraineté des données** — les données personnelles (humeur, journal, médicaments, finances) ne quittent jamais le domicile. Aucun service tiers n'y a accès.
- **Coût zéro** — pas d'abonnement cloud. Le Pi consomme ~5-8W, soit ~5€/an d'électricité.
- **Contrôle total** — pas de limites d'API, pas de quotas, pas de changements de conditions d'utilisation.
- **Tailscale** — crée un réseau privé entre tous les appareils. L'app est accessible depuis n'importe où comme si on était sur le réseau local. Trafic chiffré de bout en bout.
- **Raspberry Pi 5** — suffisamment puissant pour PocketBase + Nginx + Tailscale + AdGuard Home.

## Conséquences acceptées

- **Barrière technique à l'installation** — nécessite de configurer un Pi, SSH, Nginx, PocketBase. Compensé par INSTALL.md détaillé et une option Docker prévue.
- **Disponibilité dépend du Pi** — si le Pi tombe, l'app fonctionne en local (localStorage) mais sans sync.
- **Pas de certificat SSL reconnu** — certificat mkcert auto-signé, à installer manuellement sur chaque appareil.
- **Pas de scale** — un seul utilisateur par instance. Pour une version multi-utilisateurs, l'architecture devrait évoluer.

## Alternatives considérées

- **Vercel + Supabase** — données chez des tiers, contraire à la philosophie. Écarté.
- **VPS cloud** — coût mensuel, données hors domicile. Écarté.
- **Docker local sans Pi** — option B prévue pour les utilisateurs sans Pi (docker-compose sur Mac/PC).
- **Tailscale HTTPS** — certificats gratuits mais nécessite un compte payant. Option future.
