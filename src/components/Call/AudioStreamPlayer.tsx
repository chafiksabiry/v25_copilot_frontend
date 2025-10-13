import React,{ useEffect, useRef } from 'react';

interface AudioStreamPlayerProps {
  streamUrl: string;
  callId: string;
  onError?: (error: Error) => void;
}

export default function AudioStreamPlayer({ streamUrl, callId, onError }: AudioStreamPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Table de conversion µ-law vers PCM linéaire
  const muLawTable = new Float32Array(256);
  (() => {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    for (let i = 0; i < 256; i++) {
      let muLawValue = ~i;
      const sign = (muLawValue & 0x80) ? -1 : 1;
      let exponent = (muLawValue >> 4) & 0x07;
      let mantissa = muLawValue & 0x0F;
      mantissa = (mantissa << 3) + BIAS;
      let sample = mantissa << exponent;
      
      sample = sign * (sample - BIAS);
      sample = Math.max(-CLIP, Math.min(CLIP, sample));
      muLawTable[i] = sample / 32768.0;
    }
  })();

  // Convertir PCMU (µ-law) en PCM linéaire avec table de conversion
  const muLawToLinear = (muLawValue: number): number => {
    return muLawTable[muLawValue];
  };

  // Convertir un buffer PCMU en Float32Array
  const pcmuToFloat32 = (pcmuData: Uint8Array): Float32Array => {
    const float32Data = new Float32Array(pcmuData.length);
    for (let i = 0; i < pcmuData.length; i++) {
      float32Data[i] = muLawToLinear(pcmuData[i]);
    }
    return float32Data;
  };

  // Initialiser le contexte audio
  const initAudioContext = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 8000 });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        console.log('🎵 Audio context initialized at 8kHz');
      }
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      onError?.(new Error('Failed to initialize audio system'));
    }
  };

  // Jouer un buffer audio
  const playAudioBuffer = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current || !gainNodeRef.current) {
      console.error('❌ Audio context not initialized');
      return;
    }

    try {
      // Convertir le buffer PCMU en Float32Array
      const pcmuData = new Uint8Array(audioData);
      const float32Data = pcmuToFloat32(pcmuData);

      // Appliquer un filtre passe-bas simple pour réduire le bruit
      const filteredData = new Float32Array(float32Data.length);
      const alpha = 0.2; // Facteur de lissage
      filteredData[0] = float32Data[0];
      for (let i = 1; i < float32Data.length; i++) {
        filteredData[i] = alpha * float32Data[i] + (1 - alpha) * filteredData[i - 1];
      }

      // Créer un AudioBuffer avec les bonnes spécifications
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        filteredData.length,
        8000 // sample rate fixe pour PCMU
      );

      // Copier les données audio filtrées
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(filteredData);

      // Créer et configurer la source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Ajouter un filtre passe-bas supplémentaire
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000; // Couper les hautes fréquences > 3kHz
      filter.Q.value = 0.7; // Résonance modérée

      // Connecter la chaîne audio : source -> filter -> gain -> destination
      source.connect(filter);
      filter.connect(gainNodeRef.current);
      
      // Ajuster le gain pour éviter la saturation
      gainNodeRef.current.gain.value = 0.8;
      
      // Démarrer la lecture
      source.start();
      console.log('🔊 Playing filtered audio chunk:', filteredData.length, 'samples');
    } catch (error) {
      console.error('❌ Error playing audio buffer:', error);
    }
  };

  useEffect(() => {
    console.log('🎧 Setting up audio stream player for URL:', streamUrl);
    
    // Initialiser le contexte audio
    initAudioContext();

    // Configurer le WebSocket
    const ws = new WebSocket(streamUrl);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('✅ Audio WebSocket connected');
    };

    ws.onmessage = async (event) => {
      try {
        // Traiter les messages JSON
        const message = JSON.parse(typeof event.data === 'string' ? event.data : '{}');
        
        if (message.event === 'media' && message.media?.payload) {
          console.log('📝 Audio metadata:', {
            format: message.media.format,
            sampleRate: message.media.sampleRate,
            channels: message.media.channels,
            size: message.media.size,
            chunk: message.media.chunk,
            track: message.media.track
          });

          // Décoder le payload base64 en Uint8Array
          const binaryString = atob(message.media.payload);
          const pcmuData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            pcmuData[i] = binaryString.charCodeAt(i);
          }

          // Jouer l'audio
          await playAudioBuffer(pcmuData.buffer);
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
        console.error('Message type:', typeof event.data);
        if (typeof event.data === 'string') {
          console.error('Message preview:', event.data.substring(0, 100));
        }
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      onError?.(new Error('Audio stream connection error'));
    };

    ws.onclose = () => {
      console.log('🔌 Audio WebSocket closed');
    };

    // Nettoyage
    return () => {
      console.log('🧹 Cleaning up audio stream player...');
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
        audioContextRef.current = null;
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    };
  }, [streamUrl, callId]);

  // Ajouter un indicateur visuel pour le debug
  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 p-3 rounded-lg shadow-lg z-50 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${audioContextRef.current ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Audio System</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsRef.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Stream</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${gainNodeRef.current ? 'animate-pulse bg-blue-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">Audio Output</span>
        </div>
      </div>
    </div>
  );
}