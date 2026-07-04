# CLAUDE.md — Guide projet T-moignages (Insuffle)

## Contexte

Outil **interne** de collecte et gestion de témoignages clients pour **Insuffle** (conseil) et **Insuffle Académie** (formations). Pas de vitrine publique. Les données sont exposées uniquement via API JSON et via des pages de citation individuelles partageables sur les réseaux sociaux.

Propriétaire : **Yoan Lureault** (boulika@gmail.com) — fondateur d'Insuffle.

## Stack technique

- **Next.js 16** (App Router, Turbopack)
- **React 19**, **TypeScript 5.9**
- **Tailwind CSS v4** (syntaxe `@theme` dans `globals.css`, pas de `tailwind.config`)
- **Node.js >= 22**, npm
- Stockage : **fichiers JSON** dans `/data/` (pas de base de données)
- Auth : **cookies signés HMAC-SHA256** (stateless, pas de session serveur)

## Architecture fichiers

```
src/
  app/
    admin/page.tsx          # Back-office complet (SPA client-side)
    temoignages/
      [id]/page.tsx         # Page citation (publique) + mode quote social
      nouveau/page.tsx      # Formulaire client pour laisser un avis
    api/
      auth/route.ts         # POST login / DELETE logout
      temoignages/route.ts  # CRUD témoignages (auth requise sauf GET publié)
      temoignages/[id]/route.ts
      temoignages/soumettre/route.ts  # Soumission publique (sans auth)
      types/route.ts        # CRUD typologies de formulaires
      types/[id]/route.ts
      evenements/route.ts   # CRUD événements
      evenements/[id]/route.ts
      invitations/route.ts  # CRUD invitations (liens uniques)
      invitations/[id]/route.ts
      public/temoignages/route.ts  # Feed JSON public (CORS *, filtres)
      upload/route.ts       # Upload images (banners)
      backup/route.ts       # Export/import backup complet
      contact/route.ts      # Formulaire de contact (Brevo)
    globals.css             # Thème Tailwind + .theme-academie
  lib/
    auth.ts                 # Sessions HMAC, vérification mot de passe
    db.ts                   # Lecture/écriture JSON, auto-backup, restore
    persist.ts              # Snapshots locaux + backup Git distant
  types/index.ts            # Interfaces TypeScript
  middleware.ts             # Rate limiting 60/min/IP, redirections
data/                       # GITIGNORED — données live, JAMAIS dans le repo
  temoignages.json
  types.json
  evenements.json
  invitations.json
  backups/                  # Snapshots automatiques (30 max + latest.json)
public/uploads/             # Images uploadées (banners)
```

## Variables d'environnement

Fichier `.env` (ou `.env.local`, `.env.production`) — **jamais commité**.

```bash
# OBLIGATOIRE
ADMIN_PASSWORD=motdepassefort    # >= 4 caractères, utilisé pour le login admin

# OPTIONNEL — Session
SESSION_SECRET=                  # Si absent, utilise ADMIN_PASSWORD comme secret
                                 # Définir pour garder les sessions valides si on
                                 # change le mot de passe. Générer : openssl rand -hex 32

# OPTIONNEL — Email (Brevo/Sendinblue)
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Insuffle
CONTACT_EMAIL=                   # Destinataire des notifications

# OPTIONNEL — Backup Git distant (persistance sur FS éphémère)
BACKUP_GITHUB_TOKEN=             # Token avec contents:write sur le repo
BACKUP_GITHUB_REPO=              # "owner/repo"
BACKUP_GITHUB_BRANCH=main
BACKUP_GITHUB_PATH=backups/data.json

# INTERNE — Tests uniquement
# DATA_DIR=/tmp/test-data        # Isoler les tests du /data/ réel
```

## Commandes

```bash
npm install          # Installer les dépendances
npm run dev          # Dev local (http://localhost:3000)
npm run build        # Build production
npm start            # Serveur production (port 3000 par défaut)
```

## Déploiement

> **Brief de mission complet : voir [DEPLOIEMENT.md](./DEPLOIEMENT.md)** —
> document autonome à donner à Claude (Cowork ou Code) pour exécuter le
> déploiement : options pas à pas, config backup GitHub, checklist de
> vérification, procédure de MAJ (`scripts/update.sh`), rollback, dépannage.
> Healthcheck : `GET /api/health` (public, sans secret).

### Option A : VPS / serveur dédié (recommandé pour persistance données)

1. Cloner le repo, `npm install`, `npm run build`
2. Créer `.env` avec au minimum `ADMIN_PASSWORD`
3. `npm start` (ou via PM2 / systemd)
4. Le dossier `data/` est créé automatiquement au premier démarrage
5. Reverse proxy (nginx/Caddy) vers `localhost:3000` avec HTTPS

Exemple systemd :
```ini
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
```

Exemple nginx :
```nginx
server {
    listen 443 ssl http2;
    server_name temoignages.insuffle.com;

    ssl_certificate     /etc/letsencrypt/live/temoignages.insuffle.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/temoignages.insuffle.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B : Plateforme PaaS (Vercel, Railway, Render, Fly.io...)

**Attention** : ces plateformes ont un **filesystem éphémère** — le dossier `data/` est effacé à chaque redéploiement.

Solution : activer le **backup Git distant** :
1. Créer un repo GitHub privé dédié aux backups
2. Générer un token avec permission `contents:write`
3. Configurer les variables d'environnement :
   ```
   BACKUP_GITHUB_TOKEN=ghp_xxx
   BACKUP_GITHUB_REPO=yoan/temoignages-backup
   BACKUP_GITHUB_BRANCH=main
   BACKUP_GITHUB_PATH=backups/data.json
   ```
4. Au redéploiement, `maybeRestore()` détecte les fichiers absents et restaure automatiquement depuis le backup Git

### Option C : Docker

Pas de Dockerfile fourni. Pour en créer un :
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
# Volume pour persister /app/data
VOLUME ["/app/data"]
CMD ["npm", "start"]
```

```bash
docker build -t temoignages .
docker run -d \
  -p 3000:3000 \
  -v /chemin/local/data:/app/data \
  -e ADMIN_PASSWORD=motdepassefort \
  --name temoignages \
  temoignages
```

## Persistance des données — Règles critiques

1. **JAMAIS supprimer de données en production** — les témoignages se masquent (`publie: false`), jamais supprimés
2. **`/data/` est gitignored** — un `git pull` ou redéploiement ne touche jamais les données
3. **`ensureDataDir()`** crée les fichiers JSON seulement s'ils sont absents, jamais d'écrasement
4. **`maybeRestore()`** restaure depuis backup uniquement les fichiers manquants
5. **Auto-backup** à chaque écriture : snapshot local (`data/backups/`) + push Git si configuré
6. **Tests isolés** : toujours utiliser `DATA_DIR=/tmp/xxx` pour ne jamais toucher les données réelles
7. **Pas de seed d'événements** : les événements sont des données utilisateur, jamais auto-créés
8. Les typologies par défaut (13) ne sont seedées que si `types.json` est absent

## Thèmes

Deux marques avec thèmes distincts (définis dans `globals.css`) :

- **Insuffle (défaut)** : navy foncé `#0f172a` + jaune `#eab308` + Poppins
- **Insuffle Académie** (`.theme-academie`) : aubergine `#1a0518`/`#8e2183` + or `#ffd466` + Outfit

Le thème est appliqué automatiquement selon le champ `marque` de l'événement/témoignage.

## Sécurité

- Auth par mot de passe → cookie HMAC signé (HttpOnly, Secure en prod, SameSite=Lax)
- Rate limiting 60 req/min/IP (middleware)
- Écritures atomiques (write → rename) + verrou anti-concurrence
- Upload : validation magic bytes, SVG bloqué, noms crypto (randomBytes)
- Champs privés (`_email`, etc.) : préfixe `_` = strippé des réponses publiques
- Headers de sécurité dans le middleware (CSP, HSTS, X-Frame-Options, etc.)
- `.env*` ignoré par git

## Modèle de données (src/types/index.ts)

- **TypeTemoignage** : modèle de formulaire réutilisable (note style, champs custom)
- **Evenement** : événement lié à un client (entreprise) + banner + marque + type
- **Invitation** : lien unique héritant de l'événement (client/type/marque)
- **Temoignage** : réponse client avec note, texte, `publie: boolean`, `champsPersonnalises`

## Pages publiques

- `/temoignages/nouveau?invitation=xxx` — formulaire client (pré-rempli via invitation/événement)
- `/temoignages/[id]` — page citation (admin peut voir non-publié via cookie)
- `/temoignages/[id]?mode=quote&format=square|story|landscape&name=full|initial|first` — carte social media

## API publique

- `GET /api/public/temoignages` — feed JSON (CORS *), filtres : marque, type, event, note, limit, anonyme
- `POST /api/temoignages/soumettre` — soumission sans auth (sauvé comme non-publié)

## Import & restauration (admin, jamais destructifs)

- `POST /api/temoignages/importer` — import de témoignages externes (tableau JSON ou
  `{temoignages: [...]}`). Id généré si absent, doublons ignorés (par id ET par
  empreinte auteur+contenu), imports non publiés par défaut. Jamais d'écrasement.
- `POST /api/backup` — restauration. **Mode `fusion` par défaut** : ajoute uniquement
  les entrées inconnues, ne touche jamais à l'existant. `?mode=remplacer` pour un
  remplacement intégral (confirmation UI demandée).
- `GET /api/backup/status` — état du filet de sécurité : snapshots locaux, dernier
  backup, GitHub actif ou non, compteurs.
- L'admin a une vue **API & Flux** avec tous les liens de lecture prêts à copier,
  et un bouton **Lien unique** sur chaque événement (crée une invitation héritée et
  copie l'URL en 1 clic).

## Conventions de code

- Tout le code et les commentaires sont en **français**
- Pas de suppression de données, seulement des mises à jour
- Pas de pages front publiques (listing), seulement des pages individuelles et l'admin
- `/` et `/temoignages` redirigent vers `/admin`
