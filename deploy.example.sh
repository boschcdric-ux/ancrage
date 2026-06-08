#!/usr/bin/env bash
set -euo pipefail

# Copier ce fichier en deploy.sh
# et remplacer les variables ci-dessous

DEPLOY_USER="votre-utilisateur"
DEPLOY_HOST="votre-ip-tailscale"
DEPLOY_PATH="/home/votre-utilisateur/ancrage/dist"

echo "Construction de l'application..."
npm run build

echo "Déploiement vers le Raspberry Pi..."
scp -r dist/* ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/

echo "✅ Déploiement terminé — https://${DEPLOY_HOST}"
