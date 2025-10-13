import React, { useEffect, useRef, useState } from 'react';
import { AudioStreamManager } from '../../services/AudioStreamManager';

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
  const audioManagerRef = useRef<AudioStreamManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    // Créer l'AudioStreamManager
    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioStreamManager(onError);
    }

    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.disconnect();
        audioManagerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!streamUrl || !audioManagerRef.current) return;

    const connectAudioStream = async () => {
      try {
        await audioManagerRef.current?.connect(streamUrl);
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to connect audio stream:', error);
        onError?.(error as Error);
        setIsPlaying(false);
      }
    };

    connectAudioStream();

    return () => {
      audioManagerRef.current?.disconnect();
      setIsPlaying(false);
    };
  }, [streamUrl]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // Note: Volume control will be implemented in AudioStreamManager if needed
  };

  return (
    <div className="bg-[#1b253a] rounded-lg p-4 mt-2">
      {/* Audio stream is now handled by AudioStreamManager */}
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
