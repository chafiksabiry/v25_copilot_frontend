// recorder-processor.worklet.js
// AudioWorklet pour l'enregistrement audio (remplace ScriptProcessorNode déprécié)
class RecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.bufferSize = 4096; // Taille du buffer pour l'enregistrement
    this.sampleRate = sampleRate; // Sample rate du contexte audio
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const inputChannel = input[0];
    if (!inputChannel || inputChannel.length === 0) return true;

    // Copier les données audio dans le buffer
    this.buffer.push(new Float32Array(inputChannel));

    // Envoyer le buffer au thread principal quand il atteint la taille désirée
    // On envoie par chunks de bufferSize pour éviter de surcharger le thread principal
    if (this.buffer.length * inputChannel.length >= this.bufferSize) {
      // Flatten le buffer
      const totalSamples = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
      const audioData = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.buffer) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      // Envoyer au thread principal
      this.port.postMessage({
        type: 'audio-chunk',
        data: audioData,
        sampleRate: this.sampleRate
      });

      // Réinitialiser le buffer
      this.buffer = [];
    }

    return true; // Continuer le traitement
  }
}

registerProcessor('recorder-processor', RecorderProcessor);

