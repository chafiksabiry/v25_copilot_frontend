class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.targetSampleRate = 16000;
        this.sourceSampleRate = options.processorOptions.sampleRate || 41000;
        this.bufferSize = 2112; // Multiple of 128 and works well with 48k/44.1k/16k ratios
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // Downsampling ratio
        this.ratio = this.sourceSampleRate / this.targetSampleRate;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];

            // Collect audio data
            for (let i = 0; i < channelData.length; i++) {
                this.buffer[this.bufferIndex++] = channelData[i];

                // When buffer is full, downsample and send
                if (this.bufferIndex >= this.bufferSize) {
                    this.sendDownsampledData();
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }

    sendDownsampledData() {
        const outputLength = Math.floor(this.bufferSize / this.ratio);
        const pcmData = new Int16Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const nextIndex = Math.floor(i * this.ratio);
            // Simple nearest-neighbor downsampling for performance, or linear interpolation
            let sample = 0;
            if (nextIndex < this.bufferSize) {
                sample = this.buffer[nextIndex];
            }

            // Clamp and convert float32 to int16
            const s = Math.max(-1, Math.min(1, sample));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
    }
}

registerProcessor('audio-processor', AudioProcessor);
