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
    
    // Filtre anti-aliasing : buffer pour moyenne mobile
    this.antiAliasBuffer = [];
    this.antiAliasSize = Math.ceil(this.ratio); // Taille du filtre = ratio de downsampling
  }

  // Filtre passe-bas simple (moyenne mobile) pour réduire l'aliasing
  applyAntiAliasFilter(samples) {
    const filtered = [];
    for (let i = 0; i < samples.length; i++) {
      this.antiAliasBuffer.push(samples[i]);
      
      // Garder seulement les derniers N échantillons
      if (this.antiAliasBuffer.length > this.antiAliasSize) {
        this.antiAliasBuffer.shift();
      }
      
      // Calculer la moyenne (filtre passe-bas)
      let sum = 0;
      for (let j = 0; j < this.antiAliasBuffer.length; j++) {
        sum += this.antiAliasBuffer[j];
      }
      const average = sum / this.antiAliasBuffer.length;
      filtered.push(average);
    }
    return filtered;
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Appliquer le filtre anti-aliasing avant le downsampling
    const filteredInput = this.applyAntiAliasFilter(input);

    // Downsample from 48kHz -> 8kHz avec échantillonnage régulier
    for (let i = 0; i < filteredInput.length; i += this.ratio) {
      const idx = Math.floor(i);
      const sample = filteredInput[idx];
      const mu = this.encodeMuLaw(sample);
      this.buffer.push(mu);
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
    
    // Appliquer une légère compression pour réduire les pics
    const compressionRatio = 0.95; // Réduire légèrement les pics
    s = Math.sign(s) * Math.pow(Math.abs(s), 1.0 / compressionRatio);
    
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


