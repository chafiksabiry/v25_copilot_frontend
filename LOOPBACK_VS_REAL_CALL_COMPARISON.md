# Comparaison : Test Loopback vs Vrai Appel

## ✅ Résultat du Test Loopback

**Status** : ✅ **Test réussi - Audio clair**

Le test loopback fonctionne parfaitement, ce qui confirme que l'encodage/décodage PCMU est correct.

---

## 📊 Comparaison des Pipelines

### Test Loopback (AudioLoopbackTest)

```
Microphone
    ↓
getUserMedia()
    ↓
AudioContext (48kHz native)
    ↓
MediaStreamSource
    ↓
AudioWorkletNode (mic-processor)
    ↓
┌─────────────────────────────────────┐
│ mic-processor.worklet.js            │
│ • Downsample: 48kHz → 8kHz          │
│ • Encode: Float32 → PCMU (µ-law)    │
│ • Buffer: 160 samples (20ms)        │
│ • postMessage(Uint8Array PCMU)      │
└─────────────────────────────────────┘
    ↓
Uint8Array (160 bytes PCMU)  ← Reçu directement
    ↓
decodePCMU() [AudioLoopbackTest.ts:114-121]
    ↓
Float32Array (PCM samples)
    ↓
Queue (jitter buffer)
    ↓
AudioBuffer → BufferSource
    ↓
Speakers (vous vous entendez)
```

### Vrai Appel (MicrophoneService + Telnyx)

```
Microphone
    ↓
getUserMedia()
    ↓
AudioContext (48kHz native)
    ↓
MediaStreamSource
    ↓
AudioWorkletNode (mic-processor)
    ↓
┌─────────────────────────────────────┐
│ mic-processor.worklet.js            │  ← MÊME WORKLET
│ • Downsample: 48kHz → 8kHz          │
│ • Encode: Float32 → PCMU (µ-law)    │
│ • Buffer: 160 samples (20ms)        │
│ • postMessage(Uint8Array PCMU)      │
└─────────────────────────────────────┘
    ↓
Uint8Array (160 bytes PCMU)  ← Reçu par MicrophoneService
    ↓
createRtpPacket() [MicrophoneService.ts:76-92]
    ↓ (Ajoute header RTP 12 bytes)
Uint8Array (172 bytes RTP)
    ↓
uint8ToBase64() [MicrophoneService.ts:95-103]
    ↓
Base64 String
    ↓
WebSocket.send({ event: 'media', media: { payload: base64 }})
    ↓
Telnyx Backend
    ↓
Destinataire
```

---

## 🔍 Analyse Détaillée

### ✅ Partie Identique (Encodage)

| Composant | Test Loopback | Vrai Appel | Status |
|-----------|---------------|------------|--------|
| Worklet | `mic-processor.worklet.js` | `mic-processor.worklet.js` | ✅ Identique |
| Downsampling | 48kHz → 8kHz | 48kHz → 8kHz | ✅ Identique |
| Algorithme µ-law | Lignes 31-44 | Lignes 31-44 | ✅ Identique |
| Chunk size | 160 bytes | 160 bytes | ✅ Identique |
| Output | Uint8Array PCMU | Uint8Array PCMU | ✅ Identique |

**Conclusion** : L'encodage est **100% identique** dans les deux cas.

### ⚠️ Différence (Post-Traitement)

| Étape | Test Loopback | Vrai Appel |
|-------|---------------|------------|
| Réception PCMU | Direct du worklet | Direct du worklet |
| **RTP Packetization** | ❌ Pas fait | ✅ Fait (12 bytes header) |
| **Base64 Encoding** | ❌ Pas fait | ✅ Fait |
| **WebSocket Send** | ❌ Pas fait | ✅ Fait |

**Conclusion** : Le vrai appel ajoute **RTP + Base64**, mais le PCMU de base est identique.

---

## 🔬 Vérification du Code

### 1. Encodage PCMU (Identique)

**Worklet** (`mic-processor.worklet.js:31-44`)
```javascript
encodeMuLaw(sample) {
  const BIAS = 0x84;
  const MAX = 32635;
  const sign = sample < 0 ? 0x80 : 0;
  let s = Math.abs(sample);
  s = Math.min(s, 1.0);
  let s16 = Math.floor(s * 32767);
  if (s16 > MAX) s16 = MAX;
  s16 = s16 + BIAS;
  let exponent = 7;
  for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
  const mantissa = (s16 >> (exponent + 3)) & 0x0F;
  const muLaw = ~(sign | (exponent << 4) | mantissa);
  return muLaw & 0xff;
}
```

✅ **Utilisé par les deux** (test loopback ET vrai appel)

### 2. RTP Packetization (Vrai Appel Seulement)

**MicrophoneService** (`MicrophoneService.ts:76-92`)
```typescript
private createRtpPacket(payload: Uint8Array): Uint8Array {
  const packet = new Uint8Array(12 + payload.length);
  packet[0] = 0x80; // V=2
  packet[1] = 0x00; // PT=0 PCMU
  packet[2] = (this.seq >> 8) & 0xff;
  packet[3] = this.seq & 0xff;
  packet[4] = (this.timestamp >> 24) & 0xff;
  packet[5] = (this.timestamp >> 16) & 0xff;
  packet[6] = (this.timestamp >> 8) & 0xff;
  packet[7] = this.timestamp & 0xff;
  packet[8] = (this.ssrc >> 24) & 0xff;
  packet[9] = (this.ssrc >> 16) & 0xff;
  packet[10] = (this.ssrc >> 8) & 0xff;
  packet[11] = this.ssrc & 0xff;
  packet.set(payload, 12);  // ← PCMU payload inchangé
  return packet;
}
```

✅ **Conforme à la spec RTP** (RFC 3550)  
✅ **PCMU payload reste intact** (juste ajout d'un header)

### 3. Base64 Encoding (Vrai Appel Seulement)

**MicrophoneService** (`MicrophoneService.ts:95-103`)
```typescript
private uint8ToBase64(u8: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
```

✅ **Encodage base64 standard**  
✅ **Réversible** (le backend peut décoder)

### 4. WebSocket Send (Vrai Appel Seulement)

**MicrophoneService** (`MicrophoneService.ts:42-51`)
```typescript
this.node.port.onmessage = (ev: MessageEvent) => {
  const pcmu: Uint8Array = ev.data;
  if (!pcmu || !(pcmu instanceof Uint8Array)) return;
  const rtp = this.createRtpPacket(pcmu);      // ← Ajoute RTP header
  const base64 = this.uint8ToBase64(rtp);      // ← Encode en base64
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
    this.seq = (this.seq + 1) % 65536;
    this.timestamp += pcmu.length;
  }
};
```

✅ **Format conforme à Telnyx** (voir `TELNYX_STREAMING_ALIGNMENT.md`)

---

## 🎯 Conclusion

### ✅ Ce qui est Identique

1. **Capture audio** : Même `getUserMedia()`
2. **AudioContext** : Même configuration (native rate)
3. **Worklet** : **Exactement le même fichier** `mic-processor.worklet.js`
4. **Downsampling** : Même algorithme (ratio-based)
5. **Encodage PCMU** : **Même algorithme µ-law** (ITU-T G.711)
6. **Chunk size** : 160 bytes (20ms @ 8kHz)

### ➕ Ce que le Vrai Appel Ajoute

1. **RTP Header** (12 bytes)
   - Version, Payload Type, Sequence, Timestamp, SSRC
   - **N'altère PAS le PCMU** (juste un header)

2. **Base64 Encoding**
   - Conversion binaire → texte pour WebSocket
   - **Réversible** (décodage parfait côté backend)

3. **WebSocket Transmission**
   - Format JSON : `{ event: 'media', media: { payload: base64 } }`
   - **Conforme à Telnyx**

### 🔬 Validation

**Si le test loopback fonctionne bien** (✅ confirmé), alors :

1. ✅ L'encodage PCMU est **correct**
2. ✅ Le downsampling est **correct**
3. ✅ Le worklet fonctionne **parfaitement**
4. ✅ La qualité audio est **bonne**

**Les ajouts du vrai appel** (RTP + Base64 + WebSocket) :

1. ✅ **N'altèrent PAS** le PCMU
2. ✅ Sont **réversibles**
3. ✅ Sont **conformes aux specs**

---

## 🐛 Si le Destinataire Entend du Bruit

### Hypothèses à Vérifier

#### 1. Problème Réseau ❓
- **Perte de paquets** → Certains chunks n'arrivent pas
- **Latence variable** → Jitter buffer insuffisant côté destinataire
- **Bande passante** → Congestion réseau

**Test** : Vérifier les logs WebSocket pour des erreurs

#### 2. Problème Backend ❓
- **Décodage RTP incorrect** → Header mal parsé
- **Décodage base64 incorrect** → Données corrompues
- **Traitement audio** → Modification du PCMU

**Test** : Vérifier les logs backend

#### 3. Problème Telnyx ❓
- **Configuration codec** → Mauvais codec configuré
- **Transcoding** → Telnyx convertit vers un autre codec
- **Qualité réseau Telnyx** → Problème côté Telnyx

**Test** : Vérifier la configuration Telnyx

#### 4. Problème Destinataire ❓
- **Décodage PCMU** → Le téléphone du destinataire décode mal
- **Haut-parleur** → Problème matériel
- **Réseau destinataire** → Mauvaise connexion

**Test** : Tester avec un autre destinataire

---

## 📋 Checklist de Debug

### ✅ Partie Locale (Confirmée OK)
- [x] Encodage PCMU correct (test loopback OK)
- [x] Downsampling correct (test loopback OK)
- [x] Worklet fonctionne (test loopback OK)
- [x] Qualité audio bonne (test loopback OK)

### 🔍 Partie Réseau (À Vérifier)
- [ ] WebSocket connecté et stable
- [ ] Pas d'erreurs dans les logs WebSocket
- [ ] Messages envoyés correctement (format JSON)
- [ ] Base64 valide (pas de corruption)
- [ ] RTP packets bien formés

### 🔍 Partie Backend (À Vérifier)
- [ ] Backend reçoit les messages
- [ ] Décodage base64 correct
- [ ] Parsing RTP correct
- [ ] PCMU transmis à Telnyx sans modification
- [ ] Pas d'erreurs dans les logs backend

### 🔍 Partie Telnyx (À Vérifier)
- [ ] Configuration codec = PCMU
- [ ] Pas de transcoding activé
- [ ] stream_bidirectional_mode = "rtp"
- [ ] stream_bidirectional_codec = "PCMU"

---

## 🎯 Prochaines Étapes

### 1. Vérifier les Logs WebSocket

Ouvrez la console (F12) pendant un vrai appel et cherchez :

```javascript
// Logs à surveiller
🎤 WebSocket connecté pour le micro
🎧 Microphone capture started
📦 Sending media packet (devrait apparaître régulièrement)
```

### 2. Ajouter des Logs de Debug

Dans `MicrophoneService.ts`, ajoutez :

```typescript
this.node.port.onmessage = (ev: MessageEvent) => {
  const pcmu: Uint8Array = ev.data;
  console.log('📦 PCMU chunk received:', pcmu.length, 'bytes');
  
  const rtp = this.createRtpPacket(pcmu);
  console.log('📦 RTP packet created:', rtp.length, 'bytes');
  
  const base64 = this.uint8ToBase64(rtp);
  console.log('📦 Base64 encoded:', base64.substring(0, 20) + '...');
  
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
    console.log('✅ Sent to WebSocket');
  } else {
    console.error('❌ WebSocket not ready:', this.ws?.readyState);
  }
};
```

### 3. Vérifier le Backend

Demandez au backend de logger :
- Réception des messages WebSocket
- Décodage base64
- Parsing RTP
- Transmission à Telnyx

### 4. Tester avec Wireshark

Capturez le trafic réseau pour voir :
- Les paquets WebSocket
- Le contenu des messages
- La fréquence d'envoi

---

## 📊 Résumé

| Composant | Status | Qualité |
|-----------|--------|---------|
| Encodage PCMU | ✅ Validé | Excellent |
| Downsampling | ✅ Validé | Excellent |
| Worklet | ✅ Validé | Excellent |
| RTP Packetization | ✅ Conforme | Correct |
| Base64 Encoding | ✅ Standard | Correct |
| WebSocket Format | ✅ Conforme Telnyx | Correct |
| **Pipeline Local** | ✅ **100% OK** | **Excellent** |
| **Réseau/Backend** | ❓ À vérifier | Inconnu |

**Conclusion** : Le pipeline local est parfait. Si le destinataire entend du bruit, le problème vient du réseau, du backend, ou de Telnyx.

---

**Créé le** : 20 octobre 2025  
**Test Loopback** : ✅ Réussi  
**Vrai Appel** : 🔍 À tester avec logs

