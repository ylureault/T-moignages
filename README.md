# Témoignages — Insuffle

Outil interne de collecte et gestion de témoignages clients pour **Insuffle** (conseil) et **Insuffle Académie** (formations). Pas de vitrine publique — les témoignages sont partagés via des liens de citation individuels et un feed JSON.

## Démarrer

```bash
npm install
cp .env.example .env       # remplir au minimum ADMIN_PASSWORD
npm run dev                 # http://localhost:3000
```

## Pages

| Route | Description |
|---|---|
| `/admin` | Back-office : login, gestion témoignages/types/événements/invitations |
| `/temoignages/nouveau?invitation=xxx` | Formulaire client (pré-rempli via invitation) |
| `/temoignages/[id]` | Page citation individuelle |
| `/temoignages/[id]?mode=quote&format=square` | Carte social media (square/story/landscape) |

`/` et `/temoignages` redirigent vers `/admin`.

## API publique

- `GET /api/public/temoignages` — feed JSON (CORS `*`), filtres : `marque`, `type`, `event`, `note`, `limit`, `anonyme`
- `POST /api/temoignages/soumettre` — soumission publique (sauvé comme non-publié, en attente de modération)

## Widget embarquable

```html
<script src="https://temoignages.insuffle.com/widget.js" defer
        data-marque="insuffle" data-limit="6"></script>
```

Cartes avec étoiles, isolées en Shadow DOM. Options : `data-note`, `data-event`,
`data-type`, `data-anonyme="1"`, `data-layout="list"`, `data-theme="dark"`,
`data-target="#avis"`. Snippets prêts à copier dans l'admin (API & Flux).
Les pages citation embarquent Open Graph + JSON-LD (Review) pour les partages
et le SEO.

## API admin (cookie session requis)

- `GET/POST /api/temoignages` — liste / créer
- `POST /api/temoignages/importer` — import externe JSON/CSV (fusion, jamais destructif)
- `GET/PUT /api/temoignages/:id` — détail / modifier (publie, note, texte…)
- `GET/POST /api/types` — typologies de formulaires
- `PUT/DELETE /api/types/:id`
- `GET/POST /api/evenements` — événements (client + banner + marque)
- `PUT/DELETE /api/evenements/:id`
- `GET/POST /api/invitations` — liens d'invitation uniques
- `DELETE /api/invitations/:id`
- `POST/DELETE /api/upload` — images (banners)
- `GET/POST /api/backup` — export / import backup complet

## Déploiement

Voir [CLAUDE.md](./CLAUDE.md) pour le guide complet (VPS, PaaS, Docker).

Points clés :
- **Données** stockées dans `/data/` (gitignored, jamais dans le repo)
- **Auto-backup** à chaque écriture (snapshots locaux + GitHub optionnel)
- **Auto-restore** au démarrage si fichiers manquants
- **Filesystem éphémère** (Vercel, etc.) : configurer `BACKUP_GITHUB_*` pour persister

## Sécurité

- Auth par mot de passe → cookie HMAC-SHA256 signé (HttpOnly, Secure en prod)
- Rate limiting 60 req/min/IP
- Écritures atomiques + verrou anti-concurrence
- Uploads validés par magic bytes, SVG bloqué
- Champs privés (préfixe `_`) strippés des réponses publiques
- Aucun secret dans le repo (`.env*` gitignored)
