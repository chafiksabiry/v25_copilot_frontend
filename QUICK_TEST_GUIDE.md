# Guide Rapide - Test Audio Loopback

## 🎯 Objectif

Vérifier que l'encodage/décodage PCMU fonctionne correctement **avant** de faire un vrai appel.

## 🚀 Démarrage Rapide

### Étape 1 : Ouvrir l'Application
```bash
npm run dev
```

### Étape 2 : Activer le Test
1. Cherchez le bouton **"🔄 Test Audio"** en bas à gauche
2. Cliquez dessus

### Étape 3 : Lancer le Test
1. Cliquez sur **"▶️ Start Test"**
2. Autorisez l'accès au microphone
3. Parlez dans votre micro

### Étape 4 : Écouter
- Vous devriez **vous entendre** avec un léger délai
- La voix doit être **claire**, sans bruit ni distorsion

### Étape 5 : Vérifier les Logs
Ouvrez la console (F12) et cherchez :
```
✅ Loopback test started
📦 Received PCMU chunk: 160 bytes
▶️ Starting playback...
```

## ✅ Résultat Attendu

### Audio Clair ✅
- Voix claire et compréhensible
- Pas de bruit parasite
- Pas de distorsion
- Léger délai (~100-200ms) normal

### Statistiques Normales ✅
- **Capture Rate**: 48000 Hz
- **Playback Rate**: 8000 Hz
- **Queue Length**: 3-6 chunks
- **Latency**: ~60-120 ms

## ❌ Problèmes Courants

### Problème : Bruit / Distorsion
**Cause** : Encodage µ-law incorrect  
**Solution** : Vérifier `mic-processor.worklet.js`

### Problème : Coupures
**Cause** : Queue vide, CPU surchargé  
**Solution** : Fermer d'autres applications

### Problème : Pas de son
**Cause** : Microphone non autorisé  
**Solution** : Autoriser dans les paramètres du navigateur

## 📊 Interprétation

| Résultat Test | Résultat Appel Réel | Diagnostic |
|---------------|---------------------|------------|
| ✅ OK         | ✅ OK               | Tout fonctionne ! |
| ✅ OK         | ❌ Problème         | Problème réseau/backend |
| ❌ Problème   | ❌ Problème         | Problème encodage local |

## 🔍 Debug Avancé

### Voir les Chunks PCMU
Ouvrez la console et tapez :
```javascript
// Activer les logs détaillés
localStorage.setItem('debug_audio', 'true');
```

### Vérifier les Valeurs
Dans `mic-processor.worklet.js`, ajoutez :
```javascript
if (Math.random() < 0.001) {
  console.log('Sample:', sample, '→ PCMU:', mu);
}
```

## 📝 Checklist de Test

- [ ] Le test démarre sans erreur
- [ ] Je m'entends dans les haut-parleurs
- [ ] La voix est claire (pas de bruit)
- [ ] Pas de coupures
- [ ] Latence acceptable (~100-200ms)
- [ ] Queue Length stable (3-6 chunks)
- [ ] Logs dans la console sont normaux

## 🎓 Comprendre le Pipeline

```
Votre Voix
    ↓
Microphone (48kHz)
    ↓
Downsample → 8kHz
    ↓
Encode → PCMU (µ-law)
    ↓
Decode → PCM
    ↓
Haut-parleurs
    ↓
Vous vous entendez !
```

**C'est exactement le même traitement que pour un appel Telnyx**, sauf qu'on ne passe pas par le réseau.

## 💡 Conseils

1. **Utilisez un casque** pour éviter l'effet Larsen
2. **Parlez normalement**, pas trop fort
3. **Vérifiez le volume** du micro et des haut-parleurs
4. **Testez dans un endroit calme** pour mieux entendre les problèmes

## 📚 Documentation Complète

Pour plus de détails, consultez :
- `AUDIO_LOOPBACK_TEST.md` - Guide complet
- `TELNYX_STREAMING_ALIGNMENT.md` - Spécifications
- `AUDIO_FLOW_DIAGRAM.md` - Diagrammes

---

**Besoin d'aide ?**  
Consultez les logs dans la console (F12) et cherchez les messages d'erreur.

