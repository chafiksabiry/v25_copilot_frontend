# Intégration Zone de Destination pour la Transcription

## Vue d'ensemble

Cette fonctionnalité permet de déterminer automatiquement la langue de transcription en fonction de la zone de destination du gig, plutôt que de se baser uniquement sur le numéro de téléphone.

## Architecture

### 1. Hook `useDestinationZone`

Récupère la zone de destination depuis l'API des gigs.

```typescript
const { zone, loading, error, fetchDestinationZone } = useDestinationZone(gigId);
```

**Endpoint utilisé :**
```
GET ${VITE_GIGS_API}/gigs/${gigId}/destination-zone
```

**Réponse attendue :**
```json
{
  "data": {
    "code": "FR" // Code de la zone de destination
  }
}
```

### 2. Service de Transcription Modifié

Le `TranscriptionService` a été étendu pour supporter la zone de destination :

```typescript
// Définir la zone de destination
transcriptionService.setDestinationZone('FR');

// La langue sera automatiquement détectée lors de l'initialisation
await transcriptionService.initializeTranscription(stream, phoneNumber);
```

### 3. Mapping des Zones vers Langues

Le service inclut un mapping complet des codes de zones vers les codes de langue :

| Zone | Langue | Code |
|------|--------|------|
| FR | Français | fr-FR |
| DE | Allemand | de-DE |
| ES | Espagnol | es-ES |
| MA | Arabe | ar-MA |
| GB | Anglais | en-GB |
| US | Anglais | en-US |
| ... | ... | ... |

## Utilisation

### 1. Dans un Composant

```typescript
import { useDestinationZone } from '../hooks/useDestinationZone';
import { useTranscriptionIntegration } from '../hooks/useTranscriptionIntegration';

const MyComponent = ({ gigId, phoneNumber, stream }) => {
  // Récupérer la zone de destination
  const { zone: destinationZone } = useDestinationZone(gigId);
  
  // Utiliser la transcription avec la zone
  const { startTranscription, stopTranscription } = useTranscriptionIntegration(destinationZone);
  
  const handleStart = async () => {
    await startTranscription(stream, phoneNumber);
  };
  
  return (
    <div>
      <p>Zone: {destinationZone}</p>
      <button onClick={handleStart}>Démarrer</button>
    </div>
  );
};
```

### 2. Composant Prêt à l'Emploi

Utilisez le composant `TranscriptionWithDestinationZone` :

```typescript
import { TranscriptionWithDestinationZone } from './TranscriptionWithDestinationZone';

<TranscriptionWithDestinationZone
  gigId="123"
  phoneNumber="+33123456789"
  stream={audioStream}
/>
```

## Priorité de Détection

1. **Zone de destination du gig** (priorité haute)
2. **Numéro de téléphone** (fallback)

Si la zone de destination est disponible, elle sera utilisée en priorité. Sinon, le système revient à la détection basée sur le numéro de téléphone.

## Variables d'Environnement

Assurez-vous que les variables suivantes sont configurées dans votre fichier `.env` :

```env
VITE_GIGS_API=https://api.example.com/gigs
VITE_RUN_MODE=sandbox

# VITE_RUN_MODE options:
# - sandbox: Mode développement (utilise un gigId fixe: 686e8ddcf74ddc5ba5d4b493)
# - in-app: Mode production (récupère gigId depuis le cookie 'currentGigId')
```

## Gestion d'Erreurs

Le système gère automatiquement :
- Gig ID manquant
- Erreurs de réseau
- Réponses invalides de l'API
- Fallback vers la détection par numéro de téléphone

## Logs de Debug

Le système génère des logs détaillés :

```
🌍 Destination zone data: { data: { code: "FR" } }
🌍 Destination zone set: FR
🌍 Using destination zone for language detection: FR
🌍 Language for zone FR: fr-FR
```

## Tests

Pour tester la fonctionnalité :

1. Créez un gig avec une zone de destination spécifique
2. Utilisez le composant `TranscriptionWithDestinationZone`
3. Vérifiez que la langue correcte est utilisée dans les logs
4. Testez avec différentes zones (FR, DE, ES, MA, etc.)

## Migration

Pour migrer du système existant :

1. Remplacez `useTranscriptionIntegration()` par `useTranscriptionIntegration(destinationZone)`
2. Ajoutez `useDestinationZone(gigId)` pour récupérer la zone
3. Le reste de l'API reste identique

## Avantages

- **Précision améliorée** : La langue est déterminée par la destination réelle
- **Flexibilité** : Support de nombreuses zones géographiques
- **Fallback robuste** : Retour automatique à la détection par numéro
- **Logs détaillés** : Facilité de debug et monitoring 