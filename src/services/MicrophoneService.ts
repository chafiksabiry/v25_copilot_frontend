export class MicrophoneService {
  private ws: WebSocket;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private sequence = 0;
  private timestamp = 0;
  private ssrc = Math.floor(Math.random() * 0xffffffff);

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 8000
    });
  }

  private handleMessage(message: any) {
    if (!message || typeof message !== 'object') return;

    switch (message.event) {
      case 'connected':
        console.log('🎤 Configuration audio reçue:', message.config);
        if (message.config?.format === 'PCMU' && message.config?.sampleRate === 8000) {
          this.isConfigured = true;
          this.startCaptureResolve?.();
        }
        break;

      case 'start':
        console.log('🎤 Stream démarré, ID:', message.stream_id);
        break;

      case 'stop':
        console.log('🎤 Stream arrêté');
        this.stopCapture();
        break;

      case 'error':
        console.error('🎤 Erreur stream:', message.payload);
        break;
    }
  }

  async startCapture() {
    try {
      if (this.ws.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket non connecté");
      }
      // Demander l'accès au microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,          // Mono
          sampleRate: 8000,         // 8kHz comme requis
          echoCancellation: true,   // Suppression d'écho
          noiseSuppression: true    // Suppression de bruit
        }
      });

      // Créer la source audio depuis le micro
      const source = this.audioContext!.createMediaStreamSource(this.mediaStream);

      // Créer le processeur pour traiter l'audio
      const bufferSize = 256; // La plus petite taille de buffer valide
      this.micProcessor = this.audioContext!.createScriptProcessor(bufferSize, 1, 1);

      // Connecter la source au processeur
      source.connect(this.micProcessor);
      this.micProcessor.connect(this.audioContext!.destination);

      // Traiter l'audio capturé
      this.micProcessor.onaudioprocess = (ev) => {
        const inputData = ev.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const muLaw = this.pcm16ToMuLaw(pcm16);
        const rtpPacket = this.buildRtpPacket(muLaw);
        
        // Convertir en base64 et envoyer
        const payload = btoa(String.fromCharCode(...rtpPacket));
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            event: "media",
            media: {
              payload
            }
          }));
        }

        // Incrémenter sequence et timestamp
        this.sequence = (this.sequence + 1) & 0xffff;
        this.timestamp += muLaw.length;
      };

      console.log('🎤 Capture micro démarrée');
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la capture micro:', error);
      this.stopCapture();
      throw error;
    }
  }

  stopCapture() {
    // Arrêter le processeur
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }

    // Arrêter les tracks du mediaStream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Fermer le WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('❌ Erreur lors de la fermeture du WebSocket:', error);
      }
      this.ws = null;
    }

    // Réinitialiser l'état
    this.isConfigured = false;
    this.startCapturePromise = null;
    this.startCaptureResolve = null;

    console.log('🎤 Capture micro arrêtée');
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private pcm16ToMuLaw(pcm16: Int16Array): Uint8Array {
    const output = new Uint8Array(pcm16.length);
    const MAX = 32768;

    for (let i = 0; i < pcm16.length; i++) {
      let pcmVal = pcm16[i];
      let sign = (pcmVal < 0) ? 0x80 : 0;
      if (pcmVal < 0) pcmVal = -pcmVal;
      if (pcmVal > MAX) pcmVal = MAX;

      // Algorithme µ-law
      const exponent = Math.floor(Math.log2(pcmVal / 256 + 1));
      const mantissa = (pcmVal >> (exponent + 3)) & 0x0F;
      const muByte = ~(sign | (exponent << 4) | mantissa);
      output[i] = muByte & 0xFF;
    }
    return output;
  }

  private buildRtpPacket(muLawPayload: Uint8Array): Uint8Array {
    const header = new Uint8Array(12);
    header[0] = 0x80; // version=2, no padding, no extension, CC=0
    header[1] = 0x00; // marker=0, payload type = 0 (PCMU)
    header[2] = (this.sequence >> 8) & 0xFF;
    header[3] = this.sequence & 0xFF;
    header[4] = (this.timestamp >> 24) & 0xFF;
    header[5] = (this.timestamp >> 16) & 0xFF;
    header[6] = (this.timestamp >> 8) & 0xFF;
    header[7] = this.timestamp & 0xFF;
    header[8] = (this.ssrc >> 24) & 0xFF;
    header[9] = (this.ssrc >> 16) & 0xFF;
    header[10] = (this.ssrc >> 8) & 0xFF;
    header[11] = this.ssrc & 0xFF;

    const packet = new Uint8Array(12 + muLawPayload.length);
    packet.set(header, 0);
    packet.set(muLawPayload, 12);
    return packet;
  }
}
