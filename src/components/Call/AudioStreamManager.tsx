import { useEffect, useRef } from 'react';

interface AudioStreamProps {
  callId: string | null;
}

export const AudioStreamManager: React.FC<AudioStreamProps> = ({ callId }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!callId) {
      console.log('No call ID provided, skipping audio stream setup');
      return;
    }

    console.log('🎵 Setting up audio stream for call:', callId);

    // Create AudioContext
    try {
      audioContextRef.current = new AudioContext();
      console.log('✅ AudioContext created');
    } catch (error) {
      console.error('❌ Failed to create AudioContext:', error);
      return;
    }

    // Setup WebSocket for audio stream
    const wsUrl = `${import.meta.env.VITE_API_URL_CALL?.replace('http', 'ws')}/api/calls/media/${callId}`;
    console.log('🔌 Connecting to audio stream WebSocket:', wsUrl);

    const streamWs = new WebSocket(wsUrl);
    streamWsRef.current = streamWs;

    streamWs.onopen = () => {
      console.log('✅ Audio stream WebSocket connected');
    };

    streamWs.onmessage = async (event) => {
      try {
        if (!audioContextRef.current) {
          console.error('❌ AudioContext not available');
          return;
        }

        // Convert received data to audio
        const audioData = event.data;
        const arrayBuffer = await audioData.arrayBuffer();
        
        // Decode audio data
        console.log('🎵 Decoding audio data...');
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        // Create and connect audio node
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        // Start playing
        console.log('🔊 Playing audio chunk');
        source.start();
      } catch (error) {
        console.error('❌ Error processing audio stream:', error);
      }
    };

    streamWs.onerror = (error) => {
      console.error('❌ Audio stream WebSocket error:', error);
    };

    streamWs.onclose = () => {
      console.log('🔌 Audio stream WebSocket closed');
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up audio stream...');
      
      if (streamWsRef.current) {
        console.log('🔌 Closing audio stream WebSocket');
        streamWsRef.current.close();
        streamWsRef.current = null;
      }

      if (audioContextRef.current) {
        console.log('🎵 Closing AudioContext');
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [callId]);

  return null; // This component doesn't render anything visually
};
