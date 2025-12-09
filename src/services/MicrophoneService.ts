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
        // IMPORTANT: Essayer de forcer la capture à 8kHz pour correspondre au codec PCMA/PCMU
        // Cela réduit les artefacts de resampling et les bruits
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            // Traitement audio natif du navigateur (priorité haute)
            echoCancellation: true,        // Annulation d'écho pour éviter le feedback
            noiseSuppression: true,        // Suppression de bruit de fond
            autoGainControl: true,         // Contrôle automatique du gain (évite saturation)
            
            // Paramètres avancés pour meilleure qualité
            // Essayer 8kHz d'abord pour correspondre au codec PCMA/PCMU
            sampleRate: 8000,             // Taux d'échantillonnage correspondant au codec (8kHz)
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
          const actualSampleRate = settings.sampleRate || 48000; // Fallback si non disponible
          const requestedSampleRate = 8000;
          
          console.log('🎤 Applied audio settings:', {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
            sampleRate: actualSampleRate,
            channelCount: settings.channelCount
          });
          
          // Avertir si le sample rate réel ne correspond pas à la demande
          if (actualSampleRate && Math.abs(actualSampleRate - requestedSampleRate) > 100) {
            console.warn(`⚠️ Microphone sample rate is ${actualSampleRate}Hz instead of ${requestedSampleRate}Hz`);
            console.warn('💡 Le navigateur a ignoré la contrainte sampleRate. Le resampling sera effectué dans le worklet.');
          } else if (actualSampleRate) {
            console.log(`✅ Microphone sample rate matches codec: ${actualSampleRate}Hz`);
          }
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
      // IMPORTANT: Forcer le sampleRate à 8000Hz ou 48000Hz pour éviter les ratios non entiers
      // qui causent une dérive d'horloge RTP. Le worklet fera le resampling optimisé avec un filtre FIR anti-aliasing.
      const audioTracks = this.stream.getAudioTracks();
      const microphoneSampleRate = audioTracks[0]?.getSettings()?.sampleRate || 48000;
      
      // Ordre de priorité pour le sampleRate :
      // 1. 8000Hz (idéal, pas de resampling nécessaire)
      // 2. 48000Hz (ratio entier 6:1, resampling optimal)
      // 3. SampleRate du micro (si 8kHz ou 48kHz ne sont pas supportés)
      const preferredRates = [8000, 48000];
      let selectedRate: number | null = null;
      
      // Vérifier si le micro est déjà à 8kHz ou 48kHz
      if (Math.abs(microphoneSampleRate - 8000) < 100) {
        selectedRate = 8000;
      } else if (Math.abs(microphoneSampleRate - 48000) < 100) {
        selectedRate = 48000;
      } else {
        // Essayer les taux préférés dans l'ordre
        for (const rate of preferredRates) {
          try {
            const testContext = new (window.AudioContext || (window as any).webkitAudioContext)({
              sampleRate: rate,
              latencyHint: 'interactive'
            });
            const actualRate = testContext.sampleRate;
            testContext.close();
            
            if (Math.abs(actualRate - rate) < 100) {
              selectedRate = rate;
              break;
            }
          } catch (e) {
            // Continuer avec le taux suivant
            continue;
          }
        }
      }
      
      try {
        // Créer l'AudioContext avec le taux sélectionné ou le taux du micro
        const targetRate = selectedRate || microphoneSampleRate;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: targetRate,
          latencyHint: 'interactive' // Latence minimale pour appels en temps réel
        });
        
        const actualSampleRate = this.audioContext.sampleRate;
        const ratio = actualSampleRate / 8000;
        const isIntegerRatio = Math.abs(ratio - Math.round(ratio)) < 0.001;
        
        console.log(`🔊 AudioContext créé à ${actualSampleRate}Hz (micro: ${microphoneSampleRate}Hz)`);
        
        if (actualSampleRate === 8000) {
          console.log(`✅ AudioContext à 8kHz - Pas de resampling nécessaire (ratio: 1)`);
        } else if (isIntegerRatio) {
          console.log(`✅ AudioContext à ${actualSampleRate}Hz - Ratio entier (${ratio.toFixed(0)}:1) pour resampling optimal`);
        } else {
          console.warn(`⚠️ AudioContext à ${actualSampleRate}Hz - Ratio non entier (${ratio.toFixed(4)}:1)`);
          console.warn(`💡 Le worklet utilisera le resampling fractionnaire pour éviter la dérive d'horloge RTP`);
          console.warn(`💡 Recommandation: Le navigateur devrait supporter 8kHz ou 48kHz pour un ratio entier`);
        }
        
        if (Math.abs(actualSampleRate - microphoneSampleRate) > 100) {
          console.log(`💡 Le navigateur fera un resampling automatique du micro (${microphoneSampleRate}Hz → ${actualSampleRate}Hz)`);
          console.log(`💡 Le worklet effectuera ensuite le resampling optimisé vers 8kHz avec filtre FIR anti-aliasing`);
        }
      } catch (error) {
        // Fallback : créer avec le sample rate par défaut du navigateur
        console.warn('⚠️ Impossible de créer AudioContext avec taux préféré, utilisation du sample rate par défaut:', error);
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive'
        });
        const actualRate = this.audioContext.sampleRate;
        const ratio = actualRate / 8000;
        const isIntegerRatio = Math.abs(ratio - Math.round(ratio)) < 0.001;
        
        console.log(`🔊 AudioContext créé à ${actualRate}Hz (sample rate par défaut)`);
        if (isIntegerRatio) {
          console.log(`✅ Ratio entier (${ratio.toFixed(0)}:1) pour resampling optimal`);
        } else {
          console.warn(`⚠️ Ratio non entier (${ratio.toFixed(4)}:1) - Le worklet utilisera le resampling fractionnaire`);
        }
      }
      
      // S'assurer que l'AudioContext est actif
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 AudioContext resumed');
      }
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Créer un filtre passe-bas supplémentaire pour réduire les bruits haute fréquence
      // (le navigateur fait déjà du noise suppression, mais on peut améliorer)
      // IMPORTANT: Ce filtre est complémentaire au filtre FIR dans le worklet
      // Le filtre Biquad ici pré-filtre avant le worklet pour réduire la charge de traitement
      const lowpassFilter = this.audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 3500; // Limite à 3.5kHz (sous Nyquist 4kHz pour 8kHz)
      lowpassFilter.Q.value = 0.707; // Q optimal (Butterworth) pour transition douce sans résonance

      // 5) Create script processor for raw audio recording (before worklet)
      const bufferSize = 4096;
      this.recorderScriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      // Flag to track if we're recording (utiliser une référence partagée)
      this.isRecording = true;
      
      this.recorderScriptNode.onaudioprocess = (e) => {
        if (!this.isRecording || !this.audioContext) return; // Vérifier que audioContext existe et qu'on enregistre encore
        
        // NOTE: La sauvegarde automatique des fichiers audio a été désactivée
        // pour éviter les interruptions et bruits dans le flux audio en temps réel.
        // Le ScriptProcessorNode reste actif uniquement pour maintenir le flux audio.
        
        // Ne plus accumuler les données dans rawAudioBuffer pour économiser la mémoire
        // et éviter les interruptions de traitement
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
      
      // Nettoyer le buffer audio pour éviter les données résiduelles
      // (la sauvegarde automatique est désactivée)
      this.rawAudioBuffer = [];
      this.recordingCounter = 0;

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
    
    // NOTE: La sauvegarde automatique des fichiers audio a été désactivée
    // pour éviter les interruptions et bruits dans le flux audio en temps réel.
    
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
