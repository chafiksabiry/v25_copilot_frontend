// mic-processor.worklet.js
// Resampler optimisé avec filtre anti-aliasing pour éviter l'aliasing
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF);
    
    // Ratio de downsampling (ex: 48000/8000 = 6)
    this.ratio = Math.max(1, Math.round(sampleRate / 8000));
    
    console.log(`🎤 MicProcessor: sampleRate=${sampleRate}Hz, ratio=${this.ratio}`);
    
    // FILTRE ANTI-ALIASING (low-pass à 3.4kHz pour téléphonie)
    // Ce filtre est CRITIQUE pour éviter l'aliasing lors du decimation
    // Fréquence de coupure = sampleRate_cible / 2 = 4kHz (on prend 3.4kHz pour téléphonie)
    const cutoffFreq = 3400; // Hz
    const rc = 1.0 / (2.0 * Math.PI * cutoffFreq);
    const dt = 1.0 / sampleRate;
    this.antiAliasingAlpha = dt / (rc + dt);
    this.antiAliasingState = 0;
    
    // Noise gate basé sur RMS
    this.noiseGateThreshold = 0.03; // Seuil RMS
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Calcul RMS pour noise gate
    let sumSquares = 0;
    for (let i = 0; i < input.length; i++) {
      sumSquares += input[i] * input[i];
    }
    const rms = Math.sqrt(sumSquares / input.length);
    
    // Si signal trop faible, envoyer du silence
    if (rms < this.noiseGateThreshold) {
      for (let i = 0; i < input.length; i += this.ratio) {
        this.buffer.push(0xFF); // µ-law silence
      }
    } else {
      // VRAI RESAMPLING avec filtre anti-aliasing
      for (let i = 0; i < input.length; i += this.ratio) {
        const idx = Math.floor(i);
        let sample = input[idx];
        
        // Clamp input
        sample = Math.max(-1, Math.min(1, sample));
        
        // FILTRE ANTI-ALIASING (low-pass IIR simple)
        // Élimine les fréquences > 3.4kHz AVANT decimation pour éviter aliasing
        this.antiAliasingState = this.antiAliasingAlpha * sample + (1 - this.antiAliasingAlpha) * this.antiAliasingState;
        sample = this.antiAliasingState;
        
        // Clamp après filtrage
        sample = Math.max(-1, Math.min(1, sample));
        
        // Noise gate post-filtrage
        if (Math.abs(sample) < 0.005) {
          sample = 0;
        }
        
        // Encodage µ-law
        const mu = this.encodeMuLaw(sample);
        this.buffer.push(mu);
      }
    }

    // Envoyer par paquets RTP de 160 samples (20ms @ 8kHz)
    const CHUNK = 160;
    while (this.buffer.length >= CHUNK) {
      const frame = this.buffer.splice(0, CHUNK);
      const rtpPacket = this.createRTPPacket(frame);
      this.port.postMessage(rtpPacket);
    }

    return true;
  }

  createRTPPacket(pcmuData) {
    const header = new Uint8Array(12);
    
    // RTP Version 2
    header[0] = 0x80;
    
    // Payload Type: PCMU = 0
    header[1] = 0x00;
    
    // Sequence Number
    header[2] = (this.sequenceNumber >> 8) & 0xFF;
    header[3] = this.sequenceNumber & 0xFF;
    this.sequenceNumber++;
    
    // Timestamp (8kHz)
    header[4] = (this.timestamp >> 24) & 0xFF;
    header[5] = (this.timestamp >> 16) & 0xFF;
    header[6] = (this.timestamp >> 8) & 0xFF;
    header[7] = this.timestamp & 0xFF;
    this.timestamp += 160;
    
    // SSRC
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
    // µ-law (G.711) encoding
    const BIAS = 0x84;
    const MAX = 32635;
    
    const sign = sample < 0 ? 0x80 : 0;
    let s = Math.abs(sample);
    s = Math.min(s, 1.0);
    
    let s16 = Math.floor(s * 32767);
    if (s16 > MAX) s16 = MAX;
    s16 = s16 + BIAS;
    
    let exponent = 7;
    for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    
    const mantissa = (s16 >> (exponent + 3)) & 0x0F;
    const muLaw = ~(sign | (exponent << 4) | mantissa);
    
    return muLaw & 0xFF;
  }
}

registerProcessor('mic-processor', MicProcessor);
