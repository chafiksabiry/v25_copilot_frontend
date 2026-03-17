import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptionMessage } from '../../services/transcriptionService';
import { useAgent } from '../../contexts/AgentContext';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Phone } from 'lucide-react';

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
  onPhaseClick?: (phaseId: string) => void;
  isCallActive?: boolean;
  phoneNumber?: string;
  mediaStream?: MediaStream | null;
  disableAutoScroll?: boolean;
}

export const CallPhasesDisplay: React.FC<CallPhasesDisplayProps> = ({
  phases = [],
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
      <div className="flex items-center mb-4">
        <span className="text-harx-500 text-2xl mr-2">🧠</span>
        <h2 className="text-2xl font-black text-white tracking-tight">REPS Call Phases</h2>
        {analysisConfidence > 0 && (
          <span className="ml-auto text-[10px] bg-harx-500/10 text-harx-100 font-bold px-2 py-0.5 rounded-full border border-harx-500/20 uppercase tracking-widest">
            AI Conf: {Math.round(analysisConfidence * 100)}%
          </span>
        )}
      </div>

      {/* Call Phases Section */}
      <div className="space-y-1 mb-4">
        {(() => {
          // Trouver l'index de la phase actuelle suggérée par l'IA
          const currentPhaseIndex = phases.findIndex(p =>
            p.name.toLowerCase().includes(aiCurrentPhase.toLowerCase()) ||
            aiCurrentPhase.toLowerCase().includes(p.name.toLowerCase())
          );

          // console.log(`🧭 [CallPhases] Current active phase: "${aiCurrentPhase}" | Found at index: ${currentPhaseIndex}`);

          return phases.map((phase, index) => {
            const isActive = index === currentPhaseIndex;
            const isCompleted = currentPhaseIndex > index;
            const status = isActive ? 'in-progress' : (isCompleted ? 'completed' : 'pending');

            return (
              <div key={phase.id} className="relative mb-2">
                <div
                  className={`p-3 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm
                  ${isActive ? 'bg-harx-500/10 border-harx-500/50 border-2 scale-[1.02] shadow-harx-500/10' : 'bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/60'}
                  ${isCompleted ? 'border-emerald-500/30' : ''}
                  relative backdrop-blur-sm
                `}
                  onClick={() => onPhaseClick?.(phase.id)}
                >
                  <span className={`flex items-center justify-center w-8 h-8 mr-3 rounded-full text-lg font-bold ${phase.color.replace(/bg-[^ ]+ /, '')} shadow-inner`}>
                    {isCompleted ? '✅' : phase.icon}
                  </span>
                  <span className={`font-bold transition-colors truncate max-w-[60%] ${isActive ? 'text-harx-100' : isCompleted ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {phase.name}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ml-2 ${isActive ? 'bg-harx-500 text-white animate-pulse' :
                    isCompleted ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/20' :
                      'bg-slate-800/80 text-slate-500 border border-slate-700'
                    }`}>
                    {isActive ? 'Current' : status}
                  </span>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* AI Suggestion Section */}
      {isCallActive && nextStepSuggestion && (
        <div className="bg-harx-500/10 border border-harx-500/30 rounded-2xl p-4 mb-6 shadow-xl shadow-harx-500/5 animate-in fade-in slide-in-from-top-4 duration-500 transition-all backdrop-blur-md">
          <div className="flex items-center mb-3">
            <span className="text-harx-500 mr-2">💡</span>
            <h3 className="text-xs font-black text-harx-500 uppercase tracking-widest">AI Next Step Suggestion</h3>
          </div>
          <p className="text-harx-100 text-sm leading-relaxed italic font-medium">
            "{nextStepSuggestion}"
          </p>
        </div>
      )}

      {/* Live Transcription Section */}
      {isCallActive && (
        <div className="glass-card rounded-2xl p-5 transition-all border-harx-500/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white tracking-tight">Live Transcription</h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Active</span>
              </div>
              <button
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-colors ${autoScrollEnabled
                  ? 'bg-harx-500 text-white hover:bg-harx-600'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
              >
                {autoScrollEnabled ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-xl p-4 h-64 overflow-y-auto custom-scrollbar border border-slate-800/50">
            {transcripts.length === 0 && !currentInterimText ? (
              <div className="text-slate-500 text-center py-12 flex flex-col items-center">
                <div className="text-3xl mb-3 opacity-20">🎤</div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">Waiting for speech...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="flex flex-col space-y-1.5 animate-in fade-in duration-300">
                    <div className="text-[9px] text-harx-500 font-black uppercase tracking-widest flex justify-between px-1">
                      <span>Agent</span>
                      <span className="opacity-50 tracking-normal">{new Date(transcript.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-100 bg-slate-800/40 rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm border border-slate-700/30 backdrop-blur-sm">
                      {transcript.text}
                    </div>
                  </div>
                ))}

                {currentInterimText && (
                  <div className="flex flex-col space-y-1.5 animate-in fade-in duration-200">
                    <div className="text-[9px] text-harx-alt-500 font-black uppercase tracking-widest animate-pulse px-1">
                      Processing...
                    </div>
                    <div className="text-slate-400 bg-slate-800/20 rounded-2xl rounded-tl-none px-4 py-3 text-sm italic border border-slate-700/20 backdrop-blur-sm">
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
        <div className="glass-card rounded-2xl p-12 text-center border-dashed border-slate-700/50 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
            <Phone className="w-10 h-10 text-slate-500 opacity-20" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Active Call</h3>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">Start a call from the Contact Info panel above to see live AI analysis.</p>
        </div>
      )}
    </div>
  );
};

