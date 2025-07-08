class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 16000; // Required for speech recognition
    this.isFirstMessage = true;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const inputChannel = input[0];
      
      // Add samples to buffer
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        
        // When buffer is full, convert and send
        if (this.bufferIndex >= this.bufferSize) {
          // Check if there's actual audio data (not just silence)
          let hasAudioData = false;
          let maxAmplitude = 0;
          for (let j = 0; j < this.bufferSize; j++) {
            const amplitude = Math.abs(this.buffer[j]);
            maxAmplitude = Math.max(maxAmplitude, amplitude);
            if (amplitude > 0.01) { // Threshold for considering it actual audio
              hasAudioData = true;
              break;
            }
          }

          if (hasAudioData) {
            // Convert float32 to 16-bit PCM
            const pcmData = new Int16Array(this.bufferSize);
            for (let j = 0; j < this.bufferSize; j++) {
              // Normalize and apply gain
              const sample = Math.max(-1, Math.min(1, this.buffer[j] * 1.5)); // Increase volume by 50%
              // Convert to 16-bit PCM
              pcmData[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            
            if (this.isFirstMessage) {
              console.log('First audio buffer - Max amplitude:', maxAmplitude);
              this.isFirstMessage = false;
            }
            
            // Send the PCM data
            this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
          }
          
          // Reset buffer
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 