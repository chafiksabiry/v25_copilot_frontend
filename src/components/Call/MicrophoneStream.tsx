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
      console.log('🎤 WebSocket connection opened for microphone stream');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('🎤 WebSocket connection closed for microphone stream');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('🎤 WebSocket error:', error);
      onError?.(new Error('WebSocket connection error'));
      setIsConnected(false);
    };
  };

  // Initialiser le flux audio
  const initAudioStream = async () => {
    try {
      // Demander l'accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Créer AudioContext à 8kHz pour Telnyx
      const audioContext = new AudioContext({ sampleRate: 8000 });
      audioContextRef.current = audioContext;

      // Créer la source audio
      const source = audioContext.createMediaStreamSource(stream);

      // Créer le processeur audio
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      // Connecter les nœuds audio
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Configurer le traitement audio
      processor.onaudioprocess = (event) => {
        if (!isActive) {
          console.log('🎤 Microphone processing skipped - not active');
          return;
        }
        
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('🎤 Microphone processing skipped - WebSocket not ready');
          return;
        }

        // Récupérer les données audio en Float32
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Vérifier si l'audio n'est pas silencieux
        const isAudible = inputBuffer.some(sample => Math.abs(sample) > 0.01);
        
        if (!isAudible) {
          console.log('🎤 Microphone input too quiet');
          return;
        }

        // Convertir en PCMU
        const pcmuData = float32ToPCMU(inputBuffer);
        console.log('🎤 Processing audio:', {
          inputSize: inputBuffer.length,
          outputSize: pcmuData.length,
          maxAmplitude: Math.max(...Array.from(inputBuffer).map(Math.abs))
        });

        // Convertir en base64
        const base64Payload = btoa(String.fromCharCode(...pcmuData));

        // Envoyer au WebSocket
        wsRef.current.send(JSON.stringify({
          event: 'media',
          media: { payload: base64Payload }
        }));
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
    if (isActive && streamUrl) {
      initWebSocket();
      initAudioStream();
    }

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