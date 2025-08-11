import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptionService, TranscriptionMessage } from '../services/transcriptionService';

interface TranscriptionContextState {
  isActive: boolean;
  transcripts: TranscriptionMessage[];
  currentInterimText: string;
  error: string | null;
  startTranscription: (stream: MediaStream, phoneNumber: string) => Promise<void>;
  stopTranscription: () => Promise<void>;
  clearTranscripts: () => void;
  addTranscriptionCallback: (callback: (message: TranscriptionMessage) => void) => void;
  removeTranscriptionCallback: (callback: (message: TranscriptionMessage) => void) => void;
}

const TranscriptionContext = createContext<TranscriptionContextState | undefined>(undefined);

interface TranscriptionProviderProps {
  children: React.ReactNode;
  destinationZone?: string;
}

export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({ 
  children, 
  destinationZone 
}) => {
  const [transcriptionService] = useState(() => new TranscriptionService());
  const [state, setState] = useState({
    isActive: false,
    transcripts: [] as TranscriptionMessage[],
    currentInterimText: '',
    error: null as string | null
  });
  
  // Référence pour stocker les callbacks externes
  const externalCallbacks = useRef<((message: TranscriptionMessage) => void)[]>([]);

  // Mettre à jour la zone de destination quand elle change
  useEffect(() => {
    if (destinationZone) {
      transcriptionService.setDestinationZone(destinationZone);
      console.log('🌍 [Context] Destination zone updated in transcription service:', destinationZone);
    }
  }, [destinationZone, transcriptionService]);

  // Fonction pour ajouter un callback externe
  const addTranscriptionCallback = useCallback((callback: (message: TranscriptionMessage) => void) => {
    externalCallbacks.current.push(callback);
  }, []);

  // Fonction pour retirer un callback externe
  const removeTranscriptionCallback = useCallback((callback: (message: TranscriptionMessage) => void) => {
    const index = externalCallbacks.current.indexOf(callback);
    if (index > -1) {
      externalCallbacks.current.splice(index, 1);
    }
  }, []);

  const startTranscription = useCallback(async (stream: MediaStream, phoneNumber: string) => {
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }));
      
      // S'assurer que la zone de destination est définie avant de démarrer
      if (destinationZone) {
        transcriptionService.setDestinationZone(destinationZone);
        console.log('🌍 [Context] Setting destination zone before transcription start:', destinationZone);
      }
      
      transcriptionService.setTranscriptionCallback((message: TranscriptionMessage) => {
        // Mettre à jour l'état interne
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
        
        // Appeler tous les callbacks externes
        externalCallbacks.current.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in external transcription callback:', error);
          }
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
  }, [transcriptionService, destinationZone]);

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

  const contextValue: TranscriptionContextState = {
    ...state,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    addTranscriptionCallback,
    removeTranscriptionCallback
  };

  return (
    <TranscriptionContext.Provider value={contextValue}>
      {children}
    </TranscriptionContext.Provider>
  );
};

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (context === undefined) {
    throw new Error('useTranscription must be used within a TranscriptionProvider');
  }
  return context;
}; 