# Configuration Frontend (.env)

## Fichiers à créer dans le dossier `frontend/`

### 1. `.env` - Pour le développement local

Créez `frontend/.env` :

```env
REACT_APP_API_URL=http://localhost:5000
```

**Windows PowerShell :**
```powershell
cd frontend
"REACT_APP_API_URL=http://localhost:5000" | Out-File -FilePath .env -Encoding UTF8
```

**Bash/Linux/Mac :**
```bash
cd frontend
echo "REACT_APP_API_URL=http://localhost:5000" > .env
```

### 2. `.env.production` - Pour Vercel (optionnel)

Créez `frontend/.env.production` :

```env
# En production, le frontend et backend sont sur le même domaine Vercel
# Donc on laisse vide pour utiliser des chemins relatifs
REACT_APP_API_URL=
```

**Windows PowerShell :**
```powershell
cd frontend
"REACT_APP_API_URL=" | Out-File -FilePath .env.production -Encoding UTF8
```

**Bash/Linux/Mac :**
```bash
cd frontend
echo "REACT_APP_API_URL=" > .env.production
```

## Pourquoi le .env manquait-il ?

Le frontend utilisait **uniquement** la propriété `"proxy"` dans `package.json` :

```json
"proxy": "http://localhost:5000"
```

**Problème** : Cette approche fonctionne SEULEMENT en développement local avec `npm start`, PAS en production.

**Solution** : Utiliser `REACT_APP_API_URL` pour gérer les URLs dans tous les environnements.

## Comment ça marche maintenant ?

### En développement (`npm start`)
- Le `.env` est chargé automatiquement
- `REACT_APP_API_URL=http://localhost:5000`
- Les appels API vont vers le backend local

### En production (Vercel)
- Le `.env.production` est utilisé (si présent)
- `REACT_APP_API_URL=` (vide)
- Les appels API utilisent des chemins relatifs
- Exemple : `/api/numbers` → `https://votre-projet.vercel.app/api/numbers`

## Configuration sur Vercel Dashboard

Vous pouvez aussi configurer la variable directement sur Vercel :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez :
   - Name: `REACT_APP_API_URL`
   - Value: *(laisser vide pour production)*
   - Environment: `Production`

## Important

- ✅ Les variables React doivent commencer par `REACT_APP_`
- ✅ Redémarrez le serveur après modification du `.env`
- ❌ Ne committez JAMAIS les fichiers `.env` (déjà dans `.gitignore`)
- ✅ Le `.env.production` peut être committé (pas de secrets)

## Vérification

Après avoir créé le `.env`, vérifiez qu'il fonctionne :

```bash
cd frontend
npm start
```

Dans la console du navigateur, vous pouvez vérifier :

```javascript
console.log(process.env.REACT_APP_API_URL); // Devrait afficher: http://localhost:5000
```
