// mic-processor.worklet.js
// Optimisé pour Telnyx : 8kHz natif, pas de resampling artisanal = zéro aliasing
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.sequenceNumber = 0;
    this.timestamp = 0;
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF); // Random SSRC
    
    // On attend du 8kHz natif du navigateur, donc ratio = 1
    // Si le navigateur donne du 48kHz malgré la demande, on adapte
    this.ratio = Math.max(1, Math.round(sampleRate / 8000));
    
    console.log(`🎤 MicProcessor: sampleRate=${sampleRate}Hz, ratio=${this.ratio}`);
    
    // High-pass filter state for noise reduction (removes low-frequency noise < 200Hz)
    this.highPassPrevInput = 0;
    this.highPassPrevOutput = 0;
    const cutoffFreq = 200; // Hz - élimine grondements, ventilation
    const rc = 1.0 / (2.0 * Math.PI * cutoffFreq);
    const dt = 1.0 / sampleRate;
    this.highPassAlpha = rc / (rc + dt);
    
    // Low-pass filter to remove high-frequency noise (> 3400Hz for telephony bandwidth)
    this.lowPassPrevOutput = 0;
    const lowCutoffFreq = 3400; // Hz - standard téléphonie
    const lowRc = 1.0 / (2.0 * Math.PI * lowCutoffFreq);
    this.lowPassAlpha = dt / (lowRc + dt);
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Calculate RMS (Root Mean Square) to detect audio level
    let sumSquares = 0;
    for (let i = 0; i < input.length; i++) {
      sumSquares += input[i] * input[i];
    }
    const rms = Math.sqrt(sumSquares / input.length);
    
    // Noise gate threshold: ignore audio below this level (reduces background noise)
    // Higher values = more aggressive noise reduction (but may cut quiet speech)
    // Lower values = less aggressive (more noise passes through)
    // Based on Telnyx docs: https://developers.telnyx.com/docs/voice/programmable-voice/noise-suppression
    // Telnyx noise suppression works best for AI speech recognition, not all noise types
    const NOISE_GATE_THRESHOLD = 0.04; // Augmenté à 0.04 pour filtrage très agressif du bruit de fond
    
    // Only process audio if it's above the noise gate threshold
    if (rms < NOISE_GATE_THRESHOLD) {
      // Send silence (mu-law encoded zero) instead of noise
      for (let i = 0; i < input.length; i += this.ratio) {
        this.buffer.push(0xFF); // mu-law encoded zero (silence)
      }
    } else {
      // Apply band-pass filter (200Hz - 3400Hz) pour garder uniquement les fréquences de la voix
      // Pas de resampling artisanal = pas d'aliasing = pas de bruit
      for (let i = 0; i < input.length; i += this.ratio) {
        const idx = Math.floor(i);
        let sample = input[idx];
        
        // Clamp input pour éviter les valeurs aberrantes
        sample = Math.max(-1, Math.min(1, sample));
        
        // High-pass filter: élimine bruits < 200Hz (grondements, ventilation)
        const highFiltered = this.highPassAlpha * (this.highPassPrevOutput + sample - this.highPassPrevInput);
        this.highPassPrevInput = sample;
        this.highPassPrevOutput = highFiltered;
        sample = highFiltered;
        
        // Low-pass filter: élimine bruits > 3400Hz (sifflements électriques)
        const lowFiltered = this.lowPassAlpha * sample + (1 - this.lowPassAlpha) * this.lowPassPrevOutput;
        this.lowPassPrevOutput = lowFiltered;
        sample = lowFiltered;
        
        // Clamp après filtrage pour garantir [-1, 1] pour mu-law
        sample = Math.max(-1, Math.min(1, sample));
        
        // Noise gate post-filtrage : élimine résidus très faibles
        if (Math.abs(sample) < 0.01) {
          sample = 0;
        }
        
        const mu = this.encodeMuLaw(sample);
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
    // Encodage µ-law (G.711) optimisé
    // Sample doit être dans [-1, 1], déjà clamped avant l'appel
    const BIAS = 0x84;
    const MAX = 32635;
    
    const sign = sample < 0 ? 0x80 : 0;
    let s = Math.abs(sample);
    
    // Clamp final par sécurité
    s = Math.min(s, 1.0);
    
    // Conversion en 16-bit PCM
    let s16 = Math.floor(s * 32767);
    if (s16 > MAX) s16 = MAX;
    
    // Ajout du bias
    s16 = s16 + BIAS;
    
    // Calcul de l'exposant (logarithmique)
    let exponent = 7;
    for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    
    // Calcul de la mantisse
    const mantissa = (s16 >> (exponent + 3)) & 0x0F;
    
    // Encodage final µ-law (inversé)
    const muLaw = ~(sign | (exponent << 4) | mantissa);
    
    return muLaw & 0xFF;
  }
}

registerProcessor('mic-processor', MicProcessor);


