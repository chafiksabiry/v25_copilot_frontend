import React, { useEffect, useRef, useState } from 'react';

interface MicrophoneStreamProps {
  streamUrl: string;
  isActive: boolean;
  onError?: (error: Error) => void;
}

export function MicrophoneStream({ streamUrl, isActive, onError }: MicrophoneStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Fonction de conversion PCM float32 vers µ-law
  const linearToMuLaw = (sample: number): number => {
    const MU = 255;
    const sign = (sample < 0) ? -1 : 1;
    sample = Math.min(1, Math.max(-1, sample));
    const magnitude = Math.log1p(MU * Math.abs(sample)) / Math.log1p(MU);
    return ((sign < 0 ? 0x80 : 0) | (magnitude * 127 & 0x7F));
  };

  // Convertir un Float32Array en PCMU
  const float32ToPCMU = (float32Array: Float32Array): Uint8Array => {
    const pcmu = new Uint8Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      pcmu[i] = linearToMuLaw(float32Array[i]);
    }
    return pcmu;
  };

  // Initialiser le WebSocket
  const initWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(streamUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🎤 WebSocket connection opened for microphone stream:', {
        url: streamUrl,
        readyState: ws.readyState,
        protocol: ws.protocol
      });
      
      // Envoyer un message de test pour vérifier la connexion
      ws.send(JSON.stringify({
        event: 'test',
        message: 'Microphone WebSocket test'
      }));
      
      setIsConnected(true);
    };

    ws.onclose = (event) => {
      console.log('🎤 WebSocket connection closed for microphone stream:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('🎤 WebSocket error:', error);
      onError?.(new Error('WebSocket connection error'));
      setIsConnected(false);
    };

    // Ajouter un handler pour les messages reçus
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🎤 Received WebSocket message:', data);
      } catch (error) {
        console.log('🎤 Received non-JSON WebSocket message:', event.data);
      }
    };
  };

  // Initialiser le flux audio
  const initAudioStream = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      
      // Vérifier si le navigateur supporte getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Demander l'accès au micro avec des contraintes spécifiques
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      });
      
      console.log('✅ Microphone access granted');
      streamRef.current = stream;

      // Vérifier si le micro est actif
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Microphone status:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState
      });

      // Créer AudioContext à 8kHz pour Telnyx
      const audioContext = new AudioContext({ sampleRate: 8000 });
      console.log('🎵 AudioContext created:', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      });
      audioContextRef.current = audioContext;

      // Créer la source audio
      const source = audioContext.createMediaStreamSource(stream);

      // Créer le processeur audio avec une taille de buffer fixe
      const BUFFER_SIZE = 1024;
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      // Connecter les nœuds audio
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Configurer le traitement audio
      let sequence = 0;
      const SEND_INTERVAL = 20; // ms entre chaque envoi
      let lastSendTime = 0;

      processor.onaudioprocess = (event) => {
        if (!isActive) {
          return;
        }
        
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const now = Date.now();
        if (now - lastSendTime < SEND_INTERVAL) {
          return;
        }
        lastSendTime = now;

        try {
          // Récupérer les données audio en Float32
          const inputBuffer = event.inputBuffer.getChannelData(0);
          
          // Vérifier le niveau sonore
          let maxAmplitude = 0;
          for (let i = 0; i < inputBuffer.length; i++) {
            const abs = Math.abs(inputBuffer[i]);
            if (abs > maxAmplitude) maxAmplitude = abs;
          }
          
          // Ne pas envoyer le silence
          if (maxAmplitude < 0.01) {
            return;
          }

          // Envoyer directement le Float32Array
          const audioMessage = {
            event: 'media',
            sequence_number: sequence++,
            stream_id: streamRef.current?.id || 'default',
            media: {
              format: 'float32',
              sampleRate: 8000,
              channels: 1,
              timestamp: now,
              size: inputBuffer.length,
              payload: Array.from(inputBuffer) // Convertir en array pour JSON
            }
          };

          // Log une fois par seconde
          if (now % 1000 < SEND_INTERVAL) {
            console.log('🎤 Sending audio:', {
              sequence: sequence,
              maxAmplitude,
              bufferSize: inputBuffer.length,
              sampleRate: audioContext.sampleRate
            });
          }

          // Envoyer au WebSocket
          wsRef.current.send(JSON.stringify(audioMessage));
        } catch (error) {
          console.error('🎤 Error processing audio:', error);
        }
      };

    } catch (error) {
      console.error('🎤 Error initializing audio stream:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to initialize audio stream'));
    }
  };

  // Nettoyer les ressources audio
  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Effet pour gérer le cycle de vie du composant
  useEffect(() => {
    const setupMicrophone = async () => {
      try {
        if (!isActive) {
          console.log('🎤 Microphone setup skipped - call not active');
          return;
        }

        if (!streamUrl) {
          console.log('🎤 Microphone setup skipped - no stream URL');
          return;
        }

        console.log('🎤 Setting up microphone for active call...');
        
        // 1. Demander l'accès au micro d'abord
        await initAudioStream();
        
        // 2. Si le micro est OK, initialiser le WebSocket
        if (streamRef.current) {
          initWebSocket();
        }
      } catch (error) {
        console.error('🎤 Failed to setup microphone:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to setup microphone'));
      }
    };

    setupMicrophone();
    return cleanup;
  }, [isActive, streamUrl]);

  // Ajouter un indicateur visuel pour le debug
  return (
    <div className="fixed bottom-20 right-4 bg-slate-800 p-3 rounded-lg shadow-lg z-50 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${streamRef.current ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Microphone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsRef.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Stream</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${processorRef.current ? 'animate-pulse bg-blue-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Processing</span>
        </div>
      </div>
    </div>
  );
}