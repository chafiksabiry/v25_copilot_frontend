import { useEffect, useRef } from 'react';
import { useAgent } from '../contexts/AgentContext';

export function useAudioVisualizer(stream: MediaStream | null) {
    const { dispatch } = useAgent();
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream) {
            // Clear audio level when no stream
            dispatch({ type: 'UPDATE_AUDIO_LEVEL', level: 0 });
            return;
        }

        console.log('🎤 [useAudioVisualizer] Initializing for stream:', stream.id);

        try {
            // Initialize Audio Context
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            // Create Analyser
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            // Create Source
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateLevel = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }

                const average = sum / bufferLength;
                const normalizedLevel = average / 255; // Normalize to 0-1

                // Use a threshold to clear low-level noise
                const finalLevel = normalizedLevel > 0.01 ? normalizedLevel : 0;

                dispatch({ type: 'UPDATE_AUDIO_LEVEL', level: finalLevel });

                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();

        } catch (error) {
            console.error('❌ [useAudioVisualizer] Failed to initialize:', error);
        }

        return () => {
            console.log('🎤 [useAudioVisualizer] Cleaning up');
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
            }
            dispatch({ type: 'UPDATE_AUDIO_LEVEL', level: 0 });
        };
    }, [stream, dispatch]);
}
