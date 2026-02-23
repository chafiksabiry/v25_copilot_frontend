import React, { useEffect } from 'react';
import { Brain, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { PersonalityProfile } from '../../types';

const discTypes = [
  {
    letter: 'D',
    title: 'Dominant',
    desc: 'Direct & Results-focused',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    activeBgColor: 'bg-red-400/20',
    activeBorderColor: 'border-red-400/50'
  },
  {
    letter: 'I',
    title: 'Influential',
    desc: 'People & Persuasion',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    activeBgColor: 'bg-yellow-400/20',
    activeBorderColor: 'border-yellow-400/50'
  },
  {
    letter: 'S',
    title: 'Steady',
    desc: 'Stability & Support',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    activeBgColor: 'bg-green-400/20',
    activeBorderColor: 'border-green-400/50'
  },
  {
    letter: 'C',
    title: 'Conscientious',
    desc: 'Quality & Analysis',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    activeBgColor: 'bg-blue-400/20',
    activeBorderColor: 'border-blue-400/50'
  },
];

interface DiscPersonalityAnalysisProps {
  transcription?: string;
  context?: any[];
  callDuration?: number;
  onPersonalityDetected?: (profile: PersonalityProfile) => void;
}

const DiscPersonalityAnalysis: React.FC<DiscPersonalityAnalysisProps> = ({
  onPersonalityDetected
}) => {
  const { state } = useAgent();

  // Use transcription from state if available
  const transcription = state.transcript.map(t => t.text).join(' ');
  const personalityProfile = state.personalityProfile;
  const loading = false; // Loading state could be added to global state if needed, but for now we follow global updates
  const error = null;

  // No longer need internal triggers, handled by TranscriptionBridge
  useEffect(() => {
    if (personalityProfile) {
      onPersonalityDetected?.(personalityProfile);
    }
  }, [personalityProfile, onPersonalityDetected]);

  const getTypeStatus = (typeLetter: string) => {
    if (!personalityProfile) return 'not-identified';

    if (personalityProfile.primaryType === typeLetter) return 'primary';
    if (personalityProfile.secondaryType === typeLetter) return 'secondary';
    return 'not-identified';
  };

  const getTypeStyles = (typeLetter: string) => {
    const type = discTypes.find(t => t.letter === typeLetter);
    if (!type) return {};

    const status = getTypeStatus(typeLetter);

    switch (status) {
      case 'primary':
        return {
          bgColor: type.activeBgColor,
          borderColor: type.activeBorderColor,
          textColor: type.color,
          showCheck: true
        };
      case 'secondary':
        return {
          bgColor: type.bgColor,
          borderColor: type.borderColor,
          textColor: type.color,
          showCheck: true,
          opacity: 'opacity-70'
        };
      default:
        return {
          bgColor: 'bg-[#26314a]',
          borderColor: 'border-slate-500/30',
          textColor: 'text-white',
          showCheck: false
        };
    }
  };

  // Indicateur de progression de l'analyse
  const getAnalysisProgress = () => {
    if (!transcription) return 0;
    const length = transcription.length;
    if (length < 30) return 0;
    if (length < 100) return 25;
    if (length < 200) return 50;
    if (length < 300) return 75;
    return 100;
  };

  return (
    <div className="bg-[#232f47] rounded-xl p-8 w-full">
      <div className="flex items-center justify-between text-purple-400 text-xl font-semibold mb-4">
        <div className="flex items-center">
          <Brain className="w-6 h-6 mr-2" />
          DISC Personality Analysis
        </div>
      </div>

      <div className="bg-[#232f47] rounded-xl p-6 w-full mb-4 border border-slate-600/40">
        <div className="flex items-center justify-between text-purple-400 text-lg font-semibold mb-4">
          <div className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            DISC Personality Types
          </div>
          {loading && (
            <div className="flex items-center text-blue-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
              Analyzing...
            </div>
          )}
        </div>

        {/* Barre de progression de l'analyse */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Analysis Progress</span>
            <span>{getAnalysisProgress()}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getAnalysisProgress()}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          {discTypes.map((type) => {
            const styles = getTypeStyles(type.letter);
            return (
              <div
                key={type.letter}
                className={`${styles.bgColor} ${styles.borderColor} rounded-xl flex flex-col items-center justify-center p-6 border relative transition-all duration-300 ${styles.opacity || ''}`}
              >
                {styles.showCheck && (
                  <div className={`absolute top-2 right-2 ${styles.textColor}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                <div className={`text-3xl font-bold mb-2 ${styles.textColor}`}>
                  {type.letter}
                </div>
                <div className={`text-lg font-bold mb-1 ${styles.textColor}`}>
                  {type.title}
                </div>
                <div className="text-slate-400 text-sm text-center">
                  {type.desc}
                </div>
                {personalityProfile && getTypeStatus(type.letter) === 'primary' && (
                  <div className="mt-2 text-xs text-slate-400">
                    {personalityProfile.confidence}% confidence
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <hr className="border-slate-600/40 mb-4" />

        <div className="flex items-center gap-6 justify-center text-sm mb-4">
          <span className="flex items-center gap-1 text-slate-400">
            <input type="checkbox" disabled className="accent-slate-400" />
            Not Identified
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Identified
          </span>
          <span className="flex items-center gap-1 text-white">
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            Live Analysis
          </span>
        </div>

        {/* Analysis Status */}
        {!transcription || transcription.length < 30 ? (
          <div className="text-center text-slate-400 text-sm">
            <Clock className="w-4 h-4 mx-auto mb-1 opacity-50" />
            Waiting for conversation to analyze personality...
            <br />
            <span className="text-xs">Minimum 30 characters required</span>
          </div>
        ) : error ? (
          <div className="text-center text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
            Analysis error: {error}
          </div>
        ) : personalityProfile ? (
          <div className="text-center text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 mx-auto mb-1" />
            Primary: {personalityProfile.primaryType} ({personalityProfile.confidence}% confidence)
            {personalityProfile.secondaryType && (
              <span className="block text-slate-400">
                Secondary: {personalityProfile.secondaryType}
              </span>
            )}
          </div>
        ) : (
          <div className="text-center text-blue-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mx-auto mb-1"></div>
            Analyzing personality patterns...
            <br />
            <span className="text-xs">Building confidence with more conversation</span>
          </div>
        )}
      </div>

      {/* Quick Recommendations */}
      {personalityProfile && (
        <div className="bg-[#26314a] rounded-xl p-4 border border-slate-600/40">
          <div className="text-purple-400 text-sm font-semibold mb-2">
            Quick Recommendations
          </div>
          <div className="text-slate-300 text-sm">
            <div className="mb-1">
              <strong>Approach:</strong> {personalityProfile.approachStrategy}
            </div>
            <div className="mb-1">
              <strong>Style:</strong> {personalityProfile.communicationStyle}
            </div>
            {personalityProfile.recommendations.length > 0 && (
              <div>
                <strong>Key Tip:</strong> {personalityProfile.recommendations[0]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscPersonalityAnalysis; 