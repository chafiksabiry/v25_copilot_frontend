# Test de la Transcription en Temps Réel

## 🎯 Objectif
Vérifier que la transcription s'affiche correctement dans le composant "REPS Call Phases" pendant un appel.

## ✅ Étapes de Test

### 1. Préparation
- [ ] Ouvrir l'application
- [ ] Vérifier que le backend est accessible
- [ ] Vérifier les variables d'environnement :
  ```env
  VITE_API_URL_CALL=https://preprod-api-dash-calls.harx.ai
  VITE_WS_URL=wss://preprod-api-dash-calls.harx.ai/speech-to-text
  ```

### 2. Démarrage d'un appel
- [ ] Cliquer sur "Start Call" dans ContactInfo
- [ ] Vérifier que l'appel se connecte
- [ ] Vérifier les logs console :
  ```
  ✅ Call accepted
  🎤 Transcription started for call phases
  🔌 WebSocket connection established for speech-to-text
  ```

### 3. Vérification de la transcription
- [ ] Parler pendant l'appel
- [ ] Vérifier les logs audio :
  ```
  🎤 Audio levels: {rms: '0.032', peak: '0.110', bufferSize: 1024, isActive: true}
  ```
- [ ] Vérifier les logs de transcription :
  ```
  📝 Received transcription data: {transcript: '...', confidence: 0, isFinal: false}
  📝 CallPhasesDisplay received transcription: {type: 'interim', text: '...'}
  ```

### 4. Vérification de l'affichage
- [ ] Regarder le composant "REPS Call Phases" dans le dashboard
- [ ] Vérifier que la section "Live Transcription" apparaît
- [ ] Vérifier que le texte s'affiche en temps réel
- [ ] Vérifier l'indicateur "Active" (point vert animé)
- [ ] Vérifier les statistiques (nombre de segments, langue)

### 5. Test des fonctionnalités
- [ ] Vérifier l'auto-scroll vers le bas
- [ ] Vérifier les timestamps sur chaque segment
- [ ] Vérifier l'affichage de la confiance
- [ ] Vérifier la distinction interim/final

### 6. Fin d'appel
- [ ] Cliquer sur "End Call"
- [ ] Vérifier que la transcription s'arrête
- [ ] Vérifier que la section "Live Transcription" disparaît
- [ ] Vérifier les logs de nettoyage :
  ```
  🛑 Stopping transcription...
  🧹 Starting transcription cleanup...
  ✅ Transcription cleanup complete
  ```

## 🔍 Points de Vérification

### Logs Console Attendus
```
✅ Call accepted
🎤 Transcription started for call phases
🔌 WebSocket connection established for speech-to-text
📝 Sending speech recognition config: {...}
🎤 Audio levels: {...}
📝 Received transcription data: {...}
📝 CallPhasesDisplay received transcription: {...}
```

### Interface Utilisateur Attendue
- [ ] Section "Live Transcription" visible pendant l'appel
- [ ] Indicateur "Active" avec point vert animé
- [ ] Texte qui apparaît en temps réel
- [ ] Segments organisés avec timestamps
- [ ] Statistiques en bas (segments, langue)

### États Attendus
- **Avant appel** : Message "No Active Call"
- **Pendant appel** : Transcription en temps réel
- **Après appel** : Retour au message "No Active Call"

## 🐛 Dépannage

### Si la transcription ne s'affiche pas :
1. Vérifier les logs console pour les erreurs
2. Vérifier la connexion WebSocket
3. Vérifier que le mediaStream est bien passé
4. Vérifier que le composant CallPhasesDisplay reçoit les props

### Si l'audio n'est pas détecté :
1. Vérifier les permissions microphone
2. Vérifier que l'appel Twilio fonctionne
3. Vérifier les niveaux audio dans les logs

### Si le WebSocket ne se connecte pas :
1. Vérifier l'URL WebSocket
2. Vérifier que le backend expose l'endpoint
3. Vérifier les variables d'environnement

## 📊 Métriques de Succès

- [ ] Transcription visible dans l'interface
- [ ] Latence < 2 secondes
- [ ] Reconnexion automatique en cas de déconnexion
- [ ] Nettoyage propre des ressources
- [ ] Pas d'erreurs dans la console 