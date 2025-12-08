# Call Storage Feature

## Overview
Cette fonctionnalité permet de stocker automatiquement les détails des appels Twilio dans la base de données lorsqu'ils se terminent.

## Architecture

### Services
- **`TwilioCallService`** (`src/services/twilioCallService.ts`)
  - Gère l'interaction avec l'API Twilio
  - Récupère les détails de l'appel
  - Télécharge l'enregistrement depuis Cloudinary
  - Stocke l'appel dans la base de données

### Hooks
- **`useCallStorage`** (`src/hooks/useCallStorage.ts`)
  - Hook personnalisé pour gérer le stockage des appels
  - Gère les notifications utilisateur
  - Centralise la logique de stockage

### Composants
- **`CallNotification`** (`src/components/Dashboard/CallNotification.tsx`)
  - Composant de notification pour informer l'utilisateur (optionnel)
  - Affiche les statuts de succès, erreur et information
  - **Note** : Actuellement désactivé pour un stockage silencieux

## Fonctionnement

### 1. Fin d'appel manuelle
Quand l'utilisateur clique sur "End Call", la fonction `endCall` est appelée dans les deux composants :

**CallControls.tsx :**
```typescript
const endCall = async () => {
  if (connection) {
    connection.disconnect();
    // ... autres actions
    await storeCall(callSid, agentId);
  }
};
```

**ContactInfo.tsx :**
```typescript
const endCall = async () => {
  if (activeConnection) {
    activeConnection.disconnect();
  }
  // ... autres actions
  if (currentCallSid && contact.assignedAgent) {
    await storeCall(currentCallSid, contact.assignedAgent);
  }
};
```

### 2. Fin d'appel automatique
Quand l'appel se déconnecte automatiquement, l'événement `disconnect` est déclenché dans les deux composants :

**CallControls.tsx :**
```typescript
conn.on('disconnect', async () => {
  // ... autres actions
  await storeCall(callSid, agentId);
});
```

**ContactInfo.tsx :**
```typescript
conn.on('disconnect', async () => {
  // ... autres actions
  if (currentCallSid && contact.assignedAgent) {
    await storeCall(currentCallSid, contact.assignedAgent);
  }
});
```

### 3. Processus de stockage
Le processus de stockage suit ces étapes :

1. **Récupération des détails de l'appel** depuis Twilio
2. **Attente de 2 secondes** pour que l'enregistrement soit disponible
3. **Téléchargement de l'enregistrement** depuis Cloudinary (si disponible)
4. **Stockage dans la base de données** avec tous les détails

## Configuration

### Variables d'environnement requises
```env
VITE_API_URL_CALL=https://prod-api-dash-calls.harx.ai
```

### Données stockées
- CallSid (identifiant unique de l'appel Twilio)
- AgentId (identifiant de l'agent)
- LeadId (identifiant du prospect)
- Détails complets de l'appel depuis Twilio
- URL de l'enregistrement Cloudinary
- UserId (actuellement hardcodé)

## Notifications

**Note** : Les notifications ont été désactivées pour un stockage silencieux des appels.

Le système peut afficher des notifications pour :
- **Information** : "Storing call in database..."
- **Succès** : "Call successfully stored in database"
- **Erreur** : "Failed to store call in database"

Pour réactiver les notifications, modifiez le hook `useCallStorage` et ajoutez les composants `CallNotification` dans les composants.

## Utilisation

Le stockage des appels est automatiquement intégré dans les composants `CallControls` et `ContactInfo`. Aucune configuration supplémentaire n'est nécessaire.

### Composants intégrés
- **CallControls** : Gestion des appels depuis le panneau de contrôle
- **ContactInfo** : Gestion des appels depuis les informations de contact

### Exemple d'utilisation manuelle
```typescript
import { useCallStorage } from '../hooks/useCallStorage';

const { storeCall } = useCallStorage();

// Stocker un appel
await storeCall(callSid, agentId);
```

## Gestion des erreurs

- Les erreurs sont loggées dans la console
- Le processus de stockage n'interfère pas avec la fin de l'appel
- **Stockage silencieux** : Aucune notification utilisateur pour éviter les interruptions

## Améliorations futures

- [ ] Récupération dynamique du UserId depuis l'authentification
- [ ] Gestion des tentatives de stockage en cas d'échec
- [ ] Stockage des métriques d'appel supplémentaires
- [ ] Intégration avec le système de transcription en temps réel 