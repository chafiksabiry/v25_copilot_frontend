# Guide de Debug - Vrai Appel Telnyx

## ✅ Pré-requis

Le test loopback fonctionne parfaitement, ce qui confirme que :
- ✅ L'encodage PCMU est correct
- ✅ Le downsampling fonctionne
- ✅ Le worklet fonctionne
- ✅ La qualité audio locale est bonne

**Maintenant, testons le vrai appel !**

---

## 🎯 Objectif

Vérifier que l'audio encodé localement arrive correctement au destinataire via Telnyx.

---

## 📋 Procédure de Test

### Étape 1 : Préparer la Console

1. Ouvrez l'application
2. Appuyez sur **F12** pour ouvrir les outils de développement
3. Allez dans l'onglet **Console**
4. Cliquez sur l'icône **🗑️** pour vider la console
5. **Gardez la console ouverte** pendant tout le test

### Étape 2 : Initier un Appel

1. Entrez un numéro de téléphone
2. Cliquez sur **"Start Call"**
3. Attendez que l'appel soit établi

### Étape 3 : Vérifier les Logs de Connexion

Dans la console, vous devriez voir :

```
📞 Telnyx call status: call.initiated
🔍 Generated WebSocket URL: wss://...
🎧 Setting stream URL for frontend audio: wss://...
🎤 WebSocket connecté pour le micro
```

✅ **Si vous voyez ces logs** → WebSocket connecté  
❌ **Si vous ne les voyez pas** → Problème de connexion WebSocket

### Étape 4 : Attendre que l'Appel soit Répondu

Attendez que le destinataire réponde. Vous devriez voir :

```
📞 Telnyx call status: call.answered
📞 Call answered
🎤 Capture micro démarrée
🎧 Microphone capture started
```

✅ **Si vous voyez ces logs** → Capture micro démarrée  
❌ **Si vous ne les voyez pas** → Problème de démarrage du micro

### Étape 5 : Parler et Vérifier l'Envoi

**Parlez dans votre microphone** et vérifiez les logs :

```
📦 PCMU chunk #1: 160 bytes
✅ Sent chunk #1 via WebSocket (RTP: 172 bytes, seq: 1, ts: 160)
📦 PCMU chunk #50: 160 bytes
✅ Sent chunk #50 via WebSocket (RTP: 172 bytes, seq: 50, ts: 8000)
📦 PCMU chunk #100: 160 bytes
✅ Sent chunk #100 via WebSocket (RTP: 172 bytes, seq: 100, ts: 16000)
```

**Analyse** :
- **PCMU chunk** : 160 bytes (correct, 20ms @ 8kHz)
- **RTP packet** : 172 bytes (160 + 12 bytes header, correct)
- **seq** : Incrémente de 1 à chaque chunk (correct)
- **ts** : Incrémente de 160 à chaque chunk (correct)

✅ **Si vous voyez ces logs régulièrement** → Audio envoyé correctement  
❌ **Si vous ne voyez pas ces logs** → Problème d'encodage ou d'envoi

### Étape 6 : Demander au Destinataire

Pendant que vous parlez, demandez au destinataire :

1. **"M'entends-tu ?"**
2. **"Comment est la qualité ?"**
3. **"Y a-t-il du bruit ou de la distorsion ?"**

---

## 🔍 Diagnostic des Problèmes

### Problème 1 : Pas de Logs de Connexion

**Symptômes** :
```
❌ Pas de "WebSocket connecté pour le micro"
```

**Causes possibles** :
- WebSocket ne se connecte pas
- URL incorrecte
- Backend non accessible

**Actions** :
1. Vérifiez `VITE_API_URL_CALL` dans `.env`
2. Vérifiez que le backend est démarré
3. Vérifiez les erreurs réseau dans l'onglet **Network**

### Problème 2 : Pas de Logs de Capture

**Symptômes** :
```
❌ Pas de "Microphone capture started"
```

**Causes possibles** :
- Microphone non autorisé
- Erreur lors du chargement du worklet
- AudioContext suspendu

**Actions** :
1. Vérifiez les permissions du microphone
2. Cherchez des erreurs dans la console
3. Vérifiez que `mic-processor.worklet.js` existe

### Problème 3 : Pas de Logs d'Envoi

**Symptômes** :
```
✅ "Microphone capture started"
❌ Pas de "PCMU chunk #1"
```

**Causes possibles** :
- Worklet ne traite pas l'audio
- Microphone muet
- Pas de son capturé

**Actions** :
1. Vérifiez que vous parlez dans le micro
2. Vérifiez le volume du microphone
3. Testez le micro dans une autre application

### Problème 4 : WebSocket Non Prêt

**Symptômes** :
```
❌ WebSocket not ready for chunk #1, state: 0
```

**Causes possibles** :
- WebSocket en cours de connexion (state: 0)
- WebSocket fermé (state: 3)
- WebSocket en erreur

**Actions** :
1. Vérifiez l'état du WebSocket (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)
2. Attendez que le WebSocket soit connecté avant de démarrer le micro
3. Vérifiez les erreurs WebSocket dans la console

### Problème 5 : Chunks Irréguliers

**Symptômes** :
```
📦 PCMU chunk #1: 160 bytes
📦 PCMU chunk #2: 160 bytes
... (long délai)
📦 PCMU chunk #3: 160 bytes
```

**Causes possibles** :
- CPU surchargé
- Worklet en pause
- Microphone qui se coupe

**Actions** :
1. Fermez d'autres applications
2. Vérifiez l'utilisation CPU
3. Testez avec un autre navigateur

### Problème 6 : Destinataire Entend du Bruit

**Symptômes** :
```
✅ Logs normaux côté frontend
❌ Destinataire entend du bruit/distorsion
```

**Causes possibles** :
- Problème réseau (perte de paquets)
- Problème backend (décodage incorrect)
- Problème Telnyx (configuration)

**Actions** :
1. Vérifiez les logs backend
2. Vérifiez la configuration Telnyx
3. Testez avec un autre destinataire

---

## 📊 Checklist de Validation

### Connexion
- [ ] WebSocket URL générée correctement
- [ ] WebSocket connecté (`🎤 WebSocket connecté`)
- [ ] Pas d'erreurs de connexion

### Capture Audio
- [ ] Microphone autorisé
- [ ] AudioContext créé
- [ ] Worklet chargé
- [ ] Capture démarrée (`🎧 Microphone capture started`)

### Encodage & Envoi
- [ ] PCMU chunks reçus (160 bytes)
- [ ] RTP packets créés (172 bytes)
- [ ] Base64 encodé
- [ ] Envoyé via WebSocket
- [ ] Logs réguliers (tous les 50 chunks)

### Qualité Audio
- [ ] Destinataire entend ma voix
- [ ] Voix claire (pas de bruit)
- [ ] Pas de distorsion
- [ ] Pas de coupures
- [ ] Volume correct

---

## 🔬 Logs Détaillés

### Logs Normaux (Tout Fonctionne)

```
📞 Telnyx call status: call.initiated
🔍 Generated WebSocket URL: wss://your-backend.com/frontend-audio
🎧 Setting stream URL for frontend audio: wss://your-backend.com/frontend-audio
🎤 WebSocket connecté pour le micro

📞 Telnyx call status: call.answered
📞 Call answered
🎤 Capture micro démarrée
🎧 Microphone capture started

📦 PCMU chunk #1: 160 bytes
✅ Sent chunk #1 via WebSocket (RTP: 172 bytes, seq: 1, ts: 160)
📦 PCMU chunk #50: 160 bytes
✅ Sent chunk #50 via WebSocket (RTP: 172 bytes, seq: 50, ts: 8000)
📦 PCMU chunk #100: 160 bytes
✅ Sent chunk #100 via WebSocket (RTP: 172 bytes, seq: 100, ts: 16000)
```

### Logs Problématiques

```
❌ Error starting microphone stream: NotAllowedError
→ Microphone non autorisé

❌ WebSocket not ready for chunk #1, state: 0
→ WebSocket pas encore connecté

❌ Error starting microphone stream: Failed to load audio worklet module
→ Worklet introuvable

❌ WebSocket connection error
→ Backend non accessible
```

---

## 📈 Métriques Attendues

| Métrique | Valeur Attendue | Tolérance |
|----------|-----------------|-----------|
| PCMU chunk size | 160 bytes | Exactement 160 |
| RTP packet size | 172 bytes | Exactement 172 |
| Fréquence d'envoi | ~50 chunks/sec | 45-55 chunks/sec |
| Sequence number | Incrémente de 1 | Pas de saut |
| Timestamp | Incrémente de 160 | Pas de saut |
| WebSocket state | 1 (OPEN) | Toujours 1 |

---

## 🎯 Comparaison Test vs Réel

| Aspect | Test Loopback | Vrai Appel | Status |
|--------|---------------|------------|--------|
| Encodage PCMU | ✅ OK | ❓ À tester | - |
| Chunk size | 160 bytes | 160 bytes | ✅ |
| RTP header | ❌ Non | ✅ Oui (12 bytes) | ✅ |
| Base64 | ❌ Non | ✅ Oui | ✅ |
| WebSocket | ❌ Non | ✅ Oui | ❓ |
| Qualité audio | ✅ Excellente | ❓ À tester | - |

---

## 🆘 Si Ça Ne Marche Toujours Pas

### 1. Vérifier le Backend

Demandez au backend de logger :
```
Received WebSocket message: { event: 'media', ... }
Decoded base64: [172 bytes]
Parsed RTP header: seq=1, ts=160, pt=0
PCMU payload: [160 bytes]
Sent to Telnyx: [160 bytes PCMU]
```

### 2. Vérifier Telnyx

Dans le dashboard Telnyx, vérifiez :
- Configuration du call : `stream_bidirectional_mode = "rtp"`
- Codec : `stream_bidirectional_codec = "PCMU"`
- Pas de transcoding activé

### 3. Capturer le Trafic

Utilisez Wireshark pour capturer :
- Les messages WebSocket
- Le contenu des payloads
- La fréquence d'envoi

### 4. Tester avec un Autre Destinataire

Appelez un autre numéro pour voir si le problème persiste.

---

## 📝 Rapport de Test

Après le test, notez :

```
Date : _______________
Destinataire : _______________
Durée appel : _______________

Logs de connexion :
[ ] WebSocket connecté
[ ] Capture micro démarrée

Logs d'envoi :
[ ] PCMU chunks reçus
[ ] RTP packets créés
[ ] Envoyés via WebSocket
[ ] Fréquence régulière

Qualité audio (selon destinataire) :
[ ] Voix audible
[ ] Voix claire
[ ] Pas de bruit
[ ] Pas de distorsion
[ ] Volume correct

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

**Bonne chance avec votre test ! 🚀**

Si le test loopback fonctionne mais le vrai appel a des problèmes, consultez `LOOPBACK_VS_REAL_CALL_COMPARISON.md` pour comprendre les différences.

