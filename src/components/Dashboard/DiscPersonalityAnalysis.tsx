import React, { useState, useEffect, useRef } from 'react';
import { Brain, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { usePersonalityAnalysis, PersonalityProfile } from '../../hooks/usePersonalityAnalysis';

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
  transcription = '',
  context = [],
  callDuration,
  onPersonalityDetected
}) => {
  const {
    loading,
    error,
    personalityProfile,
    analyzePersonality,
    clearAnalysis
  } = usePersonalityAnalysis();

  // DEBUG: Log la transcription reçue
  useEffect(() => {
    console.log('[DISC] transcription prop:', transcription);
  }, [transcription]);

  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60); // Seuil de confiance initial
  const lastTranscriptionRef = useRef('');
  const analysisHistoryRef = useRef<PersonalityProfile[]>([]);

  // Patch temporaire pour logger l'appel API
  const analyzePersonalityWithLog = async (...args: Parameters<typeof analyzePersonality>) => {
    console.log('[DISC] Trigger DISC analysis with:', args[0]);
    try {
      const result = await analyzePersonality(...args);
      console.log('[DISC] API response:', result);
      return result;
    } catch (err) {
      console.error('[DISC] API error:', err);
      throw err;
    }
  };

  // Stratégie d'analyse optimisée pour détection précoce
  useEffect(() => {
    if (!transcription || transcription.length < 30) {
      clearAnalysis();
      return;
    }

    // Détection de nouveaux mots ajoutés
    const newWords = transcription.slice(lastTranscriptionRef.current.length);
    const hasSignificantNewContent = newWords.length > 20; // Au moins 20 nouveaux caractères

    if (!hasSignificantNewContent) return;

    lastTranscriptionRef.current = transcription;

    // Stratégie d'analyse progressive
    const shouldAnalyze = () => {
      const currentLength = transcription.length;
      
      // Première analyse rapide (30-50 caractères)
      if (currentLength >= 30 && currentLength < 100 && analysisCount === 0) {
        return true;
      }
      
      // Analyses intermédiaires (tous les 100-150 caractères)
      if (currentLength >= 100 && currentLength % 120 === 0) {
        return true;
      }
      
      // Analyse finale si pas de résultat concluant
      if (currentLength >= 200 && (!personalityProfile || personalityProfile.confidence < 70)) {
        return true;
      }
      
      return false;
    };

    if (shouldAnalyze()) {
      const timeoutId = setTimeout(async () => {
        try {
          const profile = await analyzePersonalityWithLog(transcription, context, callDuration);
          setLastAnalysisTime(new Date());
          setAnalysisCount(prev => prev + 1);
          
          // Stocker l'historique pour améliorer la précision
          analysisHistoryRef.current.push(profile);
          
          // Ajuster le seuil de confiance basé sur l'historique
          if (analysisHistoryRef.current.length >= 2) {
            const recentProfiles = analysisHistoryRef.current.slice(-3);
            const avgConfidence = recentProfiles.reduce((sum, p) => sum + p.confidence, 0) / recentProfiles.length;
            
            if (avgConfidence > 75) {
              setConfidenceThreshold(75); // Augmenter le seuil si on a des résultats cohérents
            }
          }
          
          onPersonalityDetected?.(profile);
        } catch (err) {
          console.error('Auto-analysis failed:', err);
        }
      }, 1500); // Réduire le délai pour une réponse plus rapide

      return () => clearTimeout(timeoutId);
    }
  }, [transcription, context, callDuration, analyzePersonality, onPersonalityDetected, clearAnalysis, analysisCount, personalityProfile]);

  // Analyse rapide des premiers mots pour détection précoce
  useEffect(() => {
    if (transcription.length >= 30 && transcription.length < 80 && analysisCount === 0) {
      const quickAnalysisTimeout = setTimeout(async () => {
        try {
          // Analyse rapide avec prompt optimisé pour détection précoce
          const quickProfile = await analyzePersonalityWithLog(
            transcription, 
            context, 
            callDuration
          );
          
          if (quickProfile && quickProfile.confidence >= 65) {
            setLastAnalysisTime(new Date());
            setAnalysisCount(1);
            onPersonalityDetected?.(quickProfile);
          }
        } catch (err) {
          console.error('Quick analysis failed:', err);
        }
      }, 800); // Délai très court pour la première analyse

      return () => clearTimeout(quickAnalysisTimeout);
    }
  }, [transcription, context, callDuration, analyzePersonality, onPersonalityDetected, analysisCount]);

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
        {personalityProfile && (
          <div className="flex items-center text-sm text-slate-400">
            <CheckCircle className="w-4 h-4 mr-1" />
            {analysisCount} analysis{analysisCount !== 1 ? 'es' : ''}
          </div>
        )}
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
            {lastAnalysisTime && (
              <span className="block text-xs text-slate-500 mt-1">
                Last updated: {lastAnalysisTime.toLocaleTimeString()}
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