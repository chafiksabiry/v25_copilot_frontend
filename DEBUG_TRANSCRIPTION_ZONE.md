# Guide de Debug - Zone de Destination Transcription

## 🔍 Problème Identifié

La langue est toujours détectée par numéro de téléphone au lieu de la zone de destination.

## 🛠️ Solutions Implémentées

### 1. **Correction du Hook `useTranscriptionIntegration`**
- ✅ Ajout de `destinationZone` dans les dépendances de `startTranscription`
- ✅ Définition explicite de la zone avant de démarrer la transcription
- ✅ Logs de debug ajoutés

### 2. **Logs de Debug Ajoutés**
- ✅ Log de la zone actuelle dans le service
- ✅ Log de la zone avant démarrage de transcription
- ✅ Log de la zone lors de la détection de langue

## 🧪 Comment Tester

### 1. **Utiliser le Composant de Test**
```typescript
import { TranscriptionTest } from './TranscriptionTest';

// Dans votre composant principal
<TranscriptionTest />
```

### 2. **Vérifier les Logs dans la Console**
Vous devriez voir ces logs dans l'ordre :

```
🌍 Destination zone set: FR
🌍 Destination zone updated in transcription service: FR
🌍 Setting destination zone before transcription start: FR
🌍 Current destination zone in service: FR
🌍 Using destination zone for language detection: FR
🌍 Language for zone FR: fr-FR
```

### 3. **Si les Logs Ne Sont Pas Corrects**

#### **Problème 1 : Zone non récupérée**
```
❌ Gig ID not found
❌ Error fetching destination zone: HTTP error! status: 404
```

**Solutions :**
- Vérifier que `VITE_GIGS_API` est configuré
- Vérifier que l'endpoint `/gigs/${gigId}/destination-zone` existe
- Vérifier que le gigId est correct

#### **Problème 2 : Zone récupérée mais non utilisée**
```
✅ 🌍 Destination zone set: FR
❌ 🔍 Detecting language for phone number: +33123456789
```

**Solutions :**
- Vérifier que `destinationZone` est passé au hook `useTranscriptionIntegration`
- Vérifier que `setDestinationZone` est appelé avant `initializeTranscription`

#### **Problème 3 : Timing des appels**
```
❌ 🌍 Current destination zone in service: null
```

**Solutions :**
- Attendre que la zone soit chargée avant de démarrer la transcription
- Utiliser un état de chargement

## 🔧 Debug Avancé

### 1. **Vérifier l'Environnement**
```javascript
console.log('Environment:', import.meta.env.DEV ? 'DEV' : 'PROD');
console.log('Gig ID used:', gigId);
console.log('VITE_GIGS_API:', import.meta.env.VITE_GIGS_API);
```

### 2. **Vérifier la Réponse de l'API**
```javascript
// Dans useDestinationZone
const data = await response.json();
console.log('🌍 Raw API response:', data);
```

### 3. **Vérifier le Mapping des Zones**
```javascript
// Dans getLanguageFromDestinationZone
console.log('🌍 Zone received:', zone);
console.log('🌍 Zone in mapping:', zoneLanguageMap[zone.toUpperCase()]);
```

## 📋 Checklist de Debug

- [ ] `VITE_GIGS_API` est configuré dans `.env`
- [ ] L'endpoint `/gigs/${gigId}/destination-zone` retourne `{ data: { code: "FR" } }`
- [ ] Le hook `useDestinationZone` récupère bien la zone
- [ ] La zone est passée au hook `useTranscriptionIntegration`
- [ ] `setDestinationZone` est appelé avant `initializeTranscription`
- [ ] Les logs montrent "🌍 Using destination zone for language detection"

## 🚀 Test Rapide

1. **Ouvrir la console du navigateur**
2. **Charger le composant `TranscriptionTest`**
3. **Cliquer sur "Tester la Logique"**
4. **Vérifier les logs dans la console**

## 🔄 Si Rien Ne Fonctionne

1. **Vérifier l'API :**
   ```bash
   curl "${VITE_GIGS_API}/gigs/686e8ddcf74ddc5ba5d4b493/destination-zone"
   ```

2. **Vérifier les cookies (en production) :**
   ```javascript
   console.log('Cookies:', document.cookie);
   ```

3. **Tester avec un gigId fixe :**
   ```javascript
   const { zone } = useDestinationZone('686e8ddcf74ddc5ba5d4b493');
   ```

## 📞 Support

Si le problème persiste, fournissez :
- Les logs de la console
- La réponse de l'API `/gigs/${gigId}/destination-zone`
- L'environnement (DEV/PROD)
- Le gigId utilisé 