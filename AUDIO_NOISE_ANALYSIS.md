# Analyse des Causes du Bruit Audio

## 🔍 Causes Principales du Bruit

### 1. **Feedback Audio (Larsen)** ✅ CORRIGÉ
**Cause :** L'audio sortant des haut-parleurs est capturé par le microphone et renvoyé, créant une boucle de feedback.

**Solutions appliquées :**
- ✅ `recorderScriptNode` connecté à `AnalyserNode` au lieu de `destination`
- ✅ Gain audio réduit à 50% (0.5)
- ✅ Suppression de bruit Telnyx activée (`suppression_start` avec `direction: 'both'`)
- ✅ Paramètres microphone : `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`

**Recommandations supplémentaires :**
- Utiliser un casque au lieu de haut-parleurs
- Réduire le volume des haut-parleurs
- Augmenter la distance entre le microphone et les haut-parleurs

---

### 2. **Problèmes de Downsampling** ⚠️ À AMÉLIORER
**Cause :** Le downsampling de 48kHz → 8kHz utilise un simple échantillonnage (1 sur 6) sans filtrage anti-aliasing, ce qui peut introduire des artefacts audio.

**Problème actuel :**
```javascript
// mic-processor.worklet.js ligne 20
for (let i = 0; i < input.length; i += this.ratio) {
  const idx = Math.floor(i);
  const sample = input[idx]; // Prend juste 1 échantillon sur 6
  // ...
}
```

**Solution recommandée :** Implémenter un filtre passe-bas avant le downsampling pour éviter l'aliasing.

---

### 3. **Problèmes de Conversion PCMU** ⚠️ À VÉRIFIER
**Cause :** La conversion Float32 → PCMU (µ-law) peut introduire des erreurs d'arrondi et de quantification.

**Problème potentiel :** L'encodage µ-law utilise une compression logarithmique qui peut introduire de la distorsion, surtout pour les signaux faibles.

**Solution :** Vérifier que l'encodage µ-law suit correctement la norme ITU-T G.711.

---

### 4. **Débordements de Buffer** ✅ CORRIGÉ
**Cause :** L'audio arrive plus vite qu'il n'est traité, causant des pertes de paquets.

**Solutions appliquées :**
- ✅ `MAX_QUEUE` augmenté de 60 à 120 chunks
- ✅ Logs d'overflow réduits pour éviter le spam

---

### 5. **Gain Audio Trop Bas** ⚠️ À AJUSTER
**Cause :** Le gain à 50% peut rendre l'audio trop faible, nécessitant une amplification côté récepteur qui amplifie aussi le bruit.

**Solution actuelle :** Gain à 0.5 (50%)

**Recommandation :** Ajuster dynamiquement le gain selon le niveau d'entrée du microphone.

---

### 6. **Problèmes de Qualité Réseau** ⚠️ HORS CONTRÔLE
**Cause :** Latence, perte de paquets, jitter sur le réseau peuvent causer des artefacts audio.

**Solutions :**
- Utiliser un jitter buffer (déjà implémenté)
- Surveiller la qualité de connexion
- Utiliser un réseau stable (WiFi filaire ou connexion filaire)

---

### 7. **Problèmes Matériels** ⚠️ HORS CONTRÔLE
**Cause :** Microphone de mauvaise qualité, haut-parleurs qui fuient vers le micro, environnement bruyant.

**Solutions :**
- Utiliser un microphone de qualité
- Utiliser un casque avec micro intégré
- Réduire le bruit ambiant dans l'environnement

---

## 📊 Priorités d'Amélioration

### 🔴 Priorité Haute
1. **Améliorer le downsampling** avec un filtre anti-aliasing
2. **Ajuster le gain dynamiquement** selon le niveau d'entrée
3. **Vérifier la qualité de la conversion PCMU**

### 🟡 Priorité Moyenne
4. **Optimiser le jitter buffer** pour réduire les débordements
5. **Ajouter un filtre passe-bas** avant l'encodage PCMU

### 🟢 Priorité Basse
6. **Améliorer la gestion des erreurs réseau**
7. **Ajouter des métriques de qualité audio**

---

## 🛠️ Solutions Immédiates (Sans Code)

1. **Utiliser un casque** au lieu de haut-parleurs
2. **Réduire le volume** des haut-parleurs si utilisés
3. **Utiliser un environnement calme** pour les appels
4. **Vérifier la qualité du microphone** dans les paramètres système
5. **Utiliser un réseau stable** (WiFi filaire ou connexion filaire)

---

## 📝 Notes Techniques

- **Sample Rate :** 48kHz (microphone) → 8kHz (Telnyx)
- **Codec :** PCMU (G.711 µ-law)
- **Format :** RTP avec headers de 12 bytes
- **Chunk Size :** 160 samples = 20ms @ 8kHz
- **Gain Actuel :** 0.5 (50%)
- **Buffer Size :** 120 chunks max

---

## 🔗 Références

- [ITU-T G.711 Specification](https://www.itu.int/rec/T-REC-G.711/)
- [Web Audio API - Downsampling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Telnyx Noise Suppression](https://developers.telnyx.com/docs/api/v2/call-control/Call-Commands#suppression_start)

