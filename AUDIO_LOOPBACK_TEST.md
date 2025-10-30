# Audio Loopback Test - Guide de Débogage

## Objectif

Ce test permet de vérifier la qualité de l'encodage/décodage audio **localement**, sans avoir besoin de faire un vrai appel Telnyx. Il capture votre voix, applique le même traitement que pour l'envoi à Telnyx, puis décode et rejoue l'audio pour que vous puissiez entendre le résultat.

## Principe de Fonctionnement

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO LOOPBACK TEST                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Microphone                                                      │
│      ↓                                                           │
│  AudioContext (48kHz native)                                     │
│      ↓                                                           │
│  MediaStreamSource                                               │
│      ↓                                                           │
│  AudioWorkletNode (mic-processor)                                │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │  1. Downsample: 48kHz → 8kHz            │                   │
│  │  2. Encode: Float32 → PCMU (µ-law)      │                   │
│  │  3. Buffer: 160 samples (20ms)          │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  Uint8Array (PCMU bytes)                                         │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │  4. Decode: PCMU → Float32              │                   │
│  │     (même algo que AudioStreamManager)   │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  Jitter Buffer (queue)                                           │
│      ↓                                                           │
│  AudioContext (8kHz playback)                                    │
│      ↓                                                           │
│  Speakers (vous vous entendez)                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Comment Utiliser

### 1. Démarrer le Test

1. Cliquez sur le bouton **"🔄 Test Audio"** en bas à gauche de l'écran
2. Un panneau s'ouvre à droite
3. Cliquez sur **"▶️ Start Test"**
4. Autorisez l'accès au microphone si demandé

### 2. Tester

1. **Parlez dans votre microphone**
2. Vous devriez **vous entendre** avec un léger délai (~100-200ms)
3. **Écoutez attentivement** :
   - Y a-t-il du **bruit** ?
   - Y a-t-il de la **distorsion** ?
   - La voix est-elle **claire** ?
   - Y a-t-il des **coupures** ?

### 3. Analyser les Logs

Ouvrez la console du navigateur (F12) pour voir les logs détaillés :

```
🔄 Starting audio loopback test...
🎤 Microphone captured
🎧 Capture AudioContext created at 48000 Hz
🔊 Playback AudioContext created at 8000 Hz
🔧 Worklet loaded and connected
✅ Loopback test started
📦 Received PCMU chunk: 160 bytes
▶️ Starting playback...
```

### 4. Vérifier les Statistiques

Le panneau affiche en temps réel :
- **Capture Rate** : Fréquence d'échantillonnage du micro (généralement 48000 Hz)
- **Playback Rate** : Fréquence de lecture (8000 Hz)
- **Queue Length** : Nombre de chunks en attente
- **Latency** : Latence approximative en millisecondes

### 5. Arrêter le Test

Cliquez sur **"⏹️ Stop Test"** pour arrêter

## Diagnostic des Problèmes

### Problème 1 : Bruit / Distorsion

**Symptôme** : Vous entendez du bruit, de la distorsion, ou la voix est "robotique"

**Causes possibles** :
1. **Encodage µ-law incorrect**
   - Vérifier l'algorithme dans `mic-processor.worklet.js`
   - Comparer avec l'algorithme de décodage dans `AudioLoopbackTest.ts`

2. **Downsampling incorrect**
   - Le ratio de downsampling peut être incorrect
   - Vérifier le calcul : `ratio = sampleRate / 8000`

3. **Clipping audio**
   - Les échantillons dépassent [-1, 1]
   - Vérifier le gain dans le pipeline

**Solution** :
```javascript
// Dans mic-processor.worklet.js, ligne 31-44
encodeMuLaw(sample) {
  const BIAS = 0x84;
  const MAX = 32635;
  const sign = sample < 0 ? 0x80 : 0;
  let s = Math.abs(sample);
  s = Math.min(s, 1.0);  // ← Clamp à 1.0
  // ... reste de l'algo
}
```

### Problème 2 : Coupures / Saccades

**Symptôme** : L'audio se coupe, il y a des blancs

**Causes possibles** :
1. **Queue vide** : Les chunks arrivent trop lentement
2. **Buffer trop petit** : Pas assez de buffering
3. **CPU surchargé** : Le worklet ne suit pas

**Solution** :
- Augmenter le seuil de démarrage (START_THRESHOLD)
- Vérifier la queue length dans les stats
- Fermer d'autres applications gourmandes

### Problème 3 : Latence Élevée

**Symptôme** : Le délai entre votre voix et ce que vous entendez est trop long

**Causes possibles** :
1. **Queue trop longue** : Trop de chunks en attente
2. **Jitter buffer trop grand**

**Solution** :
- Réduire le START_THRESHOLD
- Vérifier la latency dans les stats (devrait être ~60-120ms)

### Problème 4 : Pas de Son

**Symptôme** : Vous ne vous entendez pas du tout

**Causes possibles** :
1. **Microphone non autorisé**
2. **AudioContext suspendu** (autoplay policy)
3. **Worklet non chargé**

**Solution** :
- Vérifier les logs dans la console
- Autoriser l'accès au microphone
- Vérifier qu'il n'y a pas d'erreur dans les logs

## Comparaison avec le Pipeline Réel

### Test Loopback
```
Micro → Worklet → PCMU → Decode → Speakers
```

### Pipeline Réel (Appel Telnyx)
```
Micro → Worklet → PCMU → RTP → WebSocket → Telnyx
                                              ↓
Telnyx → WebSocket → PCMU → Decode → Speakers
```

**Différence** : Le test loopback ne passe pas par le réseau ni par Telnyx, donc :
- ✅ Pas de latence réseau
- ✅ Pas de perte de paquets
- ✅ Pas de problème de WebSocket

Si le test loopback fonctionne bien mais l'appel réel a des problèmes, alors le problème vient probablement :
- Du réseau (latence, perte de paquets)
- Du backend (traitement incorrect)
- De la configuration Telnyx

## Logs à Surveiller

### Logs Normaux (Bon Fonctionnement)

```
🔄 Starting audio loopback test...
🎤 Microphone captured
🎧 Capture AudioContext created at 48000 Hz
🔊 Playback AudioContext created at 8000 Hz
🔧 Worklet loaded and connected
✅ Loopback test started
📦 Received PCMU chunk: 160 bytes
📦 Received PCMU chunk: 160 bytes
📦 Received PCMU chunk: 160 bytes
▶️ Starting playback...
```

### Logs Problématiques

```
❌ Error starting loopback test: NotAllowedError: Permission denied
→ Autoriser le microphone

❌ Failed to start audio source
→ Problème de playback, vérifier AudioContext

⚠️ start failed with playbackTime, started immediately
→ Problème de timing, mais récupéré automatiquement
```

## Tests Avancés

### Test 1 : Vérifier l'Encodage/Décodage

Ajoutez des logs dans le worklet pour vérifier les valeurs :

```javascript
// Dans mic-processor.worklet.js
encodeMuLaw(sample) {
  // ... code existant ...
  
  // Log quelques échantillons pour debug
  if (Math.random() < 0.001) { // 0.1% des échantillons
    console.log('Sample:', sample, '→ PCMU:', muLaw);
  }
  
  return muLaw & 0xff;
}
```

### Test 2 : Comparer avec un Fichier Audio

Enregistrez un fichier audio de référence et comparez-le avec ce que vous entendez dans le test.

### Test 3 : Tester Différentes Fréquences

Jouez un son à une fréquence connue (ex: 440 Hz, la note La) et vérifiez qu'il est correctement reproduit.

## Métriques de Qualité

| Métrique                | Valeur Attendue | Valeur Acceptable | Problème si... |
|-------------------------|-----------------|-------------------|----------------|
| Latency                 | 60-120 ms       | < 200 ms          | > 300 ms       |
| Queue Length            | 3-6 chunks      | < 10 chunks       | > 20 chunks    |
| PCMU Chunk Size         | 160 bytes       | Exactement 160    | Autre valeur   |
| Capture Sample Rate     | 48000 Hz        | 44100-48000 Hz    | < 44100 Hz     |
| Playback Sample Rate    | 8000 Hz         | Exactement 8000   | Autre valeur   |

## Conclusion

Ce test est **essentiel** pour diagnostiquer les problèmes audio avant de chercher du côté réseau ou backend.

**Si le test loopback fonctionne bien** → Le problème est ailleurs (réseau, backend, Telnyx)  
**Si le test loopback a des problèmes** → Le problème est dans l'encodage/décodage local

---

**Fichiers Concernés** :
- `src/services/AudioLoopbackTest.ts` - Service de test
- `src/components/AudioLoopbackTestUI.tsx` - Interface utilisateur
- `src/worklets/mic-processor.worklet.js` - Encodage PCMU
- `src/App.tsx` - Intégration du test

**Documentation Associée** :
- `TELNYX_STREAMING_ALIGNMENT.md` - Spécifications Telnyx
- `AUDIO_FLOW_DIAGRAM.md` - Diagrammes de flux
- `STREAMING_IMPLEMENTATION_SUMMARY.md` - Résumé de l'implémentation

