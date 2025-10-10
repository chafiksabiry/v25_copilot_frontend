import React, { useEffect, useRef, useState } from 'react';

interface AudioStreamPlayerProps {
  streamUrl: string;
  callId?: string;
  onError?: (error: Error) => void;
}

const AudioStreamPlayer: React.FC<AudioStreamPlayerProps> = ({ 
  streamUrl, 
  callId,
  onError 
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Initialiser le contexte audio
    audioContextRef.current = new AudioContext();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!streamUrl) return;

    const connectWebSocket = () => {
      console.log('🎧 Connecting to audio stream:', streamUrl);
      wsRef.current = new WebSocket(streamUrl);

      wsRef.current.onopen = () => {
        console.log('🎧 WebSocket connected');
        setIsPlaying(true);
      };

      wsRef.current.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            // Données audio binaires
            const arrayBuffer = await event.data.arrayBuffer();
            playAudioBuffer(arrayBuffer);
          } else {
            // Messages de contrôle JSON
            const message = JSON.parse(event.data);
            handleControlMessage(message);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          onError?.(error as Error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error('WebSocket connection error'));
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsPlaying(false);
        // Tentative de reconnexion après 2 secondes
        setTimeout(connectWebSocket, 2000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [streamUrl]);

  const handleControlMessage = (message: any) => {
    switch (message.event) {
      case 'connected':
        console.log('Connected to audio stream');
        break;

      case 'start':
        console.log('Stream starting:', message.stream_id);
        break;

      case 'stop':
        console.log('Stream stopped:', message.stream_id);
        setIsPlaying(false);
        break;

      case 'error':
        console.error('Stream error:', message.payload);
        onError?.(new Error(message.payload.detail || 'Stream error'));
        break;

      default:
        if (message.event === 'media') {
          console.log('Media metadata received:', {
            sequence: message.sequence_number,
            timestamp: message.media.timestamp
          });
        }
    }
  };

  // Table de conversion µ-law vers PCM linéaire
  const MULAW_DECODE_TABLE = new Int16Array([
    -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
    -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
    -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
    -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
    -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
    -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
    -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
    -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
    -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
    -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
    -876, -844, -812, -780, -748, -716, -684, -652,
    -620, -588, -556, -524, -492, -460, -428, -396,
    -372, -356, -340, -324, -308, -292, -276, -260,
    -244, -228, -212, -196, -180, -164, -148, -132,
    -120, -112, -104, -96, -88, -80, -72, -64,
    -56, -48, -40, -32, -24, -16, -8, 0,
    32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
    23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
    15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
    11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
    7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
    5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
    3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
    2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
    1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
    1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
    876, 844, 812, 780, 748, 716, 684, 652,
    620, 588, 556, 524, 492, 460, 428, 396,
    372, 356, 340, 324, 308, 292, 276, 260,
    244, 228, 212, 196, 180, 164, 148, 132,
    120, 112, 104, 96, 88, 80, 72, 64,
    56, 48, 40, 32, 24, 16, 8, 0
  ]);

  const playAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    try {
      // Convertir le buffer µ-law en PCM linéaire
      const mulawData = new Uint8Array(arrayBuffer);
      const pcmData = new Int16Array(mulawData.length);
      
      // Décoder µ-law vers PCM linéaire
      for (let i = 0; i < mulawData.length; i++) {
        pcmData[i] = MULAW_DECODE_TABLE[mulawData[i]];
      }
      
      // Convertir PCM linéaire en Float32 (-1.0 à 1.0)
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }
      
      // Créer un buffer audio avec les bonnes spécifications
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        float32Data.length,
        8000 // fréquence d'échantillonnage pour Telnyx voice
      );
      
      // Copier les données dans le buffer
      audioBuffer.copyToChannel(float32Data, 0);
      
      // Créer et configurer le source node
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;
      
      // Connecter au gain node pour le contrôle du volume
      sourceNode.connect(gainNodeRef.current);
      
      // Démarrer la lecture
      sourceNode.start(0);
      
      // Nettoyer l'ancien sourceNode si nécessaire
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      
      sourceNodeRef.current = sourceNode;
    } catch (error) {
      console.error('Error playing audio:', error);
      onError?.(new Error('Failed to play audio'));
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
      setVolume(newVolume);
    }
  };

  return (
    <div className="bg-[#1b253a] rounded-lg p-4 mt-2">
      <div className="text-slate-300 mb-2">
        Status: <span className={isPlaying ? 'text-green-400' : 'text-red-400'}>
          {isPlaying ? 'Playing' : 'Stopped'}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-slate-300 min-w-[3rem]">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};

export default AudioStreamPlayer;
