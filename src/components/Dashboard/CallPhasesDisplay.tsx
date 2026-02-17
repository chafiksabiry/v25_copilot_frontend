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
    removeTranscriptionCallback,
    currentPhase: aiCurrentPhase,
    nextStepSuggestion,
    analysisConfidence
  } = useTranscription();

  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState('');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(!disableAutoScroll);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastTranscriptTextRef = useRef('');
  const { dispatch } = useAgent();

  // Callback pour gérer les messages de transcription
  const handleTranscriptionMessage = useCallback((message: TranscriptionMessage) => {
    if (message.type === 'interim') {
      setCurrentInterimText(message.text);
    } else if (message.type === 'final' || message.type === 'transcript') {
      setTranscripts(prev => [...prev, message]);
      setCurrentInterimText('');
      if (message.text && message.text !== lastTranscriptTextRef.current) {
        dispatch({
          type: 'ADD_TRANSCRIPT_ENTRY', entry: {
            id: message.timestamp ? String(message.timestamp) : String(Date.now()),
            participantId: 'agent',
            text: message.text,
            timestamp: typeof message.timestamp === 'number' ? new Date(message.timestamp) : (message.timestamp || new Date()),
            confidence: message.confidence || 0,
            sentiment: 'neutral'
          }
        });
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
      console.log('🎤 Starting transcription for call phases:', phoneNumber);
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
        {analysisConfidence > 0 && (
          <span className="ml-auto text-xs text-cyan-300 font-mono">
            AI Confidence: {Math.round(analysisConfidence * 100)}%
          </span>
        )}
      </div>

      {/* Call Phases Section */}
      <div className="space-y-1 mb-4">
        {phases.map((phase) => {
          const isActive = phase.name === aiCurrentPhase || phase.id === currentPhase;
          return (
            <div key={phase.id} className="relative mb-1">
              <div
                className={`p-2 rounded-md text-sm flex items-center justify-between cursor-pointer transition-all duration-150 shadow-sm
                ${isActive ? 'bg-[#4a5578] border-cyan-500 border-2' : 'bg-[#3a4661]'}
                relative
              `}
                onClick={() => onPhaseClick?.(phase.id)}
              >
                <span className={`flex items-center justify-center w-7 h-7 mr-2 rounded-full text-lg font-bold ${phase.color.replace(/bg-[^ ]+ /, '')}`}>
                  {phase.icon}
                </span>
                <span className={`font-medium truncate max-w-[60%] ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                  {phase.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ml-2 ${isActive ? 'bg-cyan-900 text-cyan-100 animate-pulse' :
                    phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-[#22304a] text-blue-200'
                  }`}>
                  {isActive ? 'Current' : phase.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion Section */}
      {isCallActive && nextStepSuggestion && (
        <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-3 mb-4 animate-in fade-in slide-in-from-top-4 duration-500 transition-all">
          <div className="flex items-center mb-2">
            <span className="text-cyan-400 mr-2">💡</span>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">AI Next Step Suggestion</h3>
          </div>
          <p className="text-white text-sm leading-relaxed italic">
            "{nextStepSuggestion}"
          </p>
        </div>
      )}

      {/* Live Transcription Section */}
      {isCallActive && (
        <div className="bg-[#3a4661] rounded-lg p-4 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Transcription</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-200 font-medium">Active</span>
              <button
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-colors ${autoScrollEnabled
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
              >
                {autoScrollEnabled ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              </button>
            </div>
          </div>

          <div className="bg-[#2a3651] rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar">
            {transcripts.length === 0 && !currentInterimText ? (
              <div className="text-gray-500 text-center py-8">
                <div className="text-2xl mb-2 text-slate-400">🎤</div>
                <p>Waiting for speech...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="flex flex-col space-y-1 animate-in fade-in duration-300">
                    <div className="text-[10px] text-cyan-300/60 font-mono flex justify-between">
                      <span>Agent</span>
                      <span>{new Date(transcript.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-white bg-[#3a4661] rounded-lg px-3 py-2 text-sm shadow-sm border border-slate-500/30">
                      {transcript.text}
                    </div>
                  </div>
                ))}

                {currentInterimText && (
                  <div className="flex flex-col space-y-1 animate-in fade-in duration-200">
                    <div className="text-[10px] text-yellow-500/70 font-mono animate-pulse">
                      Processing...
                    </div>
                    <div className="text-slate-300 bg-[#3a4661]/40 rounded-lg px-3 py-2 text-sm italic border border-slate-600/30">
                      {currentInterimText}
                    </div>
                  </div>
                )}
                <div ref={transcriptsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Not Active Message */}
      {!isCallActive && (
        <div className="bg-[#3a4661] rounded-lg p-8 text-center border border-dashed border-slate-500/30">
          <div className="text-4xl mb-4 opacity-50">📞</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Call</h3>
          <p className="text-slate-300 text-sm">Start a call to see live AI analysis and transcription.</p>
        </div>
      )}
    </div>
  );
};
