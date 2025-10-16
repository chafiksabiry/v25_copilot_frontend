export class AudioStreamManager {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private isConnected: boolean = false;
  private onErrorCallback: ((error: Error) => void) | null = null;

  // Nouvelles propriétés pour le traitement par lots
  private audioBuffer: Float32Array[] = [];
  private readonly BUFFER_SIZE = 2048;
  private readonly MIN_BUFFER_SIZE = 5;  // Minimum de chunks avant de commencer la lecture
  private readonly MAX_BUFFER_SIZE = 20; // Maximum de chunks à garder
  private readonly MU_LAW_DECODE_TABLE: Int16Array;

  constructor(onError?: (error: Error) => void) {
    // Initialiser la table de conversion µ-law
    this.MU_LAW_DECODE_TABLE = new Int16Array(256);
    for (let i = 0; i < 256; i++) {
      const mu = ~i; // Inversion des bits pour µ-law
      const sign = (mu & 0x80) ? -1 : 1;
      let magnitude = ((mu & 0x70) >> 4) * 2;
      magnitude += ((mu & 0x0F) << 1) + 1;
      let amplitude = magnitude << 2;
      amplitude = ((amplitude + 33) << 3);
      this.MU_LAW_DECODE_TABLE[i] = sign * amplitude;
    }
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
      
      // Pas besoin de processorNode car nous ne faisons que recevoir l'audio

      // 6. Gérer les événements WebSocket
      this.ws.onopen = () => {
        console.log('🎤 WebSocket connected for audio streaming');
        this.isConnected = true;
      };

      this.ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message type:', message.event);

          switch (message.event) {
            case 'connected':
              console.log('🎧 Connected to audio stream with config:', message.config);
              break;

            case 'start':
              console.log('▶️ Stream started:', message.stream_id);
              // Stocker les informations de configuration si nécessaire
              break;

            case 'media':
              // Décoder et jouer l'audio
              if (message.media.track === 'inbound') {
                const base64Audio = message.media.payload;
                const binaryString = atob(base64Audio);
                const audioData = new Uint8Array(binaryString.length);
                
                // Convertir la string binaire en Uint8Array
                for (let i = 0; i < binaryString.length; i++) {
                  audioData[i] = binaryString.charCodeAt(i);
                }

                // Convertir PCMU en audio et jouer
                await this.playAudioBuffer(audioData.buffer);
              }
              break;

            case 'stop':
              console.log('⏹️ Stream stopped:', message.stream_id);
              this.disconnect();
              break;

            default:
              console.log('❓ Unknown message type:', message.event);
          }
        } catch (error) {
          console.error('❌ Error processing message:', error);
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

  // Supprimé convertToPCMU car nous ne faisons que recevoir l'audio

  private async playAudioBuffer(arrayBuffer: ArrayBuffer) {
    try {
      console.log('🎵 Processing audio chunk...');
      
      // 1. Convertir le buffer en Float32Array
      const pcmuData = new Uint8Array(arrayBuffer);
      console.log('📊 PCMU data length:', pcmuData.length);
      
      const float32Data = this.convertFromPCMU(pcmuData);
      console.log('📊 Float32 data length:', float32Data.length);
      
      // 2. Ajouter au buffer
      this.audioBuffer.push(float32Data);
      console.log('📊 Buffer status:', {
        chunks: this.audioBuffer.length,
        min: this.MIN_BUFFER_SIZE,
        max: this.MAX_BUFFER_SIZE
      });

      // 3. Si nous avons assez de chunks, commencer la lecture
      if (this.audioBuffer.length >= this.MIN_BUFFER_SIZE) {
        // Concaténer les chunks en un seul buffer
        const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedBuffer = new Float32Array(totalLength);
        
        let offset = 0;
        for (const chunk of this.audioBuffer) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Créer et configurer l'AudioBuffer
        const audioBuffer = this.audioContext.createBuffer(
          1,                    // mono
          combinedBuffer.length,// nombre d'échantillons
          8000                  // fréquence d'échantillonnage
        );
        
        // Copier les données
        audioBuffer.getChannelData(0).set(combinedBuffer);
        
        // Créer et configurer la source
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // Ajouter un gain pour contrôler le volume
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        // Connecter les nœuds
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Jouer l'audio
        console.log('🔊 Playing combined audio chunks');
        source.start(0);
        
        // Vider le buffer
        this.audioBuffer = [];
      }
      
      // 4. Éviter l'overflow du buffer
      while (this.audioBuffer.length > this.MAX_BUFFER_SIZE) {
        this.audioBuffer.shift();
        console.log('⚠️ Buffer overflow, dropping oldest chunk');
      }
      
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      this.onErrorCallback?.(new Error('Failed to play audio: ' + error.message));
    }
  }

  private convertFromPCMU(pcmuData: Uint8Array): Float32Array {
    const float32 = new Float32Array(pcmuData.length);
    
    for (let i = 0; i < pcmuData.length; i++) {
      // Utiliser la table de conversion précalculée
      float32[i] = this.MU_LAW_DECODE_TABLE[pcmuData[i]] / 32768.0;
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

    // Nettoyer le contexte audio si nécessaire
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.isConnected = false;
  }

  isStreamConnected(): boolean {
    return this.isConnected;
  }
}
