# Étape de build - Construction de l'application
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (dev + prod) pour la construction
RUN npm ci

# Copier le code source
COPY . .

# Supabase Configuration
ENV VITE_SUPABASE_URL=your_supabase_project_url
ENV VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI features)
ENV VITE_OPENAI_API_KEY=your_openai_api_key

# WebRTC Configuration (for real-time calling)
ENV VITE_WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# External Integrations
ENV VITE_CRM_API_URL=your_crm_api_url
ENV VITE_CRM_API_KEY=your_crm_api_key

# Speech-to-Text Service
ENV VITE_SPEECH_API_URL=your_speech_api_url
ENV VITE_SPEECH_API_KEY=your_speech_api_key

ENV VITE_API_URL_CALL=https://api-calls.harx.ai
ENV VITE_WS_URL=ws://api-calls.harx.ai/speech-to-text
ENV VITE_GIGS_API=https://api-gigsmanual.harx.ai/api
ENV NODE_ENV=development

# Construire l'application
RUN npm run build

# Installer serve pour servir l'application
RUN npm install -g serve

# Exposer le port 5186
EXPOSE 5186

# Démarrage avec serve
CMD ["serve", "-s", "dist", "-l", "5186"]
