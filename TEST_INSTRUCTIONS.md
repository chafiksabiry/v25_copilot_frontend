# Instructions de Test - Audio Loopback

## 🎯 Objectif du Test

Vérifier que votre voix est correctement encodée en PCMU et décodée, **avant** de faire un vrai appel.

---

## 📋 Préparation

### 1. Matériel Nécessaire
- ✅ Un microphone fonctionnel
- ✅ Des haut-parleurs ou un casque
- ✅ Navigateur moderne (Chrome, Edge, Firefox, Safari)

### 2. Environnement
- ✅ Endroit calme (pour mieux entendre les problèmes)
- ✅ Casque recommandé (évite l'effet Larsen)
- ✅ Volume micro et haut-parleurs à niveau normal

---

## 🚀 Lancer le Test

### Étape 1 : Démarrer l'Application
```bash
npm run dev
```

### Étape 2 : Ouvrir la Console
- Appuyez sur **F12** pour ouvrir les outils de développement
- Allez dans l'onglet **Console**
- Gardez-la ouverte pendant le test

### Étape 3 : Activer le Test
1. Cherchez le bouton **"🔄 Test Audio"** en bas à gauche de l'écran
2. Cliquez dessus
3. Un panneau s'ouvre à droite

### Étape 4 : Démarrer le Test
1. Cliquez sur **"▶️ Start Test"**
2. Autorisez l'accès au microphone si demandé
3. Attendez que le test démarre

### Étape 5 : Vérifier les Logs
Dans la console, vous devriez voir :
```
🔄 Starting audio loopback test...
🎤 Microphone captured
🎧 Capture AudioContext created at 48000 Hz
🔊 Playback AudioContext created at 8000 Hz
🔧 Worklet loaded and connected
✅ Loopback test started - You should hear yourself with a slight delay
📊 Pipeline: Microphone → Downsample (8kHz) → Encode (PCMU) → Decode (PCMU) → Speakers
```

### Étape 6 : Tester Votre Voix
1. **Parlez normalement** dans votre microphone
2. Dites par exemple : "Test, un, deux, trois, test"
3. **Écoutez attentivement** ce que vous entendez

---

## ✅ Résultats Attendus

### Audio Normal ✅

Vous devriez entendre :
- ✅ Votre voix **claire et compréhensible**
- ✅ Un **léger délai** (~100-200ms) - c'est normal
- ✅ **Pas de bruit** parasite
- ✅ **Pas de distorsion** ou de son "robotique"
- ✅ **Pas de coupures** ou de blancs

### Statistiques Normales ✅

Dans le panneau, vous devriez voir :
- ✅ **Capture Rate** : 48000 Hz (ou 44100 Hz)
- ✅ **Playback Rate** : 8000 Hz
- ✅ **Queue Length** : 3-6 chunks (stable)
- ✅ **Latency** : ~60-120 ms

### Logs Normaux ✅

Dans la console, vous devriez voir en continu :
```
📦 Received PCMU chunk: 160 bytes
📦 Received PCMU chunk: 160 bytes
📦 Received PCMU chunk: 160 bytes
▶️ Starting playback...
```

---

## ❌ Problèmes Possibles

### Problème 1 : Bruit / Distorsion

**Symptômes** :
- Voix avec beaucoup de bruit
- Son "robotique" ou distordu
- Grésillements

**Diagnostic** :
```
❌ Problème d'encodage PCMU
```

**Actions** :
1. Vérifiez les logs pour des erreurs
2. Vérifiez que Queue Length est stable
3. Regardez dans `mic-processor.worklet.js` ligne 31-44
4. Comparez avec `AudioLoopbackTest.ts` ligne 99-110

**Solution Possible** :
Le problème vient probablement de l'algorithme µ-law. Vérifiez que :
- Le clamping à [-1, 1] est correct
- Le BIAS (0x84) est correct
- Le MAX (32635) est correct

### Problème 2 : Coupures / Blancs

**Symptômes** :
- Audio qui se coupe
- Blancs dans la voix
- Son saccadé

**Diagnostic** :
```
❌ Queue vide ou CPU surchargé
```

**Actions** :
1. Vérifiez Queue Length dans les stats
2. Si Queue Length = 0 souvent → Chunks arrivent trop lentement
3. Fermez d'autres applications gourmandes
4. Vérifiez les logs pour "⚠️ start failed"

**Solution Possible** :
- Augmenter START_THRESHOLD dans `AudioLoopbackTest.ts`
- Vérifier que le worklet n'a pas d'erreur

### Problème 3 : Pas de Son

**Symptômes** :
- Vous ne vous entendez pas du tout
- Silence complet

**Diagnostic** :
```
❌ Microphone non autorisé ou AudioContext suspendu
```

**Actions** :
1. Vérifiez les logs pour des erreurs
2. Cherchez "❌ Error starting loopback test"
3. Vérifiez les permissions du navigateur
4. Vérifiez que le micro fonctionne (testez dans une autre app)

**Solution Possible** :
- Autoriser le microphone dans les paramètres du navigateur
- Cliquer quelque part sur la page (autoplay policy)
- Recharger la page

### Problème 4 : Latence Élevée

**Symptômes** :
- Délai très long (> 500ms)
- Vous vous entendez avec beaucoup de retard

**Diagnostic** :
```
⚠️ Queue trop longue
```

**Actions** :
1. Vérifiez Queue Length dans les stats
2. Si Queue Length > 10 → Trop de buffering
3. Vérifiez Latency dans les stats

**Solution Possible** :
- Réduire START_THRESHOLD
- Vérifier que le CPU n'est pas surchargé

---

## 📊 Checklist de Validation

Cochez chaque point :

### Démarrage
- [ ] Le bouton "🔄 Test Audio" est visible
- [ ] Le panneau s'ouvre quand je clique
- [ ] Le bouton "▶️ Start Test" fonctionne
- [ ] Le navigateur demande l'autorisation du micro
- [ ] Les logs apparaissent dans la console

### Audio
- [ ] Je m'entends dans les haut-parleurs
- [ ] La voix est claire (pas de bruit)
- [ ] Pas de distorsion ou son robotique
- [ ] Pas de coupures ou blancs
- [ ] Le délai est acceptable (~100-200ms)

### Statistiques
- [ ] Capture Rate = 48000 Hz (ou 44100 Hz)
- [ ] Playback Rate = 8000 Hz
- [ ] Queue Length = 3-6 chunks (stable)
- [ ] Latency = ~60-120 ms
- [ ] LED verte animée visible

### Logs
- [ ] "✅ Loopback test started" visible
- [ ] "📦 Received PCMU chunk: 160 bytes" répété
- [ ] "▶️ Starting playback..." visible
- [ ] Pas de messages d'erreur (❌)

---

## 🔍 Tests Avancés

### Test 1 : Différents Volumes

1. Parlez **doucement**
   - La voix doit rester claire
   - Pas de distorsion même si faible

2. Parlez **fort** (sans crier)
   - La voix doit rester claire
   - Pas de saturation ou clipping

### Test 2 : Différents Sons

1. Dites des **voyelles** : "Aaaaa", "Eeeee", "Ooooo"
   - Doivent être claires et continues

2. Dites des **consonnes** : "Ssss", "Fffff", "Chchch"
   - Doivent être reconnaissables

3. **Sifflez** (si vous pouvez)
   - Le sifflement doit être audible

### Test 3 : Durée

1. Laissez le test tourner **1 minute**
   - Queue Length doit rester stable
   - Pas de dégradation progressive
   - Pas d'accumulation de latence

---

## 📝 Rapport de Test

Après le test, notez :

### Résultat Global
- [ ] ✅ Test réussi - Audio parfait
- [ ] ⚠️ Test acceptable - Quelques problèmes mineurs
- [ ] ❌ Test échoué - Problèmes majeurs

### Détails
```
Date : _______________
Navigateur : _______________
Capture Rate : _______________
Playback Rate : _______________
Queue Length : _______________
Latency : _______________

Problèmes rencontrés :
_________________________________
_________________________________
_________________________________

Logs d'erreur (copier depuis console) :
_________________________________
_________________________________
_________________________________
```

---

## 🎓 Interprétation des Résultats

### Cas 1 : Test Loopback ✅ + Appel Réel ✅
```
→ Tout fonctionne parfaitement !
→ Aucune action nécessaire
```

### Cas 2 : Test Loopback ✅ + Appel Réel ❌
```
→ Le problème n'est PAS dans l'encodage local
→ Chercher du côté :
  • WebSocket (connexion, messages)
  • Backend (traitement, logs)
  • Telnyx (configuration, compte)
  • Réseau (latence, perte de paquets)
```

### Cas 3 : Test Loopback ❌ + Appel Réel ❌
```
→ Le problème EST dans l'encodage local
→ Corriger en priorité :
  • Algorithme µ-law (worklet)
  • Downsampling (ratio)
  • Décodage (AudioLoopbackTest)
```

### Cas 4 : Test Loopback ❌ + Appel Réel ✅
```
→ Situation inhabituelle
→ Possible si :
  • Backend corrige les erreurs
  • Telnyx fait du traitement
→ Mais mieux vaut corriger le loopback quand même
```

---

## 💡 Conseils

1. **Testez AVANT de faire un vrai appel**
   - Gagne du temps
   - Évite de déranger le destinataire

2. **Utilisez un casque**
   - Évite l'effet Larsen
   - Meilleure qualité d'écoute

3. **Testez dans le silence**
   - Plus facile de détecter les problèmes
   - Pas de bruit ambiant qui masque les défauts

4. **Gardez la console ouverte**
   - Les logs sont essentiels
   - Permet de voir les erreurs en temps réel

5. **Testez plusieurs fois**
   - Vérifier la cohérence
   - Détecter les problèmes intermittents

---

## 🆘 Besoin d'Aide ?

### Logs à Fournir
Si vous avez un problème, copiez :
1. Tous les logs de la console (F12)
2. Les statistiques du panneau
3. Description précise du problème audio

### Fichiers à Vérifier
- `src/services/AudioLoopbackTest.ts`
- `src/worklets/mic-processor.worklet.js`
- `src/components/AudioLoopbackTestUI.tsx`

### Documentation
- `AUDIO_LOOPBACK_TEST.md` - Guide complet
- `LOOPBACK_TEST_SUMMARY.md` - Résumé technique
- `TELNYX_STREAMING_ALIGNMENT.md` - Spécifications

---

**Bonne chance avec vos tests ! 🚀**

