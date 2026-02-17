import React, { useState, useRef } from 'react';
import { CallPhasesDisplay } from './CallPhasesDisplay';
import StatusCard from './StatusCard';
import { Brain, Radar, MapPin, GraduationCap, Target, Lightbulb, FileText, ArrowUp } from 'lucide-react';
import DiscPersonalityAnalysis from './DiscPersonalityAnalysis';
import TransactionProgressDetails from './TransactionProgressDetails';
import CallStructureGuideDetails from './CallStructureGuideDetails';
import CoachingDetails from './CoachingDetails';
import TargetingDetails from './TargetingDetails';
import RecommendationsDetails from './RecommendationsDetails';
import { RealTimeCoaching } from './RealTimeCoaching';
import { LiveTranscript } from './LiveTranscript';
import { useAgent } from '../../contexts/AgentContext';

// Placeholders stylés pour les widgets vides
/*
const PlaceholderCard = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) => (
  <div className="bg-[#232f47] rounded-xl flex flex-col items-center justify-center p-6 min-h-[140px] h-full">
    <div className="mb-2">{icon}</div>
    <div className="text-white font-semibold text-lg mb-1">{title}</div>
    <div className="text-slate-400 text-sm text-center">{subtitle}</div>
  </div>
);
*/

const repsPhases = [
  { id: 'context', name: 'Context & Preparation', icon: '📋', color: 'bg-blue-100 text-blue-800' },
  { id: 'sbam', name: 'SBAM & Opening', icon: '👥', color: 'bg-green-100 text-green-800' },
  { id: 'legal', name: 'Legal & Compliance', icon: '🛡️', color: 'bg-purple-100 text-purple-800' },
  { id: 'discovery', name: 'Need Discovery', icon: '💬', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'value', name: 'Value Proposition', icon: '🎯', color: 'bg-pink-100 text-pink-800' },
  { id: 'documents', name: 'Documents/Quote', icon: '📄', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'objections', name: 'Objection Handling', icon: '⚠️', color: 'bg-red-100 text-red-800' },
  { id: 'closing', name: 'Confirmation & Closing', icon: '🤝', color: 'bg-teal-100 text-teal-800' },
  { id: 'postcall', name: 'Post-Call Actions', icon: '✅', color: 'bg-gray-100 text-gray-800' }
];

const DashboardGrid: React.FC = () => {
  const { state, dispatch } = useAgent();
  const [discExpanded, setDiscExpanded] = useState(false);
  const transactionExpanded = false;
  const callStructureExpanded = false;
  const coachingExpanded = false;
  const targetingExpanded = false;
  const recommendationsExpanded = false;
  const discSectionRef = useRef<HTMLDivElement>(null);

  // Génère une transcription propre pour DISC : uniquement les textes finaux uniques
  const transcriptTexts = state.transcript
    .map(entry => entry.text)
    .filter((text, idx, arr) => text && arr.indexOf(text) === idx);
  // (Optionnel) Ajoute la dernière interim si tu veux du live (à adapter si tu veux la passer via le contexte)
  // const fullTranscription = [...transcriptTexts, state.currentInterimText].filter(Boolean).join(' ');
  const fullTranscription = transcriptTexts.join(' ');

  return (
    <div className="w-full pb-8">
      <div className="grid grid-cols-6 gap-x-6 gap-y-6 my-6 w-full h-[180px]">
        <StatusCard
          icon={<Brain className="text-purple-400" />}
          title="DISC Profile"
          value={
            <div className="w-full flex flex-col items-center">
              <div className="flex gap-2 justify-center mb-2">
                <span className="bg-red-500 text-white rounded px-2 py-1 font-bold">D</span>
                <span className="bg-yellow-400 text-white rounded px-2 py-1 font-bold">I</span>
                <span className="bg-green-500 text-white rounded px-2 py-1 font-bold">S</span>
                <span className="bg-blue-500 text-white rounded px-2 py-1 font-bold">C</span>
              </div>
              <div className="text-slate-400 text-sm text-center w-full">Start call to analyze</div>
            </div>
          }
          expandable
          expanded={discExpanded}
          onToggle={() => setDiscExpanded(v => !v)}
        />
        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<Radar className="text-cyan-400" />}
              title="Transaction Progress"
              value={
                <div className="flex flex-col w-full">
                  <span className="text-red-400 font-bold text-2xl mb-1">0%</span>
                  <span className="text-slate-300 text-sm mb-1">Success Probability</span>
                  <div className="w-full h-2 bg-slate-500/30 rounded-full mb-1">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: '0%' }} />
                  </div>
                  <span className="text-slate-400 text-sm">0% to goal</span>
                </div>
              }
              expandable
              expanded={false}
              onToggle={() => { }}
            />
          </div>
        </div>

        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<MapPin className="text-cyan-400" />}
              title="Call Structure"
              value={
                <div className="flex flex-col items-center justify-center w-full mt-2">
                  <MapPin className="w-10 h-10 text-slate-500 mb-5" />
                  <span className="text-slate-400 text-base text-center">No active methodology</span>
                </div>
              }
              expandable
              expanded={false}
              onToggle={() => { }}
            />
          </div>
        </div>

        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<GraduationCap className="text-blue-400" />}
              title="Coaching"
              value={
                <div className="flex flex-col items-center justify-center w-full mt-2">
                  <GraduationCap className="w-10 h-10 text-slate-500 mb-5" />
                  <span className="text-slate-400 text-base text-center">Start call for coaching</span>
                </div>
              }
              expandable
              expanded={false}
              onToggle={() => { }}
            />
          </div>
        </div>

        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<Target className="text-cyan-400" />}
              title="Targeting"
              value={
                <div className="flex flex-col items-center justify-center w-full mt-2">
                  <Target className="w-10 h-10 text-slate-500 mb-5" />
                  <span className="text-slate-400 text-base text-center">No transaction goal set</span>
                </div>
              }
              expandable
              expanded={false}
              onToggle={() => { }}
            />
          </div>
        </div>

        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="bg-[#232f47]/50 absolute inset-0 rounded-xl" />
          </div>
          <div className="pointer-events-none w-full h-full">
            <StatusCard
              icon={<Lightbulb className="text-yellow-400" />}
              title="Recommendations"
              value={
                <div className="flex flex-col items-center justify-center w-full mt-2">
                  <Lightbulb className="w-10 h-10 text-slate-500 mb-5" />
                  <span className="text-slate-400 text-base text-center">No recommendations yet</span>
                </div>
              }
              expandable
              expanded={false}
              onToggle={() => { }}
            />
          </div>
        </div>
      </div>
      {discExpanded && (
        <>
          {console.log('[DASHBOARD] state.transcript:', state.transcript)}
          {console.log('[DASHBOARD] transcription prop:', fullTranscription)}
          <div ref={discSectionRef} className="w-full mt-2 mb-8">
            <DiscPersonalityAnalysis
              transcription={fullTranscription}
              context={state.transcript || []}
              callDuration={state.callState.isActive ? Math.floor((Date.now() - (state.callState.startTime?.getTime() || Date.now())) / 60000) : 0}
              onPersonalityDetected={(profile) => {
                console.log('Personality detected:', profile);
                // Adapter le profil pour le contexte
                const adaptedProfile = {
                  type: profile.primaryType,
                  dominance: profile.primaryType === 'D' ? profile.confidence : 0,
                  influence: profile.primaryType === 'I' ? profile.confidence : 0,
                  steadiness: profile.primaryType === 'S' ? profile.confidence : 0,
                  conscientiousness: profile.primaryType === 'C' ? profile.confidence : 0,
                  confidence: profile.confidence,
                  description: profile.communicationStyle,
                  recommendations: profile.recommendations
                };
                dispatch({ type: 'UPDATE_PERSONALITY_PROFILE', profile: adaptedProfile });

                // Notification pour informer l'utilisateur
                if (profile.confidence >= 70) {
                  // Scroll automatique vers le DISC si confiance élevée
                  setTimeout(() => {
                    discSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 1000);
                }
              }}
            />
          </div>
        </>
      )}
      {transactionExpanded && (
        <div className="w-full mt-2 mb-8">
          <TransactionProgressDetails />
        </div>
      )}
      {callStructureExpanded && (
        <div className="w-full mt-2 mb-8">
          <CallStructureGuideDetails />
        </div>
      )}
      {coachingExpanded && (
        <div className="w-full mt-2 mb-8">
          <CoachingDetails />
        </div>
      )}
      {targetingExpanded && (
        <div className="w-full mt-2 mb-8">
          <TargetingDetails />
        </div>
      )}
      {recommendationsExpanded && (
        <div className="w-full mt-2 mb-8">
          <RecommendationsDetails />
        </div>
      )}
      {/* Bouton flottant pour remonter vers DISC */}
      {discExpanded && (
        <button
          onClick={() => discSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-6 right-6 bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
          title="Scroll to DISC Analysis"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Featured Real-Time Section */}
      <div className="grid grid-cols-12 gap-6 mt-6 min-h-[450px]">
        {/* Left Column: Phases & Coaching (7 cols) */}
        <div className="col-span-7 flex flex-col space-y-6">
          <div className="bg-[#232f47] rounded-xl p-8 flex flex-col h-full shadow-xl border border-slate-700/50">
            <RealTimeCoaching />
          </div>

          <div className="bg-[#232f47] rounded-xl p-8 flex flex-col shadow-xl border border-slate-700/50">
            <CallPhasesDisplay
              phases={repsPhases as any}
              isCallActive={state.callState.isActive}
              phoneNumber={state.callState.contact?.phone || "+13024440090"}
              mediaStream={state.mediaStream}
              disableAutoScroll={true}
              onPhaseClick={(phaseId) => {
                console.log('Phase clicked:', phaseId);
              }}
            />
          </div>
        </div>

        {/* Right Column: Live Transcript (5 cols) */}
        <div className="col-span-5 h-full">
          <div className="bg-[#232f47] rounded-xl p-1 h-full shadow-2xl border border-slate-700/30">
            <LiveTranscript />
          </div>
        </div>
      </div>

      {/* Adaptive Script Prompter Overlay/Section */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="bg-[#1b253a] rounded-xl p-8 flex flex-col min-h-[180px] relative border border-slate-800 shadow-inner">
          <div className="relative z-0 h-full flex flex-col">
            <div className="flex items-center mb-4 self-start">
              <Brain className="text-cyan-400 mr-2" />
              <span className="text-lg font-bold text-white tracking-wide">Adaptive Script Prompter</span>
            </div>
            <div className="flex flex-col items-center justify-center flex-1 opacity-50">
              <FileText className="w-8 h-8 text-slate-500 mb-3" />
              <div className="text-slate-400 text-sm italic">Script prompter will activate when call starts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGrid;