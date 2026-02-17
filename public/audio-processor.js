class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.targetSampleRate = 16000;
        this.sourceSampleRate = options.processorOptions.sampleRate || 48000;
        // Increase buffer size to handle potential stereo data
        this.bufferSize = 4096;
        this.channelCount = 1; // Default
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // Downsampling ratio
        this.ratio = this.sourceSampleRate / this.targetSampleRate;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channels = input.length;
            this.channelCount = channels; // Update dynamically

            const frameCount = input[0].length;

            // Iterate through frames
            for (let i = 0; i < frameCount; i++) {
                // For each frame, push samples from all channels (interleaved)
                for (let c = 0; c < channels; c++) {
                    this.buffer[this.bufferIndex++] = input[c][i];
                }

                // If buffer full, process
                if (this.bufferIndex >= this.bufferSize) {
                    this.sendDownsampledData();
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }

    sendDownsampledData() {
        // Calculate output length based on ratio and channel count
        // We have 'bufferIndex' samples filled.
        // We want to downsample PER CHANNEL.

        // Strategy: De-interleave -> Downsample each -> Re-interleave
        // Simplified: Just downsample the interleaved stream directly? 
        // No, that mixes channels. We must preserve channel separation.

        const inputSamples = this.bufferIndex;
        const frames = inputSamples / this.channelCount;
        const outputFrames = Math.floor(frames / this.ratio);
        const outputSamples = outputFrames * this.channelCount;

        const pcmData = new Int16Array(outputSamples);

        for (let i = 0; i < outputFrames; i++) {
            const inputFrameIndex = Math.floor(i * this.ratio);

            for (let c = 0; c < this.channelCount; c++) {
                // Index in interleaved buffer: frameIndex * channels + channelIndex
                const sampleIndex = (inputFrameIndex * this.channelCount) + c;

                let sample = 0;
                if (sampleIndex < inputSamples) {
                    sample = this.buffer[sampleIndex];
                }

                // Clamp and convert
                const s = Math.max(-1, Math.min(1, sample));
                // Store in interleaved output
                pcmData[(i * this.channelCount) + c] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
        }

        this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
        // Also send channel count info occasionally or assume constant?
        // For simplicity, backend assumes constant channel count from config.
    }
}

registerProcessor('audio-processor', AudioProcessor);
