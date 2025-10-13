import React, { useEffect, useRef } from 'react';

interface MicrophoneStreamProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  isActive: boolean;
}

const MicrophoneStream: React.FC<MicrophoneStreamProps> = ({ wsRef, isActive }) => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (isActive) {
      startMicrophone();
    } else {
      stopMicrophone();
    }

    return () => {
      stopMicrophone();
    };
  }, [isActive]);

  const startMicrophone = async () => {
    try {
      // 1. Obtenir l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          channelCount: 1 // Mono
        }
      });
      mediaStreamRef.current = stream;

      // 2. Configurer le contexte audio
      const audioContext = new AudioContext({ sampleRate: 8000 }); // Même fréquence que Telnyx
      audioContextRef.current = audioContext;

      // 3. Créer le nœud source depuis le microphone
      const input = audioContext.createMediaStreamSource(stream);
      inputRef.current = input;

      // 4. Créer le processeur pour traiter l'audio
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      // 5. Connecter les nœuds
      input.connect(processor);
      processor.connect(audioContext.destination);

      // 6. Traiter et envoyer l'audio
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convertir Float32 en Int16 (PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        // Convertir PCM en µ-law
        const mulawData = new Uint8Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          mulawData[i] = linearToMulaw(pcmData[i]);
        }

        // Encoder en base64 et envoyer
        const base64Data = btoa(String.fromCharCode.apply(null, Array.from(mulawData)));
        wsRef.current.send(JSON.stringify({
          event: 'media',
          media: {
            payload: base64Data
          }
        }));
      };

    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputRef.current) {
      inputRef.current.disconnect();
      inputRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Conversion de PCM linéaire en µ-law
  const linearToMulaw = (sample: number): number => {
    const BIAS = 0x84;
    const CLIP = 32635;
    const exp_lut = [
      0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
      4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
      5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
      5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
      6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
      6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
      6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
      6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
      7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
    ];

    let sign = (sample >> 8) & 0x80;
    if (sign) sample = -sample;
    if (sample > CLIP) sample = CLIP;

    sample = sample + BIAS;
    let exponent = exp_lut[(sample >> 7) & 0xFF];
    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let compressedByte = ~(sign | (exponent << 4) | mantissa);

    return compressedByte & 0xFF;
  };

  return null; // Ce composant ne rend rien visuellement
};

export default MicrophoneStream;
