import { useState, useEffect, useCallback } from 'react';
import { TranscriptionService, TranscriptionMessage } from '../services/transcriptionService';

export interface TranscriptionState {
  isActive: boolean;
  transcripts: TranscriptionMessage[];
  currentInterimText: string;
  error: string | null;
}

export const useTranscriptionIntegration = () => {
  const [transcriptionService] = useState(() => new TranscriptionService());
  const [state, setState] = useState<TranscriptionState>({
    isActive: false,
    transcripts: [],
    currentInterimText: '',
    error: null
  });

  const startTranscription = useCallback(async (stream: MediaStream, phoneNumber: string) => {
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }));
      
      transcriptionService.setTranscriptionCallback((message: TranscriptionMessage) => {
        setState(prev => {
          if (message.type === 'interim') {
            return { ...prev, currentInterimText: message.text };
          } else if (message.type === 'final') {
            return {
              ...prev,
              transcripts: [...prev.transcripts, message],
              currentInterimText: ''
            };
          }
          return prev;
        });
      });

      await transcriptionService.initializeTranscription(stream, phoneNumber);
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start transcription',
        isActive: false 
      }));
    }
  }, [transcriptionService]);

  const stopTranscription = useCallback(async () => {
    try {
      await transcriptionService.cleanup();
      setState(prev => ({ 
        ...prev, 
        isActive: false,
        currentInterimText: '',
        error: null 
      }));
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }
  }, [transcriptionService]);

  const clearTranscripts = useCallback(() => {
    setState(prev => ({ ...prev, transcripts: [], currentInterimText: '' }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isActive) {
        transcriptionService.cleanup();
      }
    };
  }, [state.isActive, transcriptionService]);

  return {
    ...state,
    startTranscription,
    stopTranscription,
    clearTranscripts
  };
}; 