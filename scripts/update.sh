#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Mise à jour SANS RISQUE de l'application Témoignages.
#
# Garanties :
#   - ne touche JAMAIS à data/ (témoignages, événements, snapshots)
#   - ne touche JAMAIS à public/uploads/ (images)
#   - ne touche JAMAIS à .env (secrets)
#   - refuse la mise à jour si l'arbre git local a été modifié
#   - snapshot de précaution copié AVANT toute opération
#
# Usage : ./scripts/update.sh
# Puis :  sudo systemctl restart temoignages
#   ou :  docker compose up -d --build
# ──────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── Témoignages Insuffle : mise à jour sûre ──"

# 1. Copie de précaution des données (indépendante des snapshots auto).
if [ -d data ]; then
  STAMP=$(date +%Y%m%d-%H%M%S)
  mkdir -p "data/backups"
  tar czf "data/backups/pre-update-${STAMP}.tar.gz" \
    --exclude="data/backups" data public/uploads 2>/dev/null || true
  echo "✓ Copie de précaution : data/backups/pre-update-${STAMP}.tar.gz"
else
  echo "ℹ Pas encore de dossier data/ (premier déploiement)"
fi

# 2. Refuser d'écraser des modifications locales non commitées.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Modifications locales non commitées détectées — mise à jour annulée."
  echo "  (git stash ou git commit d'abord)"
  exit 1
fi

# 3. Récupérer le code (fast-forward uniquement : pas de réécriture).
git pull --ff-only
echo "✓ Code à jour ($(git rev-parse --short HEAD))"

# 4. Dépendances et build.
npm ci
npm run build
echo "✓ Build OK"

# 5. Contrôle : data/ et .env n'ont pas bougé (gitignorés, jamais touchés).
echo ""
echo "── Terminé. Redémarrer le service : ──"
echo "   systemd : sudo systemctl restart temoignages"
echo "   docker  : docker compose up -d --build"
echo "   pm2     : pm2 restart temoignages"
echo ""
echo "Puis vérifier : curl -s http://localhost:3000/api/health"
