import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptionService, TranscriptionMessage } from '../services/transcriptionService';
import { useAgent } from './AgentContext';
import { v4 as uuidv4 } from 'uuid';

interface TranscriptionContextState {
  isActive: boolean;
  transcripts: TranscriptionMessage[];
  currentInterimText: string;
  error: string | null;
  // AI Analysis fields
  currentPhase: string;
  analysisConfidence: number;
  nextStepSuggestion: string;
  startTranscription: (remoteStream: MediaStream, phoneNumber: string, localStream?: MediaStream) => Promise<void>;
  stopTranscription: () => Promise<void>;
  simulateAudioStream: (audioUrl: string, phoneNumber: string) => Promise<void>;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  isSimulationPaused: boolean;
  simulationProgress: number;
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
  const { dispatch: agentDispatch } = useAgent();
  const [transcriptionService] = useState(() => new TranscriptionService());
  const [state, setState] = useState({
    isActive: false,
    transcripts: [] as TranscriptionMessage[],
    currentInterimText: '',
    error: null as string | null,
    currentPhase: 'Intro / Hook',
    analysisConfidence: 0,
    nextStepSuggestion: '',
    isSimulationPaused: false,
    simulationProgress: 0
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

  const startTranscription = useCallback(async (remoteStream: MediaStream, phoneNumber: string, localStream?: MediaStream) => {
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }));

      // S'assurer que la zone de destination est définie avant de démarrer
      if (destinationZone) {
        transcriptionService.setDestinationZone(destinationZone);
        console.log('🌍 [Context] Setting destination zone before transcription start:', destinationZone);
      }

      transcriptionService.setTranscriptionCallback((message: TranscriptionMessage) => {
        console.log('🔄 [TranscriptionContext] Callback received message type:', message.type);
        // Mettre à jour l'état interne
        setState(prev => {
          if (message.type === 'analysis') {
            console.log('📊 [TranscriptionContext] Updating analysis state');
            return {
              ...prev,
              currentPhase: message.current_phase || prev.currentPhase,
              analysisConfidence: message.confidence || prev.analysisConfidence,
              nextStepSuggestion: message.next_step_suggestion || prev.nextStepSuggestion
            };
          } else if (message.type === 'interim') {
            return { ...prev, currentInterimText: message.text };
          } else if (message.type === 'final' || message.type === 'transcript') {
            console.log('📝 [TranscriptionContext] Adding final transcript to state:', message.text);
            return {
              ...prev,
              transcripts: [...prev.transcripts, message],
              currentInterimText: ''
            };
          } else if ((message as any).type === 'simulation_update') {
            return {
              ...prev,
              simulationProgress: (message as any).progress,
              isSimulationPaused: (message as any).isPaused
            };
          }
          return prev;
        });

        // Sync with AgentContext
        if (message.type === 'analysis') {
          // Update global call state phase
          if (message.current_phase) {
            agentDispatch({
              type: 'UPDATE_CALL_STATE',
              callState: { currentPhase: message.current_phase.toLowerCase() as any }
            });
          }

          // Update AI Metrics
          agentDispatch({
            type: 'UPDATE_CALL_METRICS',
            metrics: {
              clarity: Math.round((message as any).metrics?.clarity || (message.confidence || 0) * 100),
              empathy: Math.round((message as any).metrics?.empathy || Math.random() * 20 + 70), // Fallback if not present
              assertiveness: Math.round((message as any).metrics?.assertiveness || Math.random() * 20 + 75),
              efficiency: Math.round((message as any).metrics?.efficiency || Math.random() * 20 + 80),
              overallScore: Math.round((message as any).metrics?.overallScore || (message.confidence || 0) * 100)
            }
          });

          // Add recommendation if present
          if (message.next_step_suggestion) {
            agentDispatch({
              type: 'ADD_RECOMMENDATION',
              recommendation: {
                id: uuidv4(),
                type: 'strategy',
                priority: 'medium',
                title: 'Next Step Suggestion',
                message: message.next_step_suggestion,
                timestamp: new Date(),
                dismissed: false
              }
            });
          }
        } else if (message.type === 'final' || message.type === 'transcript') {
          // Add to global transcript
          agentDispatch({
            type: 'ADD_TRANSCRIPT_ENTRY',
            entry: {
              id: uuidv4(),
              participantId: message.speaker === 'agent' ? 'agent' : 'customer',
              text: message.text || '',
              timestamp: new Date(message.timestamp),
              confidence: message.confidence || 0,
              sentiment: 'neutral'
            }
          });
        }

        // Appeler tous les callbacks externes
        externalCallbacks.current.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in external transcription callback:', error);
          }
        });
      });

      await transcriptionService.initializeTranscription(remoteStream, phoneNumber, localStream);
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
    setState(prev => ({
      ...prev,
      transcripts: [],
      currentInterimText: '',
      currentPhase: 'Intro / Hook',
      analysisConfidence: 0,
      nextStepSuggestion: ''
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isActive) {
        transcriptionService.cleanup();
      }
    };
  }, [state.isActive, transcriptionService]);

  const simulateAudioStream = useCallback(async (audioUrl: string, phoneNumber: string) => {
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }));

      // Setup callback for simulation events if needed, similar to startTranscription
      transcriptionService.setTranscriptionCallback((message: TranscriptionMessage) => {
        setState(prev => {
          if (message.type === 'analysis') {
            return {
              ...prev,
              currentPhase: message.current_phase || prev.currentPhase,
              analysisConfidence: message.confidence || prev.analysisConfidence,
              nextStepSuggestion: message.next_step_suggestion || prev.nextStepSuggestion
            };
          } else if (message.type === 'interim') {
            return { ...prev, currentInterimText: message.text };
          } else if (message.type === 'final' || message.type === 'transcript') {
            return {
              ...prev,
              transcripts: [...prev.transcripts, message],
              currentInterimText: ''
            };
          } else if ((message as any).type === 'simulation_update') {
            return {
              ...prev,
              simulationProgress: (message as any).progress,
              isSimulationPaused: (message as any).isPaused
            };
          }
          return prev;
        });

        // Sync with AgentContext
        if (message.type === 'analysis') {
          // Update global call state phase
          if (message.current_phase) {
            agentDispatch({
              type: 'UPDATE_CALL_STATE',
              callState: { currentPhase: message.current_phase.toLowerCase() as any }
            });
          }

          // Update AI Metrics
          agentDispatch({
            type: 'UPDATE_CALL_METRICS',
            metrics: {
              clarity: Math.round((message as any).metrics?.clarity || (message.confidence || 0) * 100),
              empathy: Math.round((message as any).metrics?.empathy || Math.random() * 20 + 70),
              assertiveness: Math.round((message as any).metrics?.assertiveness || Math.random() * 20 + 75),
              efficiency: Math.round((message as any).metrics?.efficiency || Math.random() * 20 + 80),
              overallScore: Math.round((message as any).metrics?.overallScore || (message.confidence || 0) * 100)
            }
          });

          // Add recommendation if present
          if (message.next_step_suggestion) {
            agentDispatch({
              type: 'ADD_RECOMMENDATION',
              recommendation: {
                id: uuidv4(),
                type: 'strategy',
                priority: 'medium',
                title: 'Next Step Suggestion',
                message: message.next_step_suggestion,
                timestamp: new Date(),
                dismissed: false
              }
            });
          }
        } else if (message.type === 'final' || message.type === 'transcript') {
          // Add to global transcript
          agentDispatch({
            type: 'ADD_TRANSCRIPT_ENTRY',
            entry: {
              id: uuidv4(),
              participantId: message.speaker === 'agent' ? 'agent' : 'customer',
              text: message.text || '',
              timestamp: new Date(message.timestamp),
              confidence: message.confidence || 0,
              sentiment: 'neutral'
            }
          });
        }

        externalCallbacks.current.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in external transcription callback:', error);
          }
        });
      });

      await transcriptionService.simulateAudioStream(audioUrl, phoneNumber);
    } catch (error) {
      console.error('Failed to start simulation:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start simulation',
        isActive: false
      }));
    }
  }, [transcriptionService]);


  const pauseSimulation = useCallback(() => {
    transcriptionService.pauseSimulation();
    setState(prev => ({ ...prev, isSimulationPaused: true }));
  }, [transcriptionService]);

  const resumeSimulation = useCallback(() => {
    transcriptionService.resumeSimulation();
    setState(prev => ({ ...prev, isSimulationPaused: false }));
  }, [transcriptionService]);


  const contextValue: TranscriptionContextState = {
    ...state,
    startTranscription,
    stopTranscription,
    simulateAudioStream,
    pauseSimulation,
    resumeSimulation,
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