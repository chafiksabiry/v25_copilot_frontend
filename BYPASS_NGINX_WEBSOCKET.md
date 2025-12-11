# Solution Alternative : Contourner Nginx pour les WebSocket

## 🎯 Objectif

Permettre aux connexions WebSocket audio de se connecter directement au backend, en contournant nginx.

## ⚠️ Prérequis et Considérations

### Avantages
- ✅ Pas besoin de modifier nginx
- ✅ Connexion directe au backend (moins de latence)
- ✅ Plus simple à déboguer

### Inconvénients
- ⚠️ Nécessite d'exposer le backend directement (port 5006)
- ⚠️ Nécessite de gérer SSL/TLS si vous utilisez WSS
- ⚠️ Nécessite d'ouvrir un port sur le firewall
- ⚠️ Moins sécurisé (pas de reverse proxy)
- ⚠️ Pas recommandé pour la production sans protection supplémentaire

## 📋 Étapes d'implémentation

### Étape 1 : Exposer le backend directement

#### Option A : Exposer le port Docker directement

```bash
# Modifier votre docker-compose.yml ou commande docker run
docker run -p 5006:5006 v25-dash-calls-backend

# OU dans docker-compose.yml
services:
  v25-dash-calls-backend:
    ports:
      - "5006:5006"
```

#### Option B : Utiliser un tunnel SSH (pour développement/test)

```bash
# Depuis votre machine locale
ssh -L 5006:localhost:5006 user@your-server.com

# Puis utiliser ws://localhost:5006 dans le frontend
```

### Étape 2 : Configurer SSL/TLS (si nécessaire pour WSS)

Si vous voulez utiliser `wss://` au lieu de `ws://`, vous avez plusieurs options :

#### Option A : Utiliser un proxy SSL simple (comme Caddy ou Traefik)
#### Option B : Configurer SSL directement sur Node.js (plus complexe)
#### Option C : Utiliser `ws://` en développement et `wss://` via nginx en production

### Étape 3 : Configurer la variable d'environnement

#### Pour le développement local

Créez/modifiez `.env.local` :

```env
# URL directe vers le backend (contourne nginx)
VITE_WS_AUDIO_URL=ws://localhost:5006

# OU si vous avez configuré SSL
VITE_WS_AUDIO_URL=wss://backend-direct.harx.ai:5006
```

#### Pour Docker

Modifiez le `Dockerfile` ou utilisez des variables d'environnement :

```dockerfile
# Dans Dockerfile
ENV VITE_WS_AUDIO_URL=ws://v25-dash-calls-backend:5006

# OU via docker-compose.yml
environment:
  - VITE_WS_AUDIO_URL=ws://v25-dash-calls-backend:5006
```

#### Pour la production (si vous exposez directement)

```env
# Si le backend est accessible directement avec SSL
VITE_WS_AUDIO_URL=wss://api-calls-backend.harx.ai:5006

# OU si vous utilisez un port différent avec SSL
VITE_WS_AUDIO_URL=wss://api-calls-backend.harx.ai:8443
```

### Étape 4 : Ouvrir le port sur le firewall

```bash
# Ubuntu/Debian
sudo ufw allow 5006/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=5006/tcp
sudo firewall-cmd --reload
```

### Étape 5 : Vérifier que ça fonctionne

1. **Tester depuis le serveur** :
   ```bash
   # Installer wscat si nécessaire
   npm install -g wscat
   
   # Tester la connexion
   wscat -c ws://localhost:5006/frontend-audio
   ```

2. **Tester depuis le frontend** :
   - Ouvrez la console du navigateur
   - Lancez un appel
   - Vous devriez voir : `usingDirectConnection: true` dans les logs

## 🔒 Sécurité

### Recommandations pour la production

1. **Utiliser SSL/TLS** : Toujours utiliser `wss://` en production
2. **Restreindre l'accès** : Limiter l'accès au port 5006 uniquement depuis les IP autorisées
3. **Authentification** : Ajouter une authentification au niveau du backend
4. **Rate limiting** : Implémenter un rate limiting sur le backend
5. **Monitoring** : Surveiller les connexions WebSocket

### Exemple de restriction par IP (nginx ou firewall)

```bash
# Avec ufw
sudo ufw allow from 1.2.3.4 to any port 5006

# Avec iptables
sudo iptables -A INPUT -p tcp --dport 5006 -s 1.2.3.4 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5006 -j DROP
```

## 🔄 Fallback automatique

Le code a été modifié pour utiliser automatiquement `VITE_WS_AUDIO_URL` si disponible, sinon il utilise `VITE_API_URL_CALL` (via nginx).

Cela signifie que :
- Si `VITE_WS_AUDIO_URL` est défini → connexion directe au backend
- Si `VITE_WS_AUDIO_URL` n'est pas défini → connexion via nginx (comportement actuel)

## 📊 Comparaison des approches

| Aspect | Via Nginx | Direct Backend |
|--------|-----------|----------------|
| Configuration | Nécessite config nginx | Variable d'env simple |
| Sécurité | Reverse proxy + SSL | SSL nécessaire |
| Latence | Légèrement plus élevée | Plus faible |
| Production | ✅ Recommandé | ⚠️ Nécessite protection |
| Maintenance | Plus complexe | Plus simple |

## 🎯 Recommandation

**Pour le développement** : Utilisez la connexion directe (`VITE_WS_AUDIO_URL=ws://localhost:5006`)

**Pour la production** : 
- **Option recommandée** : Configurer nginx correctement (solution principale)
- **Option alternative** : Utiliser la connexion directe avec SSL et restrictions d'accès

## 🐛 Dépannage

### Le frontend ne peut pas se connecter

1. Vérifiez que le backend écoute sur le bon port : `netstat -tlnp | grep 5006`
2. Vérifiez que le firewall autorise le port : `sudo ufw status`
3. Vérifiez les logs backend pour voir si les connexions arrivent
4. Testez avec wscat depuis le serveur

### Erreur de certificat SSL

Si vous utilisez `wss://` :
- Vérifiez que le certificat SSL est valide
- Vérifiez que le certificat correspond au domaine utilisé
- Pour le développement, vous pouvez utiliser `ws://` au lieu de `wss://`

### CORS errors

Le backend doit autoriser l'origine du frontend dans sa configuration CORS. Vérifiez `v25_dash_calls_backend/src/app.js`.

