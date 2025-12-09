# Solutions pour Réduire le Bruit Audio

## ✅ Corrections Appliquées

### 1. **Filtre Anti-Aliasing Optimisé**
- **Problème** : Le downsampling 48kHz → 8kHz sans filtre causait de l'aliasing
- **Solution** : Filtre passe-bas optimisé (moyenne mobile avec buffer de 4 échantillons)
- **Fichier** : `mic-processor.worklet.js`

### 2. **Feedback Audio Corrigé**
- **Problème** : L'audio sortant était capturé par le microphone
- **Solution** : `recorderScriptNode` connecté à `AnalyserNode` au lieu de `destination`
- **Fichier** : `MicrophoneService.ts`

### 3. **Gain Audio Ajusté**
- **Gain actuel** : 55% (0.55) pour réduire la distorsion et le feedback
- **Fichier** : `AudioStreamManager.ts`

### 4. **Traitement Audio Optimisé**
- **Problème** : `requestAnimationFrame` prenait trop de temps (>200ms)
- **Solution** : Limité à 3 chunks par itération, utilisation de `setTimeout` au lieu de `requestAnimationFrame`
- **Fichier** : `AudioStreamManager.ts`

### 5. **Buffer Augmenté**
- **MAX_QUEUE** : 200 chunks pour gérer les pics de trafic
- **Fichier** : `AudioStreamManager.ts`

### 6. **Suppression de Bruit Telnyx**
- **Activée** : `suppression_start` avec `direction: 'both'`
- **Fichier** : `telnyxService.js` (backend)

---

## ⚠️ Causes Probables du Bruit Persistant

### 1. **Limitations du Codec PCMU (G.711)**
**Cause** : PCMU est un codec téléphonique ancien avec une qualité limitée (8kHz, 8 bits)
- **Bande passante** : 300-3400 Hz seulement
- **Qualité** : Inférieure aux codecs modernes (Opus, G.722)
- **Solution** : C'est une limitation inhérente du codec téléphonique standard

### 2. **Qualité du Microphone**
**Cause** : Microphone de mauvaise qualité ou mal configuré
- **Solutions** :
  - Utiliser un microphone de qualité professionnelle
  - Vérifier les paramètres du microphone dans Windows
  - Réduire le gain du microphone dans les paramètres système
  - Utiliser un casque avec micro intégré

### 3. **Environnement Bruyant**
**Cause** : Bruit ambiant capturé par le microphone
- **Solutions** :
  - Utiliser un environnement calme
  - Utiliser un microphone directionnel
  - Activer la suppression de bruit dans les paramètres Windows

### 4. **Feedback Audio (Larsen)**
**Cause** : L'audio sortant des haut-parleurs est capturé par le microphone
- **Solutions** :
  - ✅ Déjà corrigé dans le code
  - Utiliser un casque au lieu de haut-parleurs
  - Réduire le volume des haut-parleurs
  - Augmenter la distance entre le microphone et les haut-parleurs

### 5. **Problèmes de Réseau**
**Cause** : Latence, perte de paquets, jitter
- **Solutions** :
  - Utiliser un réseau stable (WiFi filaire ou connexion filaire)
  - Vérifier la qualité de connexion
  - Les statistiques Telnyx montrent : `mos: 4.50` (bonne qualité), mais `skip_packet_count: 8` (quelques paquets perdus)

### 6. **Paramètres Microphone Système**
**Cause** : Paramètres Windows non optimaux
- **Solutions** :
  - Ouvrir les paramètres Windows → Système → Son
  - Vérifier le niveau du microphone
  - Désactiver l'amplification automatique si activée
  - Activer la suppression de bruit Windows si disponible

---

## 🔧 Solutions Immédiates (Sans Code)

### 1. **Utiliser un Casque**
- **Pourquoi** : Élimine complètement le feedback audio
- **Recommandation** : Casque avec micro intégré de qualité

### 2. **Réduire le Volume des Haut-parleurs**
- **Pourquoi** : Réduit le feedback si vous utilisez des haut-parleurs
- **Action** : Réduire le volume à 30-40%

### 3. **Vérifier les Paramètres Microphone Windows**
- **Comment** :
  1. Clic droit sur l'icône son → Paramètres son
  2. Microphone → Propriétés
  3. Niveaux : Réduire le gain si trop élevé
  4. Amélioration : Activer "Suppression de bruit" et "Suppression d'écho"

### 4. **Utiliser un Environnement Calme**
- **Pourquoi** : Réduit le bruit ambiant capturé
- **Action** : Choisir un endroit calme pour les appels

### 5. **Vérifier la Qualité du Microphone**
- **Test** : Utiliser l'enregistreur Windows pour tester la qualité
- **Action** : Si le bruit est présent même dans l'enregistreur, c'est un problème matériel

---

## 📊 Statistiques de Qualité Telnyx

D'après les logs récents :
- **MOS** : 4.50 (excellent, sur une échelle de 1-5)
- **Paquets inbound** : 1049 reçus, 8 perdus (0.76% de perte)
- **Paquets outbound** : 853 envoyés, 0 perdus
- **Jitter** : 3.05ms (très faible)

**Conclusion** : La qualité réseau est bonne. Le bruit vient probablement de :
1. La qualité du microphone
2. L'environnement (bruit ambiant)
3. Les limitations du codec PCMU
4. Les paramètres système du microphone

---

## 🎯 Prochaines Étapes Recommandées

### Priorité 1 : Solutions Matérielles
1. ✅ Utiliser un casque avec micro intégré
2. ✅ Vérifier les paramètres microphone Windows
3. ✅ Réduire le volume des haut-parleurs

### Priorité 2 : Vérifications Système
1. Tester le microphone avec l'enregistreur Windows
2. Vérifier si le bruit est présent même sans appel
3. Tester avec un autre microphone

### Priorité 3 : Améliorations Code (Si nécessaire)
1. Implémenter un filtre de débruitement plus sophistiqué
2. Ajouter un contrôle de gain dynamique
3. Implémenter un filtre passe-bande pour réduire les fréquences indésirables

---

## 📝 Notes Techniques

- **Codec** : PCMU (G.711 µ-law) - Standard téléphonique
- **Sample Rate** : 8kHz (limité par le codec)
- **Bande passante** : 300-3400 Hz (limitation téléphonique)
- **Qualité** : Inférieure aux codecs VoIP modernes mais standard pour la téléphonie

Le bruit peut être une limitation inhérente du codec PCMU utilisé pour la téléphonie. Pour une meilleure qualité, il faudrait utiliser un codec plus moderne (Opus, G.722), mais Telnyx utilise PCMU pour la compatibilité téléphonique standard.

