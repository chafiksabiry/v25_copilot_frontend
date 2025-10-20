// mic-processor.worklet.js
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.ratio = sampleRate / 8000; // if input is 48kHz
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    // Downsample from 48kHz -> 8kHz
    for (let i = 0; i < input.length; i += this.ratio) {
      const idx = Math.floor(i);
      const sample = input[idx];
      const mu = this.encodeMuLaw(sample);
      this.buffer.push(mu);
    }

    // Send in reasonable chunks (e.g. 160 samples = 20 ms @ 8 kHz)
    const CHUNK = 160;
    while (this.buffer.length >= CHUNK) {
      const frame = this.buffer.splice(0, CHUNK);
      this.port.postMessage(new Uint8Array(frame));
    }

    return true;
  }

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
}

registerProcessor('mic-processor', MicProcessor);


