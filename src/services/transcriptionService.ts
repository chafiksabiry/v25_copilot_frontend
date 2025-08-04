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
  private phoneNumber: string | null = null;
  private configSent = false; // Flag pour s'assurer que la configuration est envoyée avant l'audio
  private destinationZone: string | null = null; // Zone de destination du gig

  constructor() {
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  setTranscriptionCallback(callback: (message: TranscriptionMessage) => void) {
    this.onTranscriptionUpdate = callback;
  }

  // Méthode pour définir la zone de destination du gig
  setDestinationZone(zone: string) {
    this.destinationZone = zone;
    console.log('🌍 Destination zone set for transcription:', zone);
  }

  // Méthode pour déterminer la langue basée sur la zone de destination
  private getLanguageFromDestinationZone(zone: string): string {
    console.log('🌍 Getting language from destination zone:', zone);
    
    const zoneLanguageMap: { [key: string]: string } = {
      // Europe
      'FR': 'fr-FR', // France
      'DE': 'de-DE', // Allemagne
      'ES': 'es-ES', // Espagne
      'IT': 'it-IT', // Italie
      'PT': 'pt-PT', // Portugal
      'GB': 'en-GB', // Royaume-Uni
      'NL': 'nl-NL', // Pays-Bas
      'BE': 'fr-FR', // Belgique (français)
      'CH': 'fr-FR', // Suisse (français)
      'AT': 'de-DE', // Autriche
      'PL': 'pl-PL', // Pologne
      'CZ': 'cs-CZ', // République tchèque
      'HU': 'hu-HU', // Hongrie
      'RO': 'ro-RO', // Roumanie
      'BG': 'bg-BG', // Bulgarie
      'HR': 'hr-HR', // Croatie
      'SI': 'sl-SI', // Slovénie
      'SK': 'sk-SK', // Slovaquie
      'LT': 'lt-LT', // Lituanie
      'LV': 'lv-LV', // Lettonie
      'EE': 'et-ET', // Estonie
      'FI': 'fi-FI', // Finlande
      'SE': 'sv-SE', // Suède
      'NO': 'no-NO', // Norvège
      'DK': 'da-DK', // Danemark
      'IE': 'en-IE', // Irlande
      'MT': 'mt-MT', // Malte
      'CY': 'el-CY', // Chypre
      'GR': 'el-GR', // Grèce
      
      // Amérique du Nord
      'US': 'en-US', // États-Unis
      'CA': 'en-CA', // Canada (anglais)
      'CA-FR': 'fr-CA', // Canada (français)
      'MX': 'es-MX', // Mexique
      
      // Amérique du Sud
      'BR': 'pt-BR', // Brésil
      'AR': 'es-AR', // Argentine
      'CL': 'es-CL', // Chili
      'CO': 'es-CO', // Colombie
      'PE': 'es-PE', // Pérou
      'VE': 'es-VE', // Venezuela
      'EC': 'es-EC', // Équateur
      'BO': 'es-BO', // Bolivie
      'PY': 'es-PY', // Paraguay
      'UY': 'es-UY', // Uruguay
      
      // Afrique
      'MA': 'ar-MA', // Maroc
      'DZ': 'ar-DZ', // Algérie
      'TN': 'ar-TN', // Tunisie
      'EG': 'ar-EG', // Égypte
      'ZA': 'en-ZA', // Afrique du Sud
      'NG': 'en-NG', // Nigeria
      'KE': 'sw-KE', // Kenya
      'SN': 'fr-SN', // Sénégal
      'CI': 'fr-CI', // Côte d'Ivoire
      'CM': 'fr-CM', // Cameroun
      
      // Asie
      'CN': 'zh-CN', // Chine
      'JP': 'ja-JP', // Japon
      'KR': 'ko-KR', // Corée du Sud
      'IN': 'en-IN', // Inde
      'TH': 'th-TH', // Thaïlande
      'VN': 'vi-VN', // Vietnam
      'MY': 'ms-MY', // Malaisie
      'SG': 'en-SG', // Singapour
      'PH': 'en-PH', // Philippines
      'ID': 'id-ID', // Indonésie
      'TR': 'tr-TR', // Turquie
      'IL': 'he-IL', // Israël
      'AE': 'ar-AE', // Émirats arabes unis
      'SA': 'ar-SA', // Arabie saoudite
      'QA': 'ar-QA', // Qatar
      'KW': 'ar-KW', // Koweït
      'BH': 'ar-BH', // Bahreïn
      'OM': 'ar-OM', // Oman
      
      // Océanie
      'AU': 'en-AU', // Australie
      'NZ': 'en-NZ', // Nouvelle-Zélande
      
      // Par défaut
      'DEFAULT': 'en-US'
    };

    const language = zoneLanguageMap[zone.toUpperCase()] || zoneLanguageMap['DEFAULT'];
    console.log(`🌍 Language for zone ${zone}: ${language}`);
    return language;
  }

  private getLanguageFromPhoneNumber(phone: string, destinationZone?: string): string {
    // Si on a une zone de destination du gig, l'utiliser en priorité
    if (destinationZone) {
      console.log('🌍 Using destination zone for language detection:', destinationZone);
      return this.getLanguageFromDestinationZone(destinationZone);
    }

    console.log('🔍 Detecting language for phone number:', phone);
    console.log('🔍 Phone number type:', typeof phone);
    console.log('🔍 Phone number length:', phone.length);
    
    // Nettoyer le numéro de téléphone
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
    console.log('🔍 Cleaned phone number:', cleanPhone);
    
    // France (+33, 0033, 33, ou numéros commençant par 0)
    if (cleanPhone.startsWith('+33') || cleanPhone.startsWith('0033') || 
        cleanPhone.startsWith('33') || cleanPhone.match(/^0[1-9]/)) {
      console.log('🇫🇷 Detected French phone number, using fr-FR');
      return 'fr-FR';
    }
    
    // Maroc (+212, 00212)
    else if (cleanPhone.startsWith('+212') || cleanPhone.startsWith('00212')) {
      console.log('🇲🇦 Detected Moroccan phone number, using ar-MA');
      return 'ar-MA';
    }
    
    // Espagne (+34, 0034)
    else if (cleanPhone.startsWith('+34') || cleanPhone.startsWith('0034')) {
      console.log('🇪🇸 Detected Spanish phone number, using es-ES');
      return 'es-ES';
    }
    
    // Allemagne (+49, 0049)
    else if (cleanPhone.startsWith('+49') || cleanPhone.startsWith('0049')) {
      console.log('🇩🇪 Detected German phone number, using de-DE');
      return 'de-DE';
    }
    
    // Royaume-Uni (+44, 0044, 44, ou numéros commençant par 0)
    else if (cleanPhone.startsWith('+44') || cleanPhone.startsWith('0044') || 
             cleanPhone.startsWith('44') || cleanPhone.match(/^0[1-9]/)) {
      console.log('🇬🇧 Detected UK phone number, using en-GB');
      return 'en-GB';
    }
    
    // Canada (+1 avec codes régionaux canadiens spécifiques)
    else if (cleanPhone.startsWith('+1') && (
      // Codes régionaux canadiens exacts
      cleanPhone.match(/\+1(403|587|604|778|204|431|506|428|709|879|902|782|705|249|418|581|306|639|867)/)
    )) {
      console.log('🇨🇦 Detected Canadian phone number, using en-CA');
      return 'en-CA';
    }
    
    // États-Unis (+1 ou numéros à 10 chiffres)
    else if (cleanPhone.startsWith('+1') || 
             (cleanPhone.length === 10 && cleanPhone.match(/^[2-9][0-9]{9}$/)) ||
             cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      console.log('🇺🇸 Detected US phone number, using en-US');
      return 'en-US';
    }
    
    // Italie (+39, 0039)
    else if (cleanPhone.startsWith('+39') || cleanPhone.startsWith('0039')) {
      console.log('🇮🇹 Detected Italian phone number, using it-IT');
      return 'it-IT';
    }
    
    // Portugal (+351, 00351)
    else if (cleanPhone.startsWith('+351') || cleanPhone.startsWith('00351')) {
      console.log('🇵🇹 Detected Portuguese phone number, using pt-PT');
      return 'pt-PT';
    }
    
    // Brésil (+55, 0055)
    else if (cleanPhone.startsWith('+55') || cleanPhone.startsWith('0055')) {
      console.log('🇧🇷 Detected Brazilian phone number, using pt-BR');
      return 'pt-BR';
    }
    
    // Japon (+81, 0081)
    else if (cleanPhone.startsWith('+81') || cleanPhone.startsWith('0081')) {
      console.log('🇯🇵 Detected Japanese phone number, using ja-JP');
      return 'ja-JP';
    }
    
    // Corée du Sud (+82, 0082)
    else if (cleanPhone.startsWith('+82') || cleanPhone.startsWith('0082')) {
      console.log('🇰🇷 Detected Korean phone number, using ko-KR');
      return 'ko-KR';
    }
    
    // Chine (+86, 0086)
    else if (cleanPhone.startsWith('+86') || cleanPhone.startsWith('0086')) {
      console.log('🇨🇳 Detected Chinese phone number, using zh-CN');
      return 'zh-CN';
    }
    
    // Par défaut, utiliser l'anglais américain
    else {
      console.log('🇺🇸 Using default English (en-US) for phone number:', cleanPhone);
      return 'en-US';
    }
  }

  async initializeTranscription(stream: MediaStream, phoneNumber: string) {
    console.log("🎤 Initializing transcription service...");
    console.log("📞 Phone number received:", phoneNumber);
    console.log("📞 Phone number type:", typeof phoneNumber);
    
    this.isCallActive = true;
    this.phoneNumber = phoneNumber;
    
    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.audioContext.createMediaStreamSource(stream);
    
    // Create analyzer for audio level monitoring
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 2048;
    this.source.connect(this.analyzer);
    
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
      
      // Attendre un peu pour s'assurer que la connexion est stable
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // ENVOYER LA CONFIGURATION APRÈS UN COURT DÉLAI
      console.log('🌍 Current destination zone in service:', this.destinationZone);
      const detectedLanguage = this.getLanguageFromPhoneNumber(phoneNumber, this.destinationZone || undefined);
      const config = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: this.audioContext!.sampleRate,
          languageCode: detectedLanguage,
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
          enableAutomaticLanguageIdentification: false,
          alternativeLanguageCodes: [],
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

      console.log('📝 Sending speech recognition config with detected language:', detectedLanguage);
      console.log('🔍 Language detected from phone number:', phoneNumber, '→', detectedLanguage);
      console.log('🎤 Audio sample rate:', this.audioContext!.sampleRate);
      console.log('📤 WebSocket readyState before sending config:', this.ws?.readyState);
      console.log('📤 Sending config to WebSocket:', JSON.stringify(config, null, 2));
      // Envoyer la configuration comme une string, pas comme un buffer
      this.ws!.send(JSON.stringify(config));
      console.log('✅ Config sent to WebSocket');
      console.log('📤 WebSocket readyState after sending config:', this.ws?.readyState);
      
      // Configuration envoyée, procéder directement à l'audio
      console.log('✅ Config sent, proceeding with audio setup');
      
      // Marquer que la configuration a été envoyée
      this.configSent = true;
      
      // MAINTENANT créer l'audio worklet APRÈS avoir envoyé la configuration
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

        // Handle audio data
        this.audioProcessor.port.onmessage = (event) => {
          if (this.ws?.readyState === WebSocket.OPEN && this.isCallActive && this.configSent) {
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
          } else if (!this.configSent) {
            console.log('⏳ Skipping audio data, config not yet sent to backend');
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

  } catch (error: any) {
    console.error('❌ Error initializing transcription:', error);
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