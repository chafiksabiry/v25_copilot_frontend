export class MicrophoneService {
  private outboundWs: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private rawAudioBuffer: Float32Array[] = [];
  private recordingStartTime: number = 0;
  private recordingInterval: number | null = null;
  private recorderScriptNode: ScriptProcessorNode | null = null;
  private recorderWorkletNode: AudioWorkletNode | null = null; // Nouveau worklet pour enregistrement
  private recordingCounter: number = 0;
  private isRecording: boolean = false;
  private hasStartedCapture: boolean = false; // Flag pour éviter la double capture

  constructor(outboundWs: WebSocket) {
    this.outboundWs = outboundWs;
  }

  // Static method to test microphone permissions before starting capture
  static async testMicrophonePermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing microphone permissions...');
      
      // Check if we're in a secure context
      if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        return {
          success: false,
          error: 'Microphone access requires HTTPS or localhost. Please use HTTPS or test on localhost.'
        };
      }

      // Check permissions API
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎤 Permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'denied') {
          return {
            success: false,
            error: 'Microphone permission denied. Please allow microphone access in your browser settings.'
          };
        }
      }

      // Test actual microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Microphone permissions test passed');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Microphone permissions test failed:', error);
      
      let errorMessage = 'Unknown microphone error';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please click "Allow" when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints cannot be satisfied.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async startCapture() {
    // Empêcher la double capture
    if (this.hasStartedCapture) {
      console.warn('⚠️ Capture déjà démarrée, ignoré');
      return;
    }
    
    try {
      this.hasStartedCapture = true;
      
      // 1) Ensure outbound WebSocket provided and open
      if (!this.outboundWs) throw new Error('Outbound WebSocket instance not provided');
      if (this.outboundWs.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => { this.outboundWs?.removeEventListener('open', onOpen as any); resolve(); };
          const onError = () => { this.outboundWs?.removeEventListener('error', onError as any); reject(new Error('Outbound WebSocket error')); };
          this.outboundWs?.addEventListener('open', onOpen as any);
          this.outboundWs?.addEventListener('error', onError as any);
        });
      }

      // 2) Check microphone permissions first
      console.log('🎤 Checking microphone permissions...');
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('🎤 Microphone permission status:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      }

      // 3) Capture microphone with optimized audio constraints for call quality
      console.log('🎤 Requesting microphone access...');
      try {
        // Configuration optimale pour réduire les bruits automatiquement
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            // Traitement audio natif du navigateur (priorité haute)
            echoCancellation: true,        // Annulation d'écho pour éviter le feedback
            noiseSuppression: true,        // Suppression de bruit de fond
            autoGainControl: true,         // Contrôle automatique du gain (évite saturation)
            
            // Paramètres avancés pour meilleure qualité
            sampleRate: 48000,            // Taux d'échantillonnage haute qualité
            channelCount: 1,              // Mono (suffisant pour la voix)
            latency: 0.01,                // Latence minimale (10ms)
            
            // Contraintes pour forcer l'activation des fonctionnalités
            googEchoCancellation: true,   // Google-specific (Chrome)
            googNoiseSuppression: true,   // Google-specific (Chrome)
            googAutoGainControl: true,    // Google-specific (Chrome)
            googHighpassFilter: true,     // Filtre passe-haut pour réduire basses fréquences
            googTypingNoiseDetection: true, // Détection bruit de frappe clavier
            
            // Paramètres de qualité
            volume: 1.0,                  // Volume maximum (le navigateur ajustera automatiquement)
            suppressLocalAudioPlayback: false // Permettre la lecture locale si nécessaire
          } 
        });
        console.log('✅ Microphone access granted with optimized audio settings');
        
        // Vérifier les contraintes appliquées (pour debug)
        const audioTracks = this.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const settings = audioTracks[0].getSettings();
          console.log('🎤 Applied audio settings:', {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount
          });
        }
      } catch (mediaError: any) {
        console.error('❌ Microphone access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please click "Allow" when prompted or check your browser settings.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Microphone is being used by another application. Please close other applications and try again.');
        } else {
          throw new Error(`Microphone error: ${mediaError.message}`);
        }
      }

      // 4) Create AudioContext with optimized settings for call quality
      // Utiliser la latence minimale pour réduire la latence totale
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 48000,  // Haute qualité
        latencyHint: 'interactive' // Latence minimale pour appels en temps réel
      });
      
      // S'assurer que l'AudioContext est actif
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 AudioContext resumed');
      }
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Créer un filtre passe-bas supplémentaire pour réduire les bruits haute fréquence
      // (le navigateur fait déjà du noise suppression, mais on peut améliorer)
      const lowpassFilter = this.audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 3400; // Limite haute pour voix téléphonique (réduit bruits > 3.4kHz)
      lowpassFilter.Q.value = 1; // Qualité du filtre (modérée pour éviter artefacts)

      // 5) Create script processor for raw audio recording (before worklet)
      const bufferSize = 4096;
      this.recorderScriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      // Flag to track if we're recording (utiliser une référence partagée)
      this.isRecording = true;
      
      this.recorderScriptNode.onaudioprocess = (e) => {
        if (!this.isRecording || !this.audioContext) return; // Vérifier que audioContext existe et qu'on enregistre encore
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Make a copy of the audio data
        this.rawAudioBuffer.push(new Float32Array(inputData));
        
        // Log moins fréquemment pour réduire le bruit dans la console
        if (this.rawAudioBuffer.length % 10 === 0) {
          console.log(`🎙️ Recording chunk ${this.rawAudioBuffer.length}: ${inputData.length} samples`);
        }
        
        // Check if we have 3 seconds of audio (assuming 48000 Hz sample rate)
        const samplesFor3Seconds = this.audioContext.sampleRate * 3;
        const totalSamples = this.rawAudioBuffer.length * bufferSize;
        
        if (this.rawAudioBuffer.length % 10 === 0) {
          console.log(`📊 Buffer: ${totalSamples} / ${samplesFor3Seconds} samples`);
        }
        
        if (totalSamples >= samplesFor3Seconds) {
          console.log(`✨ Triggering 3-second save with ${this.rawAudioBuffer.length} chunks`);
          this.saveAudioAsMP3();
        }
      };
      
      // 6) Load and create worklet for RTP encoding FIRST (before connecting)
      const workletUrl = new URL('../worklets/mic-processor.worklet.js', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      this.node = new AudioWorkletNode(this.audioContext, 'mic-processor', { numberOfInputs: 1, numberOfOutputs: 0 });
      
      // 7) Connect audio chain with noise reduction filter:
      //    OPTIMIZED: source → lowpassFilter → worklet (encodes RTP with noise reduction)
      //    PARALLEL: source → recorder → analyser (records audio without feedback)
      
      // Créer un AnalyserNode qui ne produit pas de sortie audio mais maintient le ScriptProcessorNode actif
      // L'AnalyserNode permet au ScriptProcessorNode de fonctionner sans créer de feedback
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      // Chaîne principale avec filtre passe-bas pour réduire les bruits haute fréquence
      source.connect(lowpassFilter);
      lowpassFilter.connect(this.node);
      
      // Chaîne parallèle pour l'enregistrement (sans filtre pour garder la qualité originale)
      source.connect(this.recorderScriptNode);
      // Connecter à un AnalyserNode au lieu de la destination pour éviter le feedback
      this.recorderScriptNode.connect(analyser);
      // L'AnalyserNode n'a pas besoin d'être connecté à la destination
      
      // Store recording start time
      this.recordingStartTime = Date.now();

      // 4) Receive RTP packets from worklet and send over WS (RTP PCMU with headers)
      // SYSTÈME DE BACKPRESSURE : Limiter le nombre de paquets en attente
      let chunkCount = 0;
      let pendingPackets = 0; // Compteur de paquets en attente d'envoi
      const MAX_PENDING_PACKETS = 10; // Maximum de paquets en attente
      
      this.node.port.onmessage = (ev: MessageEvent) => {
        // Arrêter si on n'enregistre plus
        if (!this.isRecording) return;
        
        const rtpPacket: Uint8Array = ev.data;
        if (!rtpPacket || !(rtpPacket instanceof Uint8Array)) return;
        
        chunkCount++;
        
        // BACKPRESSURE : Si trop de paquets en attente, drop ce paquet
        if (pendingPackets >= MAX_PENDING_PACKETS) {
          if (chunkCount % 100 === 0) {
            console.warn(`⚠️ Backpressure: dropping RTP packet #${chunkCount} (${pendingPackets} packets pending)`);
          }
          return; // Drop ce paquet pour éviter la saturation
        }
        
        // Log moins fréquemment pour réduire le bruit
        if (chunkCount === 1 || chunkCount % 100 === 0) {
          console.log(`📦 RTP packet #${chunkCount}: ${rtpPacket.length} bytes`);
        }
        
        // Vérifier que le WebSocket est ouvert avant d'envoyer
        if (!this.outboundWs || this.outboundWs.readyState !== WebSocket.OPEN) {
          if (chunkCount === 1) {
            console.warn(`⚠️ Outbound WebSocket not ready, stopping RTP packet sending. State: ${this.outboundWs?.readyState}`);
          }
          return;
        }
        
        // Encode RTP packet to base64
        const base64 = this.uint8ToBase64(rtpPacket);
        
        try {
          // Incrémenter le compteur de paquets en attente
          pendingPackets++;
          
          this.outboundWs.send(JSON.stringify({ event: 'media', media: { payload: base64 } }));
          
          // Décrémenter après l'envoi (simuler l'acknowledgment)
          // En réalité, on ne peut pas savoir quand le paquet est vraiment envoyé,
          // donc on décrémente après un court délai
          setTimeout(() => {
            pendingPackets = Math.max(0, pendingPackets - 1);
          }, 20); // 20ms = temps approximatif d'envoi d'un paquet
          
          // Log moins fréquemment
          if (chunkCount === 1 || chunkCount % 100 === 0) {
            console.log(`✅ Sent RTP packet #${chunkCount} via outbound WebSocket`);
          }
        } catch (error) {
          pendingPackets = Math.max(0, pendingPackets - 1);
          console.error(`❌ Error sending RTP packet #${chunkCount}:`, error);
        }
      };

      console.log('🎧 Microphone capture started');
    } catch (err) {
      console.error('❌ Error starting microphone stream:', err);
      await this.stopCapture();
      throw err;
    }
  }

  private saveAudioAsMP3() {
    if (this.rawAudioBuffer.length === 0) return;

    try {
      console.log(`💾 Preparing to save audio file (3 seconds, ${this.rawAudioBuffer.length} chunks)`);
      
      // Flatten the buffer to a single Float32Array
      const totalSamples = this.rawAudioBuffer.reduce((sum, arr) => sum + arr.length, 0);
      const audioData = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.rawAudioBuffer) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to WAV and download
      const wavBlob = this.float32ToWav(audioData, this.audioContext!.sampleRate);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toTimeString().replace(/[:.]/g, '-').split(' ')[0];
      const filename = `outbound-call-${timestamp}-${time}-part${this.recordingCounter}.wav`;
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Saved audio file: ${filename} (${audioData.length} samples, ${this.audioContext!.sampleRate}Hz)`);

      // Clear buffer for next 3 seconds and increment counter
      this.rawAudioBuffer = [];
      this.recordingCounter++;
    } catch (error) {
      console.error('❌ Error saving audio file:', error);
    }
  }

  private float32ToWav(pcmData: Float32Array, sampleRate: number): Blob {
    // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    // WAV header helper function
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Write WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true); // File size - 8
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, length * 2, true); // Subchunk2Size

    // Write PCM data with Float32 to Int16 conversion
    for (let i = 0; i < length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      const sample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(44 + i * 2, sample, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async stopCapture() {
    console.log('⏹️ Stopping microphone stream');
    this.hasStartedCapture = false; // Réinitialiser le flag
    // Arrêter l'enregistrement d'abord pour éviter les callbacks après le cleanup
    this.isRecording = false;
    
    // Save any remaining audio buffer before stopping
    if (this.rawAudioBuffer.length > 0) {
      console.log('💾 Saving final audio buffer...');
      this.saveAudioAsMP3();
    }
    
    // Clear interval if set
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    // Arrêter le worklet d'abord pour éviter l'envoi de paquets après la fermeture
    if (this.node) {
      try {
        this.node.port.onmessage = null; // Arrêter les callbacks
        this.node.disconnect();
      } catch (_) {}
    }
    
    // Arrêter le recorderScriptNode
    if (this.recorderScriptNode) {
      try {
        this.recorderScriptNode.onaudioprocess = null; // Arrêter les callbacks
        this.recorderScriptNode.disconnect();
      } catch (_) {}
    }
    
    // Arrêter le stream
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    
    // Fermer l'audioContext en dernier
    try { await this.audioContext?.close(); } catch (_) {}
    // We do NOT close the outbound WebSocket here; it's managed by the caller

    this.node = null;
    this.recorderScriptNode = null;
    this.stream = null;
    this.audioContext = null;
    this.rawAudioBuffer = [];
    this.recordingCounter = 0;
    // keep outboundWs reference (still owned by caller)
  }

  // Uint8Array -> base64
  private uint8ToBase64(u8: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      const chunk = u8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }
}
