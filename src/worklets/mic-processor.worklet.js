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
    
    // Filtre de réduction de bruit adaptatif : moyenne mobile pour estimer le niveau de bruit
    this.noiseLevel = 0.005; // Estimation initiale du niveau de bruit (0.5%)
    this.signalLevel = 0; // Niveau du signal actuel
    this.alpha = 0.95; // Facteur de lissage pour l'estimation du bruit (95% ancien, 5% nouveau)
    
    // Log pour debug
    if (this.ratio === 1) {
      console.log(`✅ Worklet: Pas de resampling nécessaire (AudioContext à ${sampleRate}Hz = codec 8kHz)`);
    } else {
      console.log(`🔄 Worklet: Resampling de ${sampleRate}Hz vers 8kHz (ratio: ${this.ratio.toFixed(2)})`);
    }
    
    // Filtre passe-bas amélioré pour anti-aliasing (réduit les artefacts de downsampling)
    // Utiliser un filtre à réponse impulsionnelle finie (FIR) pour une meilleure qualité
    // que la simple moyenne mobile
    this.filterOrder = 13; // Ordre du filtre (correspond au nombre de coefficients)
    this.filterBuffer = new Float32Array(this.filterOrder);
    this.filterIndex = 0;
    
    // Coefficients du filtre FIR passe-bas amélioré (cutoff ~3.5kHz pour 48kHz input, downsampling à 8kHz)
    // Fréquence de coupure réduite à 3.5kHz pour mieux éliminer les bruits haute fréquence
    // Coefficients optimisés avec fenêtre de Hamming pour réduire les ondulations
    this.filterCoefficients = new Float32Array([
      0.002, 0.010, 0.028, 0.058, 0.088, 0.108, 0.112, 0.108, 0.088, 0.058, 0.028, 0.010, 0.002
    ]);
    // Normaliser les coefficients pour que leur somme = 1
    const sum = this.filterCoefficients.reduce((a, b) => a + b, 0);
    for (let i = 0; i < this.filterCoefficients.length; i++) {
      this.filterCoefficients[i] /= sum;
    }
  }

  // Filtre passe-bas FIR amélioré pour réduire l'aliasing
  applyLowPassFilter(sample) {
    // Ajouter le nouvel échantillon au buffer circulaire
    this.filterBuffer[this.filterIndex] = sample;
    this.filterIndex = (this.filterIndex + 1) % this.filterOrder;
    
    // Appliquer le filtre FIR (convolution)
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

    const ratio = Math.floor(this.ratio); // Utiliser un ratio entier pour éviter les calculs flottants
    
    // Filtre de réduction de bruit adaptatif amélioré
    // Estimer le niveau de bruit en temps réel et supprimer les signaux en dessous
    let maxAmplitude = 0;
    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i]);
      if (abs > maxAmplitude) maxAmplitude = abs;
    }
    
    // Mettre à jour l'estimation du niveau de bruit (seulement si le signal est faible)
    if (maxAmplitude < 0.1) {
      // Si le signal est faible, c'est probablement du bruit
      this.noiseLevel = this.noiseLevel * this.alpha + maxAmplitude * (1 - this.alpha);
    }
    
    // Seuil de gate adaptatif : 3x le niveau de bruit estimé (pour être sûr de capturer la voix)
    const adaptiveGateThreshold = Math.max(0.015, this.noiseLevel * 3); // Minimum 1.5% pour éviter de couper la voix
    
    // Cas optimisé : pas de resampling nécessaire (AudioContext déjà à 8kHz)
    if (ratio === 1) {
      // Pas besoin de filtre anti-aliasing ni de downsampling
      // Encoder directement en µ-law avec gate adaptatif
      for (let i = 0; i < input.length; i++) {
        const absSample = Math.abs(input[i]);
        // Gate adaptatif : supprimer les signaux en dessous du seuil
        const gatedSample = absSample < adaptiveGateThreshold ? 0 : input[i];
        const mu = this.encodeMuLaw(gatedSample);
        this.buffer.push(mu);
      }
    } else {
      // Cas avec resampling : Filtrer TOUS les échantillons avant le downsampling pour éviter l'aliasing
      // Le filtre passe-bas doit être appliqué avant de prendre un échantillon sur 'ratio'
      let sampleCounter = 0; // Compteur pour le downsampling
      
      for (let i = 0; i < input.length; i++) {
        // Appliquer le filtre passe-bas sur CHAQUE échantillon avant le downsampling
        const filteredSample = this.applyLowPassFilter(input[i]);
        
        // Appliquer le gate adaptatif pour supprimer les bruits de fond
        const absFiltered = Math.abs(filteredSample);
        const gatedSample = absFiltered < adaptiveGateThreshold ? 0 : filteredSample;
        
        // Downsampler : prendre seulement 1 échantillon sur 'ratio' APRÈS le filtrage
        sampleCounter++;
        if (sampleCounter >= ratio) {
          sampleCounter = 0;
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
    
    // Marker (1 bit) + Payload Type (7 bits) - PCMU = 0
    header[1] = 0x00; // No marker, PCMU payload type
    
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
    
    // Réduction globale plus agressive pour éviter la saturation et les bruits
    s = s * 0.85; // Réduire de 15% pour éviter la saturation (augmenté de 12% à 15%)
    
    // Filtre de réduction de bruit haute fréquence supplémentaire
    // Supprimer les composantes très haute fréquence qui peuvent causer des bruits
    if (Math.abs(s) < 0.005) {
      // Si le signal est très faible, c'est probablement du bruit - le supprimer complètement
      s = 0;
    }
    
    // Appliquer un soft limiter amélioré pour éviter la saturation brutale
    // Cela réduit les bruits de clipping tout en préservant la dynamique
    const threshold = 0.85; // Seuil de compression douce réduit (de 0.90 à 0.85)
    if (Math.abs(s) > threshold) {
      const sign = s < 0 ? -1 : 1;
      const excess = Math.abs(s) - threshold;
      // Compression douce au-delà du seuil (au lieu de clipping dur)
      // Réduction progressive : plus le signal est fort, plus on compresse
      const compressionRatio = 0.20; // Compression encore plus agressive (réduit de 0.25 à 0.20)
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


