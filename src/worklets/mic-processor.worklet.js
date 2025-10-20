class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 8000;
    this.sourceRate = sampleRate; // context rate
    this._resampleCursor = 0;
  }

  // Very simple resampler: pick nearest sample based on rate ratio
  _resampleTo8k(input) {
    const ratio = this.sourceRate / this.targetRate;
    const outLen = Math.floor((input.length + this._resampleCursor) / ratio);
    const out = new Float32Array(outLen);
    let cursor = this._resampleCursor;
    for (let i = 0; i < outLen; i++) {
      const srcIndex = Math.floor(i * ratio - cursor);
      const idx = Math.min(input.length - 1, Math.max(0, srcIndex));
      out[i] = input[idx];
    }
    // update cursor for next block
    const consumed = outLen * ratio;
    this._resampleCursor = (cursor + consumed) - Math.floor(cursor + consumed);
    return out;
  }

  _encodeMuLawSample(sample) {
    const BIAS = 0x84;
    const MAX = 32635;
    const sign = sample < 0 ? 0x80 : 0;
    let s = Math.abs(sample);
    if (s > 1.0) s = 1.0;
    let s16 = Math.floor(s * 32767);
    if (s16 > MAX) s16 = MAX;
    s16 = s16 + BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (s16 & expMask) === 0 && exponent > 0; expMask >>= 1) exponent--;
    const mantissa = (s16 >> (exponent + 3)) & 0x0F;
    const muLaw = ~(sign | (exponent << 4) | mantissa);
    return muLaw & 0xff;
  }

  _floatToMuLaw(float32) {
    const out = new Uint8Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      out[i] = this._encodeMuLawSample(float32[i]);
    }
    return out;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0]; // mono
    if (!channel) return true;

    // Downsample to 8kHz and encode to PCMU inside the worklet
    const ds = this._resampleTo8k(channel);
    const pcmu = this._floatToMuLaw(ds);

    // Transfer chunk to main thread (transfer buffer to avoid copy)
    this.port.postMessage(pcmu, [pcmu.buffer]);
    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);


