

export interface TranscriptionMessage {
  type: 'transcript' | 'interim' | 'final' | 'analysis';
  text: string;
  confidence?: number;
  speaker?: string;
  timestamp: number;
  // AI Analysis fields
  current_phase?: string;
  next_step_suggestion?: string;
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
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[()-]/g, '');

    // France (+33, 0033, 33, ou numéros commençant par 0)
    if (cleanPhone.startsWith('+33') || cleanPhone.startsWith('0033') ||
      cleanPhone.startsWith('33') || cleanPhone.match(/^0[1-9]/)) {
      return 'fr-FR';
    }

    // Maroc (+212, 00212)
    else if (cleanPhone.startsWith('+212') || cleanPhone.startsWith('00212')) {
      return 'ar-MA';
    }

    // Royaume-Uni (+44, 0044, 44, ou numéros commençant par 0)
    else if (cleanPhone.startsWith('+44') || cleanPhone.startsWith('0044') ||
      cleanPhone.startsWith('44')) {
      return 'en-GB';
    }

    // États-Unis (+1 ou numéros à 10 chiffres)
    else if (cleanPhone.startsWith('+1') || cleanPhone.startsWith('1')) {
      return 'en-US';
    }

    return 'en-US';
  }

  async initializeTranscription(stream: MediaStream, phoneNumber: string) {
    try {
      this.isCallActive = true;

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;
      this.source.connect(this.analyzer);

      const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        if (!this.isCallActive) {
          this.ws?.close(1000, "Call already ended");
          return;
        }

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
            interimResults: true
          }
        };

        this.ws!.send(JSON.stringify(config));
        this.configSent = true;

        try {
          // Use the microfrontend's public path if available
          const publicPath = (window as any).__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || '/';
          const workletUrl = new URL('audio-processor.js', publicPath).href;
          console.log('🎤 Loading audio worklet from:', workletUrl);

          await this.audioContext!.audioWorklet.addModule(workletUrl);
          this.audioProcessor = new AudioWorkletNode(this.audioContext!, 'audio-processor', {
            processorOptions: {
              sampleRate: this.audioContext!.sampleRate
            }
          });

          this.source!.connect(this.audioProcessor);
          this.audioProcessor.connect(this.audioContext!.destination);

          this.audioProcessor.port.onmessage = (event) => {
            if (this.ws?.readyState === WebSocket.OPEN && this.isCallActive && this.configSent) {
              const audioData = event.data;
              const view = new DataView(audioData);
              const pcmData = new Int16Array(audioData.byteLength / 2);
              for (let i = 0; i < pcmData.length; i++) {
                pcmData[i] = view.getInt16(i * 2, true);
              }
              this.ws!.send(pcmData.buffer);
            }
          };

          this.startAudioLevelMonitoring();

        } catch (error) {
          console.error('❌ Error initializing audio worklet:', error);
        }
      };

      this.ws.onerror = (error) => console.error('❌ WebSocket error:', error);
      this.ws.onclose = (event) => {
        if (this.isCallActive && event.code !== 1000) setTimeout(() => this.reconnectWebSocket(), 2000);
      };
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);

    } catch (error: any) {
      console.error('❌ Error initializing transcription:', error);
    }
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'analysis') {
        console.log('📊 Frontend received AI Analysis:', data);
        if (this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate({
            type: 'analysis',
            text: '',
            current_phase: data.current_phase,
            confidence: data.confidence,
            next_step_suggestion: data.next_step_suggestion,
            timestamp: data.timestamp || Date.now()
          });
        }
        return;
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const isFinal = result.isFinal;
        const transcript = result.alternatives[0]?.transcript || '';

        if (transcript.trim() && this.onTranscriptionUpdate) {
          this.onTranscriptionUpdate({
            type: isFinal ? 'final' : 'interim',
            text: transcript,
            confidence: result.alternatives[0]?.confidence || 0,
            timestamp: Date.now()
          });
        }
      } else if (typeof data.transcript === 'string' && this.onTranscriptionUpdate) {
        console.log('💬 Received legacy transcript message:', data.transcript);
        this.onTranscriptionUpdate({
          type: data.isFinal ? 'final' : 'interim',
          text: data.transcript,
          confidence: data.confidence || 0,
          timestamp: Date.now()
        });
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
      for (let i = 0; i < dataArray.length; i++) {
        rms += dataArray[i] * dataArray[i];
      }
      rms = Math.sqrt(rms / dataArray.length);

      if (this.isCallActive) {
        requestAnimationFrame(analyzeAudio);
      }
    };

    analyzeAudio();
  }

  private reconnectWebSocket() {
    if (this.isCallActive && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);
    }
  }

  async cleanup() {
    if (this.cleanupInitiated) return;
    this.cleanupInitiated = true;
    this.isCallActive = false;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close(1000, "Call ended normally");
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (this.analyzer) this.analyzer.disconnect();
      if (this.source) this.source.disconnect();
      if (this.audioProcessor) this.audioProcessor.disconnect();
      if (this.audioContext) {
        await this.audioContext.close();
      }
    } catch (error) {
      console.error("❌ Error during audio cleanup:", error);
    }
  }
}