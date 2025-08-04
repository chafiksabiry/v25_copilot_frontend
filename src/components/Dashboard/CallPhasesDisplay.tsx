import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptionMessage } from '../../services/transcriptionService';
import { useAgent } from '../../contexts/AgentContext';
import { useTranscription } from '../../contexts/TranscriptionContext';

interface CallPhase {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  startTime?: string;
  endTime?: string;
  transcript?: string;
  icon: string;
  color: string;
}

interface CallPhasesDisplayProps {
  phases?: CallPhase[];
  currentPhase?: string;
  onPhaseClick?: (phaseId: string) => void;
  isCallActive?: boolean;
  phoneNumber?: string;
  mediaStream?: MediaStream | null;
  disableAutoScroll?: boolean;
}

export const CallPhasesDisplay: React.FC<CallPhasesDisplayProps> = ({
  phases = [],
  currentPhase,
  onPhaseClick,
  isCallActive = false,
  phoneNumber,
  mediaStream,
  disableAutoScroll = false
}) => {
  // Utiliser le contexte de transcription global
  const {
    isActive: isTranscriptionActive,
    startTranscription,
    stopTranscription,
    addTranscriptionCallback,
    removeTranscriptionCallback
  } = useTranscription();
  
  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState('');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(!disableAutoScroll);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastTranscriptTextRef = useRef('');
  const { dispatch } = useAgent();

  // Callback pour gérer les messages de transcription
  const handleTranscriptionMessage = useCallback((message: TranscriptionMessage) => {
    console.log('📝 CallPhasesDisplay received transcription:', message);
    if (message.type === 'interim') {
      setCurrentInterimText(message.text);
      // Astuce : n'ajoute que si différent du dernier texte stocké
      if (message.text && message.text !== lastTranscriptTextRef.current) {
        dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', entry: {
          id: message.timestamp ? String(message.timestamp) : String(Date.now()),
          participantId: 'agent',
          text: message.text,
          timestamp: typeof message.timestamp === 'number' ? new Date(message.timestamp) : (message.timestamp || new Date()),
          confidence: message.confidence || 0,
          sentiment: 'neutral'
        }});
        lastTranscriptTextRef.current = message.text;
      }
    } else if (message.type === 'final') {
      setTranscripts(prev => [...prev, message]);
      setCurrentInterimText('');
      if (message.text && message.text !== lastTranscriptTextRef.current) {
        dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', entry: {
          id: message.timestamp ? String(message.timestamp) : String(Date.now()),
          participantId: 'agent',
          text: message.text,
          timestamp: typeof message.timestamp === 'number' ? new Date(message.timestamp) : (message.timestamp || new Date()),
          confidence: message.confidence || 0,
          sentiment: 'neutral'
        }});
        lastTranscriptTextRef.current = message.text;
      }
    }
  }, [dispatch]);

  // Ajouter le callback quand le composant monte
  useEffect(() => {
    addTranscriptionCallback(handleTranscriptionMessage);
    
    // Retirer le callback quand le composant se démonte
    return () => {
      removeTranscriptionCallback(handleTranscriptionMessage);
    };
  }, [addTranscriptionCallback, removeTranscriptionCallback, handleTranscriptionMessage]);

  // Auto-scroll to bottom of transcripts (can be disabled)
  useEffect(() => {
    if (autoScrollEnabled && !disableAutoScroll) {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, currentInterimText, autoScrollEnabled, disableAutoScroll]);

  // Initialize transcription when call becomes active
  useEffect(() => {
    if (isCallActive && mediaStream && phoneNumber && !isTranscriptionActive) {
      console.log('🎤 Starting transcription for call phases with destination zone:', phoneNumber);
      
      // Utiliser le hook de transcription au lieu de créer une nouvelle instance
      startTranscription(mediaStream, phoneNumber);
    } else if (!isCallActive && isTranscriptionActive) {
      console.log('🛑 Stopping transcription...');
      stopTranscription();
      setCurrentInterimText('');
    }
  }, [isCallActive, mediaStream, phoneNumber, isTranscriptionActive, startTranscription, stopTranscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTranscriptionActive) {
        stopTranscription();
      }
    };
  }, [isTranscriptionActive, stopTranscription]);
  return (
    <div className="flex flex-col space-y-1 p-2">
      <div className="flex items-center mb-2">
        <span className="text-cyan-400 text-2xl mr-2">🧠</span>
        <h2 className="text-2xl font-bold text-white">REPS Call Phases</h2>
      </div>
      
      {/* Call Phases Section */}
      <div className="space-y-1 mb-4">
        {phases.map((phase) => (
                      <div
              key={phase.id}
              className="relative mb-1"
            >
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="bg-[#232f47]/50 absolute inset-0 rounded-md" />
              </div>
              <div
                className={`p-2 rounded-md text-sm flex items-center justify-between cursor-pointer transition-all duration-150 shadow-sm
                bg-[#3a4661] pointer-events-none relative
                ${phase.id === currentPhase ? 'border-blue-500 border' : ''}
              `}
                onClick={() => onPhaseClick?.(phase.id)}
              >
                <span className={`flex items-center justify-center w-7 h-7 mr-2 rounded-full text-lg font-bold ${phase.color.replace(/bg-[^ ]+ /, '')}`}>{phase.icon}</span>
                <span className="font-medium truncate max-w-[60%] text-white">{phase.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs ml-2 ${
                  phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                  phase.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                  phase.status === 'pending' ? 'bg-[#22304a] text-blue-200' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {phase.status}
                </span>
              </div>
            </div>
          ))}
        </div>

      {/* Live Transcription Section */}
      {isCallActive && (
        <div className="bg-[#3a4661] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Transcription</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-200 font-medium">Active</span>
              <button
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  autoScrollEnabled 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
                title={autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
              >
                {autoScrollEnabled ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              </button>
            </div>
          </div>
          
          {/* Transcription Display */}
          <div className="bg-[#3a4661] rounded-lg p-4 h-64 overflow-y-auto">
            {transcripts.length === 0 && !currentInterimText ? (
              <div className="text-gray-500 text-center py-8">
                <div className="text-2xl mb-2">🎤</div>
                <p>Waiting for speech...</p>
                <p className="text-sm">Start speaking to see live transcription</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        {transcript.speaker || 'Speaker'} • {new Date(transcript.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-gray-800 bg-white rounded p-2 shadow-sm">
                        {transcript.text}
                      </div>
                      {transcript.confidence && (
                        <div className="text-xs text-gray-500 mt-1">
                          Confidence: {(transcript.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Current interim text */}
                {currentInterimText && (
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        Processing...
                      </div>
                      <div className="text-gray-600 bg-yellow-50 rounded p-2 border border-yellow-200 italic">
                        {currentInterimText}
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={transcriptsEndRef} />
              </div>
            )}
          </div>
          
          {/* Transcription Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
            <span>Total segments: {transcripts.length}</span>
            <span>Language: {phoneNumber?.startsWith('+33') ? 'French' : phoneNumber?.startsWith('+212') ? 'Arabic' : 'English'}</span>
          </div>
        </div>
      )}

      {/* Call Not Active Message */}
      {!isCallActive && (
        <div className="bg-[#3a4661] rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Call</h3>
          <p className="text-slate-200">Start a call to see live transcription in REPS Call Phases</p>
        </div>
      )}
    </div>
  );
};
