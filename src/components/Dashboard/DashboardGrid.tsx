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
import { KnowledgeBase } from './KnowledgeBase';
import { useAgent } from '../../contexts/AgentContext';
import SmartWarningSystem from './SmartWarningSystem';

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
  { id: 'context', name: 'Context & Preparation', icon: '📋', color: 'bg-white/5 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
  { id: 'sbam', name: 'SBAM & Opening', icon: '👥', color: 'bg-white/5 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' },
  { id: 'legal', name: 'Legal & Compliance', icon: '🛡️', color: 'bg-white/5 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' },
  { id: 'discovery', name: 'Need Discovery', icon: '💬', color: 'bg-white/5 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
  { id: 'value', name: 'Value Proposition', icon: '🎯', color: 'bg-white/5 text-harx-500 border border-harx-500/30 shadow-[0_0_20px_rgba(255,77,77,0.15)]' },
  { id: 'documents', name: 'Documents/Quote', icon: '📄', color: 'bg-white/5 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' },
  { id: 'objections', name: 'Objection Handling', icon: '⚠️', color: 'bg-white/5 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]' },
  { id: 'closing', name: 'Confirmation & Closing', icon: '🤝', color: 'bg-white/5 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]' },
  { id: 'postcall', name: 'Post-Call Actions', icon: '✅', color: 'bg-white/5 text-slate-400 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' }
];

const DashboardGrid: React.FC = () => {
  const { state } = useAgent();
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
    <div className="w-full pb-2">
      <div className="grid grid-cols-6 gap-2 my-1 w-full h-[120px]">
        <StatusCard
          icon={<Brain className="text-harx-alt-400" />}
          title="DISC Profile"
          value={
            <div className="w-full flex flex-col items-center">
              {state.personalityProfile ? (
                <div className="flex flex-col items-center">
                  <div className="flex gap-2 justify-center mb-2">
                    <span className={`rounded px-2 py-1 font-bold ${state.personalityProfile.primaryType === 'D' ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-500/50'}`}>D</span>
                    <span className={`rounded px-2 py-1 font-bold ${state.personalityProfile.primaryType === 'I' ? 'bg-yellow-400 text-white' : 'bg-yellow-400/20 text-yellow-400/50'}`}>I</span>
                    <span className={`rounded px-2 py-1 font-bold ${state.personalityProfile.primaryType === 'S' ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-500/50'}`}>S</span>
                    <span className={`rounded px-2 py-1 font-bold ${state.personalityProfile.primaryType === 'C' ? 'bg-harx-500 text-white' : 'bg-harx-500/20 text-harx-500/50'}`}>C</span>
                  </div>
                  <div className="text-white font-bold text-center capitalize">{state.personalityProfile.primaryType} Profile Detected</div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 justify-center mb-2">
                    <span className="bg-red-500/20 text-red-500/50 rounded px-2 py-1 font-bold">D</span>
                    <span className="bg-yellow-400/20 text-yellow-400/50 rounded px-2 py-1 font-bold">I</span>
                    <span className="bg-green-500/20 text-green-500/50 rounded px-2 py-1 font-bold">S</span>
                    <span className="bg-harx-500/20 text-harx-500/50 rounded px-2 py-1 font-bold">C</span>
                  </div>
                  <div className="text-slate-400 text-sm text-center w-full">Start call to analyze</div>
                </>
              )}
            </div>
          }
          expandable
          expanded={discExpanded}
          onToggle={() => setDiscExpanded(v => !v)}
          disabled
        />
        <StatusCard
          icon={<Radar className="text-cyan-400" />}
          title="Transaction Progress"
          value={
            <div className="flex flex-col w-full">
              <span className="text-slate-500 font-bold text-2xl mb-1">0%</span>
              <span className="text-slate-500 text-sm mb-1">Success Probability</span>
              <div className="w-full h-2 bg-slate-500/30 rounded-full mb-1">
                <div className="h-2 rounded-full bg-slate-600" style={{ width: '0%' }} />
              </div>
              <span className="text-slate-500 text-sm">0% to goal</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<MapPin className="text-cyan-400" />}
          title="Call Structure"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <MapPin className="w-10 h-10 text-slate-500 mb-5" />
              <span className="text-slate-500 text-base text-center">No active methodology</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<GraduationCap className="text-harx-400" />}
          title="Coaching"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <GraduationCap className="w-10 h-10 text-slate-500 mb-5" />
              <span className="text-slate-500 text-base text-center">Start call for coaching</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<Target className="text-cyan-400" />}
          title="Targeting"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Target className="w-10 h-10 text-slate-500 mb-5" />
              <span className="text-slate-500 text-base text-center">No transaction goal set</span>
            </div>
          }
          disabled
        />

        <StatusCard
          icon={<Lightbulb className="text-yellow-400" />}
          title="Recommendations"
          value={
            <div className="flex flex-col items-center justify-center w-full mt-2">
              <Lightbulb className="w-10 h-10 text-slate-500 mb-5" />
              <span className="text-slate-500 text-base text-center">No recommendations yet</span>
            </div>
          }
          disabled
        />
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
          className="fixed bottom-6 right-6 bg-harx-alt-500 hover:bg-harx-alt-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
          title="Scroll to DISC Analysis"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Featured Real-Time Section */}
      <div className="grid grid-cols-12 gap-2 mt-1 min-h-[300px]">
        {/* Left Column: Phases & Coaching (7 cols) */}
        <div className="col-span-7 flex flex-col space-y-2">
          <div className="relative h-full">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] rounded-2xl" />
              <div className="relative z-20 bg-slate-900/90 text-harx-500 text-[9px] font-black px-5 py-2 rounded-full border border-harx-500/30 shadow-[0_0_30px_rgba(255,77,77,0.2)] uppercase tracking-[0.3em] animate-pulse transform rotate-[-3deg]">
                Cognitive Analytics Offline
              </div>
            </div>
            <div className="glass-card rounded-2xl p-8 flex flex-col h-full shadow-xl opacity-30 grayscale-[0.8] hover:grayscale-0 transition-all duration-700">
              <RealTimeCoaching />
            </div>
          </div>

          <div className="relative h-[250px]">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] rounded-2xl" />
              <div className="relative z-20 bg-slate-900/90 text-harx-500 text-[9px] font-black px-5 py-2 rounded-full border border-harx-500/30 shadow-[0_0_30px_rgba(255,77,77,0.2)] uppercase tracking-[0.3em] animate-pulse transform rotate-[-3deg]">
                Cognitive Analytics Offline
              </div>
            </div>
            <div className="glass-card rounded-2xl p-8 flex flex-col shadow-xl opacity-30 grayscale-[0.8]">
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
        </div>

        {/* Right Column: Live Transcript (5 cols) */}
        <div className="col-span-5 h-full">
          <div className="relative h-full min-h-[300px]">
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] rounded-2xl" />
              <div className="relative z-20 bg-slate-900/90 text-harx-500 text-[9px] font-black px-5 py-2 rounded-full border border-harx-500/30 shadow-[0_0_30px_rgba(255,77,77,0.2)] uppercase tracking-[0.3em] animate-pulse transform rotate-[-3deg]">
                Cognitive Analytics Offline
              </div>
            </div>
            <div className="glass-card rounded-2xl p-2 h-full shadow-2xl opacity-30">
              <LiveTranscript />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Layout: Script Prompter & Knowledge Base */}
      <div className="grid grid-cols-12 gap-2 mt-2">
        {/* Left Column: Script Prompter (7 cols) */}
        <div className="col-span-7 relative">
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] rounded-2xl" />
            <div className="relative z-20 bg-slate-900/90 text-harx-400 text-[10px] font-black px-4 py-1.5 rounded-full border border-harx-500/20 shadow-2xl uppercase tracking-[0.2em] animate-pulse">
              Coming Soon
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col h-full min-h-[220px] relative shadow-inner opacity-30">
            <div className="relative z-0 h-full flex flex-col">
              <div className="flex items-center mb-4 self-start group">
                <div className="p-2 bg-harx-alt-500/10 rounded-xl mr-3 group-hover:bg-harx-alt-500/20 transition-all">
                  <Brain className="text-harx-alt-400" />
                </div>
                <span className="text-sm font-black text-white tracking-widest uppercase">Adaptive Script Prompter</span>
              </div>
              <div className="flex flex-col items-center justify-center flex-1 opacity-50">
                <FileText className="w-8 h-8 text-harx-500/30 mb-2" />
                <div className="text-harx-100/30 text-[10px] font-black uppercase tracking-widest italic text-center">Prompter will activate on connection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Base (5 cols) */}
        <div className="col-span-5 relative">
           <KnowledgeBase />
        </div>
      </div>

      {/* AI Overlays */}
      <SmartWarningSystem />
    </div>
  );
};

export default DashboardGrid;
