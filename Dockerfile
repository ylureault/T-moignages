# ── Build ─────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Run ───────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./

# Les données vivent dans /app/data et les images dans /app/public/uploads :
# TOUJOURS monter ces deux chemins en volumes pour survivre aux redéploiements.
VOLUME ["/app/data", "/app/public/uploads"]

EXPOSE 3000

# Healthcheck intégré : l'orchestrateur sait si l'app est saine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "start"]
