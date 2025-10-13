export class AudioStreamManager {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private microphoneStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(onError?: (error: Error) => void) {
    this.audioContext = new AudioContext({
      sampleRate: 8000  // Même fréquence que Telnyx
    });
    this.onErrorCallback = onError || null;
  }

  async connect(streamUrl: string) {
    try {
      console.log('🎤 Connecting to audio stream:', streamUrl);
      
      // 1. Connexion WebSocket
      this.ws = new WebSocket(streamUrl);
      
      // 2. Demander l'accès au microphone
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,          // Mono
          sampleRate: 8000,         // 8kHz comme requis par Telnyx
          echoCancellation: true,   // Suppression d'écho
          noiseSuppression: true    // Suppression de bruit
        }
      });

      // 3. Configurer le traitement audio
      const microphoneSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      // 4. Traitement audio en temps réel
      this.processorNode.onaudioprocess = (e) => {
        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convertir Float32Array en PCMU (µ-law)
          const pcmuData = this.convertToPCMU(inputData);
          
          // Encoder en base64 et envoyer
          const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(pcmuData)));
          
          this.ws.send(JSON.stringify({
            event: 'media',
            media: {
              payload: base64Audio
            }
          }));
        }
      };

      // 5. Connecter les nœuds audio
      microphoneSource.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // 6. Gérer les événements WebSocket
      this.ws.onopen = () => {
        console.log('🎤 WebSocket connected for audio streaming');
        this.isConnected = true;
      };

      this.ws.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            // Données audio reçues
            const arrayBuffer = await event.data.arrayBuffer();
            await this.playAudioBuffer(arrayBuffer);
          } else {
            // Messages de contrôle
            const message = JSON.parse(event.data);
            this.handleControlMessage(message);
          }
        } catch (error) {
          console.error('Error processing audio message:', error);
          this.onErrorCallback?.(error as Error);
        }
      };

      this.ws.onclose = () => {
        console.log('🎤 Audio WebSocket closed');
        this.isConnected = false;
      };

      this.ws.onerror = (error) => {
        console.error('🎤 Audio WebSocket error:', error);
        this.isConnected = false;
        this.onErrorCallback?.(new Error('Audio WebSocket error'));
      };

    } catch (error) {
      console.error('Error setting up audio stream:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  private convertToPCMU(float32Audio: Float32Array): Uint8Array {
    const pcmu = new Uint8Array(float32Audio.length);
    
    for (let i = 0; i < float32Audio.length; i++) {
      // 1. Normaliser entre -1 et 1
      let sample = Math.min(1, Math.max(-1, float32Audio[i]));
      
      // 2. Convertir en PCM 16-bit
      sample = sample * 32768;
      
      // 3. Convertir en µ-law
      const sign = (sample < 0) ? 0x80 : 0;
      sample = Math.abs(sample);
      
      // Compression logarithmique
      let magnitude = Math.min(15, Math.floor(Math.log(1 + 255 * sample / 32768) / Math.log(1 + 255) * 15));
      
      // Format µ-law final
      pcmu[i] = ~(sign | (magnitude << 4) | Math.floor((sample >> ((magnitude + 1) >= 8 ? 4 : 3)) & 0x0f));
    }
    
    return pcmu;
  }

  private async playAudioBuffer(arrayBuffer: ArrayBuffer) {
    try {
      // 1. Convertir le buffer en Float32Array
      const pcmuData = new Uint8Array(arrayBuffer);
      const float32Data = this.convertFromPCMU(pcmuData);
      
      // 2. Créer un AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1,                    // mono
        float32Data.length,   // nombre d'échantillons
        8000                  // fréquence d'échantillonnage
      );
      
      // 3. Copier les données
      audioBuffer.getChannelData(0).set(float32Data);
      
      // 4. Créer et configurer la source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // 5. Jouer l'audio
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.onErrorCallback?.(new Error('Failed to play audio'));
    }
  }

  private convertFromPCMU(pcmuData: Uint8Array): Float32Array {
    const float32 = new Float32Array(pcmuData.length);
    
    for (let i = 0; i < pcmuData.length; i++) {
      // Inverser le µ-law
      const ulaw = ~pcmuData[i];
      
      // Extraire le signe et la magnitude
      const sign = (ulaw & 0x80) ? -1 : 1;
      const magnitude = ((ulaw & 0x70) >> 4);
      const mantissa = ((ulaw & 0x0f) << 3) + 0x84;
      
      // Reconstruire la valeur
      let sample = sign * mantissa * Math.pow(2, magnitude) / 32768.0;
      
      // Limiter entre -1 et 1
      float32[i] = Math.max(-1, Math.min(1, sample));
    }
    
    return float32;
  }

  private handleControlMessage(message: any) {
    switch (message.event) {
      case 'connected':
        console.log('🎤 Connected to audio stream');
        break;

      case 'start':
        console.log('🎤 Stream started:', message.stream_id);
        break;

      case 'stop':
        console.log('🎤 Stream stopped');
        this.disconnect();
        break;

      case 'error':
        console.error('🎤 Stream error:', message.payload);
        this.onErrorCallback?.(new Error(message.payload.detail || 'Stream error'));
        break;
    }
  }

  disconnect() {
    console.log('🎤 Disconnecting audio stream');
    
    // 1. Fermer le WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 2. Arrêter le microphone
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    // 3. Nettoyer le traitement audio
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    this.isConnected = false;
  }

  isStreamConnected(): boolean {
    return this.isConnected;
  }
}
