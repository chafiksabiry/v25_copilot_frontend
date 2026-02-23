import React, { useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { useTranscription } from '../contexts/TranscriptionContext';
import { TranscriptionMessage } from '../services/transcriptionService';
import { v4 as uuidv4 } from 'uuid';
import { processAiAnalysis } from '../services/aiAnalysisBridge';

export const TranscriptionBridge: React.FC = () => {
    const { dispatch } = useAgent();
    const { addTranscriptionCallback, removeTranscriptionCallback, isActive } = useTranscription();

    useEffect(() => {
        const handleTranscriptionUpdate = async (message: TranscriptionMessage) => {
            // Handle Transcripts
            if (message.type === 'final' || message.type === 'transcript') {
                const transcriptId = uuidv4();
                dispatch({
                    type: 'ADD_TRANSCRIPT_ENTRY',
                    entry: {
                        id: transcriptId,
                        participantId: message.speaker === 'agent' ? 'agent-1' : 'customer-1',
                        text: message.text,
                        timestamp: new Date(message.timestamp),
                        confidence: message.confidence || 1.0,
                        sentiment: 'neutral'
                    }
                });

                // Trigger AI analysis on final transcripts
                if (message.type === 'final') {
                    processAiAnalysis(message.text, dispatch);
                }
            }

            // Handle AI Analysis (Phase changes, etc)
            if (message.type === 'analysis') {
                if (message.current_phase) {
                    // Map backend phase strings to frontend CallPhase type
                    let mappedPhase = 'greeting'; // Default
                    const phaseLower = message.current_phase.toLowerCase();

                    if (phaseLower.includes('intro') || phaseLower.includes('hook') || phaseLower.includes('greeting')) {
                        mappedPhase = 'greeting';
                    } else if (phaseLower.includes('discovery') || phaseLower.includes('need')) {
                        mappedPhase = 'discovery';
                    } else if (phaseLower.includes('value') || phaseLower.includes('presentation') || phaseLower.includes('pitch')) {
                        mappedPhase = 'presentation';
                    } else if (phaseLower.includes('objection')) {
                        mappedPhase = 'objection';
                    } else if (phaseLower.includes('closing') || phaseLower.includes('confirmation')) {
                        mappedPhase = 'closing';
                    } else if (phaseLower.includes('post') || phaseLower.includes('follow')) {
                        mappedPhase = 'follow-up';
                    }

                    dispatch({
                        type: 'UPDATE_CALL_STATE',
                        callState: {
                            currentPhase: mappedPhase as any
                        }
                    });
                }

                // TODO: Handle next_step_suggestion, strengths, improvements if AgentContext supports them
                // AgentContext has callStructureGuidance, maybe map there?
            }
        };

        addTranscriptionCallback(handleTranscriptionUpdate);
        return () => removeTranscriptionCallback(handleTranscriptionUpdate);
    }, [addTranscriptionCallback, removeTranscriptionCallback, dispatch]);

    // Handle Active State Sync (Optional, if AgentContext needs to know about Simulation status)
    useEffect(() => {
        if (isActive) {
            // If simulation starts, ensure Agent is in call state (ContactInfo handles this via setCallStatus usually, but good to be safe)
            // But we don't want to create duplicate START_CALL actions if ContactInfo already did it.
            // So leaving this out for now to avoid side effects.
        }
    }, [isActive, dispatch]);

    return null; // Logic only component
};
