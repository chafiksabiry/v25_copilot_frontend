import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  Participant, 
  Lead, 
  TranscriptEntry, 
  PersonalityProfile, 
  Recommendation, 
  CallMetrics, 
  CallState, 
  CallStructureGuidance, 
  TransactionIntelligence,
  SmartWarning,
  WarningSystemState
} from '../types';

// Define the complete agent state interface matching what components expect
export interface AgentState {
  // Call state
  callState: CallState;
  
  // Audio and recording
  isAIListening: boolean;
  audioLevel: number;
  mediaStream: MediaStream | null;
  
  // Transcript and conversation
  transcript: TranscriptEntry[];
  
  // Personality and insights
  personalityProfile?: PersonalityProfile;
  
  // Recommendations and guidance
  recommendations: Recommendation[];
  
  // Call metrics and performance
  callMetrics: CallMetrics;
  
  // Call structure and methodology guidance
  callStructureGuidance: CallStructureGuidance;
  
  // Transaction intelligence
  transactionIntelligence: TransactionIntelligence;
  
  // Smart warning system
  smartWarnings: SmartWarning[];
  warningSystem: WarningSystemState;
}

// Define action types
export type AgentAction =
  | { type: 'START_CALL'; participants: Participant[]; contact?: Lead }
  | { type: 'END_CALL' }
  | { type: 'UPDATE_CALL_STATE'; callState: Partial<CallState> }
  | { type: 'TOGGLE_AI_LISTENING' }
  | { type: 'UPDATE_AUDIO_LEVEL'; level: number }
  | { type: 'SET_MEDIA_STREAM'; mediaStream: MediaStream | null }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; entry: TranscriptEntry }
  | { type: 'UPDATE_PERSONALITY_PROFILE'; profile: PersonalityProfile }
  | { type: 'ADD_RECOMMENDATION'; recommendation: Recommendation }
  | { type: 'DISMISS_RECOMMENDATION'; id: string }
  | { type: 'UPDATE_CALL_METRICS'; metrics: Partial<CallMetrics> }
  | { type: 'UPDATE_CALL_STRUCTURE_GUIDANCE'; guidance: Partial<CallStructureGuidance> }
  | { type: 'UPDATE_TRANSACTION_INTELLIGENCE'; intelligence: Partial<TransactionIntelligence> }
  | { type: 'SET_TRANSACTION_GOAL'; goal: any }
  | { type: 'ADD_SMART_WARNING'; warning: SmartWarning }
  | { type: 'RESOLVE_WARNING'; warningId: string }
  | { type: 'UPDATE_WARNING_SYSTEM'; state: Partial<WarningSystemState> };

// Initial state
const initialState: AgentState = {
  callState: {
    isActive: false,
    isRecording: false,
    participants: [],
    currentPhase: 'greeting'
  },
  isAIListening: false,
  audioLevel: 0,
  mediaStream: null,
  transcript: [],
  recommendations: [],
  callMetrics: {
    duration: 0,
    clarity: 0,
    empathy: 0,
    assertiveness: 0,
    efficiency: 0,
    overallScore: 0
  },
  callStructureGuidance: {
    phaseProgress: 0,
    deviationAlerts: [],
    completedObjectives: [],
    missedOpportunities: []
  },
  transactionIntelligence: {
    currentScore: 0,
    readinessSignals: [],
    barriers: [],
    opportunities: [],
    nextBestActions: [],
    optimalTiming: {
      shouldProceed: false,
      reason: 'Insufficient data'
    },
    progressToGoal: 0,
    riskFactors: [],
    confidenceLevel: 0
  },
  smartWarnings: [],
  warningSystem: {
    activeWarnings: [],
    warningHistory: [],
    systemStatus: 'active',
    lastCheck: new Date(),
    sensitivity: 'medium',
    autoResolutionEnabled: false
  }
};

// Reducer function
function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'START_CALL':
      return {
        ...state,
        callState: {
          ...state.callState,
          isActive: true,
          isRecording: true,
          startTime: new Date(),
          participants: action.participants,
          contact: action.contact
        },
        transcript: [],
        recommendations: []
      };

    case 'END_CALL':
      return {
        ...state,
        callState: {
          ...state.callState,
          isActive: false,
          isRecording: false,
          startTime: undefined,
          participants: [],
          contact: undefined
        },
        isAIListening: false,
        audioLevel: 0
      };

    case 'UPDATE_CALL_STATE':
      return {
        ...state,
        callState: {
          ...state.callState,
          ...action.callState
        }
      };

    case 'TOGGLE_AI_LISTENING':
      return {
        ...state,
        isAIListening: !state.isAIListening
      };

    case 'UPDATE_AUDIO_LEVEL':
      return {
        ...state,
        audioLevel: action.level
      };

    case 'SET_MEDIA_STREAM':
      return {
        ...state,
        mediaStream: action.mediaStream
      };

    case 'ADD_TRANSCRIPT_ENTRY':
      return {
        ...state,
        transcript: [...state.transcript, action.entry],
        callMetrics: {
          ...state.callMetrics,
          duration: state.callState.startTime ? 
            Date.now() - state.callState.startTime.getTime() : 0
        }
      };

    case 'UPDATE_PERSONALITY_PROFILE':
      return {
        ...state,
        personalityProfile: action.profile
      };

    case 'ADD_RECOMMENDATION':
      return {
        ...state,
        recommendations: [...state.recommendations, action.recommendation]
      };

    case 'DISMISS_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.map(rec =>
          rec.id === action.id ? { ...rec, dismissed: true } : rec
        )
      };

    case 'UPDATE_CALL_METRICS':
      return {
        ...state,
        callMetrics: {
          ...state.callMetrics,
          ...action.metrics
        }
      };

    case 'UPDATE_CALL_STRUCTURE_GUIDANCE':
      return {
        ...state,
        callStructureGuidance: {
          ...state.callStructureGuidance,
          ...action.guidance
        }
      };

    case 'UPDATE_TRANSACTION_INTELLIGENCE':
      return {
        ...state,
        transactionIntelligence: {
          ...state.transactionIntelligence,
          ...action.intelligence
        }
      };

    case 'SET_TRANSACTION_GOAL':
      return {
        ...state,
        transactionIntelligence: {
          ...state.transactionIntelligence,
          goal: action.goal
        }
      };

    case 'ADD_SMART_WARNING':
      return {
        ...state,
        smartWarnings: [...state.smartWarnings, action.warning],
        warningSystem: {
          ...state.warningSystem,
          activeWarnings: [...state.warningSystem.activeWarnings, action.warning]
        }
      };

    case 'RESOLVE_WARNING':
      return {
        ...state,
        smartWarnings: state.smartWarnings.map(warning =>
          warning.id === action.warningId 
            ? { ...warning, resolved: true, resolvedAt: new Date() }
            : warning
        ),
        warningSystem: {
          ...state.warningSystem,
          activeWarnings: state.warningSystem.activeWarnings.filter(w => w.id !== action.warningId)
        }
      };

    case 'UPDATE_WARNING_SYSTEM':
      return {
        ...state,
        warningSystem: {
          ...state.warningSystem,
          ...action.state
        }
      };

    default:
      return state;
  }
}

// Create context
const AgentContext = createContext<{
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
} | undefined>(undefined);

// Provider component
export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);

  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}

// Custom hook to use the agent context
export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}