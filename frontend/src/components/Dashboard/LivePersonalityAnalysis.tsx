import React, { useEffect, useState } from 'react';
import { Brain, Lightbulb, Target, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { usePersonalityAnalysis, PersonalityProfile } from '../../hooks/usePersonalityAnalysis';

interface LivePersonalityAnalysisProps {
  transcription: string;
  context?: any[];
  callDuration?: number;
  onAnalysisComplete?: (profile: PersonalityProfile) => void;
}

const LivePersonalityAnalysis: React.FC<LivePersonalityAnalysisProps> = ({
  transcription,
  context,
  callDuration,
  onAnalysisComplete
}) => {
  const {
    loading,
    error,
    personalityProfile,
    analyzePersonality,
    getPersonalityTypeInfo
  } = usePersonalityAnalysis();

  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);

  // Auto-analyze when transcription changes (with debouncing)
  useEffect(() => {
    if (!transcription || transcription.length < 50) return; // Minimum text for analysis

    const timeoutId = setTimeout(async () => {
      try {
        const profile = await analyzePersonality(transcription, context, callDuration);
        setLastAnalysisTime(new Date());
        setAnalysisCount(prev => prev + 1);
        onAnalysisComplete?.(profile);
      } catch (err) {
        console.error('Auto-analysis failed:', err);
      }
    }, 3000); // Wait 3 seconds after transcription stops changing

    return () => clearTimeout(timeoutId);
  }, [transcription, context, callDuration, analyzePersonality, onAnalysisComplete]);

  if (!personalityProfile && !loading) {
    return (
      <div className="bg-[#232f47] rounded-xl p-6 border border-slate-600/40">
        <div className="flex items-center text-purple-400 text-lg font-semibold mb-4">
          <Brain className="w-5 h-5 mr-2" />
          Live Personality Analysis
        </div>
        <div className="text-slate-400 text-center py-8">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Waiting for conversation to analyze personality...</p>
          <p className="text-sm mt-2">Minimum 50 characters required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#232f47] rounded-xl p-6 border border-slate-600/40">
        <div className="flex items-center text-purple-400 text-lg font-semibold mb-4">
          <Brain className="w-5 h-5 mr-2" />
          Live Personality Analysis
        </div>
        <div className="text-slate-400 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
          <p>Analyzing personality patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#232f47] rounded-xl p-6 border border-red-500/30">
        <div className="flex items-center text-red-400 text-lg font-semibold mb-4">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Analysis Error
        </div>
        <div className="text-slate-400">
          <p>Failed to analyze personality: {error}</p>
        </div>
      </div>
    );
  }

  if (!personalityProfile) return null;

  const primaryTypeInfo = getPersonalityTypeInfo(personalityProfile.primaryType);
  const secondaryTypeInfo = personalityProfile.secondaryType 
    ? getPersonalityTypeInfo(personalityProfile.secondaryType) 
    : null;

  return (
    <div className="bg-[#232f47] rounded-xl p-6 border border-slate-600/40">
      <div className="flex items-center justify-between text-purple-400 text-lg font-semibold mb-4">
        <div className="flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Live Personality Analysis
        </div>
        <div className="flex items-center text-xs text-slate-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          {analysisCount} analysis{analysisCount !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Primary Personality Type */}
      <div className={`${primaryTypeInfo.bgColor} ${primaryTypeInfo.borderColor} rounded-lg p-4 mb-4 border`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className={`text-2xl font-bold ${primaryTypeInfo.color} mr-3`}>
              {personalityProfile.primaryType}
            </div>
            <div>
              <div className={`font-semibold ${primaryTypeInfo.color}`}>
                {primaryTypeInfo.title}
              </div>
              <div className="text-slate-400 text-sm">
                {primaryTypeInfo.description}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Confidence</div>
            <div className={`font-bold ${primaryTypeInfo.color}`}>
              {personalityProfile.confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Type (if exists) */}
      {secondaryTypeInfo && (
        <div className={`${secondaryTypeInfo.bgColor} ${secondaryTypeInfo.borderColor} rounded-lg p-3 mb-4 border opacity-70`}>
          <div className="flex items-center">
            <div className={`text-lg font-bold ${secondaryTypeInfo.color} mr-2`}>
              {personalityProfile.secondaryType}
            </div>
            <div className="text-sm text-slate-400">
              Secondary: {secondaryTypeInfo.title}
            </div>
          </div>
        </div>
      )}

      {/* Key Recommendations */}
      <div className="mb-4">
        <div className="flex items-center text-green-400 text-sm font-semibold mb-2">
          <Lightbulb className="w-4 h-4 mr-1" />
          Key Recommendations
        </div>
        <div className="space-y-2">
          {personalityProfile.recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="text-slate-300 text-sm bg-[#26314a] rounded p-2">
              • {rec}
            </div>
          ))}
        </div>
      </div>

      {/* Approach Strategy */}
      <div className="mb-4">
        <div className="flex items-center text-blue-400 text-sm font-semibold mb-2">
          <Target className="w-4 h-4 mr-1" />
          Approach Strategy
        </div>
        <div className="text-slate-300 text-sm bg-[#26314a] rounded p-3">
          {personalityProfile.approachStrategy}
        </div>
      </div>

      {/* Communication Style */}
      <div className="mb-4">
        <div className="text-slate-400 text-sm font-semibold mb-2">Communication Style</div>
        <div className="text-slate-300 text-sm bg-[#26314a] rounded p-2">
          {personalityProfile.communicationStyle}
        </div>
      </div>

      {/* Personality Indicators */}
      {personalityProfile.personalityIndicators.length > 0 && (
        <div className="mb-4">
          <div className="text-slate-400 text-sm font-semibold mb-2">Detected Patterns</div>
          <div className="flex flex-wrap gap-1">
            {personalityProfile.personalityIndicators.slice(0, 4).map((indicator, index) => (
              <span key={index} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                {indicator}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {lastAnalysisTime && (
        <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-600/40">
          Last updated: {lastAnalysisTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default LivePersonalityAnalysis; 