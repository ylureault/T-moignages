# Témoignages — Insuffle

Plateforme de témoignages clients pour **Insuffle** (conseil) et
**Insuffle Académie** (formations). API sécurisée + site vitrine au design
de marque.

## Démarrer

```bash
npm install
cp .env.example .env.local   # remplir les valeurs
npm run dev                  # http://localhost:3000
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing de marque + témoignages en vedette |
| `/temoignages` | Vitrine, filtrable par marque (Conseil / Académie) |
| `/temoignages/[id]` | Témoignage détaillé avec **hero banner** (image de fond en alpha) |
| `/temoignages/nouveau` | Formulaire public pour laisser un avis |

## API

Lecture publique :

- `GET /api/temoignages` — liste paginée. Filtres : `type`, `source`, `marque`,
  `note_min`, `tag`, `verifie`, `q`, `sort`, `order`, `page`, `limit`
- `GET /api/temoignages/:id`
- `GET /api/types`
- `POST /api/temoignages/soumettre` — soumission publique (envoi email, pas d'écriture base)
- `POST /api/contact` — message de contact via Brevo

Écriture protégée (header `x-api-key`) :

- `POST/PUT/DELETE /api/temoignages[/:id]`
- `POST/PUT/DELETE /api/types[/:id]`
- `POST/DELETE /api/upload` — upload/suppression d'images
- `GET/POST /api/backup` — export / restauration complète

## Hero banner uploadable

1. Uploader une image : `POST /api/upload` (avec `x-api-key`) → renvoie une `url`.
2. Affecter au témoignage : `PUT /api/temoignages/:id` avec `{ "heroImage": "<url>" }`.
3. L'image s'affiche en fond du hero à 25 % d'opacité, sous un voile dégradé.

## Sécurité

- Clé API comparée à temps constant (anti timing-attack), ≥ 32 caractères
- Rate limiting 60 req/min/IP, limite de payload
- Headers : CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy
- Écritures atomiques + verrou anti-concurrence, validation de schéma stricte
- Échappement HTML systématique (emails), uploads validés par magic bytes
- Aucun secret dans le repo (`.env*` ignoré)
