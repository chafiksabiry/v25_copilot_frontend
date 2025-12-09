// mic-processor.worklet.js
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    // Calculate ratio based on the actual AudioContext sample rate
    // sampleRate is a global variable in AudioWorkletProcessor representing the context's sample rate
    // For a typical 48kHz AudioContext: ratio = 48000 / 8000 = 6
    this.ratio = sampleRate / 8000;
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF); // Random SSRC
    
    // Filtre passe-bas simple et rapide pour anti-aliasing
    // Utiliser une moyenne mobile simple (plus rapide qu'un FIR complet)
    this.lowPassBuffer = new Float32Array(4); // Buffer réduit pour performance
    this.lowPassIndex = 0;
    this.lowPassSum = 0; // Maintenir la somme pour éviter de recalculer
  }

  // Filtre passe-bas simple et rapide (moyenne mobile optimisée)
  applyLowPassFilter(sample) {
    // Soustraire l'ancien échantillon de la somme
    const oldSample = this.lowPassBuffer[this.lowPassIndex];
    this.lowPassSum -= oldSample;
    
    // Ajouter le nouvel échantillon
    this.lowPassBuffer[this.lowPassIndex] = sample;
    this.lowPassSum += sample;
    this.lowPassIndex = (this.lowPassIndex + 1) % this.lowPassBuffer.length;
    
    // Retourner la moyenne
    return this.lowPassSum / this.lowPassBuffer.length;
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // IMPORTANT : Filtrer TOUS les échantillons avant le downsampling pour éviter l'aliasing
    // Le filtre passe-bas doit être appliqué avant de prendre un échantillon sur 'ratio'
    let sampleCounter = 0; // Compteur pour le downsampling
    const ratio = Math.floor(this.ratio); // Utiliser un ratio entier pour éviter les calculs flottants
    
    for (let i = 0; i < input.length; i++) {
      // Appliquer le filtre passe-bas sur CHAQUE échantillon avant le downsampling
      const filteredSample = this.applyLowPassFilter(input[i]);
      
      // Downsampler : prendre seulement 1 échantillon sur 'ratio' APRÈS le filtrage
      sampleCounter++;
      if (sampleCounter >= ratio) {
        sampleCounter = 0;
        // Encoder en µ-law seulement les échantillons downsamplés
        const mu = this.encodeMuLaw(filteredSample);
        this.buffer.push(mu);
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
    
    // Réduire légèrement le niveau pour éviter la saturation
    // Mais sans compression excessive qui introduit de la distorsion
    s = s * 0.9; // Réduire de 10% pour éviter la saturation
    
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


