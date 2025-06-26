# Déploiement Docker - HARX REPS AI COPILOT

Ce guide explique comment déployer l'application HARX REPS AI COPILOT en utilisant Docker.

## Prérequis

- Docker installé sur votre machine
- Docker Compose installé (optionnel, pour utiliser docker-compose.yml)

## Variables d'environnement

Avant de déployer, configurez vos variables d'environnement. Créez un fichier `.env` à la racine du projet :

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# WebRTC Configuration (for real-time calling)
VITE_WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# External Integrations
VITE_CRM_API_URL=your_crm_api_url
VITE_CRM_API_KEY=your_crm_api_key

# Speech-to-Text Service
VITE_SPEECH_API_URL=your_speech_api_url
VITE_SPEECH_API_KEY=your_speech_api_key

# API Configuration
VITE_API_URL_CALL=https://preprod-api-dash-calls.harx.ai

# Environment
NODE_ENV=production
```

## Déploiement avec Docker Compose (Recommandé)

1. **Cloner le projet** (si ce n'est pas déjà fait) :
   ```bash
   git clone <votre-repo>
   cd project
   ```

2. **Configurer les variables d'environnement** :
   ```bash
   cp .env.example .env
   # Éditer le fichier .env avec vos vraies valeurs
   ```

3. **Construire et démarrer l'application** :
   ```bash
   docker-compose up --build
   ```

4. **Accéder à l'application** :
   Ouvrez votre navigateur et allez sur `http://localhost:3000`

5. **Arrêter l'application** :
   ```bash
   docker-compose down
   ```

## Déploiement avec Docker uniquement

1. **Construire l'image** :
   ```bash
   docker build -t harx-reps-ai-copilot .
   ```

2. **Lancer le conteneur** :
   ```bash
   docker run -d -p 3000:80 --name harx-app harx-reps-ai-copilot
   ```

3. **Accéder à l'application** :
   Ouvrez votre navigateur et allez sur `http://localhost:3000`

4. **Arrêter le conteneur** :
   ```bash
   docker stop harx-app
   docker rm harx-app
   ```

## Résolution des problèmes

### Erreur "vite: not found"
Cette erreur se produit si les dépendances de développement ne sont pas installées. Le Dockerfile corrigé installe maintenant toutes les dépendances nécessaires pour la construction.

### Variables d'environnement manquantes
Assurez-vous que toutes les variables d'environnement requises sont définies dans votre fichier `.env` ou dans `docker-compose.yml`.

## Production

Pour un déploiement en production :

1. **Utilisez un reverse proxy** (nginx, traefik, etc.)
2. **Configurez HTTPS** avec des certificats SSL
3. **Utilisez un registre Docker** pour stocker vos images
4. **Configurez la surveillance** et les logs
5. **Sécurisez les variables d'environnement** (ne les exposez pas dans le code)

## Commandes utiles

- **Voir les logs** :
  ```bash
  docker-compose logs -f
  ```

- **Reconstruire l'image** :
  ```bash
  docker-compose up --build --force-recreate
  ```

- **Nettoyer les images** :
  ```bash
  docker system prune -a
  ```

- **Vérifier les conteneurs en cours** :
  ```bash
  docker ps
  ```

## Structure du Dockerfile

Le Dockerfile utilise une approche multi-stage :

1. **Étape de build** : Node.js Alpine pour construire l'application
   - Installe toutes les dépendances (dev + prod)
   - Configure les variables d'environnement
   - Construit l'application avec `npm run build`

2. **Étape de production** : Nginx Alpine pour servir les fichiers statiques
   - Copie uniquement les fichiers construits
   - Image finale légère et sécurisée

Cette approche optimise la taille de l'image finale et améliore la sécurité. 