import axios from 'axios';

export interface TranscriptionMessage {
  type: 'transcript' | 'interim' | 'final';
  text: string;
  confidence?: number;
  speaker?: string;
  timestamp: number;
}

export interface TranscriptionConfig {
  encoding: string;
  sampleRateHertz: number;
  languageCode: string;
  enableAutomaticPunctuation: boolean;
  model: string;
  useEnhanced: boolean;
  audioChannelCount: number;
  enableWordConfidence: boolean;
  enableSpeakerDiarization: boolean;
  diarizationConfig: {
    enableSpeakerDiarization: boolean;
    minSpeakerCount: number;
    maxSpeakerCount: number;
  };
  enableAutomaticLanguageIdentification: boolean;
  alternativeLanguageCodes: string[];
  interimResults: boolean;
  singleUtterance: boolean;
  metadata: {
    interactionType: string;
    industryNaicsCodeOfAudio: number;
    originalMediaType: string;
    recordingDeviceType: string;
    microphoneDistance: string;
    originalMimeType: string;
    audioTopic: string;
  };
}

export class TranscriptionService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: AudioWorkletNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isCallActive = false;
  private cleanupInitiated = false;
  private onTranscriptionUpdate: ((message: TranscriptionMessage) => void) | null = null;

  constructor() {
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  setTranscriptionCallback(callback: (message: TranscriptionMessage) => void) {
    this.onTranscriptionUpdate = callback;
  }

  private getLanguageFromPhoneNumber(phone: string): string {
    console.log('🔍 Detecting language for phone number:', phone);
    
    // Nettoyer le numéro de téléphone
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
    
    if (cleanPhone.startsWith('+33') || cleanPhone.startsWith('0033') || 
        cleanPhone.startsWith('33') || cleanPhone.match(/^0[1-9]/)) {
      console.log('🇫🇷 Detected French phone number, using fr-FR');
      return 'fr-FR';
    } else if (cleanPhone.startsWith('+212') || cleanPhone.startsWith('00212')) {
      console.log('🇲🇦 Detected Moroccan phone number, using ar-MA');
      return 'ar-MA';
    } else if (cleanPhone.startsWith('+34') || cleanPhone.startsWith('0034')) {
      console.log('🇪🇸 Detected Spanish phone number, using es-ES');
      return 'es-ES';
    } else if (cleanPhone.startsWith('+49') || cleanPhone.startsWith('0049')) {
      console.log('🇩🇪 Detected German phone number, using de-DE');
      return 'de-DE';
    } else if (cleanPhone.startsWith('+44') || cleanPhone.startsWith('0044') || 
               cleanPhone.startsWith('44') || cleanPhone.match(/^0[1-9]/)) {
      console.log('🇬🇧 Detected UK phone number, using en-GB');
      return 'en-GB';
    } else {
      console.log('🇺🇸 Using default English (en-US) for phone number:', cleanPhone);
      return 'en-US'; // Default to English
    }
  }

  async initializeTranscription(stream: MediaStream, phoneNumber: string) {
    try {
      console.log("🎤 Initializing transcription service...");
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.audioContext.createMediaStreamSource(stream);
      
      // Create audio analyzer
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.source.connect(this.analyzer);

      this.isCallActive = true;
      this.cleanupInitiated = false;

      // Initialize WebSocket connection
      const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
      console.log('🔌 Connecting to WebSocket URL:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = async () => {
        if (!this.isCallActive) {
          console.log("Call no longer active, closing WebSocket connection");
          this.ws?.close(1000, "Call already ended");
          return;
        }

        console.log('🔌 WebSocket connection established for speech-to-text');
        
        try {
          // Create audio worklet
          await this.audioContext!.audioWorklet.addModule('/audio-processor.js');
          this.audioProcessor = new AudioWorkletNode(this.audioContext!, 'audio-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1,
            processorOptions: {
              sampleRate: this.audioContext!.sampleRate
            }
          });
          
          this.source!.connect(this.audioProcessor);
          this.audioProcessor.connect(this.audioContext!.destination);

          // Send configuration
          const config = {
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: this.audioContext!.sampleRate,
              languageCode: 'fr-FR', // Forcer le français
              enableAutomaticPunctuation: true,
              model: 'phone_call',
              useEnhanced: true,
              audioChannelCount: 1,
              enableWordConfidence: true,
              enableSpeakerDiarization: true,
              diarizationConfig: {
                enableSpeakerDiarization: true,
                minSpeakerCount: 1,
                maxSpeakerCount: 2
              },
              enableAutomaticLanguageIdentification: false, // Désactiver la détection automatique
              alternativeLanguageCodes: [], // Pas d'alternatives pour forcer le français
              interimResults: true,
              singleUtterance: false,
              metadata: {
                interactionType: 'PHONE_CALL',
                industryNaicsCodeOfAudio: 518,
                originalMediaType: 'PHONE_CALL',
                recordingDeviceType: 'PHONE_LINE',
                microphoneDistance: 'NEARFIELD',
                originalMimeType: 'audio/x-raw',
                audioTopic: 'customer_service'
              }
            }
          };
          
          console.log('📝 Sending speech recognition config with FORCED French:', config);
          console.log('🇫🇷 Forcing French (fr-FR) - auto-detection DISABLED');
          console.log('🎤 Audio sample rate:', this.audioContext!.sampleRate);
          this.ws!.send(JSON.stringify(config));

          // Handle audio data
          this.audioProcessor.port.onmessage = (event) => {
            if (this.ws?.readyState === WebSocket.OPEN && this.isCallActive) {
              try {
                const audioData = event.data;
                if (!(audioData instanceof ArrayBuffer)) {
                  console.error('❌ Invalid audio data format:', typeof audioData);
                  return;
                }

                // Convert to 16-bit PCM
                const view = new DataView(audioData);
                const pcmData = new Int16Array(audioData.byteLength / 2);
                for (let i = 0; i < pcmData.length; i++) {
                  pcmData[i] = view.getInt16(i * 2, true);
                }
                
                this.ws!.send(pcmData.buffer);
              } catch (error) {
                console.error('❌ Error processing audio data:', error);
              }
            }
          };

          // Start audio level monitoring
          this.startAudioLevelMonitoring();

        } catch (error) {
          console.error('❌ Error initializing audio worklet:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        if (this.isCallActive) {
          setTimeout(() => this.reconnectWebSocket(), 2000);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        if (this.isCallActive && event.code !== 1000) {
          console.log('🔄 WebSocket closed unexpectedly, attempting to reconnect...');
          setTimeout(() => this.reconnectWebSocket(), 2000);
        }
      };

      this.ws.onmessage = this.handleWebSocketMessage;

    } catch (error) {
      console.error('❌ Error initializing transcription:', error);
    }
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('📝 Received transcription data:', data);

      // Google format
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const isFinal = result.isFinal;
        const transcript = result.alternatives[0]?.transcript || '';
        const confidence = result.alternatives[0]?.confidence || 0;
        const detectedLanguage = 'fr-FR'; // Forcer le français

        console.log('🔍 Raw result:', result);
        console.log('🔍 Alternative:', result.alternatives[0]);

        if (transcript.trim()) {
          console.log(`🇫🇷 French transcription: "${transcript}"`);
          console.log(`📊 Confidence: ${confidence}, Final: ${isFinal}`);
          
          const message: TranscriptionMessage = {
            type: isFinal ? 'final' : 'interim',
            text: transcript,
            confidence,
            speaker: 'Unknown', // Will be determined by diarization
            timestamp: Date.now()
          };

          if (this.onTranscriptionUpdate) {
            this.onTranscriptionUpdate(message);
          }
        } else {
          console.log('⚠️ Empty transcript received');
        }
      }
      // Fallback: flat format (comme dans les logs de l'utilisateur)
      else if (typeof data.transcript === 'string') {
        const detectedLanguage = 'fr-FR'; // Forcer le français
        console.log(`🇫🇷 French transcription: "${data.transcript}"`);
        console.log(`📊 Confidence: ${data.confidence}, Final: ${data.isFinal}`);
        
        const message: TranscriptionMessage = {
          type: data.isFinal ? 'final' : 'interim',
          text: data.transcript,
          confidence: data.confidence || 0,
          speaker: 'Unknown',
          timestamp: Date.now()
        };
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate(message);
        }
      } else {
        console.log('⚠️ Unknown message format:', data);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private startAudioLevelMonitoring() {
    const analyzeAudio = () => {
      if (!this.isCallActive || !this.analyzer) return;
      
      const dataArray = new Float32Array(this.analyzer.frequencyBinCount);
      this.analyzer.getFloatTimeDomainData(dataArray);
      
      let rms = 0;
      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = Math.abs(dataArray[i]);
        rms += amplitude * amplitude;
        peak = Math.max(peak, amplitude);
      }
      
      rms = Math.sqrt(rms / dataArray.length);
      const isActive = rms > 0.02;
      
      if (rms > 0.01) {
        console.log('🎤 Audio levels:', {
          rms: rms.toFixed(3),
          peak: peak.toFixed(3),
          bufferSize: dataArray.length,
          isActive
        });
      }
      
      if (this.isCallActive) {
        requestAnimationFrame(analyzeAudio);
      }
    };
    
    analyzeAudio();
  }

  private reconnectWebSocket() {
    if (this.isCallActive && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      console.log('🔄 Attempting to reconnect WebSocket...');
      const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log('🔄 WebSocket reconnected');
      };
      this.ws.onmessage = this.handleWebSocketMessage;
    }
  }

  async cleanup() {
    if (this.cleanupInitiated) return;
    this.cleanupInitiated = true;
    console.log("🧹 Starting transcription cleanup...");
    
    this.isCallActive = false;
    
    // Close WebSocket first
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("🔌 Closing WebSocket connection...");
      this.ws.close(1000, "Call ended normally");
    }

    // Wait a bit for WebSocket to close cleanly
    await new Promise(resolve => setTimeout(resolve, 500));

    // Then cleanup audio
    try {
      console.log("🎵 Cleaning up audio resources...");
      if (this.analyzer) {
        this.analyzer.disconnect();
      }
      if (this.source) {
        this.source.disconnect();
      }
      if (this.audioProcessor) {
        this.audioProcessor.disconnect();
      }
      if (this.audioContext) {
        await this.audioContext.close();
      }
    } catch (error) {
      console.error("❌ Error during audio cleanup:", error);
    }

    console.log("✅ Transcription cleanup complete");
  }
} 