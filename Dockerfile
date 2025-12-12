# Frontend Dockerfile - Telnyx Call Manager
# Étape 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (dev + prod) pour la construction
RUN npm ci

# Copier le code source
COPY . .

# Variables d'environnement de build (à définir lors du build)
ENV REACT_APP_API_URL=https://api-calls.harx.ai

# Construire l'application
RUN npm run build

# Étape 2: Production
FROM node:20-alpine

WORKDIR /app

# Installer serve pour servir l'application
RUN npm install -g serve

# Copier les fichiers buildés depuis l'étape précédente
COPY --from=builder /app/build ./build

# Exposer le port
EXPOSE 5186

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Démarrer l'application avec serve
CMD ["serve", "-s", "build", "-l", "5186"]

