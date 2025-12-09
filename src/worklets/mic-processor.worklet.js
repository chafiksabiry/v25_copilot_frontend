// mic-processor.worklet.js
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    // Calculate ratio based on the actual AudioContext sample rate
    // sampleRate is a global variable in AudioWorkletProcessor representing the context's sample rate
    // Target: 8kHz pour correspondre au codec PCMA/PCMU
    // Si AudioContext est à 8kHz: ratio = 1 (pas de resampling)
    // Si AudioContext est à 48kHz: ratio = 6 (resampling nécessaire)
    this.ratio = sampleRate / 8000;
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF); // Random SSRC
    
    // Gestion du resampling fractionnaire pour éviter la dérive d'horloge RTP
    // Si le ratio n'est pas entier (ex: 44100/8000 = 5.5125), utiliser un accumulateur fractionnaire
    this.isIntegerRatio = Math.abs(this.ratio - Math.round(this.ratio)) < 0.001;
    this.ratioInteger = Math.floor(this.ratio);
    this.ratioFractional = this.ratio - this.ratioInteger;
    this.fractionalAccumulator = 0; // Accumulateur pour gérer la partie fractionnaire
    
    // Avertir si le ratio n'est pas entier (peut causer une dérive d'horloge)
    if (!this.isIntegerRatio) {
      console.warn(`⚠️ Worklet: Ratio non entier détecté (${this.ratio.toFixed(4)}). Utilisation du resampling fractionnaire pour éviter la dérive d'horloge RTP.`);
      console.warn(`💡 Recommandation: Forcer AudioContext à 8000Hz ou 48000Hz pour un ratio entier.`);
    }
    
    // Filtre de réduction de bruit adaptatif amélioré : estimation plus précise du bruit
    this.noiseLevel = 0.002; // Estimation initiale réduite (0.2% au lieu de 0.3%) pour gate plus strict
    this.signalLevel = 0; // Niveau du signal actuel
    this.alpha = 0.98; // Facteur de lissage par défaut (98% ancien, 2% nouveau) pour stabilité
    this.alphaFast = 0.85; // Alpha rapide pour adaptation initiale (85% ancien, 15% nouveau) - plus rapide
    this.alphaSlow = 0.98; // Alpha lent pour stabilité (98% ancien, 2% nouveau)
    this.samplesProcessed = 0; // Compteur d'échantillons traités (pour adaptation initiale)
    this.silenceDuration = 0; // Durée du silence détecté (en nombre de buffers)
    this.signalHistory = new Float32Array(10); // Historique des niveaux de signal
    this.historyIndex = 0;
    
    // Filtre passe-haut pour éliminer les basses fréquences (< 80Hz) qui causent du bruit
    // Utiliser un filtre passe-haut simple de premier ordre (filtre RC)
    // Fréquence de coupure ~80Hz pour 8kHz (ou ~480Hz pour 48kHz)
    const cutoffFreq = 80; // Hz
    const dt = 1.0 / sampleRate; // Période d'échantillonnage
    const rc = 1.0 / (2.0 * Math.PI * cutoffFreq); // Constante de temps RC
    this.highpassAlpha = rc / (rc + dt); // Coefficient du filtre passe-haut
    this.highpassPrevInput = 0; // Échantillon d'entrée précédent
    this.highpassPrevOutput = 0; // Échantillon de sortie précédent
    
    // Log pour debug
    if (this.ratio === 1) {
      console.log(`✅ Worklet: Pas de resampling nécessaire (AudioContext à ${sampleRate}Hz = codec 8kHz)`);
    } else if (this.isIntegerRatio) {
      console.log(`🔄 Worklet: Resampling de ${sampleRate}Hz vers 8kHz (ratio entier: ${this.ratioInteger})`);
    } else {
      console.log(`🔄 Worklet: Resampling fractionnaire de ${sampleRate}Hz vers 8kHz (ratio: ${this.ratio.toFixed(4)})`);
    }
    
    // Filtre passe-bas amélioré pour anti-aliasing (réduit les artefacts de downsampling)
    // Utiliser un filtre à réponse impulsionnelle finie (FIR) pour une meilleure qualité
    // Ordre augmenté pour meilleure atténuation des fréquences > 4kHz (Nyquist à 4kHz pour 8kHz)
    // Coefficients du filtre FIR passe-bas optimisé (cutoff ~3.0kHz pour 48kHz input, downsampling à 8kHz)
    // Fréquence de coupure réduite à 3.0kHz (sous Nyquist 4kHz) pour éliminer plus agressivement l'aliasing
    // Coefficients générés avec fenêtre de Kaiser pour meilleure atténuation stopband
    // Ordre 29 pour transition plus raide et meilleure suppression des bruits haute fréquence
    // Coefficients ajustés pour une atténuation plus forte des fréquences > 3kHz
    this.filterCoefficients = new Float32Array([
      -0.002, -0.003, 0.002, 0.006, 0.010, 0.008, -0.003, -0.025, -0.042, -0.038,
      0.002, 0.068, 0.145, 0.215, 0.255, 0.215, 0.145, 0.068, 0.002, -0.038,
      -0.042, -0.025, -0.003, 0.008, 0.010, 0.006, 0.002, -0.003, -0.002
    ]);
    this.filterOrder = this.filterCoefficients.length; // Ordre = nombre de coefficients
    this.filterBuffer = new Float32Array(this.filterOrder);
    this.filterIndex = 0;
    // Normaliser les coefficients pour que leur somme = 1 (gain unitaire)
    const sum = this.filterCoefficients.reduce((a, b) => a + b, 0);
    for (let i = 0; i < this.filterCoefficients.length; i++) {
      this.filterCoefficients[i] /= sum;
    }
  }

  // Filtre passe-bas FIR amélioré pour réduire l'aliasing
  applyLowPassFilter(sample) {
    // Appliquer d'abord le filtre passe-haut pour éliminer les basses fréquences (< 80Hz)
    // Filtre passe-haut de premier ordre (filtre RC) : y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    const highpassOutput = this.highpassAlpha * (this.highpassPrevOutput + sample - this.highpassPrevInput);
    this.highpassPrevInput = sample;
    this.highpassPrevOutput = highpassOutput;
    const filteredSample = sample - highpassOutput; // Sortie du passe-haut (élimine les basses fréquences)
    
    // Ajouter l'échantillon filtré passe-haut au buffer circulaire
    this.filterBuffer[this.filterIndex] = filteredSample;
    this.filterIndex = (this.filterIndex + 1) % this.filterOrder;
    
    // Appliquer le filtre FIR passe-bas (convolution)
    // Le filtre est appliqué de manière causale (utilise seulement les échantillons passés)
    let output = 0;
    for (let i = 0; i < this.filterCoefficients.length; i++) {
      // Calculer l'index dans le buffer circulaire (échantillons passés)
      const bufferIndex = (this.filterIndex - 1 - i + this.filterOrder) % this.filterOrder;
      output += this.filterBuffer[bufferIndex] * this.filterCoefficients[i];
    }
    
    return output;
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Incrémenter le compteur d'échantillons traités
    this.samplesProcessed += input.length;
    
    // Filtre de réduction de bruit adaptatif amélioré
    // Estimer le niveau de bruit en temps réel avec analyse RMS (Root Mean Square)
    let sumSquares = 0;
    let maxAmplitude = 0;
    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i]);
      sumSquares += input[i] * input[i];
      if (abs > maxAmplitude) maxAmplitude = abs;
    }
    
    // Calculer RMS (Root Mean Square) pour meilleure estimation du niveau
    const rms = Math.sqrt(sumSquares / input.length);
    
    // Mettre à jour l'historique des niveaux de signal
    this.signalHistory[this.historyIndex] = rms;
    this.historyIndex = (this.historyIndex + 1) % this.signalHistory.length;
    
    // Calculer le niveau médian pour détecter les pics de bruit
    const sortedHistory = Array.from(this.signalHistory).sort((a, b) => a - b);
    const medianLevel = sortedHistory[Math.floor(sortedHistory.length / 2)];
    
    // Alpha dynamique : adaptation rapide au début ou lors de changements d'environnement
    // - Adaptation rapide pendant les 2 premières secondes (environ 96000 échantillons à 48kHz)
    // - Adaptation rapide lors de silence prolongé (changement d'environnement probable)
    const isInitialPhase = this.samplesProcessed < 96000; // ~2 secondes à 48kHz
    const isSilenceDetected = rms < 0.05 && Math.abs(rms - medianLevel) < 0.015;
    
    if (isSilenceDetected) {
      this.silenceDuration++;
    } else {
      this.silenceDuration = 0;
    }
    
    const isLongSilence = this.silenceDuration > 10; // ~10 buffers de silence (~200ms)
    
    // Choisir alpha selon le contexte
    if (isInitialPhase || isLongSilence) {
      this.alpha = this.alphaFast; // Adaptation rapide
    } else {
      this.alpha = this.alphaSlow; // Stabilité
    }
    
    // Mettre à jour l'estimation du niveau de bruit (seulement si le signal est faible et stable)
    // Utiliser le niveau médian pour éviter les faux positifs dus aux pics de bruit
    if (rms < 0.08 && Math.abs(rms - medianLevel) < 0.02) {
      // Si le signal est faible et stable, c'est probablement du bruit
      this.noiseLevel = this.noiseLevel * this.alpha + rms * (1 - this.alpha);
    }
    
    // Seuil de gate adaptatif amélioré : 5x le niveau de bruit estimé avec minimum plus bas
    // Utiliser le maximum entre le seuil adaptatif et un seuil absolu bas pour éviter les bruits
    // Multiplicateur augmenté de 4x à 5x pour gate plus strict
    const adaptiveGateThreshold = Math.max(0.012, Math.max(this.noiseLevel * 5, 0.010)); // Minimum 1.0% à 1.2%
    
    // Cas optimisé : pas de resampling nécessaire (AudioContext déjà à 8kHz)
    if (this.ratio === 1) {
      // Pas besoin de filtre anti-aliasing ni de downsampling
      // Encoder directement en µ-law avec gate adaptatif
      for (let i = 0; i < input.length; i++) {
        const absSample = Math.abs(input[i]);
        // Gate adaptatif : supprimer les signaux en dessous du seuil
        const gatedSample = absSample < adaptiveGateThreshold ? 0 : input[i];
        const mu = this.encodeMuLaw(gatedSample);
        this.buffer.push(mu);
      }
    } else if (this.isIntegerRatio) {
      // Cas avec resampling entier : Filtrer TOUS les échantillons avant le downsampling pour éviter l'aliasing
      // Le filtre passe-bas doit être appliqué avant de prendre un échantillon sur 'ratio'
      let sampleCounter = 0; // Compteur pour le downsampling
      
      for (let i = 0; i < input.length; i++) {
        // Appliquer le filtre passe-bas sur CHAQUE échantillon avant le downsampling
        const filteredSample = this.applyLowPassFilter(input[i]);
        
        // Appliquer le gate adaptatif pour supprimer les bruits de fond
        const absFiltered = Math.abs(filteredSample);
        const gatedSample = absFiltered < adaptiveGateThreshold ? 0 : filteredSample;
        
        // Downsampler : prendre seulement 1 échantillon sur 'ratioInteger' APRÈS le filtrage
        sampleCounter++;
        if (sampleCounter >= this.ratioInteger) {
          sampleCounter = 0;
          // Encoder en µ-law seulement les échantillons downsamplés
          const mu = this.encodeMuLaw(gatedSample);
          this.buffer.push(mu);
        }
      }
    } else {
      // Cas avec resampling fractionnaire : Utiliser un accumulateur pour gérer la partie fractionnaire
      // Cela évite la dérive d'horloge RTP en préservant le taux d'échantillonnage exact
      for (let i = 0; i < input.length; i++) {
        // Appliquer le filtre passe-bas sur CHAQUE échantillon avant le downsampling
        const filteredSample = this.applyLowPassFilter(input[i]);
        
        // Appliquer le gate adaptatif pour supprimer les bruits de fond
        const absFiltered = Math.abs(filteredSample);
        const gatedSample = absFiltered < adaptiveGateThreshold ? 0 : filteredSample;
        
        // Resampling fractionnaire : accumuler la partie fractionnaire
        this.fractionalAccumulator += 1.0;
        
        // Prendre un échantillon quand l'accumulateur dépasse le ratio
        if (this.fractionalAccumulator >= this.ratio) {
          this.fractionalAccumulator -= this.ratio;
          // Encoder en µ-law seulement les échantillons downsamplés
          const mu = this.encodeMuLaw(gatedSample);
          this.buffer.push(mu);
        }
      }
    }

    // Send in RTP chunks (160 samples = 20 ms @ 8 kHz)
    const CHUNK = 160;
    while (this.buffer.length >= CHUNK) {
      const frame = this.buffer.splice(0, CHUNK);
      const rtpPacket = this.createRTPPacket(frame);
      this.port.postMessage(rtpPacket);
    }

    return true;
  }

  createRTPPacket(pcmuData) {
    // RTP Header (12 bytes)
    const header = new Uint8Array(12);
    
    // Version (2 bits) + Padding (1 bit) + Extension (1 bit) + CSRC Count (4 bits)
    header[0] = 0x80; // Version 2, no padding, no extension, no CSRC
    
    // Marker (1 bit) + Payload Type (7 bits) - PCMU = 0 (G.711 µ-law)
    // Payload Type 0 = PCMU (G.711 µ-law), Payload Type 8 = PCMA (G.711 A-law)
    header[1] = 0x00; // No marker (bit 7 = 0), PCMU payload type = 0 (bits 0-6)
    
    // Sequence Number (16 bits)
    header[2] = (this.sequenceNumber >> 8) & 0xFF;
    header[3] = this.sequenceNumber & 0xFF;
    this.sequenceNumber++;
    
    // Timestamp (32 bits) - 8kHz sample rate
    header[4] = (this.timestamp >> 24) & 0xFF;
    header[5] = (this.timestamp >> 16) & 0xFF;
    header[6] = (this.timestamp >> 8) & 0xFF;
    header[7] = this.timestamp & 0xFF;
    this.timestamp += 160; // 160 samples = 20ms @ 8kHz
    
    // SSRC (32 bits)
    header[8] = (this.ssrc >> 24) & 0xFF;
    header[9] = (this.ssrc >> 16) & 0xFF;
    header[10] = (this.ssrc >> 8) & 0xFF;
    header[11] = this.ssrc & 0xFF;
    
    // Combine header + payload
    const rtpPacket = new Uint8Array(12 + pcmuData.length);
    rtpPacket.set(header, 0);
    rtpPacket.set(pcmuData, 12);
    
    return rtpPacket;
  }

  encodeMuLaw(sample) {
    // Normaliser et limiter le signal pour éviter la distorsion
    let s = Math.max(-1.0, Math.min(1.0, sample));
    
    // Réduction globale optimisée pour éviter la saturation tout en préservant la dynamique
    s = s * 0.90; // Réduction modérée (10%) pour préserver la qualité vocale
    
    // Filtre de réduction de bruit haute fréquence amélioré
    // Supprimer les composantes très faibles qui sont probablement du bruit
    // Seuil réduit de 0.3% à 0.25% pour suppression plus agressive
    if (Math.abs(s) < 0.0025) {
      // Si le signal est très faible (< 0.25%), c'est probablement du bruit - le supprimer
      s = 0;
    }
    
    // Appliquer un soft limiter amélioré avec compression douce
    // Cela réduit les bruits de clipping tout en préservant la dynamique vocale
    const threshold = 0.88; // Seuil de compression douce optimisé
    if (Math.abs(s) > threshold) {
      const sign = s < 0 ? -1 : 1;
      const excess = Math.abs(s) - threshold;
      // Compression douce avec ratio progressif pour éviter les artefacts
      const compressionRatio = 0.25; // Compression modérée pour préserver la qualité
      s = sign * (threshold + excess * compressionRatio);
    }
    
    // Encodage µ-law standard ITU-T G.711
    const BIAS = 0x84;
    const MAX = 32635;
    const sign = s < 0 ? 0x80 : 0;
    let absSample = Math.abs(s);
    let s16 = Math.floor(absSample * 32767);
    if (s16 > MAX) s16 = MAX;
    s16 = s16 + BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
    const mantissa = (s16 >> (exponent + 3)) & 0x0F;
    const muLaw = ~(sign | (exponent << 4) | mantissa);
    return muLaw & 0xff;
  }
}

registerProcessor('mic-processor', MicProcessor);


