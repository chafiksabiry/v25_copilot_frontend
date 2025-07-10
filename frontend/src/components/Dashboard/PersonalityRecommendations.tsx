import React from 'react';
import { MessageSquare, Shield, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { PersonalityProfile } from '../../hooks/usePersonalityAnalysis';

interface PersonalityRecommendationsProps {
  personalityProfile: PersonalityProfile;
}

const PersonalityRecommendations: React.FC<PersonalityRecommendationsProps> = ({
  personalityProfile
}) => {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'communication':
        return <MessageSquare className="w-4 h-4" />;
      case 'objection':
        return <Shield className="w-4 h-4" />;
      case 'closing':
        return <Zap className="w-4 h-4" />;
      case 'approach':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'communication':
        return 'text-blue-400';
      case 'objection':
        return 'text-orange-400';
      case 'closing':
        return 'text-green-400';
      case 'approach':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-[#232f47] rounded-xl p-6 border border-slate-600/40">
      <div className="flex items-center text-purple-400 text-lg font-semibold mb-4">
        <MessageSquare className="w-5 h-5 mr-2" />
        Personality-Based Recommendations
      </div>

      {/* Communication Recommendations */}
      <div className="mb-6">
        <div className="flex items-center text-blue-400 text-sm font-semibold mb-3">
          <MessageSquare className="w-4 h-4 mr-2" />
          Communication Style
        </div>
        <div className="bg-[#26314a] rounded-lg p-4">
          <div className="text-slate-300 text-sm mb-2">
            {personalityProfile.communicationStyle}
          </div>
          <div className="space-y-2">
            {personalityProfile.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approach Strategy */}
      <div className="mb-6">
        <div className="flex items-center text-purple-400 text-sm font-semibold mb-3">
          <TrendingUp className="w-4 h-4 mr-2" />
          Approach Strategy
        </div>
        <div className="bg-[#26314a] rounded-lg p-4">
          <div className="text-slate-300 text-sm">
            {personalityProfile.approachStrategy}
          </div>
        </div>
      </div>

      {/* Objection Handling */}
      {personalityProfile.potentialObjections.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center text-orange-400 text-sm font-semibold mb-3">
            <Shield className="w-4 h-4 mr-2" />
            Potential Objections & Handling
          </div>
          <div className="space-y-3">
            {personalityProfile.potentialObjections.map((objection, index) => (
              <div key={index} className="bg-[#26314a] rounded-lg p-3">
                <div className="flex items-start mb-2">
                  <AlertCircle className="w-3 h-3 text-orange-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-slate-300 text-sm font-medium">Objection: {objection}</span>
                </div>
                {personalityProfile.objectionHandling[index] && (
                  <div className="flex items-start ml-5">
                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-slate-400 text-sm">
                      Response: {personalityProfile.objectionHandling[index]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing Techniques */}
      {personalityProfile.closingTechniques.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center text-green-400 text-sm font-semibold mb-3">
            <Zap className="w-4 h-4 mr-2" />
            Recommended Closing Techniques
          </div>
          <div className="bg-[#26314a] rounded-lg p-4">
            <div className="space-y-2">
              {personalityProfile.closingTechniques.map((technique, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-slate-300 text-sm">{technique}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Emotional Triggers */}
      {personalityProfile.emotionalTriggers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center text-yellow-400 text-sm font-semibold mb-3">
            <Zap className="w-4 h-4 mr-2" />
            Emotional Triggers
          </div>
          <div className="flex flex-wrap gap-2">
            {personalityProfile.emotionalTriggers.map((trigger, index) => (
              <span key={index} className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                {trigger}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {personalityProfile.riskFactors.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center text-red-400 text-sm font-semibold mb-3">
            <AlertCircle className="w-4 h-4 mr-2" />
            Risk Factors
          </div>
          <div className="space-y-2">
            {personalityProfile.riskFactors.map((risk, index) => (
              <div key={index} className="flex items-start">
                <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Indicators */}
      {personalityProfile.successIndicators.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center text-green-400 text-sm font-semibold mb-3">
            <CheckCircle className="w-4 h-4 mr-2" />
            Success Indicators
          </div>
          <div className="flex flex-wrap gap-2">
            {personalityProfile.successIndicators.map((indicator, index) => (
              <span key={index} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                {indicator}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Confidence */}
      <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-600/40">
        Analysis confidence: {personalityProfile.confidence}% | 
        Last updated: {new Date(personalityProfile.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PersonalityRecommendations; 