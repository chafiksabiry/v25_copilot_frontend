# Live Transcription Integration

## Overview
Cette fonctionnalité permet d'afficher la transcription en temps réel dans le composant "REPS Call Phases" pendant les appels Twilio.

## Architecture

### Services
- **`TranscriptionService`** (`src/services/transcriptionService.ts`)
  - Gère la connexion WebSocket avec le backend
  - Traite le flux audio en temps réel
  - Gère la reconnaissance vocale avec Google Speech-to-Text
  - Supporte la diarisation des locuteurs
  - Détection automatique de la langue basée sur le numéro de téléphone

### Hooks
- **`useTranscriptionIntegration`** (`src/hooks/useTranscriptionIntegration.ts`)
  - Hook personnalisé pour gérer l'état de la transcription
  - Gère le démarrage/arrêt de la transcription
  - Centralise la logique de gestion des transcripts

### Composants
- **`CallPhasesDisplay`** (mis à jour)
  - Affiche les phases d'appel
  - Intègre la transcription en temps réel
  - Interface utilisateur pour les transcripts
- **`TranscriptionDemo`** (`src/components/Dashboard/TranscriptionDemo.tsx`)
  - Composant de démonstration
  - Exemple d'utilisation du CallPhasesDisplay

## Fonctionnalités

### 1. Transcription en Temps Réel
- **Interim Results** : Affichage en temps réel pendant la parole
- **Final Results** : Transcription finale avec confiance
- **Auto-scroll** : Défilement automatique vers le bas
- **Timestamps** : Horodatage de chaque segment

### 2. Détection de Langue
- **Automatique** : Basée sur le préfixe du numéro de téléphone
- **Supportées** :
  - Français (`+33`) → `fr-FR`
  - Arabe (`+212`) → `ar-MA`
  - Espagnol (`+34`) → `es-ES`
  - Allemand (`+49`) → `de-DE`
  - Anglais (par défaut) → `en-US`

### 3. Diarisation des Locuteurs
- **Identification** : Distinction entre agent et client
- **Configuration** : 2 locuteurs maximum
- **Affichage** : Indication du locuteur pour chaque segment

### 4. Interface Utilisateur
- **État actif** : Indicateur visuel de l'activité
- **Segments** : Affichage organisé des transcripts
- **Confiance** : Pourcentage de confiance pour chaque segment
- **Statistiques** : Nombre total de segments et langue détectée

## Configuration

### Variables d'environnement requises
```env
VITE_API_URL_CALL=https://api-dash-calls.harx.ai
VITE_WS_URL=wss://api-dash-calls.harx.ai/speech-to-text
```

### Configuration Speech-to-Text
```typescript
const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: audioContext.sampleRate,
  languageCode: 'fr-FR', // Détecté automatiquement
  enableAutomaticPunctuation: true,
  model: 'phone_call',
  useEnhanced: true,
  enableSpeakerDiarization: true,
  enableAutomaticLanguageIdentification: true,
  interimResults: true
};
```

## Utilisation

### 1. Dans ContactInfo.tsx
```typescript
import { useTranscriptionIntegration } from '../../hooks/useTranscriptionIntegration';

export function ContactInfo() {
  const { startTranscription, stopTranscription } = useTranscriptionIntegration();
  
  // Démarrer la transcription quand l'appel est accepté
  conn.on('accept', async () => {
    const stream = conn.getRemoteStream();
    if (stream) {
      await startTranscription(stream, contact.phone);
    }
  });
  
  // Arrêter la transcription quand l'appel se termine
  const endCall = async () => {
    await stopTranscription();
    // ... autres actions
  };
}
```

### 2. Dans CallPhasesDisplay.tsx
```typescript
<CallPhasesDisplay
  phases={phases}
  currentPhase="qualification"
  isCallActive={true}
  phoneNumber="+33123456789"
  mediaStream={mediaStream}
  onPhaseClick={handlePhaseClick}
/>
```

### 3. Composant de démonstration
```typescript
<TranscriptionDemo
  isCallActive={callStatus === 'active'}
  phoneNumber={contact.phone}
  mediaStream={mediaStream}
/>
```

## Flux de Données

1. **Démarrage d'appel** → `ContactInfo` initialise la transcription
2. **Flux audio** → `TranscriptionService` traite l'audio
3. **WebSocket** → Envoi au backend pour reconnaissance vocale
4. **Résultats** → Retour via WebSocket
5. **Affichage** → `CallPhasesDisplay` met à jour l'interface
6. **Fin d'appel** → Nettoyage automatique des ressources

## Gestion des Erreurs

- **WebSocket déconnecté** : Reconnexion automatique
- **Audio indisponible** : Message d'erreur informatif
- **Langue non supportée** : Fallback vers l'anglais
- **Ressources** : Nettoyage automatique à la fin d'appel

## Améliorations Futures

- [ ] Sauvegarde des transcripts dans la base de données
- [ ] Analyse de sentiment en temps réel
- [ ] Détection de mots-clés et alertes
- [ ] Export des transcripts (PDF, TXT)
- [ ] Intégration avec l'IA pour recommandations
- [ ] Support de plus de langues
- [ ] Amélioration de la diarisation
- [ ] Métriques de performance de la transcription 