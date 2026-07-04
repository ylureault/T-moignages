# DEPLOIEMENT.md — Brief de mission pour Claude (Cowork)

> **À Claude** : ce document est ta mission complète pour déployer l'outil de
> témoignages d'Insuffle en production. Il est autonome — tout ce dont tu as
> besoin est ici ou doit être demandé à Yoan (liste ci-dessous). Suis les
> étapes dans l'ordre et termine par la checklist de vérification.

## La mission

Déployer l'application **T-moignages** (Next.js 16, Node >= 22) pour qu'elle
soit accessible en HTTPS (idéalement `temoignages.insuffle.com`), avec :

1. les **données durablement protégées** (backup GitHub distant configuré) ;
2. le **healthcheck vert** : `GET /api/health` → `{"status":"ok"}` ;
3. la **procédure de mise à jour** testée une fois (`scripts/update.sh`).

## Règles absolues sur les données

- `data/` contient TOUTES les données (JSON) et `public/uploads/` les images.
  Les deux sont **gitignorés** : aucune opération git ne peut les toucher.
- **Ne jamais supprimer ni recréer** `data/` ou `public/uploads/` sur un
  serveur existant. Ne jamais exécuter de commande destructive dessus.
- L'application crée `data/` toute seule au premier démarrage et fait un
  **snapshot automatique à chaque écriture** (`data/backups/`, 30 max).
- Si `BACKUP_GITHUB_*` est configuré, chaque écriture est aussi poussée sur
  un repo GitHub privé, et **restaurée automatiquement** au démarrage si les
  fichiers locaux manquent (indispensable sur filesystem éphémère).
- Restaurer un backup se fait par défaut en **fusion** (rien d'existant n'est
  modifié ni supprimé) — le remplacement intégral est explicite (`?mode=remplacer`).

## À demander à Yoan avant de commencer (4 choses)

1. **Où déployer ?** VPS existant (IP + accès SSH) / nouveau VPS / Docker /
   PaaS (Vercel, Railway…). Recommandation : VPS ou Docker, pour la
   persistance native des fichiers.
2. **Le domaine** : `temoignages.insuffle.com` pointe-t-il déjà (DNS A) vers
   le serveur ? Sinon, lui demander de créer l'enregistrement.
3. **Le mot de passe admin** (`ADMIN_PASSWORD`, >= 4 caractères — recommander
   une phrase forte). Ne jamais l'écrire dans le repo.
4. **Un token GitHub pour le backup** : repo privé dédié (ex.
   `ylureault/temoignages-backup`) + fine-grained token limité à ce repo avec
   permission **Contents: Read and write**. (Étapes détaillées plus bas.)

## Option A — VPS avec systemd + nginx (recommandé)

```bash
# 1. Prérequis serveur (Ubuntu/Debian)
sudo apt update && sudo apt install -y git nginx certbot python3-certbot-nginx
# Node 22 via NodeSource si absent :
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs

# 2. Code
sudo mkdir -p /opt/temoignages && sudo chown $USER /opt/temoignages
git clone https://github.com/ylureault/T-moignages.git /opt/temoignages
cd /opt/temoignages

# 3. Secrets — créer .env (JAMAIS commité)
cp .env.example .env
nano .env   # remplir ADMIN_PASSWORD, SESSION_SECRET (openssl rand -hex 32), BACKUP_GITHUB_*

# 4. Build
npm ci && npm run build

# 5. Service systemd
sudo tee /etc/systemd/system/temoignages.service > /dev/null <<'EOF'
[Unit]
Description=Temoignages Insuffle
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/temoignages
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/opt/temoignages/.env

[Install]
WantedBy=multi-user.target
EOF
sudo chown -R www-data:www-data /opt/temoignages
sudo systemctl daemon-reload && sudo systemctl enable --now temoignages

# 6. nginx + HTTPS
sudo tee /etc/nginx/sites-available/temoignages > /dev/null <<'EOF'
server {
    listen 80;
    server_name temoignages.insuffle.com;
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/temoignages /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d temoignages.insuffle.com   # HTTPS automatique
```

## Option B — Docker (une commande)

```bash
git clone https://github.com/ylureault/T-moignages.git && cd T-moignages
cp .env.example .env && nano .env        # ADMIN_PASSWORD au minimum
docker compose up -d --build
curl -s http://localhost:3000/api/health
```

Le `docker-compose.yml` fourni monte `./data` et `./public/uploads` en
volumes : les mises à jour (`docker compose up -d --build`) ne touchent
jamais aux données. Mettre nginx/Caddy devant pour l'HTTPS.

## Option C — PaaS (Vercel, Railway, Render…)

⚠️ Filesystem **éphémère** : le backup GitHub n'est pas optionnel ici, il est
**OBLIGATOIRE** — sans lui, chaque redéploiement efface les données.

1. Connecter le repo à la plateforme (build : `npm run build`, start : `npm start`).
2. Renseigner TOUTES les variables d'environnement (voir tableau).
3. Vérifier `/api/health` : `backupGitHubActif` doit être `true`.
4. Tester le cycle : créer un témoignage de test → redéployer → vérifier
   qu'il est toujours là (restauration automatique au démarrage).
5. Limite : `public/uploads` (images) n'est pas couvert par le backup GitHub —
   sur PaaS, éviter les banners uploadées ou utiliser des URLs d'images externes.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `ADMIN_PASSWORD` | **OUI** | Login admin (>= 4 caractères, mettre une phrase forte) |
| `SESSION_SECRET` | Recommandé | Signature des sessions (`openssl rand -hex 32`) — permet de changer le mot de passe sans déconnecter |
| `BACKUP_GITHUB_TOKEN` | Recommandé (obligatoire PaaS) | Fine-grained token, permission Contents RW sur le repo de backup |
| `BACKUP_GITHUB_REPO` | avec le token | `owner/repo`, ex. `ylureault/temoignages-backup` |
| `BACKUP_GITHUB_BRANCH` | non | défaut `main` |
| `BACKUP_GITHUB_PATH` | non | défaut `backups/data.json` |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | non | Notifications email (soumissions) |
| `CONTACT_EMAIL` | non | Destinataire des notifications |

## Configurer le backup GitHub (pas à pas)

1. Créer un repo **privé** : `ylureault/temoignages-backup`.
2. GitHub → Settings → Developer settings → Fine-grained tokens → Generate :
   - Repository access : **Only select repositories** → `temoignages-backup`
   - Permissions → Repository → **Contents : Read and write**
   - Expiration : 1 an (noter la date, à renouveler)
3. Mettre le token dans `.env` (`BACKUP_GITHUB_TOKEN=github_pat_…`).
4. Redémarrer, puis vérifier : `/api/health` → `backupGitHubActif: true`.
5. Faire une écriture (créer/modifier un témoignage) et vérifier qu'un commit
   `chore(backup): …` apparaît dans le repo de backup.

## Checklist de vérification finale (OBLIGATOIRE)

```bash
BASE=https://temoignages.insuffle.com

# 1. Santé : status ok, données en écriture, admin configuré
curl -s $BASE/api/health

# 2. Redirections : / et /temoignages → /admin
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $BASE/

# 3. Login admin (avec le mot de passe de Yoan) → {"success":true}
curl -s -X POST $BASE/api/auth -H "Content-Type: application/json" \
  -d '{"password":"LE_MOT_DE_PASSE"}' -c /tmp/c.txt

# 4. Flux public (vide au départ, mais 200)
curl -s $BASE/api/public/temoignages

# 5. Statut des sauvegardes (authentifié)
curl -s -b /tmp/c.txt $BASE/api/backup/status
```

Manuellement dans le navigateur :
- [ ] `/admin` : login OK, tableau de bord s'affiche
- [ ] Créer un événement de test → bouton **« Lien unique »** → le lien copié
      s'ouvre et affiche le formulaire client
- [ ] Soumettre un témoignage de test via ce lien → il apparaît dans l'admin
      (non publié) → le publier → il apparaît dans `/api/public/temoignages`
- [ ] Page Sauvegarde : snapshots > 0, backup GitHub « Activé »
- [ ] Si backup GitHub : un commit est apparu dans le repo de backup
- [ ] Supprimer l'événement et le témoignage de test **via l'interface admin**
      (jamais en touchant les fichiers)

## Mise à jour (déploiements suivants)

```bash
cd /opt/temoignages
./scripts/update.sh                 # pull + build, NE TOUCHE JAMAIS aux données
sudo systemctl restart temoignages  # ou : docker compose up -d --build
curl -s http://localhost:3000/api/health
```

Le script refuse de tourner si des modifications locales existent, fait une
archive de précaution (`data/backups/pre-update-*.tar.gz`) et ne touche ni
`data/`, ni `public/uploads/`, ni `.env`.

## Restauration / retour arrière

- **Données** : Admin → Sauvegarde → Restaurer en mode **Fusionner** (défaut,
  sans risque). Snapshots locaux dans `data/backups/`, backup distant dans le
  repo GitHub de backup.
- **Code** : `git log --oneline` → `git checkout <commit>` → rebuild →
  restart. Les données ne sont pas affectées par les changements de code.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `/api/health` → `motDePasseAdminConfigure: false` | `.env` absent/incomplet ou non chargé | Vérifier `EnvironmentFile=` (systemd) ou `env_file` (docker), redémarrer |
| `/api/health` → `donneesEcriture: false` | Permissions sur `data/` | `sudo chown -R www-data:www-data /opt/temoignages/data` |
| 401 en boucle dans l'admin | Session signée avec un ancien secret | Normal après changement de `ADMIN_PASSWORD` sans `SESSION_SECRET` : se reconnecter |
| Données absentes après redéploiement PaaS | Backup GitHub non configuré | Configurer `BACKUP_GITHUB_*` ; les données précédentes sont perdues si aucun backup n'existait |
| Images banners cassées après redéploiement | `public/uploads` non persisté | VPS : rien à faire ; Docker : vérifier le volume ; PaaS : utiliser des URLs externes |
| 429 Too Many Requests | Rate limiting 60 req/min/IP | Attendre 1 min ; normal en cas de test en rafale |
